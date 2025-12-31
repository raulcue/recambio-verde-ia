const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const port = process.env.PORT || 10000;

// Configuración de conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * SISTEMA DE AUDITORÍA (LOGS)
 */
const registrarLog = async (usuario, accion, detalle, ip) => {
    try {
        const iniciales = usuario 
            ? usuario.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) 
            : 'SY';
        const query = `
            INSERT INTO logs (usuario_nombre, usuario_iniciales, accion, detalle, ip_address, fecha)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        `;
        const cleanIp = ip === '::1' ? '127.0.0.1' : ip;
        await pool.query(query, [usuario || 'Sistema', iniciales, accion, detalle, cleanIp]);
    } catch (err) {
        console.error('CRITICAL ERROR en Auditoría:', err);
    }
};

/**
 * MIDDLEWARE DE VALIDACIÓN
 */
const validarPedido = (req, res, next) => {
    const { pieza } = req.body;
    if (!pieza || pieza.trim() === "") {
        return res.status(400).json({ error: "La pieza es obligatoria" });
    }
    next();
};

/**
 * RUTAS DE LA API - GESTIÓN DE USUARIOS (TALLERES)
 */

// 1. Obtener lista de usuarios con rol 'taller' (Para talleres.html)
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, nombre_taller, email, provincia, password, rol FROM usuarios WHERE rol = 'taller' ORDER BY nombre_taller ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error SQL Usuarios:', err.message);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// 2. Crear Nuevo Usuario/Taller
app.post('/api/usuarios', async (req, res) => {
    const { nombre_taller, email, provincia, password, rol } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const query = `
            INSERT INTO usuarios (nombre_taller, email, provincia, password, rol, fecha_registro)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id`;
        const result = await pool.query(query, [nombre_taller, email, provincia, password, rol || 'taller']);
        
        await registrarLog('Admin', 'ALTA_TALLER', `Nuevo taller: ${nombre_taller}`, ip);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('Error Crear Usuario:', err.message);
        res.status(500).json({ error: 'Error al registrar taller' });
    }
});

// 3. Actualizar Usuario/Taller
app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_taller, email, provincia, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const query = `
            UPDATE usuarios 
            SET nombre_taller = $1, email = $2, provincia = $3, password = $4, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $5`;
        await pool.query(query, [nombre_taller, email, provincia, password, id]);
        
        await registrarLog('Admin', 'EDIT_TALLER', `Editado taller: ${nombre_taller}`, ip);
        res.json({ success: true });
    } catch (err) {
        console.error('Error Update Usuario:', err.message);
        res.status(500).json({ error: 'Error al actualizar taller' });
    }
});

// 4. Eliminar Usuario/Taller
app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        const info = await pool.query("SELECT nombre_taller FROM usuarios WHERE id = $1", [id]);
        const nombre = info.rows[0]?.nombre_taller || id;
        
        await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
        await registrarLog('Admin', 'BAJA_TALLER', `Eliminado taller: ${nombre}`, ip);
        res.json({ success: true });
    } catch (err) {
        console.error('Error Delete Usuario:', err.message);
        res.status(500).json({ error: 'Error al eliminar taller' });
    }
});

/**
 * RUTAS DE LA API - PEDIDOS Y OTROS
 */

// 5. Lista simple de nombres de talleres (para selectores)
app.get('/api/talleres', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, nombre_taller as nombre FROM usuarios WHERE rol = 'taller' ORDER BY nombre_taller ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener lista de talleres' });
    }
});

// 6. Marcas Maestras
app.get('/api/marcas', async (req, res) => {
    try {
        const result = await pool.query("SELECT nombre FROM marcas_maestras ORDER BY nombre ASC");
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener marcas:', err);
        res.status(500).json({ error: 'Error al obtener marcas' });
    }
});

// 7. Listar pedidos con filtros
app.get('/api/pedidos', async (req, res) => {
    try {
        const { taller_id } = req.query;
        let query = "SELECT * FROM pedidos WHERE 1=1";
        const params = [];

        if (taller_id && taller_id !== 'todos' && !isNaN(taller_id)) {
            params.push(parseInt(taller_id));
            query += ` AND usuario_id = $${params.length}`;
        }

        query += " ORDER BY fecha_creacion DESC";
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar pedidos' });
    }
});

// 8. Crear o Actualizar Pedido (UPSERT)
app.post('/api/pedidos/update-status', validarPedido, async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const { id, nuevoEstado, pieza, matricula, precio, marca_coche, modelo_coche, bastidor, precio_coste, proveedor, usuario_id, sub_estado_incidencia, notas_tecnicas, admin_user } = req.body;

    try {
        if (id && !isNaN(id)) {
            const campos = [
                {n: 'estado', v: nuevoEstado}, {n: 'pieza', v: pieza}, {n: 'matricula', v: matricula},
                {n: 'precio', v: parseFloat(precio) || 0}, {n: 'marca_coche', v: marca_coche},
                {n: 'modelo_coche', v: modelo_coche}, {n: 'bastidor', v: bastidor},
                {n: 'precio_coste', v: parseFloat(precio_coste) || 0}, {n: 'proveedor', v: proveedor},
                {n: 'usuario_id', v: (usuario_id && !isNaN(usuario_id)) ? parseInt(usuario_id) : null},
                {n: 'sub_estado_incidencia', v: sub_estado_incidencia}, {n: 'notas_tecnicas', v: notas_tecnicas}
            ];

            const sets = campos.map((c, i) => `${c.n} = $${i + 1}`).join(', ');
            const values = campos.map(c => (c.v === "" ? null : c.v));
            
            await pool.query(`UPDATE pedidos SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${campos.length + 1}`, [...values, id]);
            await registrarLog(admin_user, 'EDIT', `Pedido #${id}: ${pieza}`, ip);
        } else {
            const queryInsert = `
                INSERT INTO pedidos (pieza, matricula, marca_coche, modelo_coche, estado, precio, precio_coste, usuario_id, fecha_creacion)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING id`;
            
            const uId = (usuario_id && !isNaN(usuario_id)) ? parseInt(usuario_id) : null;
            await pool.query(queryInsert, [
                pieza, matricula, marca_coche, modelo_coche, nuevoEstado || 'solicitado', 
                parseFloat(precio) || 0, parseFloat(precio_coste) || 0, uId
            ]);
            await registrarLog(admin_user, 'CREATE', `Nueva pieza: ${pieza}`, ip);
        }
        res.json({ success: true });
    } catch (err) {
        console.error('ERROR_UPSERT:', err.message);
        res.status(500).json({ error: 'Error al procesar pedido' });
    }
});

// 9. Eliminar Pedido
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

// 10. Consultar Auditoría (Logs)
app.get('/api/logs', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM logs ORDER BY fecha DESC LIMIT 100");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al cargar auditoría' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`🚀 SERVIDOR LOGÍSTICA IA CORRIENDO EN PUERTO: ${port}`);
});
