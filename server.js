const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Error DB:', err.message);
    else console.log('Conectado a SQLite');
});

// Inicialización de tablas
db.serialize(() => {
    // Tabla de usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        iniciales TEXT NOT NULL,
        rol TEXT CHECK(rol IN ('admin', 'taller')) DEFAULT 'taller',
        email TEXT,
        telefono TEXT,
        provincia TEXT,
        direccion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de desguaces
    db.run(`CREATE TABLE IF NOT EXISTS desguaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        provincia TEXT,
        direccion TEXT,
        cp TEXT,
        telefono_fijo TEXT,
        movil_1 TEXT,
        movil_2 TEXT,
        email TEXT,
        horario TEXT,
        es_workshop BOOLEAN DEFAULT 0,
        fuente_origen TEXT DEFAULT 'WEB',
        admin_user TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla de pedidos/piezas
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descripcion TEXT,
        cliente_id INTEGER NOT NULL,
        taller_id INTEGER NOT NULL,
        estado TEXT CHECK(estado IN ('solicitud', 'proceso', 'finalizado', 'cancelado')) DEFAULT 'solicitud',
        prioridad TEXT CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')) DEFAULT 'media',
        marca TEXT,
        modelo TEXT,
        matricula TEXT,
        año INTEGER,
        fecha_limite DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cliente_id) REFERENCES usuarios(id),
        FOREIGN KEY (taller_id) REFERENCES usuarios(id)
    )`);

    // Insertar usuario admin por defecto si no existe
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO usuarios (username, password, nombre, iniciales, rol) 
            VALUES (?, ?, ?, ?, ?)`, 
            ['admin', adminPassword, 'Administrador', 'AD', 'admin']);
});

// API RUTAS

// === USUARIOS ===
// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
        
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });
            
            // Eliminar password de la respuesta
            delete user.password;
            res.json(user);
        });
    });
});

// Obtener todos los usuarios (talleres para filtros)
app.get('/api/usuarios', (req, res) => {
    const { rol } = req.query;
    let query = 'SELECT id, username, nombre, iniciales, rol, email, telefono, provincia FROM usuarios';
    let params = [];
    
    if (rol) {
        query += ' WHERE rol = ?';
        params.push(rol);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Obtener usuario por ID
app.get('/api/usuarios/:id', (req, res) => {
    db.get('SELECT id, username, nombre, iniciales, rol, email, telefono, provincia FROM usuarios WHERE id = ?', 
           [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(row);
    });
});

// === DESGUACES ===
// Obtener todos los desguaces
app.get('/api/desguaces', (req, res) => {
    db.all('SELECT * FROM desguaces ORDER BY nombre', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Crear nuevo desguace
app.post('/api/desguaces', (req, res) => {
    const desguace = req.body;
    
    const sql = `INSERT INTO desguaces (nombre, provincia, direccion, cp, telefono_fijo, movil_1, movil_2, 
                email, horario, es_workshop, fuente_origen, admin_user) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        desguace.nombre, desguace.provincia, desguace.direccion, desguace.cp,
        desguace.telefono_fijo, desguace.movil_1, desguace.movil_2,
        desguace.email, desguace.horario, desguace.es_workshop ? 1 : 0,
        desguace.fuente_origen || 'WEB', desguace.admin_user
    ];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, message: 'Desguace creado' });
    });
});

// === PEDIDOS/PIEZAS ===
// Obtener todos los pedidos
app.get('/api/pedidos', (req, res) => {
    const { estado, taller_id, cliente_id } = req.query;
    
    let query = `
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
    let params = [];
    
    if (estado) {
        query += ' AND p.estado = ?';
        params.push(estado);
    }
    
    if (taller_id) {
        query += ' AND p.taller_id = ?';
        params.push(taller_id);
    }
    
    if (cliente_id) {
        query += ' AND p.cliente_id = ?';
        params.push(cliente_id);
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Crear nuevo pedido
app.post('/api/pedidos', (req, res) => {
    const pedido = req.body;
    
    const sql = `INSERT INTO pedidos (titulo, descripcion, cliente_id, taller_id, estado, prioridad, 
                marca, modelo, matricula, año, fecha_limite) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        pedido.titulo, pedido.descripcion, pedido.cliente_id, pedido.taller_id,
        pedido.estado || 'solicitud', pedido.prioridad || 'media',
        pedido.marca, pedido.modelo, pedido.matricula, pedido.año, pedido.fecha_limite
    ];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Obtener el pedido recién creado con los datos de cliente y taller
        db.get(`
            SELECT p.*, 
                   c.nombre as cliente_nombre,
                   c.iniciales as cliente_iniciales,
                   t.nombre as taller_nombre,
                   t.iniciales as taller_iniciales
            FROM pedidos p
            LEFT JOIN usuarios c ON p.cliente_id = c.id
            LEFT JOIN usuarios t ON p.taller_id = t.id
            WHERE p.id = ?
        `, [this.lastID], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row);
        });
    });
});

// Actualizar estado de pedido (Drag & Drop)
app.put('/api/pedidos/:id/estado', (req, res) => {
    const { estado } = req.body;
    const { id } = req.params;
    
    if (!estado || !['solicitud', 'proceso', 'finalizado', 'cancelado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
    }
    
    db.run('UPDATE pedidos SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
           [estado, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        // Obtener el pedido actualizado
        db.get(`
            SELECT p.*, 
                   c.nombre as cliente_nombre,
                   c.iniciales as cliente_iniciales,
                   t.nombre as taller_nombre,
                   t.iniciales as taller_iniciales
            FROM pedidos p
            LEFT JOIN usuarios c ON p.cliente_id = c.id
            LEFT JOIN usuarios t ON p.taller_id = t.id
            WHERE p.id = ?
        `, [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row);
        });
    });
});

// Actualizar pedido completo
app.put('/api/pedidos/:id', (req, res) => {
    const { id } = req.params;
    const pedido = req.body;
    
    const sql = `UPDATE pedidos SET 
                titulo = ?, descripcion = ?, cliente_id = ?, taller_id = ?, 
                estado = ?, prioridad = ?, marca = ?, modelo = ?, 
                matricula = ?, año = ?, fecha_limite = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`;
    
    const params = [
        pedido.titulo, pedido.descripcion, pedido.cliente_id, pedido.taller_id,
        pedido.estado, pedido.prioridad, pedido.marca, pedido.modelo,
        pedido.matricula, pedido.año, pedido.fecha_limite, id
    ];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        res.json({ message: 'Pedido actualizado', changes: this.changes });
    });
});

// Eliminar pedido
app.delete('/api/pedidos/:id', (req, res) => {
    db.run('DELETE FROM pedidos WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pedido eliminado', changes: this.changes });
    });
});

// Ruta para el frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});
