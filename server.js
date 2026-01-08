// ============================================================================
// AUTO-CREATE package.json si no existe (para Render.com)
// ============================================================================
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  const packageJson = {
    name: "gestor-desguaces",
    version: "1.0.0",
    main: "server.js",
    scripts: { "start": "node server.js" },
    dependencies: {
      "express": "^4.18.2",
      "pg": "^8.11.3",
      "cors": "^2.8.5",
      "bcryptjs": "^2.4.3"
    }
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log("✅ package.json creado para Render");
}
// ============================================================================

const express = require('express');
const { Pool } = require('pg');  // CAMBIO: pg en lugar de sqlite3
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;  // CAMBIO: Usar variable de entorno

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos PostgreSQL para Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper para ejecutar queries
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// Inicialización de tablas
async function inicializarBaseDeDatos() {
  try {
    // Tabla de usuarios
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        iniciales VARCHAR(10) NOT NULL,
        rol VARCHAR(20) CHECK(rol IN ('admin', 'taller')) DEFAULT 'taller',
        email VARCHAR(100),
        telefono VARCHAR(20),
        provincia VARCHAR(50),
        direccion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de desguaces
    await query(`
      CREATE TABLE IF NOT EXISTS desguaces (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        provincia VARCHAR(50),
        direccion TEXT,
        cp VARCHAR(10),
        telefono_fijo VARCHAR(20),
        movil_1 VARCHAR(20),
        movil_2 VARCHAR(20),
        email VARCHAR(100),
        horario TEXT,
        es_workshop BOOLEAN DEFAULT false,
        fuente_origen VARCHAR(50) DEFAULT 'WEB',
        admin_user VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de pedidos
    await query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        descripcion TEXT,
        cliente_id INTEGER NOT NULL REFERENCES usuarios(id),
        taller_id INTEGER NOT NULL REFERENCES usuarios(id),
        estado VARCHAR(20) CHECK(estado IN ('solicitud', 'proceso', 'finalizado', 'cancelado')) DEFAULT 'solicitud',
        prioridad VARCHAR(20) CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')) DEFAULT 'media',
        marca VARCHAR(50),
        modelo VARCHAR(50),
        matricula VARCHAR(20),
        año INTEGER,
        fecha_limite DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insertar usuario admin
    const adminPassword = bcrypt.hashSync('admin123', 10);
    await query(`
      INSERT INTO usuarios (username, password, nombre, iniciales, rol)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, 'Administrador', 'AD', 'admin']);

    console.log('✅ Base de datos PostgreSQL inicializada');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// Inicializar al arrancar
inicializarBaseDeDatos();

// API RUTAS - MANTENIENDO TU LÓGICA ORIGINAL

// === USUARIOS ===
// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
    
    const user = result.rows[0];
    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });
    
    delete user.password;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
  const { rol } = req.query;
  let sql = 'SELECT id, username, nombre, iniciales, rol, email, telefono, provincia FROM usuarios';
  const params = [];
  
  if (rol) {
    sql += ' WHERE rol = $1';
    params.push(rol);
  }
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, nombre, iniciales, rol, email, telefono, provincia FROM usuarios WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === DESGUACES ===
app.get('/api/desguaces', async (req, res) => {
  try {
    const result = await query('SELECT * FROM desguaces ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/desguaces', async (req, res) => {
  const desguace = req.body;
  try {
    const result = await query(`
      INSERT INTO desguaces (nombre, provincia, direccion, cp, telefono_fijo, movil_1, movil_2, 
        email, horario, es_workshop, fuente_origen, admin_user) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      desguace.nombre, desguace.provincia, desguace.direccion, desguace.cp,
      desguace.telefono_fijo, desguace.movil_1, desguace.movil_2,
      desguace.email, desguace.horario, desguace.es_workshop || false,
      desguace.fuente_origen || 'WEB', desguace.admin_user
    ]);
    res.json({ id: result.rows[0].id, message: 'Desguace creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === PEDIDOS/PIEZAS ===
app.get('/api/pedidos', async (req, res) => {
  const { estado, taller_id, cliente_id } = req.query;
  
  let sql = `
    SELECT p.*, 
           c.nombre as cliente_nombre,
           c.iniciales as cliente_iniciales,
           t.nombre as taller_nombre,
           t.iniciales as taller_iniciales
    FROM pedidos p
    LEFT JOIN usuarios c ON p.cliente_id = c.id
    LEFT JOIN usuarios t ON p.taller_id = t.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;
  
  if (estado) {
    paramCount++;
    sql += ` AND p.estado = $${paramCount}`;
    params.push(estado);
  }
  
  if (taller_id) {
    paramCount++;
    sql += ` AND p.taller_id = $${paramCount}`;
    params.push(taller_id);
  }
  
  if (cliente_id) {
    paramCount++;
    sql += ` AND p.cliente_id = $${paramCount}`;
    params.push(cliente_id);
  }
  
  sql += ' ORDER BY p.created_at DESC';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const pedido = req.body;
  try {
    const result = await query(`
      INSERT INTO pedidos (titulo, descripcion, cliente_id, taller_id, estado, prioridad, 
        marca, modelo, matricula, año, fecha_limite) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      pedido.titulo, pedido.descripcion, pedido.cliente_id, pedido.taller_id,
      pedido.estado || 'solicitud', pedido.prioridad || 'media',
      pedido.marca, pedido.modelo, pedido.matricula, pedido.año, pedido.fecha_limite
    ]);
    
    const newId = result.rows[0].id;
    const pedidoCompleto = await query(`
      SELECT p.*, 
             c.nombre as cliente_nombre,
             c.iniciales as cliente_iniciales,
             t.nombre as taller_nombre,
             t.iniciales as taller_iniciales
      FROM pedidos p
      LEFT JOIN usuarios c ON p.cliente_id = c.id
      LEFT JOIN usuarios t ON p.taller_id = t.id
      WHERE p.id = $1
    `, [newId]);
    
    res.json(pedidoCompleto.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pedidos/:id/estado', async (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;
  
  if (!estado || !['solicitud', 'proceso', 'finalizado', 'cancelado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  
  try {
    const result = await query(
      'UPDATE pedidos SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    const pedidoActualizado = await query(`
      SELECT p.*, 
             c.nombre as cliente_nombre,
             c.iniciales as cliente_iniciales,
             t.nombre as taller_nombre,
             t.iniciales as taller_iniciales
      FROM pedidos p
      LEFT JOIN usuarios c ON p.cliente_id = c.id
      LEFT JOIN usuarios t ON p.taller_id = t.id
      WHERE p.id = $1
    `, [id]);
    
    res.json(pedidoActualizado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const pedido = req.body;
  
  try {
    const result = await query(`
      UPDATE pedidos SET 
        titulo = $1, descripcion = $2, cliente_id = $3, taller_id = $4, 
        estado = $5, prioridad = $6, marca = $7, modelo = $8, 
        matricula = $9, año = $10, fecha_limite = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      pedido.titulo, pedido.descripcion, pedido.cliente_id, pedido.taller_id,
      pedido.estado, pedido.prioridad, pedido.marca, pedido.modelo,
      pedido.matricula, pedido.año, pedido.fecha_limite, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    
    res.json({ message: 'Pedido actualizado', changes: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM pedidos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Pedido eliminado', changes: result.rowCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
