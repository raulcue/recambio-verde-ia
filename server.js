const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// USAR VARIABLE DE ENTORNO (Seguro para Git)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const query = `
      SELECT p.*, u.nombre_taller 
      FROM pedidos p 
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.id DESC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo`));
