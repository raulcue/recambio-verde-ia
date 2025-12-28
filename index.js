const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para entender JSON
app.use(express.json());

// Servir archivos estáticos desde la raíz
app.use(express.static(__dirname));

// --- RUTA PRINCIPAL ---
app.get('/', (req, res) => {
    // Usamos path.resolve para evitar el error ENOENT en Render
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// --- LÓGICA DE LOGIN ---
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Credenciales actualizadas según tu petición
    if (email === "admin@test.com" && password === "123456") {
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
