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

// 2. FUNCIÓN DE LOGS (Para auditoría de acciones)
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

// 4. RUTAS DE PEDIDOS (CON JOIN PARA EL NOMBRE DEL TALLER)
app.get('/api/pedidos', async (req, res) => {
    try {
        // Obtenemos los pedidos y el nombre del taller asociado
        const result = await pool.query(`
            SELECT p.*, u.nombre_taller 
            FROM pedidos p 
            LEFT JOIN usuarios u ON p.usuario_id = u.id 
            ORDER BY p.id DESC
        `);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pedidos', async (req, res) => {
    const { numero_pedido, marca_coche, modelo_coche, pieza, matricula, email_usuario } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO pedidos (numero_pedido, marca_coche, modelo_coche, pieza, matricula, estado, usuario_id) 
             VALUES ($1, $2, $3, $4, $5, 1, (SELECT id FROM usuarios WHERE email = $6)) 
             RETURNING id`,
            [numero_pedido, marca_coche, modelo_coche, pieza, matricula, email_usuario]
        );
        
        if(email_usuario) await registrarLog(email_usuario, "Creó nuevo pedido", result.rows[0].id);
        
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

// Actualización completa (desde el Popup del Dashboard)
app.put('/api/pedidos/:id/update', async (req, res) => {
    const { marca_coche, modelo_coche, matricula, numero_pedido, bastidor, notas_tecnicas } = req.body;
    try {
        await pool.query(
            `UPDATE pedidos SET 
                marca_coche = $1, 
                modelo_coche = $2, 
                matricula = $3, 
                numero_pedido = $4, 
                bastidor = $5, 
                notas_tecnicas = $6 
             WHERE id = $7`,
            [marca_coche, modelo_coche, matricula, numero_pedido, bastidor, notas_tecnicas, req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. RUTAS DE USUARIOS (Para configuracion.html)
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

// 6. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor operativo en puerto ${PORT}`));
