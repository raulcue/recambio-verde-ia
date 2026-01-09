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
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper para ejecutar queries con manejo de errores
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error('Error en query:', sql, params, error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Inicialización de tablas - ESTRUCTURA ACTUALIZADA
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

    // Tabla de pedidos - ESTRUCTURA ACTUALIZADA según tu imagen
    await query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id SERIAL PRIMARY KEY,
        pieza TEXT NOT NULL,
        matricula TEXT,
        marca_coche VARCHAR(100),
        modelo_coche TEXT,
        estado TEXT DEFAULT 'solicitado',
        precio NUMERIC DEFAULT 0,
        precio_coste NUMERIC DEFAULT 0,
        proveedor TEXT,
        bastidor TEXT,
        sub_estado_incidencia TEXT,
        notas_tecnicas TEXT,
        usuario_id INTEGER REFERENCES usuarios(id),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_entrega DATE,
        fecha_entrega_estimada DATE,
        agente_id INTEGER,
        detalles_extra TEXT,
        iva_porcentaje NUMERIC DEFAULT 21,
        notas_incidencia TEXT,
        numero_pedido TEXT,
        prioridad VARCHAR(10) DEFAULT 'media',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valoracion_nps INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Índices para mejorar rendimiento
    await query('CREATE INDEX IF NOT EXISTS idx_pedidos_usuario_id ON pedidos(usuario_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado)');
    await query('CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_creacion ON pedidos(fecha_creacion DESC)');

    // Insertar usuario admin si no existe
    const adminPassword = bcrypt.hashSync('admin123', 10);
    await query(`
      INSERT INTO usuarios (username, password, nombre, iniciales, rol)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, 'Administrador', 'AD', 'admin']);

    console.log('✅ Base de datos PostgreSQL inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    console.error('Detalle completo:', error);
  }
}

// Middleware de autenticación
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  // Aquí podrías implementar JWT en el futuro
  next();
};

// Inicializar al arrancar
inicializarBaseDeDatos();

// ==================== API RUTAS ====================

// === USUARIOS ===
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  
  try {
    const result = await query('SELECT * FROM usuarios WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    const match = bcrypt.compareSync(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    // Eliminar password del objeto de respuesta
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
  const { rol } = req.query;
  let sql = 'SELECT id, username, nombre, iniciales, rol, email, telefono, provincia, created_at FROM usuarios';
  const params = [];
  
  if (rol) {
    sql += ' WHERE rol = $1';
    params.push(rol);
  }
  
  sql += ' ORDER BY nombre';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
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
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo usuario
app.post('/api/usuarios', async (req, res) => {
  const { username, password, nombre, iniciales, rol = 'taller', email, telefono, provincia } = req.body;
  
  if (!username || !password || !nombre || !iniciales) {
    return res.status(400).json({ error: 'Campos requeridos: username, password, nombre, iniciales' });
  }
  
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = await query(`
      INSERT INTO usuarios (username, password, nombre, iniciales, rol, email, telefono, provincia)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, nombre, iniciales, rol, email, telefono, provincia
    `, [username, hashedPassword, nombre, iniciales, rol, email, telefono, provincia]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

// === DESGUACES ===
app.get('/api/desguaces', async (req, res) => {
  const { provincia } = req.query;
  let sql = 'SELECT * FROM desguaces';
  const params = [];
  
  if (provincia) {
    sql += ' WHERE provincia = $1';
    params.push(provincia);
  }
  
  sql += ' ORDER BY nombre';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo desguaces:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/desguaces/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM desguaces WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Desguace no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo desguace:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/desguaces', async (req, res) => {
  const desguace = req.body;
  
  if (!desguace.nombre) {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }
  
  try {
    const result = await query(`
      INSERT INTO desguaces (nombre, provincia, direccion, cp, telefono_fijo, movil_1, movil_2, 
        email, horario, es_workshop, fuente_origen, admin_user) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, nombre, provincia, direccion, cp, telefono_fijo, movil_1, movil_2, 
               email, horario, es_workshop, fuente_origen, admin_user, created_at
    `, [
      desguace.nombre, desguace.provincia, desguace.direccion, desguace.cp,
      desguace.telefono_fijo, desguace.movil_1, desguace.movil_2,
      desguace.email, desguace.horario, desguace.es_workshop || false,
      desguace.fuente_origen || 'WEB', desguace.admin_user
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creando desguace:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/desguaces/:id', async (req, res) => {
  const { id } = req.params;
  const desguace = req.body;
  
  try {
    const result = await query(`
      UPDATE desguaces SET 
        nombre = $1, provincia = $2, direccion = $3, cp = $4,
        telefono_fijo = $5, movil_1 = $6, movil_2 = $7,
        email = $8, horario = $9, es_workshop = $10,
        fuente_origen = $11, admin_user = $12
      WHERE id = $13
      RETURNING *
    `, [
      desguace.nombre, desguace.provincia, desguace.direccion, desguace.cp,
      desguace.telefono_fijo, desguace.movil_1, desguace.movil_2,
      desguace.email, desguace.horario, desguace.es_workshop || false,
      desguace.fuente_origen || 'WEB', desguace.admin_user, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Desguace no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando desguace:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/desguaces/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM desguaces WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Desguace no encontrado' });
    }
    res.json({ message: 'Desguace eliminado', id: result.rows[0].id });
  } catch (error) {
    console.error('Error eliminando desguace:', error);
    res.status(500).json({ error: error.message });
  }
});

// === PEDIDOS/PIEZAS ===
app.get('/api/pedidos', async (req, res) => {
  const { usuario_id, estado, fecha_desde, fecha_hasta, proveedor } = req.query;
  
  let sql = `
    SELECT p.*, 
           u.nombre as nombre_usuario,
           u.iniciales as iniciales_usuario,
           u.rol as rol_usuario
    FROM pedidos p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;
  
  if (usuario_id && usuario_id !== 'todos') {
    paramCount++;
    sql += ` AND p.usuario_id = $${paramCount}`;
    params.push(usuario_id);
  }
  
  if (estado && estado !== 'todos') {
    paramCount++;
    sql += ` AND p.estado = $${paramCount}`;
    params.push(estado);
  }
  
  if (proveedor) {
    paramCount++;
    sql += ` AND p.proveedor ILIKE $${paramCount}`;
    params.push(`%${proveedor}%`);
  }
  
  if (fecha_desde) {
    paramCount++;
    sql += ` AND p.fecha_creacion >= $${paramCount}`;
    params.push(fecha_desde);
  }
  
  if (fecha_hasta) {
    paramCount++;
    sql += ` AND p.fecha_creacion <= $${paramCount}`;
    params.push(fecha_hasta);
  }
  
  sql += ' ORDER BY p.fecha_creacion DESC';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pedidos/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, 
             u.nombre as nombre_usuario,
             u.iniciales as iniciales_usuario,
             u.rol as rol_usuario
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pedidos', async (req, res) => {
  const p = req.body;
  
  if (!p.pieza) {
    return res.status(400).json({ error: 'La pieza es requerida' });
  }
  
  try {
    const result = await query(`
      INSERT INTO pedidos (
        pieza, matricula, marca_coche, modelo_coche, estado, 
        precio, precio_coste, proveedor, bastidor, 
        sub_estado_incidencia, notas_tecnicas, usuario_id,
        fecha_entrega, fecha_entrega_estimada, agente_id,
        detalles_extra, iva_porcentaje, notas_incidencia,
        numero_pedido, prioridad, valoracion_nps
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id, pieza, estado, fecha_creacion
    `, [
      p.pieza, p.matricula, p.marca_coche, p.modelo_coche, p.estado || 'solicitado',
      p.precio || 0, p.precio_coste || 0, p.proveedor, p.bastidor,
      p.sub_estado_incidencia, p.notas_tecnicas, p.usuario_id,
      p.fecha_entrega, p.fecha_entrega_estimada, p.agente_id,
      p.detalles_extra, p.iva_porcentaje || 21, p.notas_incidencia,
      p.numero_pedido, p.prioridad || 'media', p.valoracion_nps
    ]);
    
    res.status(201).json({ 
      id: result.rows[0].id, 
      message: 'Pedido creado con éxito',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pedidos/:id/estado', async (req, res) => {
  const { estado } = req.body;
  const { id } = req.params;
  
  if (!estado) {
    return res.status(400).json({ error: 'El estado es requerido' });
  }
  
  try {
    const result = await query(
      'UPDATE pedidos SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error actualizando estado:', error);
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
        usuario_id = $12, fecha_entrega = $13, fecha_entrega_estimada = $14,
        agente_id = $15, detalles_extra = $16, iva_porcentaje = $17,
        notas_incidencia = $18, numero_pedido = $19, prioridad = $20,
        valoracion_nps = $21, updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *
    `, [
      p.pieza, p.matricula, p.marca_coche, p.modelo_coche, 
      p.estado, p.precio, p.precio_coste, p.proveedor, 
      p.bastidor, p.sub_estado_incidencia, p.notas_tecnicas, 
      p.usuario_id, p.fecha_entrega, p.fecha_entrega_estimada,
      p.agente_id, p.detalles_extra, p.iva_porcentaje,
      p.notas_incidencia, p.numero_pedido, p.prioridad,
      p.valoracion_nps, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json({ 
      message: 'Pedido actualizado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM pedidos WHERE id = $1 RETURNING id, pieza', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    res.json({ 
      message: 'Pedido eliminado', 
      id: result.rows[0].id,
      pieza: result.rows[0].pieza
    });
  } catch (error) {
    console.error('Error eliminando pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ESTADÍSTICAS ===
app.get('/api/estadisticas/pedidos', async (req, res) => {
  try {
    const estadisticas = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'solicitado' THEN 1 END) as solicitados,
        COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END) as en_proceso,
        COUNT(CASE WHEN estado = 'finalizado' THEN 1 END) as finalizados,
        COUNT(CASE WHEN estado = 'cancelado' THEN 1 END) as cancelados,
        AVG(precio) as precio_promedio,
        SUM(precio) as total_ventas,
        SUM(precio_coste) as total_coste
      FROM pedidos
    `);
    
    const porUsuario = await query(`
      SELECT 
        u.id,
        u.nombre,
        u.iniciales,
        COUNT(p.id) as total_pedidos,
        COUNT(CASE WHEN p.estado = 'finalizado' THEN 1 END) as pedidos_finalizados
      FROM usuarios u
      LEFT JOIN pedidos p ON u.id = p.usuario_id
      WHERE u.rol = 'taller'
      GROUP BY u.id, u.nombre, u.iniciales
      ORDER BY total_pedidos DESC
    `);
    
    res.json({
      generales: estadisticas.rows[0],
      por_usuario: porUsuario.rows
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta de salud
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: error.message 
    });
  }
});

// Ruta para el frontend - debe ir al final
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api/`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
