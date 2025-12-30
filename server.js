// ==========================================
// 1. GESTIÓN DE USUARIOS Y TALLERES (Ajustado para coincidir con frontend)
// ==========================================
app.get('/api/talleres', async (req, res) => { // Simplificado de /api/usuarios/talleres
    try {
        const result = await pool.query(
            "SELECT id, nombre_taller as nombre FROM usuarios WHERE rol = 'taller' ORDER BY nombre_taller ASC"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener talleres' });
    }
});

// ==========================================
// 2. ACTUALIZACIÓN INTEGRAL (Acepta los 20 campos del popup)
// ==========================================
app.post('/api/pedidos/update-status', async (req, res) => {
    // Extraemos TODO lo que envía el popup
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

        // UPDATE con todos los campos técnicos de tu BBDD
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

        // Lógica de Logs (Mantenemos tu excelente sistema)
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
