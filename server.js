// ============================================================================
// AUTO-CREATE package.json if it doesn't exist (for Render.com)
// AUTO-CREAR package.json si no existe (para Render.com)
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
  console.log("✅ package.json creado para Render / created for Render");
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
app.use(express.static('.')); // Cambiado para servir archivos desde la raíz

// PostgreSQL Database - Connect to existing database (tables already created)
// Base de datos PostgreSQL - Conectar a base de datos existente (tablas ya creadas)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper to execute queries with error handling
// Ayudante para ejecutar queries con manejo de errores
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error('Query error / Error en query:', sql, params, error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Verify database connection (tables already exist)
// Verificar conexión a base de datos (las tablas ya existen)
async function verificarBaseDeDatos() {
  try {
    // Verify tables exist
    // Verificar que las tablas existen
    await query('SELECT 1 FROM usuarios LIMIT 1');
    await query('SELECT 1 FROM pedidos LIMIT 1');
    await query('SELECT 1 FROM desguaces LIMIT 1');
    
    console.log('✅ Connected to existing database / Conectado a base de datos existente');
    
    // Check if admin user exists
    // Verificar si existe el usuario admin
    const result = await query("SELECT id FROM usuarios WHERE email = 'admin@admin.com'");
    if (result.rows.length === 0) {
      const adminPassword = bcrypt.hashSync('admin123', 10);
      await query(`
        INSERT INTO usuarios (email, password, nombre_taller, rol, telefono)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@admin.com', adminPassword, 'Administrador', 'admin', '000000000']);
      console.log('✅ Admin user created / Usuario admin creado');
    }
  } catch (error) {
    console.error('❌ Database connection error / Error de conexión a BD:', error.message);
    // No salir del proceso en producción
    console.log('⚠️ Continuando sin verificación completa de BD');
  }
}

// ==================== API ROUTES / RUTAS API ====================

// Health check route
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      message: 'Server is running'
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'warning', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
      message: 'Server running but database issue'
    });
  }
});

// === MARCAS API ===
app.get('/api/marcas', async (req, res) => {
  try {
    const result = await query('SELECT * FROM marcas_maestras ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo marcas:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Error cargando marcas'
    });
  }
});

// === USERS / USUARIOS ===
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Verify password (could be plain text or hashed)
    let match = false;
    if (user.password && user.password.startsWith('$2a$')) {
      // Hashed password
      match = bcrypt.compareSync(password, user.password);
    } else {
      // Plain text password (for compatibility)
      match = password === user.password;
    }
    
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (workshops)
app.get('/api/usuarios', async (req, res) => {
  const { rol } = req.query;
  let sql = `
    SELECT 
      id, email, rol, 
      nombre_taller as nombre,
      telefono_whatsapp as telefono,
      provincia, direccion, created_at
    FROM usuarios 
    WHERE 1=1
  `;
  const params = [];
  
  if (rol) {
    sql += ' AND rol = $1';
    params.push(rol);
  }
  
  sql += ' ORDER BY nombre_taller';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id, email, rol, nombre_taller as nombre, 
        telefono_whatsapp as telefono, provincia, direccion
      FROM usuarios 
      WHERE id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// === SCRAPYARDS / DESGUACES ===
app.get('/api/desguaces', async (req, res) => {
  const { provincia } = req.query;
  let sql = `
    SELECT 
      id, nombre, provincia, direccion, cp,
      telefono_fijo, movil_1, movil_2,
      email, horario, es_workshop, 
      fuente_origen, web,
      fecha_registro as created_at
    FROM desguaces
    WHERE 1=1
  `;
  const params = [];
  
  if (provincia) {
    sql += ' AND provincia = $1';
    params.push(provincia);
  }
  
  sql += ' ORDER BY nombre';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting scrapyards:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/desguaces', async (req, res) => {
  const desguace = req.body;
  
  if (!desguace.nombre) {
    return res.status(400).json({ error: 'Name required' });
  }
  
  try {
    const result = await query(`
      INSERT INTO desguaces (
        nombre, provincia, direccion, cp, telefono_fijo, 
        movil_1, movil_2, email, horario, es_workshop, 
        fuente_origen, web, fecha_registro
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      desguace.nombre, desguace.provincia, desguace.direccion, desguace.cp,
      desguace.telefono_fijo, desguace.movil_1, desguace.movil_2,
      desguace.email, desguace.horario, desguace.es_workshop || false,
      desguace.fuente_origen || 'WEB', desguace.web
    ]);
    res.status(201).json({ id: result.rows[0].id, message: 'Scrapyard created' });
  } catch (error) {
    console.error('Error creating scrapyard:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ORDERS / PEDIDOS ===
app.get('/api/pedidos', async (req, res) => {
  const { usuario_id, estado } = req.query;
  
  let sql = `
    SELECT 
      p.id,
      p.numero_pedido,
      p.pieza,
      p.matricula,
      p.marca_coche,
      p.modelo_coche,
      p.estado,
      p.precio,
      p.precio_coste,
      p.proveedor,
      p.bastidor,
      p.sub_estado_incidencia,
      p.notas_tecnicas,
      p.usuario_id,
      p.fecha_creacion,
      p.prioridad,
      p.fecha_entrega_estimada,
      p.detalles_extra,
      u.nombre_taller as nombre_usuario,
      u.email as email_usuario
    FROM pedidos p
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (usuario_id && usuario_id !== 'todos' && usuario_id !== '0') {
    sql += ` AND p.usuario_id = $1`;
    params.push(usuario_id);
  }
  
  if (estado && estado !== 'todos') {
    if (params.length > 0) {
      sql += ` AND p.estado = $${params.length + 1}`;
    } else {
      sql += ` AND p.estado = $1`;
    }
    params.push(estado);
  }
  
  sql += ' ORDER BY p.fecha_creacion DESC';
  
  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// CRITICAL endpoint for drag & drop
app.put('/api/pedidos/:id/estado', async (req, res) => {
  const { estado, usuario_id } = req.body;
  const { id } = req.params;
  
  if (!estado) {
    return res.status(400).json({ error: 'State required' });
  }
  
  try {
    // If usuario_id comes, update both fields
    let sql, params;
    if (usuario_id) {
      sql = 'UPDATE pedidos SET estado = $1, usuario_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *';
      params = [estado, usuario_id, id];
    } else {
      sql = 'UPDATE pedidos SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
      params = [estado, id];
    }
    
    const result = await query(sql, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Return updated order with user info
    const pedidoActualizado = await query(`
      SELECT 
        p.*,
        u.nombre_taller as nombre_usuario,
        u.email as email_usuario
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1
    `, [id]);
    
    res.json({
      success: true,
      pedido: pedidoActualizado.rows[0]
    });
  } catch (error) {
    console.error('Error updating state (drag & drop):', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new order
app.post('/api/pedidos', async (req, res) => {
  const p = req.body;
  
  if (!p.pieza) {
    return res.status(400).json({ error: 'Part required' });
  }
  
  try {
    // Generate unique order number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const numero_pedido = `PED-${timestamp}-${random}`;
    
    const result = await query(`
      INSERT INTO pedidos (
        numero_pedido, pieza, matricula, marca_coche, modelo_coche, estado, 
        precio, precio_coste, proveedor, bastidor, 
        sub_estado_incidencia, notas_tecnicas, usuario_id,
        fecha_entrega_estimada, agente_id, detalles_extra, 
        iva_porcentaje, notas_incidencia, prioridad, valoracion_nps
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id, numero_pedido, pieza, estado, fecha_creacion
    `, [
      numero_pedido, p.pieza, p.matricula, p.marca_coche, p.modelo_coche, 
      p.estado || 'solicitud', p.precio || 0, p.precio_coste || 0, 
      p.proveedor, p.bastidor, p.sub_estado_incidencia, p.notas_tecnicas, 
      p.usuario_id, p.fecha_entrega_estimada, p.agente_id, p.detalles_extra,
      p.iva_porcentaje || 21, p.notas_incidencia, p.prioridad || 'normal', 
      p.valoracion_nps
    ]);
    
    res.status(201).json({ 
      id: result.rows[0].id, 
      numero_pedido: result.rows[0].numero_pedido,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update complete order
app.put('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  
  try {
    const result = await query(`
      UPDATE pedidos SET 
        pieza = $1, matricula = $2, marca_coche = $3, modelo_coche = $4, 
        estado = $5, precio = $6, precio_coste = $7, proveedor = $8, 
        bastidor = $9, sub_estado_incidencia = $10, notas_tecnicas = $11, 
        usuario_id = $12, fecha_entrega_estimada = $13,
        agente_id = $14, detalles_extra = $15, iva_porcentaje = $16,
        notas_incidencia = $17, prioridad = $18,
        valoracion_nps = $19, updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *
    `, [
      p.pieza, p.matricula, p.marca_coche, p.modelo_coche, 
      p.estado, p.precio, p.precio_coste, p.proveedor, 
      p.bastidor, p.sub_estado_incidencia, p.notas_tecnicas, 
      p.usuario_id, p.fecha_entrega_estimada, p.agente_id, 
      p.detalles_extra, p.iva_porcentaje, p.notas_incidencia, 
      p.prioridad, p.valoracion_nps, id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ 
      message: 'Order updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete order
app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM pedidos WHERE id = $1 RETURNING id, numero_pedido, pieza', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ 
      message: 'Order deleted', 
      id: result.rows[0].id,
      numero_pedido: result.rows[0].numero_pedido
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Servir archivos HTML desde la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/stats.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'stats.html'));
});

// Servir otros archivos estáticos
app.get('/:file', (req, res) => {
  const filePath = path.join(__dirname, req.params.file);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Iniciar servidor DESPUÉS de configurar todas las rutas
async function startServer() {
  try {
    // Verificar base de datos (pero no bloquear el inicio)
    verificarBaseDeDatos().catch(err => {
      console.log('⚠️ Database verification failed, but server will start:', err.message);
    });
    
    app.listen(PORT, () => {
      console.log(`🚀 Server started at http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
      console.log(`🔧 API Health: http://localhost:${PORT}/api/health`);
      console.log(`📋 Marcas API: http://localhost:${PORT}/api/marcas`);
      console.log(`👤 Login API: http://localhost:${PORT}/api/login`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();
