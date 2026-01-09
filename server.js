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
app.use(express.static(path.join(__dirname, 'public')));

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
    process.exit(1);
  }
}

// Verify on startup
// Verificar al arrancar
verificarBaseDeDatos();

// ==================== API ROUTES / RUTAS API ====================

// === USERS / USUARIOS - Adapted to your actual structure ===
// === USUARIOS - Adaptado a tu estructura real ===
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;  // CHANGE: email instead of username / CAMBIO: email en lugar de username
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required / Email y contraseña requeridos' });
  }
  
  try {
    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found / Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    
    // Verify password (could be plain text or hashed)
    // Verificar contraseña (puede estar en texto plano o hasheada)
    let match = false;
    if (user.password && user.password.startsWith('$2a$')) {
      // Hashed password / Contraseña hasheada
      match = bcrypt.compareSync(password, user.password);
    } else {
      // Plain text password (for compatibility) / Contraseña en texto plano (para compatibilidad)
      match = password === user.password;
    }
    
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password / Contraseña incorrecta' });
    }
    
    // Remove password from response / Eliminar password de la respuesta
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error / Error en login:', error);
    res.status(500).json({ error: 'Internal server error / Error interno del servidor' });
  }
});

// Get all users (workshops) / Obtener todos los usuarios (talleres)
app.get('/api/usuarios', async (req, res) => {
  const { rol } = req.query;
  let sql = `
    SELECT 
      id, email, rol, 
      nombre_taller as nombre,  -- CHANGE: nombre_taller instead of nombre / CAMBIO: nombre_taller en lugar de nombre
      telefono_whatsapp as telefono,  -- CHANGE: telefono_whatsapp / CAMBIO: telefono_whatsapp
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
    console.error('Error getting users / Error obteniendo usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID / Obtener usuario por ID
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
      return res.status(404).json({ error: 'User not found / Usuario no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting user / Error obteniendo usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

// === SCRAPYARDS / DESGUACES - Adapted to your actual structure ===
// === DESGUACES - Adaptado a tu estructura real ===
app.get('/api/desguaces', async (req, res) => {
  const { provincia } = req.query;
  let sql = `
    SELECT 
      id, nombre, provincia, direccion, cp,
      telefono_fijo, movil_1, movil_2,
      email, horario, es_workshop, 
      fuente_origen, web,  -- CHANGE: include web / CAMBIO: incluir web
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
    console.error('Error getting scrapyards / Error obteniendo desguaces:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/desguaces', async (req, res) => {
  const desguace = req.body;
  
  if (!desguace.nombre) {
    return res.status(400).json({ error: 'Name required / El nombre es requerido' });
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
    res.status(201).json({ id: result.rows[0].id, message: 'Scrapyard created / Desguace creado' });
  } catch (error) {
    console.error('Error creating scrapyard / Error creando desguace:', error);
    res.status(500).json({ error: error.message });
  }
});

// === ORDERS / PEDIDOS - Version for Drag & Drop ===
// === PEDIDOS - Versión para Drag & Drop ===
app.get('/api/pedidos', async (req, res) => {
  const { usuario_id, estado } = req.query;
  
  // Query for drag & drop - uses your actual field names
  // Consulta para drag & drop - usa tus nombres de campo reales
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
    console.error('Error getting orders / Error obteniendo pedidos:', error);
    res.status(500).json({ error: error.message });
  }
});

// CRITICAL endpoint for drag & drop / Endpoint CRÍTICO para drag & drop
app.put('/api/pedidos/:id/estado', async (req, res) => {
  const { estado, usuario_id } = req.body;
  const { id } = req.params;
  
  if (!estado) {
    return res.status(400).json({ error: 'State required / El estado es requerido' });
  }
  
  try {
    // If usuario_id comes, update both fields / Si viene usuario_id, actualizamos ambos campos
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
      return res.status(404).json({ error: 'Order not found / Pedido no encontrado' });
    }
    
    // Return updated order with user info / Devolver pedido actualizado con info del usuario
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
    console.error('Error updating state (drag & drop) / Error actualizando estado (drag & drop):', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new order / Crear nuevo pedido
app.post('/api/pedidos', async (req, res) => {
  const p = req.body;
  
  if (!p.pieza) {
    return res.status(400).json({ error: 'Part required / La pieza es requerida' });
  }
  
  try {
    // Generate unique order number / Generar número de pedido único
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
      p.estado || 'solicitado', p.precio || 0, p.precio_coste || 0, 
      p.proveedor, p.bastidor, p.sub_estado_incidencia, p.notas_tecnicas, 
      p.usuario_id, p.fecha_entrega_estimada, p.agente_id, p.detalles_extra,
      p.iva_porcentaje || 21, p.notas_incidencia, p.prioridad || 'media', 
      p.valoracion_nps
    ]);
    
    res.status(201).json({ 
      id: result.rows[0].id, 
      numero_pedido: result.rows[0].numero_pedido,
      message: 'Order created successfully / Pedido creado con éxito'
    });
  } catch (error) {
    console.error('Error creating order / Error creando pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update complete order / Actualizar pedido completo
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
      return res.status(404).json({ error: 'Order not found / Pedido no encontrado' });
    }
    res.json({ 
      message: 'Order updated successfully / Pedido actualizado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating order / Error actualizando pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete order / Eliminar pedido
app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM pedidos WHERE id = $1 RETURNING id, numero_pedido, pieza', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found / Pedido no encontrado' });
    }
    res.json({ 
      message: 'Order deleted / Pedido eliminado', 
      id: result.rows[0].id,
      numero_pedido: result.rows[0].numero_pedido
    });
  } catch (error) {
    console.error('Error deleting order / Error eliminando pedido:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health route / Ruta de salud
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

// Frontend route - must be at the end / Ruta para el frontend - debe ir al final
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling / Manejo de errores
app.use((err, req, res, next) => {
  console.error('Global error / Error global:', err);
  res.status(500).json({ error: 'Internal server error / Error interno del servidor' });
});

// Start server / Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Server started at / Servidor iniciado en http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
  console.log(`🔧 API: http://localhost:${PORT}/api/`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
