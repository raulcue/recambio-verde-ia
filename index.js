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

// 2. FUNCIÓN DE AUDITORÍA
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

            res.json({ success: true, rol: user.rol, email: user.email, redirect: redirect });
        } else {
            res.status(401).json({ success: false, message: "Credenciales incorrectas" });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. RUTAS DE PEDIDOS (Gestión y Kanban)
app.get('/api/pedidos', async (req, res) => {
    const email = req.query.email;
    try {
        let query = `
            SELECT p.*, u.nombre_taller, u.email as email_usuario, u.provincia
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
            `INSERT INTO pedidos (numero_pedido, marca_coche, modelo_coche, pieza, matricula, bastidor, estado, usuario_id, fecha_creacion) 
             VALUES ($1, $2, $3, $4, $5, $6, 1, (SELECT id FROM usuarios WHERE email = $7), CURRENT_TIMESTAMP) 
             RETURNING id`,
            [numero_pedido, marca_coche, modelo_coche, pieza, matricula, bastidor, email_usuario]
        );
        if(email_usuario) await registrarLog(email_usuario, `Creó pedido ${numero_pedido}`, result.rows[0].id);
        res.json({ success: true, id: result.rows[0].id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Actualización desde Modal (Dashboard)
app.put('/api/pedidos/:id/update', async (req, res) => {
    const { marca_coche, modelo_coche, matricula, numero_pedido, bastidor, notas_tecnicas, precio, precio_coste } = req.body;
    try {
        await pool.query(
            `UPDATE pedidos SET 
                marca_coche = $1, modelo_coche = $2, matricula = $3, 
                numero_pedido = $4, bastidor = $5, notas_tecnicas = $6,
                precio = $7, precio_coste = $8
             WHERE id = $9`,
            [marca_coche, modelo_coche, matricula, numero_pedido, bastidor, notas_tecnicas, precio, precio_coste, req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cambio de estado INTELIGENTE (Lead Time, Incidencias y NPS)
app.patch('/api/pedidos/:id/estado', async (req, res) => {
    const { estado, email, sub_estado, notas } = req.body;
    try {
        let query = 'UPDATE pedidos SET estado = $1';
        let params = [estado, req.params.id];

        if (estado === 5) { // ENTREGADO
            query += ', fecha_entrega = CURRENT_TIMESTAMP';
        } else if (estado === 6) { // INCIDENCIA
            query += ', sub_estado_incidencia = $3, notas_incidencia = $4';
            params.push(sub_estado || 'Otros', notas || '');
        }

        query += ' WHERE id = $2';
        await pool.query(query, params);
        
        await registrarLog(email || 'Sistema', `Estado ${estado} | ${sub_estado || ''}`, req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. MÓDULO DE ESTADÍSTICAS (KPIs BI & Rendimiento)
app.get('/api/stats/global', async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                u.nombre_taller,
                u.provincia,
                COUNT(p.id) as total_pedidos,
                SUM(COALESCE(p.precio, 0)) as total_ventas,
                SUM(COALESCE(p.precio, 0) - COALESCE(p.precio_coste, 0)) as beneficio_total,
                AVG(CASE WHEN p.fecha_entrega IS NOT NULL THEN EXTRACT(EPOCH FROM (p.fecha_entrega - p.fecha_creacion))/86400 END) as lead_time_medio,
                COUNT(CASE WHEN p.sub_estado_incidencia = 'Rechazada Precio' THEN 1 END) as rechazos_precio,
                COUNT(CASE WHEN p.sub_estado_incidencia = 'Devuelta' THEN 1 END) as devoluciones,
                MAX(p.fecha_creacion) as fecha_ultimo_pedido
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            GROUP BY u.nombre_taller, u.provincia
        `);
        res.json(stats.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. CONFIGURACIÓN DE NEGOCIO (Costes Fijos para Break-even)
app.get('/api/config', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM configuracion_negocio LIMIT 1');
        res.json(result.rows[0] || { costes_fijos_mensuales: 0 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config', async (req, res) => {
    const { costes_fijos } = req.body;
    try {
        await pool.query(`
            INSERT INTO configuracion_negocio (id, costes_fijos_mensuales) 
            VALUES (1, $1) 
            ON CONFLICT (id) DO UPDATE SET costes_fijos_mensuales = $1`, 
            [costes_fijos]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. GESTIÓN DE USUARIOS
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, email, rol, nombre_taller, provincia FROM usuarios ORDER BY id DESC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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

// 8. INICIO DEL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema BI & Kanban operativo en puerto ${PORT}`);
});
