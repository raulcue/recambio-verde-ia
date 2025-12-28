const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para entender JSON (vital para que el login funcione)
app.use(express.json());

// 1. SERVIR ARCHIVOS ESTÁTICOS
// Intentamos servir desde 'public' y luego desde la raíz para que carguen assets y js
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname)));

// 2. RUTA PRINCIPAL (index.html)
app.get('/', (req, res) => {
    // Buscamos el index dentro de public según tu estructura actual
    const indexPath = path.resolve(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // Si por algún motivo no está en public, intenta en la raíz
            res.sendFile(path.resolve(__dirname, 'index.html'), (err2) => {
                if (err2) res.status(404).send("Error: No se encuentra index.html");
            });
        }
    });
});

// 3. LÓGICA DE LOGIN (Con tus credenciales exactas)
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

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
