const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Sirve la carpeta public

// --- CONEXIÓN A BASE DE DATOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTAS DE NAVEGACIÓN (VISTAS HTML) ---

// Públicas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, 'public', 'registro.html')));

// Administrador (Landing con 4 iconos)
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));

// Gestor/Agente (Landing sin botón de Usuarios)
app.get('/landing-agente', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing-agente.html')));

// Comunes (Dashboard Kanban y Lista Excel)
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pedidos-lista', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pedidos-lista.html')));

// Configuración (Solo Admin)
app.get('/configuracion', (req, res) => res.sendFile(path.join(__dirname, 'public', 'configuracion.html')));

// Taller (Vista optimizada para móvil)
app.get('/pedidos-taller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pedidos-taller.html')));


// --- LÓGICA DE AUTENTICACIÓN ---
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = 'SELECT * FROM usuarios WHERE email = $1 AND password = $2';
    const result = await pool.query(query, [email, password]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      let destino = '';

      // Redirección por rol según requerimientos
      if (user.rol === 'admin') {
        destino = '/landing';
      } else if (user.rol === 'gestor') {
        destino = '/landing-agente';
      } else if (user.rol === 'taller') {
        destino = '/pedidos-taller';
      }

      res.json({ success: true, redirect: destino });
    } else {
      res.status(401).json({ success: false, message: 'Email o contraseña incorrectos.' });
    }
  } catch (err) {
    console.error('Error en Login:', err);
    res.status(500).json({ success: false });
  }
});


// --- API DE DATOS (PARA EL KANBAN Y LA LISTA) ---
app.get('/api/pedidos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedidos ORDER BY fecha_creacion DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar pedidos' });
  }
});

// API para actualizar pedidos desde el modal
app.post('/api/pedidos/update', async (req, res) => {
  const { id, estado, pieza, matricula } = req.body;
  try {
    await pool.query(
      'UPDATE pedidos SET estado = $1, pieza = $2, matricula = $3 WHERE id = $4',
      [estado, pieza, matricula, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// --- ARRANQUE ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Recambio Reciclado activo en puerto ${PORT}`);
});
