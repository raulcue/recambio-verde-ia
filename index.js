const express = require('express');
const { Pool } = require('pg');
const path = require('path'); // Esta línea es nueva, para manejar carpetas
const app = express();

app.use(express.json());

// Esta línea le dice al servidor que busque archivos (como imágenes o el login) en la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Cambiamos el mensaje de texto por el archivo espectacular de login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor espectacular activo en el puerto ${PORT}`);
});
