const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 10000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const getClientInfo = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};

// 1. GESTIÓN DE TALLERES
app.get('/api/talleres', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, nombre_taller as nombre FROM usuarios WHERE rol = 'taller' ORDER BY nombre_taller ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /api/talleres:', err);
        res.status(500).json({ error: 'Error al obtener talleres' });
    }
});

// 2. LECTURA DE PEDIDOS (Mapeado a tus columnas reales)
app.get('/api/pedidos', async (req, res) => {
    try {
        const { taller_id } = req.query;
        let query = "SELECT *, fecha_creacion as created_at FROM pedidos";
        const params = [];

        if (taller_id && taller_id !== 'todos') {
            query += " WHERE usuario_id = $1";
            params.push(taller_id);
        }
        
        query += " ORDER BY fecha_creacion DESC";
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error en /api/pedidos:', err);
        res.status(500).json({ error: 'Error al cargar pedidos' });
    }
});

// 3. ACTUALIZACIÓN E INSERCIÓN
app.post('/api/pedidos/update-status', async (req, res) => {
    const { 
        id, nuevoEstado, pieza, matricula, precio, 
        marca_coche, modelo_coche, bastidor, precio_coste, 
        proveedor, usuario_id, sub_estado_incidencia, 
        notas_incidencia, notas_tecnicas
    } = req.body;

    try {
        if (id) {
            // UPDATE usando tus columnas exactas
            await pool.query(
                `UPDATE pedidos SET 
                    estado = COALESCE($1, estado), 
                    pieza = COALESCE($2, pieza), 
                    matricula = COALESCE($3, matricula), 
                    precio = $4, marca_coche = $5, modelo_coche = $6, 
                    bastidor = $7, precio_coste = $8, proveedor = $9, 
                    usuario_id = $10, sub_estado_incidencia = $11, 
                    notas_incidencia = $12, notas_tecnicas = $13,
                    updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $14`,
                [nuevoEstado, pieza, matricula, precio || 0, marca_coche, modelo_coche, bastidor, precio_coste || 0, proveedor, usuario_id || null, sub_estado_incidencia, notas_incidencia, notas_tecnicas, id]
            );
        } else {
            // INSERT usando tus columnas exactas
            await pool.query(
                `INSERT INTO pedidos (pieza, matricula, precio, marca_coche, modelo_coche, bastidor, precio_coste, proveedor, usuario_id, estado, fecha_creacion) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'solicitado', CURRENT_TIMESTAMP)`,
                [pieza, matricula, precio || 0, marca_coche, modelo_coche, bastidor, precio_coste || 0, proveedor, usuario_id || null]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error en DB:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor en puerto ${port}`);
});
