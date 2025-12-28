const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTAS DE NAVEGACIÓN ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/landing-agente', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing-agente.html')));
app.get('/configuracion', (req, res) => res.sendFile(path.join(__dirname, 'public', 'configuracion.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pedidos-lista', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pedidos-lista.html')));
app.get('/pedidos-taller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pedidos-taller.html')));

// --- API AUTENTICACIÓN ---
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
  if (result.rows.length > 0) {
    const user = result.rows[0];
    let destino = user.rol === 'admin' ? '/landing' : (user.rol === 'gestor' ? '/landing-agente' : '/pedidos-taller');
    res.json({ success: true, redirect: destino });
  } else {
    res.status(401).json({ success: false });
  }
});

// --- API USUARIOS ---
app.get('/api/usuarios', async (req, res) => {
  const result = await pool.query('SELECT id, email, rol, nombre_taller FROM usuarios ORDER BY id DESC');
  res.json(result.rows);
});

app.post('/api/usuarios/rol', async (req, res) => {
  await pool.query('UPDATE usuarios SET rol = $2 WHERE id = $1', [req.body.id, req.body.nuevoRol]);
  res.json({ success: true });
});

app.delete('/api/usuarios/delete/:id', async (req, res) => {
  await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// --- API PEDIDOS ---
app.get('/api/pedidos', async (req, res) => {
  const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
  res.json(result.rows);
});

app.listen(process.env.PORT || 3000);
