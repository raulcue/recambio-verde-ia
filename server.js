const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// MIDDLEWARES
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// CONFIGURACIÓN DE LA BASE DE DATOS
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ==========================================
// 1. GESTIÓN DE USUARIOS Y TALLERES
// ==========================================

// Obtener lista de talleres (Mejora: Cacheable en frontend)
app.get('/api/usuarios/talleres', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, email, nombre_taller FROM usuarios WHERE rol = 'taller' ORDER BY email ASC"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener talleres' });
    }
});

// ==========================================
// 2. GESTIÓN DE PEDIDOS (DASHBOARD)
// ==========================================

// OBTENER PEDIDOS (Con filtro de taller opcional)
app.get('/api/pedidos', async (req, res) => {
    const { taller_id } = req.query;
    try {
        let query = 'SELECT * FROM pedidos';
        const params = [];

        if (taller_id && taller_id !== 'todos') {
            query += ' WHERE usuario_id = $1'; 
            params.push(taller_id);
        }

        query += ' ORDER BY id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREAR NUEVO PEDIDO
app.post('/api/pedidos/new', async (req, res) => {
    const { pieza, matricula, estado, precio, usuario_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO pedidos (pieza, matricula, estado, precio, usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [pieza, matricula, estado || 'solicitado', precio || 0, usuario_id]
        );

        // Registro en LOGS para admin-logs.html
        await pool.query(
            'INSERT INTO logs (pedido_id, accion, detalle) VALUES ($1, $2, $3)',
            [result.rows[0].id, 'CREATE_PIEZA', `Alta de ${pieza} para ${matricula}`]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});

// ACTUALIZAR ESTADO O DATOS (Optimizado para Drag & Drop y Modal)
app.post('/api/pedidos/update-status', async (req, res) => {
    const { id, nuevoEstado, pieza, matricula, precio } = req.body;
    try {
        // 1. Obtener estado anterior para el Log (Opcional pero recomendado para auditoría)
        const current = await pool.query('SELECT estado FROM pedidos WHERE id = $1', [id]);
        const estadoAnterior = current.rows[0]?.estado;

        // 2. Actualización con COALESCE
        await pool.query(
            `UPDATE pedidos SET 
                estado = COALESCE($1, estado), 
                pieza = COALESCE($2, pieza), 
                matricula = COALESCE($3, matricula), 
                precio = COALESCE($4, precio),
                updated_at = CURRENT_TIMESTAMP 
             WHERE id = $5`,
            [nuevoEstado, pieza, matricula, precio, id]
        );

        // 3. Registro en LOGS especializado para admin-logs.html
        let accion = 'MODIFICACION';
        let detalle = `Actualización de datos generales`;

        if (nuevoEstado && nuevoEstado !== estadoAnterior) {
            accion = 'KANBAN_MOVE';
            detalle = `Pedido #${id} movido de ${estadoAnterior} a ${nuevoEstado}`;
        }

        await pool.query(
            'INSERT INTO logs (pedido_id, accion, detalle) VALUES ($1, $2, $3)',
            [id, accion, detalle]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar SQL' });
    }
});

// ==========================================
// 3. SISTEMA DE AUDITORÍA (LOGS)
// ==========================================

// OBTENER TODOS LOS LOGS (Para admin-logs.html)
app.get('/api/logs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, p.matricula, p.pieza 
            FROM logs l 
            LEFT JOIN pedidos p ON l.pedido_id = p.id 
            ORDER BY l.fecha DESC 
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar historial' });
    }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Logístico IA corriendo en puerto ${PORT}`);
});
