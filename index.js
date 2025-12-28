const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// 1. MIDDLEWARE
app.use(express.json());
// Servimos los archivos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. FUNCIÓN DE LOGS (Para registrar movimientos)
async function registrarLog(email, accion, pedidoId = null) {
    try {
        await pool.query(
            'INSERT INTO logs (usuario_id, accion, pedido_id) VALUES ((SELECT id FROM usuarios WHERE email = $1), $2, $3)', 
            [email, accion, pedidoId]
        );
    } catch (e) { console.error("Error en log:", e); }
}

// 3. RUTAS DE AUTENTICACIÓN (LOGIN Y REGISTRO)

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        // Verificación simple (En producción usar bcrypt)
        if (user && user.password === password) {
            let redirect = 'pedidos-taller.html';
            if (user.rol === 'admin') redirect = 'landing.html';
            if (user.rol === 'gestor') redirect = 'landing-agente.html';

            await registrarLog(email, "Inicio de sesión");

            res.json({
                success: true,
                rol: user.rol,
                email: user.email,
                redirect: redirect
            });
        } else {
            res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    try {
        await pool.query(
            'INSERT INTO usuarios (nombre_taller, email, password, rol) VALUES ($1, $2, $3, $4)',
            [nombre, email, password, 'taller']
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: "El email ya existe" });
    }
});

// 4. RUTAS DE USUARIOS (Para configuracion.html)

app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombre_taller, email, rol FROM usuarios ORDER BY id DESC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/usuarios/:id/rol', async (req, res) => {
    try {
        await pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [req.body.rol, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. RUTAS DE PEDIDOS (Para Dashboard y Taller)

app.get('/api/pedidos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
        res.json(result.rows);
    } catch (e)
