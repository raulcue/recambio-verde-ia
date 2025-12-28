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

// Función centralizada para Logs
async function registrarLog(userId, pedidoId, accion) {
    try {
        await pool.query('INSERT INTO logs (usuario_id, pedido_id, accion) VALUES ($1, $2, $3)', [userId, pedidoId, accion]);
    } catch (e) { console.error("Error en log:", e); }
}

// Actualización de estado (Drag & Drop)
app.post('/api/pedidos/update-status', async (req, res) => {
    const { id, estado, userId } = req.body;
    await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
    await registrarLog(userId, id, `Estado cambiado a ${estado}`);
    res.json({ success: true });
});

// Obtener Logs para el Admin
app.get('/api/admin/logs', async (req, res) => {
    const query = `
        SELECT l.fecha, u.email, p.numero_pedido, l.accion 
        FROM logs l 
        LEFT JOIN usuarios u ON l.usuario_id = u.id 
        LEFT JOIN pedidos p ON l.pedido_id = p.id 
        ORDER BY l.fecha DESC LIMIT 50`;
    const result = await pool.query(query);
    res.json(result.rows);
});

// CRUD Pedidos con Taller Dinámico
app.post('/api/pedidos/upsert', async (req, res) => {
    const { id, pieza, matricula, taller_nombre, taller_email, telefono, estado, userId } = req.body;
    if (id) {
        await pool.query('UPDATE pedidos SET pieza=$1, matricula=$2, taller_nombre=$3, taller_email=$4, telefono=$5, estado=$6 WHERE id=$7', 
        [pieza, matricula, taller_nombre, taller_email, telefono, estado, id]);
        await registrarLog(userId, id, "Pedido editado");
    } else {
        const num = 'REC-' + Math.floor(Math.random()*9000);
        const nuevo = await pool.query('INSERT INTO pedidos (numero_pedido, pieza, matricula, taller_nombre, taller_email, telefono, estado) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [num, pieza, matricula, taller_nombre, taller_email, telefono, estado]);
        await registrarLog(userId, nuevo.rows[0].id, "Pedido creado");
    }
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);
