const express = require('express');
const { Pool } = require('pg');
const path = require('path'); 
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- NAVEGACIÓN (GET) ---

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

app.get('/privacidad', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacidad.html'));
});

// Nueva ruta para el Dashboard (Kanban)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// --- MOTOR DE REGISTRO ---

app.post('/auth/registro', async (req, res) => {
  const { nombre, telefono, email, password } = req.body;
  try {
    const query = 'INSERT INTO usuarios (nombre_taller, telefono, email, password) VALUES ($1, $2, $3, $4) RETURNING id';
    await pool.query(query, [nombre, telefono, email, password]);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: 'El email o teléfono ya existen.' });
  }
});

// --- MOTOR DE LOGIN (NUEVO) ---

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = 'SELECT * FROM usuarios WHERE email = $1 AND password = $2';
    const result = await pool.query(query, [email, password]);

    if (result.rows.length > 0) {
      // Usuario encontrado
      res.json({ success: true, message: 'Bienvenido', taller: result.rows[0].nombre_taller });
    } else {
      // Usuario no encontrado o clave mal
      res.status(401).json({ success: false, message: 'Email o contraseña incorrectos.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error en el servidor.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Recambio Verde IA funcionando en puerto ${PORT}`);
});
