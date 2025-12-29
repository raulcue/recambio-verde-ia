const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

// Servir archivos estáticos desde la carpeta /public
app.use(express.static(path.join(__dirname, 'public')));

// RUTAS DE NAVEGACIÓN
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API: Obtener pedidos para el Kanban
app.get('/api/pedidos', async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.nombre_taller 
      FROM pedidos p 
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.id DESC;`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Crear nuevo pedido (Indispensable para pedidos-taller.html)
app.post('/api/pedidos', async (req, res) => {
    const { matricula, pieza, bastidor, notas_tecnicas, estado } = req.body;
    try {
        const query = 'INSERT INTO pedidos (matricula, pieza, bastidor, notas_tecnicas, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *';
        const result = await pool.query(query, [matricula, pieza, bastidor, notas_tecnicas, estado || 'solicitado']);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: Login
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({ 
                success: true, 
                rol: user.rol, 
                redirect: user.rol === 'taller' ? 'pedidos-taller.html' : 'dashboard.html' 
            });
        } else {
            res.status(401).json({ success: false, message: "Error de credenciales" });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
