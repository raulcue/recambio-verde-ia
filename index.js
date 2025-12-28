const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// 1. CONFIGURACIÓN Y MIDDLEWARE
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. FUNCIÓN DE LOGS (Auditoría de acciones)
async function registrarLog(email, accion, pedidoId = null) {
    try {
        await pool.query(
            'INSERT INTO logs (usuario_id, accion, pedido_id) VALUES ((SELECT id FROM usuarios WHERE email = $1), $2, $3)', 
            [email, accion, pedidoId]
        );
    } catch (e) { console.error("Error en log:", e); }
}

// 3. RUTAS DE AUTENTICACIÓN
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

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
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. RUTAS DE PEDIDOS
app.get('/api/pedidos', async (req, res) => {
    // Filtro opcional por email para que el taller solo vea lo suyo
    const email = req.query.email;
    try {
        let query = `
            SELECT p.*, u.nombre_taller, u.email as email_usuario
            FROM pedidos p 
            LEFT JOIN usuarios u ON p.usuario_id = u.id `;
        
        let params = [];
        if (email) {
            query += ` WHERE u.email = $1 `;
            params.push(email);
        }
        
        query += ` ORDER BY p.id DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pedidos', async (req, res) => {
    const { numero_pedido, marca_coche, modelo_coche, pieza, matricula, email_usuario, bastidor } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO pedidos (numero_pedido, marca_coche, modelo_coche, pieza, matricula, bastidor, estado, usuario_id) 
             VALUES ($1, $2, $3, $4, $5, $6, 1, (SELECT id FROM usuarios WHERE email = $7)) 
             RETURNING id`,
            [numero_pedido, marca_coche, modelo_coche, pieza, matricula, bastidor, email_usuario]
        );
        
        if(email_usuario) await registrarLog(email_usuario, `Creó pedido ${numero_pedido}`, result.rows[0].id);
        
        res.json({ success: true, id: result.rows[0].id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Actualizar estado (para el Drag & Drop del Kanban)
app.put('/api/pedidos/:id/estado', async (req, res) => {
    try {
        await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [req.body.estado, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Actualización completa (Dashboard) - AHORA INCLUYE PRECIO Y BASTIDOR
app.put('/api/pedidos/:id/update', async (req, res) => {
    const { marca_coche, modelo_coche, matricula, numero_pedido, bastidor, notas_tecnicas, precio } = req.body;
    try {
        await pool.query(
            `UPDATE pedidos SET 
                marca_coche = $1, 
                modelo_coche = $2, 
                matricula = $3, 
                numero_pedido = $4, 
                bastidor = $5, 
                notas_tecnicas = $6,
                precio = $7
             WHERE id = $8`,
            [marca_coche, modelo_coche, matricula, numero_pedido, bastidor, notas_tecnicas, precio, req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. RUTAS DE USUARIOS
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, rol, nombre_taller FROM usuarios ORDER BY id DESC');
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

// 6. RUTA DE LOGS PARA ADMIN
app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.fecha, u.email, p.numero_pedido, l.accion 
            FROM logs l
            LEFT JOIN usuarios u ON l.usuario_id = u.id
            LEFT JOIN pedidos p ON l.pedido_id = p.id
            ORDER BY l.fecha DESC LIMIT 100
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor operativo en puerto ${PORT}`));
