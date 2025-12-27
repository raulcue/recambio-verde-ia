const express = require('express');
const { Pool } = require('pg');
const path = require('path'); 
const app = express();

app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- RUTAS DE NAVEGACIÓN ---

// Página de inicio (Login)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página de Registro
app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

// Página de Política de Privacidad (LOPD)
app.get('/privacidad', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacidad.html'));
});

// Ruta temporal para Recuperar Contraseña
app.get('/recuperar', (req, res) => {
  res.send('<body style="background:#064e3b; color:white; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; justify-center; height:100vh;"><h1>Recuperar Acceso</h1><p>En construcción: Pronto podrás recuperar tu acceso vía WhatsApp.</p><a href="/" style="color:#4ade80;">Volver</a></body>');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Recambio Verde IA activo en el puerto ${PORT}`);
});
