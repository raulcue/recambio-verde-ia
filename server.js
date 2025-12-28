const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path'); // FALTA ESTO PARA LAS RUTAS
require('dotenv').config(); // RECOMENDADO PARA LOCAL

const app = express();
app.use(cors());
app.use(express.json());

// USAR VARIABLE DE ENTORNO
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

// --- CLAVE PARA EL ERROR CANNOT GET / ---
// 1. Indica que los archivos están en la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 2. Ruta raíz: envía el index.html (Login)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Ruta para el Dashboard (asegura que cargue el HTML)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// --- TUS RUTAS DE API ---
app.get('/api/pedidos', async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.nombre_taller 
      FROM pedidos p 
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor');
  }
});

// --- RUTA DE LOGIN (La necesitas para entrar) ---
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
