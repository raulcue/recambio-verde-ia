// ==========================================
// 0. CONFIGURACIÓN INICIAL (IMPORTANTE: Faltaba esto)
// ==========================================
const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Para conectar con tu base de datos de Render
const app = express();
const port = process.env.PORT || 10000;

// Configuración de la conexión a la base de datos
// Render inyecta automáticamente la variable DATABASE_URL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Función auxiliar para info de cliente
const getClientInfo = (req) => {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};

// ==========================================
// 1. GESTIÓN DE USUARIOS Y TALLERES
// ==========================================
app.get('/api/talleres', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, nombre_taller as nombre FROM usuarios WHERE rol = 'taller' ORDER BY nombre_taller ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener talleres' });
    }
});

// ==========================================
// 2. ACTUALIZACIÓN INTEGRAL (Popup de 20 campos)
// ==========================================
app.post('/api/pedidos/update-status', async (req, res) => {
    const { 
        id, nuevoEstado, pieza, matricula, precio, 
        marca_coche, modelo_coche, bastidor, precio_coste, 
        proveedor, usuario_id, sub_estado_incidencia, 
        notas_incidencia, notas_tecnicas, admin_user 
    } = req.body;
    
    const ip = getClientInfo(req);

    try {
        const current = await pool.query('SELECT estado FROM pedidos WHERE id = $1', [id]);
        const estadoAnterior = current.rows[0]?.estado;

        await pool.query(
            `UPDATE pedidos SET 
                estado = COALESCE($1, estado), 
                pieza = COALESCE($2, pieza), 
                matricula = COALESCE($3, matricula), 
                precio = COALESCE($4, precio),
                marca_coche = $5, modelo_coche = $6, bastidor = $7,
                precio_coste = $8, proveedor = $9, usuario_id = $10,
                sub_estado_incidencia = $11, notas_incidencia = $12,
                notas_tecnicas = $13,
                updated_at = CURRENT_TIMESTAMP 
             WHERE id = $14`,
            [
                nuevoEstado || estadoAnterior, pieza, matricula, precio,
                marca_coche, modelo_coche, bastidor, precio_coste,
                proveedor, usuario_id, sub_estado_incidencia,
                notas_incidencia, notas_tecnicas, id
            ]
        );

        let accion = 'MODIFICACION';
        let detalle = `Actualización ficha técnica pieza: ${pieza || 'ID '+id}`;
        if (nuevoEstado && nuevoEstado !== estadoAnterior) {
            accion = 'KANBAN_MOVE';
            detalle = `Movido de ${estadoAnterior} a ${nuevoEstado}`;
        }

        await pool.query(
            'INSERT INTO logs (pedido_id, accion, detalle, ip_address, usuario_nombre, usuario_iniciales) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, accion, detalle, ip, admin_user || 'Admin', 'AD']
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar SQL' });
    }
});

// ==========================================
// 3. RUTAS DE NAVEGACIÓN (Para servir el HTML)
// ==========================================
app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ==========================================
// 4. ARRANQUE DEL SERVIDOR
// ==========================================
app.listen(port, () => {
    console.log(`🚀 Servidor Logístico IA con Auditoría Root en puerto ${port}`);
});
