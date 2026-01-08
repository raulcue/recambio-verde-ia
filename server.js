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
 * Lista de control activa: 
 * 1. SyntaxError JSON, Integridad de rutas, Registro de altas/bajas de talleres.
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
    const { pieza, matricula } = req.body;
    if (!pieza || !matricula) {
        return res.status(400).json({ error: 'Pieza y Matrícula son obligatorios' });
    }
    next();
};

// --- RUTAS DE AUTENTICACIÓN ---

app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    try {
        const result = await pool.query(
            "SELECT id, nombre_taller, rol, password FROM usuarios WHERE email = $1", 
            [email]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (user.password === password) {
                const iniciales = user.nombre_taller 
                    ? user.nombre_taller.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) 
                    : '??';

                await registrarLog(user.nombre_taller, 'LOGIN', `Inicio de sesión exitoso (Rol: ${user.rol})`, ip);
                
                return res.json({ 
                    success: true, 
                    redirect: 'landing.html',
                    user: {
                        id: user.id,
                        nombre: user.nombre_taller,
                        rol: user.rol,
                        iniciales: iniciales
                    }
                });
            }
        }
        
        await registrarLog(email, 'LOGIN_FAIL', 'Intento de acceso fallido', ip);
        res.json({ success: false, message: 'Credenciales incorrectas' });
    } catch (err) {
        console.error('LOGIN_ERROR:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// --- API DE PEDIDOS ---

app.get('/api/pedidos', async (req, res) => {
    const userRol = req.headers['x-user-role'];
    const userId = req.headers['x-user-id'];

    try {
        let query = "SELECT * FROM pedidos";
        let params = [];

        if (userRol === 'taller' && userId) {
            query += " WHERE usuario_id = $1";
            params.push(userId);
        }
        
        query += " ORDER BY fecha_creacion DESC";
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET_PEDIDOS_ERROR:', err);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

app.post('/api/pedidos', validarPedido, async (req, res) => {
    const { id, pieza, matricula, marca_coche, modelo_coche, estado, precio, precio_coste, usuario_id, proveedor, bastidor, sub_estado_incidencia, notas_tecnicas, admin_user } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
        const uId = usuario_id || null;
        const nuevoEstado = estado || 'solicitado';

        if (id) {
            const query = `
                UPDATE pedidos SET 
                pieza=$1, matricula=$2, marca_coche=$3, modelo_coche=$4, estado=$5, 
                precio=$6, precio_coste=$7, usuario_id=$8, proveedor=$9, bastidor=$10, 
                sub_estado_incidencia=$11, notas_tecnicas=$12, fecha_actualizacion=CURRENT_TIMESTAMP
                WHERE id=$13
            `;
            await pool.query(query, [
                pieza, matricula, marca_coche, modelo_coche, nuevoEstado, 
                parseFloat(precio) || 0, parseFloat(precio_coste) || 0, uId,
                proveedor, bastidor, sub_estado_incidencia, notas_tecnicas, id
            ]);
            await registrarLog(admin_user, 'UPDATE', `Pedido #${id} actualizado: ${pieza}`, ip);
            res.json({ success: true });
        } else {
            const query = `
                INSERT INTO pedidos 
                (pieza, matricula, marca_coche, modelo_coche, estado, precio, precio_coste, usuario_id, proveedor, bastidor, sub_estado_incidencia, notas_tecnicas)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id
            `;
            const result = await pool.query(query, [
                pieza, matricula, marca_coche, modelo_coche, nuevoEstado, 
                parseFloat(precio) || 0, parseFloat(precio_coste) || 0, uId,
                proveedor || null, bastidor || null, 
                sub_estado_incidencia || null, notas_tecnicas || null
            ]);
            await registrarLog(admin_user, 'CREATE', `Nueva pieza: ${pieza}`, ip);
            res.json({ success: true, id: result.rows[0].id });
        }
    } catch (err) {
        console.error('ERROR_UPSERT:', err.message);
        res.status(500).json({ error: 'Error al procesar pedido' });
    }
});

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

app.get('/api/logs', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM logs ORDER BY fecha DESC LIMIT 100");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener logs' });
    }
});

app.get('/api/talleres', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, nombre_taller, email, rol FROM usuarios WHERE rol = 'taller' ORDER BY nombre_taller ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener talleres' });
    }
});

// --- LÓGICA DE USUARIOS ---

app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM usuarios ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

app.post('/api/usuarios', async (req, res) => {
    const { id, nombre_taller, email, password, rol, admin_user } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        if (id) {
            await pool.query(
                "UPDATE usuarios SET nombre_taller=$1, email=$2, password=$3, rol=$4 WHERE id=$5",
                [nombre_taller, email, password, rol, id]
            );
            await registrarLog(admin_user, 'USER_UPDATE', `Usuario ${nombre_taller} actualizado`, ip);
        } else {
            await pool.query(
                "INSERT INTO usuarios (nombre_taller, email, password, rol) VALUES ($1, $2, $3, $4)",
                [nombre_taller, email, password, rol]
            );
            await registrarLog(admin_user, 'USER_CREATE', `Nuevo usuario creado: ${nombre_taller}`, ip);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al procesar usuario' });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { admin_user } = req.query;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
        await registrarLog(admin_user, 'USER_DELETE', `Usuario ID ${id} eliminado`, ip);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// --- API DE ESTADÍSTICAS (MEJORADA PARA COMPATIBILIDAD CON FRONTEND) ---

app.get('/api/stats/dashboard', async (req, res) => {
    try {
        const totalPedidos = await pool.query("SELECT COUNT(*) FROM pedidos");
        const pedidosMes = await pool.query("SELECT COUNT(*) FROM pedidos WHERE fecha_creacion > CURRENT_DATE - INTERVAL '1 month'");
        const ventasTotales = await pool.query("SELECT SUM(precio) FROM pedidos WHERE estado = 'finalizado'");
        
        res.json({
            total: totalPedidos.rows[0].count,
            mes: pedidosMes.rows[0].count,
            ventas: ventasTotales.rows[0].sum || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

app.get('/api/stats/graficos', async (req, res) => {
    try {
        // Obtenemos los datos agrupados por mes
        const result = await pool.query(`
            SELECT to_char(fecha_creacion, 'Mon') as mes, 
                   SUM(precio) as total_ventas,
                   SUM(precio - precio_coste) as total_beneficio
            FROM pedidos 
            WHERE estado = 'finalizado'
            GROUP BY mes 
            ORDER BY MIN(fecha_creacion)
        `);

        // Formateamos para que stats.html lo entienda directamente
        const labels = result.rows.map(r => r.mes);
        const ventas = result.rows.map(r => parseFloat(r.total_ventas) || 0);
        const beneficios = result.rows.map(r => parseFloat(r.total_beneficio) || 0);

        res.json({
            labels: labels,
            ventas: ventas,
            beneficios: beneficios
        });
    } catch (err) {
        console.error('ERROR_GRAFICOS:', err);
        res.status(500).json({ error: 'Error al obtener gráficos' });
    }
});
// --- API DE DESGUACES (NUEVA SECCIÓN) ---

app.get('/api/desguaces', async (req, res) => {
    try {
        // Antes de nada, comprobamos la BBDD (Norma: Antes de crear nada, comprueba la BBDD)
        const result = await pool.query('SELECT * FROM desguaces ORDER BY provincia ASC, nombre ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('GET_DESGUACES_ERROR:', err);
        res.status(500).json({ error: 'Error al obtener desguaces' });
    }
});

app.post('/api/desguaces', async (req, res) => {
    const d = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        // Verificación preventiva para evitar duplicados (Norma: Comprobar BBDD)
        const check = await pool.query('SELECT id FROM desguaces WHERE nombre = $1 AND provincia = $2', [d.nombre, d.provincia]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'El desguace ya existe en esta provincia.' });
        }

        const query = `
            INSERT INTO desguaces 
            (nombre, direccion, provincia, cp, telefono_fijo, movil_1, movil_2, email, horario, web, es_workshop, fuente_origen, fecha_registro)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
            RETURNING *`;
        const values = [
            d.nombre, d.direccion, d.provincia, d.cp, 
            d.telefono_fijo, d.movil_1, d.movil_2, d.email, 
            d.horario, d.web, d.es_workshop, d.fuente_origen
        ];
        const result = await pool.query(query, values);
        
        // Registro en log usando tu función existente
        await registrarLog(d.admin_user || 'Admin', 'DESGUACE_CREATE', `Nuevo desguace: ${d.nombre}`, ip);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('POST_DESGUACE_ERROR:', err);
        res.status(500).json({ error: 'Error al procesar desguace' });
    }
});
// --- SERVIDO DE ARCHIVOS ---

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Servidor activo en puerto ${port}`);
});
