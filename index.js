const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Requerido para conectar a PostgreSQL
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN DE LA BASE DE DATOS
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para Render
    }
});

// Middleware
app.use(express.json());
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname)));

/**
 * 2. RUTA PARA OBTENER PEDIDOS (GET)
 * Ajustada a tus columnas reales de DBeaver: 'pieza' y 'modelo_coche'
 */
app.get('/api/pedidos', async (req, res) => {
    try {
        // Consultamos 'pieza' y 'modelo_coche' pero los enviamos como espera el frontend
        const query = `
            SELECT id, pieza as pieza_nombre, modelo_coche as vehiculo_modelo, estado 
            FROM pedidos 
            ORDER BY fecha_creacion DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error en DDBB:", err.message);
        res.status(500).json({ error: "Error de conexión: " + err.message });
    }
});

/**
 * 3. NUEVA RUTA PARA GUARDAR PEDIDOS (POST)
 * Permite que el taller guarde datos reales en la base de datos
 */
app.post('/api/pedidos', async (req, res) => {
    const { pieza, vehiculo } = req.body;
    try {
        const query = `
            INSERT INTO pedidos (pieza, modelo_coche, estado) 
            VALUES ($1, $2, 'pendiente') 
            RETURNING *
        `;
        const values = [pieza, vehiculo];
        const result = await pool.query(query, values);
        res.json({ success: true, pedido: result.rows[0] });
    } catch (err) {
        console.error("Error al guardar:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * 4. LÓGICA DE AUTENTICACIÓN
 */
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === "admin@recambio.com" && password === "1234") {
        return res.json({ 
            success: true, 
            rol: 'admin', 
            email: email, 
            redirect: 'landing.html' 
        });
    } else if (email === "taller@test.com" && password === "1234") {
        return res.json({ 
            success: true, 
            rol: 'taller', 
            email: email, 
            redirect: 'pedidos-taller.html' 
        });
    } else {
        return res.status(401).json({ 
            success: false, 
            message: "Usuario o contraseña incorrectos" 
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor con DDBB sincronizada listo en puerto ${PORT}`);
});
