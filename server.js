// ============================================================================
// CONFIGURACIÓN BÁSICA
// ============================================================================
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// =======================
// INYECCIÓN QUIRÚRGICA #1
// =======================
console.log('🟢 Booting server.js...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT ENV:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// INYECCIÓN QUIRÚRGICA #2
// =======================
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', error);
});

// ============================================================================
// MIDDLEWARE Y CONFIGURACIÓN
// ============================================================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ============================================================================
// DIAGNÓSTICO DE ESTRUCTURA
// ============================================================================
console.log('=== DIAGNÓSTICO DE ESTRUCTURA ===');
console.log(`Directorio actual: ${__dirname}`);
console.log(`Directorio de trabajo: ${process.cwd()}`);

// Listar archivos y directorios
console.log('\n📁 Contenido del directorio:');
const items = fs.readdirSync(__dirname);
items.forEach(item => {
  const itemPath = path.join(__dirname, item);
  const isDir = fs.statSync(itemPath).isDirectory();
  console.log(`  ${isDir ? '📂' : '📄'} ${item} ${isDir ? '(directorio)' : ''}`);
});

// Verificar archivos clave
console.log('\n🔍 Verificación de archivos HTML:');
['landing.html', 'index.html', 'dashboard.html', 'stats.html'].forEach(file => {
  const filePaths = [
    path.join(__dirname, file),
    path.join(__dirname, 'public', file),
    path.join(__dirname, 'src', file)
  ];
  
  let encontrado = false;
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file} encontrado en: ${filePath}`);
      encontrado = true;
    }
  });
  
  if (!encontrado) {
    console.log(`  ❌ ${file} NO encontrado`);
  }
});

// Configurar middleware static en orden de prioridad
const staticPaths = [
  { path: path.join(__dirname, 'public'), label: 'public' },
  { path: __dirname, label: 'raíz' },
  { path: path.join(__dirname, 'src'), label: 'src' }
];

staticPaths.forEach(({ path: staticPath, label }) => {
  if (fs.existsSync(staticPath)) {
    console.log(`📂 Configurando express.static para: ${label}`);
    app.use(express.static(staticPath));
  }
});

// ============================================================================
// CONEXIÓN A BASE DE DATOS
// ============================================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // =======================
  // INYECCIÓN QUIRÚRGICA #5
  // =======================
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

// =======================
// INYECCIÓN QUIRÚRGICA #5 (continuación)
// =======================
pool.on('error', (err) => {
  console.error('🔥 PG Pool error:', err);
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

async function verificarBaseDeDatos() {
  try {
    await query('SELECT 1 FROM usuarios LIMIT 1');
    console.log('✅ Conectado a base de datos existente');
    
    // Crear usuario admin si no existe
    const adminCheck = await query("SELECT id FROM usuarios WHERE email = 'admin@admin.com'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await query(`
        INSERT INTO usuarios (email, password, nombre_taller, rol, telefono)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@admin.com', hashedPassword, 'Administrador', 'admin', '000000000']);
      console.log('✅ Usuario admin creado');
    }
  } catch (error) {
    console.error('❌ Error de conexión a BD:', error.message);
  }
}

// ============================================================================
// FUNCIONES HELPER
// ============================================================================
function servirArchivo(res, filename) {
  console.log(`\n🔎 Buscando: ${filename}`);
  
  // Orden de búsqueda
  const ubicaciones = [
    path.join(__dirname, 'public', filename),
    path.join(__dirname, filename),
    path.join(__dirname, 'src', filename),
    path.join(process.cwd(), filename),
    filename
  ];
  
  for (const ubicacion of ubicaciones) {
    try {
      if (fs.existsSync(ubicacion)) {
        console.log(`✅ Encontrado en: ${ubicacion}`);
        return res.sendFile(ubicacion);
      }
    } catch (error) {
      // Continuar con siguiente ubicación
    }
  }
  
  console.error(`❌ Archivo NO encontrado: ${filename}`);
  return res.status(404).send(`
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>Error: Archivo ${filename} no encontrado</h1>
        <p>Verifica que el archivo esté en tu repositorio.</p>
      </body>
    </html>
  `);
}

// ============================================================================
// RUTAS DE ARCHIVOS HTML
// ============================================================================
const rutasHTML = {
  '/': 'landing.html',
  '/index.html': 'index.html',
  '/dashboard.html': 'dashboard.html',
  '/stats.html': 'stats.html',
  '/landing.html': 'landing.html',
  '/talleres.html': 'talleres.html',
  '/pedidos-taller.html': 'pedidos-taller.html',
  '/admin-logs.html': 'admin-logs.html',
  '/desguaces.html': 'desguaces.html',
  '/profitpulse.html': 'profitpulse.html',
  '/stackcost.html': 'stackcost.html',
};

Object.entries(rutasHTML).forEach(([ruta, archivo]) => {
  app.get(ruta, (req, res) => {
    console.log(`📭 GET ${ruta}`);
    servirArchivo(res, archivo);
  });
});

// ============================================================================
// RUTAS API
// ============================================================================
// =======================
// 🔔 INYECCIÓN QUIRÚRGICA #3
// WHATSAPP AUTOMATION CORE
// =======================

// Memoria de notificaciones WhatsApp (simple en RAM)
let whatsappNotifications = [];
let whatsappCounter = 0;

// Teléfono receptor oficial (sandbox / pruebas)
const WHATSAPP_RECEIVER_NUMBER = '+971523241001';

// Normalizar teléfonos para comparar
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/^\+/, '');
}

// Extraer información básica desde texto libre
function parseWhatsappMessage(text = '') {
  const data = {
    pieza: null,
    marca: null,
    modelo: null,
    matricula: null
  };

  const t = text.toLowerCase();

  // Intentos simples de inferencia
  if (t.includes('motor')) data.pieza = 'Motor';
  if (t.includes('embrague')) data.pieza = 'Embrague';
  if (t.includes('turbo')) data.pieza = 'Turbo';
  if (t.includes('faro')) data.pieza = 'Faro';
  if (t.includes('retrovisor')) data.pieza = 'Retrovisor';

  const marcas = ['audi', 'bmw', 'vw', 'volkswagen', 'seat', 'renault', 'peugeot', 'citroen', 'toyota', 'nissan'];
  marcas.forEach(m => {
    if (t.includes(m)) data.marca = m.toUpperCase();
  });

  // Matrícula simple (heurística)
  const matriculaMatch = text.match(/\b[0-9]{3,4}[A-Z]{3}\b/i);
  if (matriculaMatch) data.matricula = matriculaMatch[0].toUpperCase();

  return data;
}

// ============================================================================
// 📩 WEBHOOK SIMULADO PARA RECIBIR WHATSAPP
// ============================================================================
app.post('/api/whatsapp/inbound', async (req, res) => {
  try {
    const {
      from,       // número que envía (taller)
      to,         // número receptor
      message     // texto del mensaje
    } = req.body;

    console.log('📩 WhatsApp inbound:', req.body);

    if (!from || !to || !message) {
      return res.status(400).json({ error: 'Payload incompleto' });
    }

    // Verificar que llega al número correcto
    if (normalizePhone(to) !== normalizePhone(WHATSAPP_RECEIVER_NUMBER)) {
      console.log('⚠️ WhatsApp ignorado: número receptor incorrecto');
      return res.json({ ignored: true });
    }

    // Buscar taller por teléfono
    const phoneNormalized = normalizePhone(from);

    const tallerResult = await query(`
      SELECT id, nombre_taller, telefono_whatsapp
      FROM usuarios
      WHERE telefono_whatsapp IS NOT NULL
    `);

    const taller = tallerResult.rows.find(u =>
      normalizePhone(u.telefono_whatsapp) === phoneNormalized
    );

    if (!taller) {
      console.log('❌ Taller no encontrado para teléfono:', from);
      return res.status(404).json({ error: 'Taller no reconocido' });
    }

    console.log('✅ Taller detectado:', taller.nombre_taller);

    // Inferir datos desde el mensaje
    const parsed = parseWhatsappMessage(message);

    const numero_pedido = `WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Crear pedido mínimo
    const insertResult = await query(`
      INSERT INTO pedidos (
        numero_pedido,
        pieza,
        marca_coche,
        modelo_coche,
        matricula,
        estado,
        usuario_id,
        precio,
        canal,
        fecha_creacion
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CURRENT_TIMESTAMP)
      RETURNING id, numero_pedido
    `, [
      numero_pedido,
      parsed.pieza || message.substring(0, 80),
      parsed.marca || '',
      parsed.modelo || '',
      parsed.matricula || null,
      'solicitud',
      taller.id,
      0,
      'whatsapp'
    ]);

    const pedidoCreado = insertResult.rows[0];

    // Registrar notificación en memoria
    whatsappCounter++;
    whatsappNotifications.push({
      id: pedidoCreado.id,
      numero_pedido: pedidoCreado.numero_pedido,
      taller: taller.nombre_taller,
      mensaje: message,
      timestamp: Date.now()
    });

    console.log('🟢 Pedido creado vía WhatsApp:', pedidoCreado);

    res.json({
      success: true,
      pedido: pedidoCreado
    });

  } catch (error) {
    console.error('🔥 Error WhatsApp inbound:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🔔 ENDPOINT PARA DASHBOARD - CONSULTAR NOTIFICACIONES
// ============================================================================
app.get('/api/whatsapp/notifications', (req, res) => {
  res.json({
    counter: whatsappCounter,
    notifications: whatsappNotifications
  });
});

// ============================================================================
// 🔄 RESET NOTIFICACIONES DESDE DASHBOARD
// ============================================================================
app.post('/api/whatsapp/reset', (req, res) => {
  whatsappCounter = 0;
  whatsappNotifications = [];
  res.json({ success: true });
});
// Health check
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

// Marcas
app.get('/api/marcas', async (req, res) => {
  try {
    const result = await query('SELECT * FROM marcas_maestras ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login (compatibilidad)
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    let match = user.password && user.password.startsWith('$2a$') 
      ? bcrypt.compareSync(password, user.password)
      : password === user.password;
    
    if (!match) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: { ...userWithoutPassword, nombre: user.nombre_taller || user.email.split('@')[0] },
      redirect: '/dashboard.html'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' });
  }
});

// Login API
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    let match = user.password && user.password.startsWith('$2a$') 
      ? bcrypt.compareSync(password, user.password)
      : password === user.password;
    
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const { rol } = req.query;
    let sql = 'SELECT id, email, rol, nombre_taller as nombre FROM usuarios WHERE 1=1';
    const params = [];
    
    if (rol) {
      sql += ' AND rol = $1';
      params.push(rol);
    }
    
    sql += ' ORDER BY nombre_taller';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Desguaces
app.get('/api/desguaces', async (req, res) => {
  try {
    const { provincia } = req.query;
    let sql = 'SELECT * FROM desguaces WHERE 1=1';
    const params = [];
    
    if (provincia) {
      sql += ' AND provincia = $1';
      params.push(provincia);
    }
    
    sql += ' ORDER BY nombre';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const { usuario_id, estado } = req.query;
    let sql = `
      SELECT p.*, u.nombre_taller as nombre_usuario
      FROM pedidos p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (usuario_id && usuario_id !== 'todos' && usuario_id !== '0') {
      sql += ' AND p.usuario_id = $1';
      params.push(usuario_id);
    }
    
    if (estado && estado !== 'todos') {
      sql += params.length > 0 ? ` AND p.estado = $${params.length + 1}` : ' AND p.estado = $1';
      params.push(estado);
    }
    
    sql += ' ORDER BY p.fecha_creacion DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado (drag & drop)
app.put('/api/pedidos/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // MODIFICACIÓN QUIRÚRGICA: Actualizar estado respetando los nuevos nombres
    const result = await query(
      'UPDATE pedidos SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [estado, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ success: true, pedido: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear pedido
app.post('/api/pedidos', async (req, res) => {
  try {
    const p = req.body;
    const numero_pedido = `PED-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // MODIFICACIÓN QUIRÚRGICA: El estado por defecto ahora es 'solicitud'
    const result = await query(`
      INSERT INTO pedidos (numero_pedido, pieza, marca_coche, modelo_coche, estado, precio, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, numero_pedido
    `, [
      numero_pedido, p.pieza, p.marca_coche, p.modelo_coche, 
      p.estado || 'solicitud', p.precio || 0, p.usuario_id
    ]);
    
    res.status(201).json({ 
      id: result.rows[0].id, 
      numero_pedido: result.rows[0].numero_pedido,
      message: 'Order created'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// INYECCIÓN QUIRÚRGICA #6
// ENDPOINT WHATSAPP
// =======================
app.post('/api/whatsapp/pedido', async (req, res) => {
  try {
    const { from, message } = req.body;
    console.log('📩 WhatsApp recibido:', from, message);

    if (!from || !message) {
      return res.status(400).json({ error: 'Payload inválido' });
    }

    const tel = from.replace(/\D/g, '');

    const tallerResult = await query(`
      SELECT id, nombre_taller
      FROM usuarios
      WHERE rol = 'taller'
      AND (
        REPLACE(telefono_whatsapp,'+','') = $1 OR
        REPLACE(telefono_whatsapp_2,'+','') = $1 OR
        REPLACE(telefono_whatsapp_3,'+','') = $1 OR
        REPLACE(telefono_whatsapp_4,'+','') = $1 OR
        REPLACE(telefono_whatsapp_5,'+','') = $1 OR
        REPLACE(telefono_whatsapp_6,'+','') = $1 OR
        REPLACE(telefono_whatsapp_7,'+','') = $1 OR
        REPLACE(telefono_whatsapp_8,'+','') = $1 OR
        REPLACE(telefono_whatsapp_9,'+','') = $1 OR
        REPLACE(telefono_whatsapp_10,'+','') = $1
      )
      LIMIT 1
    `, [tel]);

    if (tallerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Número no autorizado' });
    }

    const taller = tallerResult.rows[0];
    const text = message.toLowerCase();

    const matriculaMatch = text.match(/\b([0-9]{4}[a-z]{3})\b/i);
    const matricula = matriculaMatch ? matriculaMatch[1].toUpperCase() : null;

    let prioridad = 'normal';
    if (text.includes('urgente')) prioridad = 'alta';

    let pieza = text
      .replace(/necesito|quiero|busco|pieza|para|del|de|una|un/gi, '')
      .replace(matricula || '', '')
      .trim();

if (!pieza || pieza.length < 3) {
  return res.json({ question: '¿Qué pieza necesitas?' });
}

const numero_pedido = `WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const insert = await query(`
  INSERT INTO pedidos (
    numero_pedido,
    pieza,
    matricula,
    usuario_id,
    estado,
    detalles_extra,
    fecha_creacion,
    precio,
    precio_coste,
    prioridad,
    canal
  ) VALUES (
    $1,  -- numero_pedido
    $2,  -- pieza
    $3,  -- matricula
    $4,  -- usuario_id
    'solicitud',
    $5,  -- detalles_extra (mensaje original)
    NOW(),
    0,
    0,
    $6,  -- prioridad
    'whatsapp'
  )
  RETURNING id
`, [
  numero_pedido,
  pieza,
  matricula,
  taller.id,
  message,
  prioridad
]);

    console.log('✅ Pedido WhatsApp creado:', insert.rows[0].id);
// 🔔 Registrar notificación para dashboard
whatsappCounter++;
whatsappNotifications.push({
  id: insert.rows[0].id,
  numero_pedido: numero_pedido || null,
  taller: taller.nombre_taller,
  mensaje: message,
  timestamp: Date.now()
});
    res.json({
      success: true,
      pedido_id: insert.rows[0].id,
      taller: taller.nombre_taller
    });

  } catch (error) {
    console.error('🔥 Error WhatsApp:', error);
    res.status(500).json({ error: 'Error procesando WhatsApp' });
  }
});

// ============================================================================
// RUTA CATCH-ALL PARA ARCHIVOS ESTÁTICOS
// ============================================================================
app.get('/:file', (req, res) => {
  const file = req.params.file;
  if (!file.startsWith('api/')) {
    servirArchivo(res, file);
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
async function startServer() {
  // =======================
  // INYECCIÓN QUIRÚRGICA #4
  // =======================
  console.log('🚦 Iniciando startServer()...');
  
  try {
    console.log('🔌 Verificando base de datos...');
    await verificarBaseDeDatos();
    console.log('✅ Verificación de base de datos finalizada');
  } catch (err) {
    console.error('❌ Error durante verificarBaseDeDatos:', err);
  }
  
  console.log('🌍 Intentando levantar servidor HTTP...');
  
  // =======================
  // INYECCIÓN QUIRÚRGICA #3
  // =======================
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 ======= SERVIDOR INICIADO =======
🔗 URL: https://recambio-verde-iax.onrender.com
🔧 Health: /api/health
📋 Marcas: /api/marcas
👤 Login: /index.html
📊 Dashboard: /dashboard.html
====================================
    `);
  });
}

startServer().catch(console.error);
