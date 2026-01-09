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
  const { taller_id } = req.query;
  
  // Usamos p.* para traer todas las columnas largas de tu tabla
  // Unimos con usuarios para sacar el nombre del taller/usuario asignado
  let sql = `
    SELECT p.*, 
           u.nombre as nombre_usuario,
           u.iniciales as taller_iniciales
    FROM pedidos p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (taller_id && taller_id !== 'todos') {
    sql += ` AND p.usuario_id = $1`;
    params.push(taller_id);
  }
  
  // Cambiamos created_at por fecha_creacion (que es el nombre en tu BBDD)
  sql += ' ORDER BY p.fecha_creacion DESC';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const p = req.body;
  try {
    const result = await query(`
      INSERT INTO pedidos (
        pieza, matricula, marca_coche, modelo_coche, estado, 
        precio, precio_coste, proveedor, bastidor, 
        sub_estado_incidencia, notas_tecnicas, usuario_id, fecha_creacion
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      p.pieza, p.matricula, p.marca_coche, p.modelo_coche, p.estado || 'solicitado',
      p.precio || 0, p.precio_coste || 0, p.proveedor, p.bastidor,
      p.sub_estado_incidencia, p.notas_tecnicas, p.usuario_id
    ]);
    
    res.json({ id: result.rows[0].id, message: 'Pedido creado con éxito' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pedidos/:id/estado', async (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;
  
  try {
    // Actualizamos el estado y la fecha de modificación
    const result = await query(
      'UPDATE pedidos SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  
  try {
    const result = await query(`
      UPDATE pedidos SET 
        pieza = $1, matricula = $2, marca_coche = $3, modelo_coche = $4, 
        estado = $5, precio = $6, precio_coste = $7, proveedor = $8, 
        bastidor = $9, sub_estado_incidencia = $10, notas_tecnicas = $11, 
        usuario_id = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      p.pieza, p.matricula, p.marca_coche, p.modelo_coche, 
      p.estado, p.precio, p.precio_coste, p.proveedor, 
      p.bastidor, p.sub_estado_incidencia, p.notas_tecnicas, 
      p.usuario_id, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json({ message: 'Pedido actualizado correctamente' });
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
