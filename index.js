const express = require('express');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname)));

// API para el Kanban
app.get('/api/pedidos', async (req, res) => {
    try {
        const query = `
            SELECT p.*, u.nombre_taller 
            FROM pedidos p 
            LEFT JOIN usuarios u ON p.usuario_id = u.id 
            ORDER BY p.id DESC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login dinámico
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({ success: true, rol: user.rol, redirect: user.rol === 'taller' ? 'pedidos-taller.html' : 'dashboard.html' });
        } else {
            res.status(401).json({ success: false, message: "Error de credenciales" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
