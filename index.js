const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Requerido para conectar a PostgreSQL
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. CONFIGURACIÓN DE LA BASE DE DATOS
// En Render, DATABASE_URL se configura automáticamente o la pegas en Environment
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para la seguridad de Render
    }
});

// Middleware para procesar datos JSON
app.use(express.json());
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname)));

/**
 * 2. RUTA PARA OBTENER PEDIDOS DE LA DDBB (Para el Kanban)
 */
app.get('/api/pedidos', async (req, res) => {
    try {
        // Ajusta los nombres de las columnas según tu tabla real
        const query = `
            SELECT id, pieza_nombre as pieza, vehiculo_modelo as vehiculo, estado 
            FROM pedidos 
            ORDER BY fecha_creacion DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error en DDBB:", err);
        res.status(500).json({ error: "No se pudieron cargar los datos de la base de datos" });
    }
});

/**
 * 3. LÓGICA DE AUTENTICACIÓN (Actualizada para que coincida con tus roles)
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
    console.log(`🚀 Servidor con DDBB listo en puerto ${PORT}`);
});
