const express = require('express');
const path = require('path');
const app = express();

// Render asigna un puerto automáticamente, si no usa el 3000
const PORT = process.env.PORT || 3000;

// 1. SERVIR ARCHIVOS ESTÁTICOS
// Esto permite que el navegador encuentre tu carpeta /js, /assets, etc.
app.use(express.static(__dirname));

// 2. RUTA PRINCIPAL
// Cuando alguien entre a tu URL, le entregamos el login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. ARRANCAR EL SERVIDOR
app.listen(PORT, () => {
    console.log(`🚀 Servidor arrancado con éxito`);
    console.log(`🌍 Disponible en el puerto: ${PORT}`);
});
