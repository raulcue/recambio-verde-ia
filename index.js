const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();

// 1. MIDDLEWARE PARA LEER JSON (Crítico para recibir datos del Dashboard)
app.use(express.json());

// 2. SERVIR ARCHIVOS ESTÁTICOS
// Asegúrate de que tus archivos .html estén dentro de una carpeta llamada 'public'
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

// ENDPOINT: LISTAR PEDIDOS (Necesario para el Dashboard)
app.get('/api/pedidos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
});

// ENDPOINT: CREAR PEDIDO (Con Marca y Modelo)
app.post('/api/pedidos/create', async (req, res) => {
    try {
        const { marca_coche, modelo_coche, pieza, matricula, estado, userId } = req.body;
        
        // Generar un número de pedido aleatorio sencillo (ej: RP-1234)
        const numero_pedido = "RP-" + Math.floor(1000 + Math.random() * 9000);

        const result = await pool.query(
            'INSERT INTO pedidos (marca_coche, modelo_coche, pieza, matricula, estado, numero_pedido) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [marca_coche, modelo_coche, pieza, matricula, estado || 1, numero_pedido]
        );

        const newId = result.rows[0].id;
        await registrarLog(userId, newId, `Pedido creado: ${pieza} para ${marca_coche}`);
        
        res.json({ success: true, id: newId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error al crear pedido" });
    }
});

// ENDPOINT: LOGS
app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.fecha, u.email, p.numero_pedido, l.accion 
            FROM logs l 
            LEFT JOIN usuarios u ON l.usuario_id = u.id 
            LEFT JOIN pedidos p ON l.pedido_id = p.id 
            ORDER BY l.fecha DESC LIMIT 100`);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: "Error en logs" });
    }
});

// ENDPOINT: ACTUALIZAR ESTADO (DRAG & DROP)
app.post('/api/pedidos/update-status', async (req, res) => {
    try {
        const { id, estado, userId } = req.body;
        await pool.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
        await registrarLog(userId, id, `Cambio de estado a: ${estado}`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Error al actualizar" });
    }
});

// ENDPOINT: EXPORTAR EXCEL (CSV)
app.get('/api/pedidos/export', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=pedidos.csv');
        
        const csvRows = ["ID,Pedido,Marca,Modelo,Pieza,Matricula,Estado"];
        result.rows.forEach(r => {
            csvRows.push(`${r.id},${r.numero_pedido},${r.marca_coche},${r.modelo_coche},${r.pieza},${r.matricula},${r.estado}`);
        });
        res.send(csvRows.join('\n'));
    } catch (e) {
        res.status(500).send("Error al exportar");
    }
});

// 3. MANEJO DE RUTAS NO ENCONTRADAS (Para evitar el error de JSON)
// Si alguien pide algo a /api que no existe, devolvemos JSON 404, no el HTML
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: "Endpoint de API no encontrado" });
});

// 4. REDIRECCIÓN PARA RUTAS LIMPIAS (Opcional)
// Si el usuario entra a /dashboard, le servimos dashboard.html
app.get('/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${req.params.page}.html`), (err) => {
        if (err) res.status(404).send("Página no encontrada");
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor corriendo en puerto 3000");
});
