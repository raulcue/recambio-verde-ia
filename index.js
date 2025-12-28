const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- CONEXIÓN A BASE DE DATOS (POSTGRESQL) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTAS DE NAVEGACIÓN (VISTAS) ---

// Acceso público
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, 'public', 'registro.html')));

// Acceso Administrador (Ve todo)
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/configuracion', (req, res) => res.sendFile(path.join(__dirname, 'public', 'configuracion.html')));

// Acceso Gestor/Agente (No ve configuración de usuarios)
app.get('/landing-agente', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing-agente.html')));

// Acceso compartido (Kanban y Lista Excel)
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/pedidos-lista', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pedidos-lista.html')));

// Acceso Taller (Directo a Excel móvil)
app.get('/pedidos-taller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'pedidos-taller.html')));


// --- MOTOR DE AUTENTICACIÓN (LOGIN CON REDIRECCIÓN POR ROL) ---
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const query = 'SELECT * FROM usuarios WHERE email = $1 AND password = $2';
    const result = await pool.query(query, [email, password]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      let destino = '';

      // Lógica de redirección según el requerimiento
      if (user.rol === 'admin') {
        destino = '/landing'; // Centro de mando con 4 iconos
      } else if (user.rol === 'gestor') {
        destino = '/landing-agente'; // Centro de mando sin "Configuración"
      } else if (user.rol === 'taller') {
        destino = '/pedidos-taller'; // Directo a su lista optimizada para móvil
      }

      res.json({ 
        success: true, 
        rol: user.rol, 
        nombre: user.nombre_taller,
        redirect: destino 
      });
    } else {
      res.status(401).json({ success: false, message: 'Email o contraseña incorrectos.' });
    }
  } catch (err) {
    console.error('Error Login:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor.' });
  }
});

// --- API DE PEDIDOS (PARA KANBAN Y EXCEL) ---
app.get('/api/pedidos', async (req, res) => {
  try {
    // Ordenamos por los más recientes primero
    const result = await pool.query('SELECT * FROM pedidos ORDER BY fecha_creacion DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al cargar los datos' });
  }
});

// --- ACTUALIZAR ESTADO DE PEDIDO (PARA EL MODAL) ---
app.post('/api/pedidos/update', async (req, res) => {
  const { id, estado, pieza, matricula } = req.body;
  try {
    const query = 'UPDATE pedidos SET estado = $1, pieza = $2, matricula = $3 WHERE id = $4';
    await pool.query(query, [estado, pieza, matricula, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al actualizar pedido:', err);
    res.status(500).json({ success: false });
  }
});

// --- REGISTRO DE NUEVOS TALLERES ---
app.post('/auth/registro', async (req, res) => {
  const { nombre, telefono, email, password } = req.body;
  try {
    const query = 'INSERT INTO usuarios (nombre_taller, telefono, email, password, rol) VALUES ($1, $2, $3, $4, $5)';
    await pool.query(query, [nombre, telefono, email, password, 'taller']);
    res.json({ success: true });
  } catch (err) {
    console.error('Error Registro:', err);
    res.status(400).json({ success: false, message: 'El usuario ya existe o
