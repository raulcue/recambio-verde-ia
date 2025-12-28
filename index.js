const express = require('express');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN DE LA BASE DE DATOS
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname)));

/**
 * 2. RUTA PARA OBTENER PEDIDOS (PULL REAL DE DDBB)
 */
app.get('/api/pedidos', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, 
                p.numero_pedido, 
                p.pieza, 
                p.modelo_coche, 
                p.matricula, 
                p.bastidor, 
                p.precio, 
                p.estado,
                p.notas_tecnicas,
                u.nombre_taller 
            FROM pedidos p 
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.id DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error en DDBB:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 3. RUTA PARA GUARDAR (POST)
 */
app.post('/api/pedidos', async (req, res) => {
    const { pieza, vehiculo, matricula } = req.body;
    try {
        const query = `
            INSERT INTO pedidos (pieza, modelo_coche, matricula, estado) 
            VALUES ($1, $2, $3, 'solicitado') 
            RETURNING *
        `;
        const result = await pool.query(query, [pieza, vehiculo, matricula]);
        res.json({ success: true, pedido: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
