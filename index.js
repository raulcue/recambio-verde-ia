const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para entender JSON
app.use(express.json());

// --- LA CORRECCIÓN CLAVE ---
// Le decimos a Express que todos los archivos (HTML, JS, CSS) 
// están dentro de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// --- RUTA PRINCIPAL ---
app.get('/', (req, res) => {
    // Apuntamos específicamente a la carpeta 'public'
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- LÓGICA DE LOGIN ---
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Credenciales: admin@test.com / 123456
    if (email === "admin@test.com" && password === "123456") {
        return res.json({ 
            success: true, 
            rol: 'admin', 
            email: email, 
            redirect: 'landing.html' // Express ya sabe que está en public
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
