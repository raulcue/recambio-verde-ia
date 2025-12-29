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
app.set('trust proxy', true); // CRÍTICO: Para capturar la IP real tras proxies como Render/Heroku

// CONFIGURACIÓN DE LA BASE DE DATOS
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Helper para obtener datos del cliente (IP)
const getClientInfo = (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};

// ==========================================
// 1. GESTIÓN DE USUARIOS Y TALLERES
// ==========================================

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

// Simulación de Login para auditoría (Ajusta con tu lógica de auth real)
app.post('/api/login', async (req, res) => {
    const { email } = req.body;
    const ip = getClientInfo(req);
    try {
        // Registro de evento de seguridad
        await pool.query(
            'INSERT INTO logs (accion, detalle, ip_address, usuario_nombre, usuario_iniciales) VALUES ($1, $2, $3, $4, $5)',
            ['LOGIN_SUCCESS', `Acceso al sistema`, ip, email, email.substring(0,2).toUpperCase()]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error en login' });
    }
});

// ==========================================
// 2. GESTIÓN DE PEDIDOS (DASHBOARD)
// ==========================================

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

app.post('/api/pedidos/new', async (req, res) => {
    const { pieza, matricula, estado, precio, usuario_id, admin_user } = req.body;
    const ip = getClientInfo(req);
    try {
        const result = await pool.query(
            'INSERT INTO pedidos (pieza, matricula, estado, precio, usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [pieza, matricula, estado || 'solicitado', precio || 0, usuario_id]
        );

        await pool.query(
            'INSERT INTO logs (pedido_id, accion, detalle, ip_address, usuario_nombre, usuario_iniciales) VALUES ($1, $2, $3, $4, $5, $6)',
            [result.rows[0].id, 'CREATE_PIEZA', `Alta de pieza: ${pieza}`, ip, admin_user || 'Admin', 'AD']
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});

app.post('/api/pedidos/update-status', async (req, res) => {
    const { id, nuevoEstado, pieza, matricula, precio, admin_user } = req.body;
    const ip = getClientInfo(req);
    try {
        const current = await pool.query('SELECT estado FROM pedidos WHERE id = $1', [id]);
        const estadoAnterior = current.rows[0]?.estado;

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

        let accion = 'MODIFICACION';
        let detalle = `Cambio de datos en pieza ${pieza || ''}`;

        if (nuevoEstado && nuevoEstado !== estadoAnterior) {
            accion = 'KANBAN_MOVE';
            detalle = `Movido de ${estadoAnterior} a ${nuevoEstado}`;
        }

        await pool.query(
            'INSERT INTO logs (pedido_id, accion, detalle, ip_address, usuario_nombre, usuario_iniciales) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, accion, detalle, ip, admin_user || 'Admin', 'AD']
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar SQL' });
    }
});

// ==========================================
// 3. SISTEMA DE AUDITORÍA (LOGS)
// ==========================================

app.get('/api/logs', async (req, res) => {
    try {
        // Traemos también IP, nombre de usuario e iniciales
        const result = await pool.query(`
            SELECT l.id, l.fecha, l.accion, l.detalle, l.ip_address, l.usuario_nombre, l.usuario_iniciales, 
                   p.matricula, p.pieza 
            FROM logs l 
            LEFT JOIN pedidos p ON l.pedido_id = p.id 
            ORDER BY l.fecha DESC 
            LIMIT 150
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
    console.log(`🚀 Servidor Logístico IA con Auditoría Root en puerto ${PORT}`);
});
