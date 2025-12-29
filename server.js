const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Configuración de la base de datos
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ==========================================
// 1. RUTA DE LOGIN (MANTENIDA EXACTAMENTE)
// ==========================================
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND password = $2',
            [email, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            let redirectUrl = 'landing.html'; 

            if (user.rol === 'taller') {
                redirectUrl = 'pedidos-taller.html';
            }

            res.json({ 
                success: true, 
                redirect: redirectUrl,
                user: { email: user.email, rol: user.rol }
            });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// ==========================================
// 2. RUTAS PARA EL DASHBOARD PRO (69 MEJORAS)
// ==========================================

// OBTENER TODOS LOS PEDIDOS (Con campos extendidos)
app.get('/api/pedidos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ACTUALIZAR ESTADO (Para el Drag & Drop)
app.post('/api/pedidos/update-status', async (req, res) => {
    const { id, nuevoEstado } = req.body;
    try {
        // Actualizamos estado y fecha
        await pool.query(
            'UPDATE pedidos SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [nuevoEstado, id]
        );

        // Registro automático en LOGS (Trazabilidad)
        await pool.query(
            'INSERT INTO logs (pedido_id, accion, detalle) VALUES ($1, $2, $3)',
            [id, 'MOVIMIENTO', `Cambiado a ${nuevoEstado.toUpperCase()}`]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el estado' });
    }
});

// OBTENER LOGS DE UN PEDIDO (Para el Popup Avanzado)
app.get('/api/pedidos/:id/logs', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM logs WHERE pedido_id = $1 ORDER BY fecha DESC',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar logs' });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
