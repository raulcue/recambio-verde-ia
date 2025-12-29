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
// 1. RUTA DE LOGIN
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
// 2. RUTAS PARA EL DASHBOARD Y GESTIÓN
// ==========================================

// OBTENER TODOS LOS PEDIDOS
app.get('/api/pedidos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREAR NUEVO PEDIDO (Para el botón + del Dashboard)
app.post('/api/pedidos/new', async (req, res) => {
    const { pieza, vehiculo, estado } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO pedidos (pieza, vehiculo, estado) VALUES ($1, $2, $3) RETURNING *',
            [pieza, vehiculo, estado || 'solicitado']
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear pedido' });
    }
});

// ACTUALIZAR ESTADO O DATOS (Modificar)
app.post('/api/pedidos/update-status', async (req, res) => {
    const { id, nuevoEstado, pieza, vehiculo } = req.body;
    try {
        // Actualizamos campos (pueden ser solo estado o también pieza/vehiculo)
        await pool.query(
            'UPDATE pedidos SET estado = $1, pieza = COALESCE($2, pieza), vehiculo = COALESCE($3, vehiculo), updated_at = CURRENT_TIMESTAMP WHERE id = $4',
            [nuevoEstado, pieza, vehiculo, id]
        );

        // Registro en LOGS
        await pool.query(
            'INSERT INTO logs (pedido_id, accion, detalle) VALUES ($1, $2, $3)',
            [id, 'MODIFICACION', `Estado: ${nuevoEstado.toUpperCase()}`]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

// OBTENER LOGS
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

// INICIAR SERVIDOR
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
