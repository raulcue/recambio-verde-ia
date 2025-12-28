const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// FUNCIÓN PARA LOGS
async function registrarLog(userId, pedidoId, accion) {
    try {
        await pool.query('INSERT INTO logs (usuario_id, pedido_id, accion) VALUES ($1, $2, $3)', [userId, pedidoId, accion]);
    } catch (e) { console.error("Error en log:", e); }
}

// ENDPOINT: LOGS (SECCIÓN NUEVA ADMIN)
app.get('/api/admin/logs', async (req, res) => {
    const result = await pool.query(`
        SELECT l.fecha, u.email, p.numero_pedido, l.accion 
        FROM logs l 
        LEFT JOIN usuarios u ON l.usuario_id = u.id 
        LEFT JOIN pedidos p ON l.pedido_id = p.id 
        ORDER BY l.fecha DESC LIMIT 100`);
    res.json(result.rows);
});

// ENDPOINT: ACTUALIZAR ESTADO (DRAG & DROP)
app.post('/api/pedidos/update-status', async (req, res) => {
    const { id, estado, userId } = req.body;
    await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
    await registrarLog(userId, id, `Cambio de estado a: ${estado}`);
    res.json({ success: true });
});

// ENDPOINT: EXPORTAR EXCEL (CSV)
app.get('/api/pedidos/export', async (req, res) => {
    const result = await pool.query('SELECT * FROM pedidos ORDER BY fecha_creacion DESC');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pedidos.csv');
    
    const csvRows = ["ID,Pedido,Pieza,Matricula,Taller,Estado"];
    result.rows.forEach(r => {
        csvRows.push(`${r.id},${r.numero_pedido},${r.pieza},${r.matricula},${r.taller_nombre},${r.estado}`);
    });
    res.send(csvRows.join('\n'));
});

app.listen(process.env.PORT || 3000);
