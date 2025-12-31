const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 10000;

// Configuración de conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * SISTEMA DE AUDITORÍA (LOGS)
 * Genera iniciales automáticamente y registra IP y acciones.
 */
const registrarLog = async (usuario, accion, detalle, ip) => {
    try {
        // Genera iniciales (Ej: "Admin Central" -> "AC")
        const iniciales = usuario 
            ? usuario.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) 
            : 'SY';
            
        const query = `
            INSERT INTO logs (usuario_nombre, usuario_iniciales, accion, detalle, ip_address, fecha)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;
        await pool.query(query, [usuario || 'Sistema', iniciales, accion, detalle, ip || '127.0.0.1']);
    } catch (err) {
        console.error('CRITICAL ERROR en Auditoría:', err);
    }
};

/**
 * RUTAS DE DATOS (API)
 */

// 1. Obtener lista de talleres para los selects
app.get('/api/talleres', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, nombre_taller as nombre FROM usuarios WHERE rol = 'taller' ORDER BY nombre_taller ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener talleres' });
    }
});

// 2. Listar pedidos con filtros avanzados
app.get('/api/pedidos', async (req, res) => {
    try {
        const { taller_id, estado } = req.query;
        let query = "SELECT * FROM pedidos WHERE 1=1";
        const params = [];

        if (taller_id && taller_id !== 'todos') {
            params.push(taller_id);
            query += ` AND usuario_id = $${params.length}`;
        }
        
        if (estado) {
            params.push(estado);
            query += ` AND estado = $${params.length}`;
        }

        query += " ORDER BY fecha_creacion DESC";
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al cargar base de datos de pedidos' });
    }
});

// 3. Crear o Actualizar Pedido (Sincronización Total)
app.post('/api/pedidos/update-status', async (req, res) => {
    const { 
        id, nuevoEstado, pieza, matricula, precio, 
        marca_coche, modelo_coche, bastidor, precio_coste, 
        proveedor, usuario_id, sub_estado_incidencia, 
        notas_incidencia, notas_tecnicas, admin_user 
    } = req.body;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        if (id && id !== "null") {
            // MODO ACTUALIZACIÓN: Mantiene valores antiguos si los nuevos son null
            const queryUpdate = `
                UPDATE pedidos SET 
                    estado = COALESCE($1, estado), 
                    pieza = COALESCE($2, pieza), 
                    matricula = COALESCE($3, matricula), 
                    precio = COALESCE($4, precio), 
                    marca_coche = COALESCE($5, marca_coche), 
                    modelo_coche = COALESCE($6, modelo_coche), 
                    bastidor = COALESCE($7, bastidor), 
                    precio_coste = COALESCE($8, precio_coste), 
                    proveedor = COALESCE($9, proveedor), 
                    usuario_id = COALESCE($10, usuario_id), 
                    sub_estado_incidencia = COALESCE($11, sub_estado_incidencia), 
                    notas_incidencia = COALESCE($12, notas_incidencia), 
                    notas_tecnicas = COALESCE($13, notas_tecnicas), 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $14
            `;
            await pool.query(queryUpdate, [
                nuevoEstado, pieza, matricula, precio, marca_coche, 
                modelo_coche, bastidor, precio_coste, proveedor, 
                usuario_id, sub_estado_incidencia, notas_incidencia, 
                notas_tecnicas, id
            ]);
            
            // Log de movimiento o edición
            const accionLog = (nuevoEstado && !precio) ? 'MOVE' : 'EDIT';
            await registrarLog(admin_user || 'Admin', accionLog, `Pedido #${id}: ${pieza || 'Actualización de datos'}`, ip);

        } else {
            // MODO CREACIÓN
            const queryInsert = `
                INSERT INTO pedidos (
                    pieza, matricula, marca_coche, modelo_coche, 
                    estado, precio, fecha_creacion, usuario_id
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)
                RETURNING id
            `;
            const result = await pool.query(queryInsert, [
                pieza, matricula, marca_coche, modelo_coche, 
                nuevoEstado || 'solicitado', precio || 0, usuario_id
            ]);
            
            await registrarLog(admin_user || 'Sistema', 'CREATE', `Nueva pieza: ${pieza} (ID: ${result.rows[0].id})`, ip);
        }

        res.json({ success: true, message: 'Sincronizado con PostgreSQL' });

    } catch (err) {
        console.error('ERROR SQL:', err.message);
        res.status(500).json({ error: 'Fallo en servidor', detalle: err.message });
    }
});

// 4. Eliminar pedido definitivamente
app.delete('/api/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        await pool.query("DELETE FROM pedidos WHERE id = $1", [id]);
        await registrarLog('Admin', 'DELETE', `Pedido #${id} eliminado`, ip);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// 5. Historial de Logs para el Panel Root
app.get('/api/logs', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM logs ORDER BY fecha DESC LIMIT 100");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar auditoría' });
    }
});

// Servir el index.html para cualquier ruta no encontrada (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 SERVIDOR LOGÍSTICA IA CORRIENDO EN PUERTO: ${port}`);
});
