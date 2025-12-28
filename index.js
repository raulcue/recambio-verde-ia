const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Permite al servidor entender datos JSON (necesario para el login)
app.use(express.json());

// Sirve todos los archivos de la carpeta raíz (HTML, JS, Imágenes)
app.use(express.static(__dirname));

// --- RUTA PRINCIPAL (Lo que ves al abrir la URL) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- LÓGICA DE LOGIN (Rescatada y Limpia) ---
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Aquí puedes poner tus usuarios de prueba
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

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
