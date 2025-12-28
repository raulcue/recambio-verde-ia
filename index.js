const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Servir estáticos de ambas rutas para mayor seguridad
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname)));

// 2. RUTA PRINCIPAL CON RUTA ABSOLUTA
app.get('/', (req, res) => {
    // Intentamos la ruta que vimos en tu captura (dentro de public)
    const filePath = path.resolve(__dirname, 'public', 'index.html');
    
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("No se encontró en /public, intentando raíz...");
            // Backup: Intentar enviarlo desde la raíz si no estaba en public
            res.sendFile(path.resolve(__dirname, 'index.html'), (err2) => {
                if (err2) {
                    res.status(404).send("Error crítico: index.html no encontrado. Revisa la estructura en GitHub.");
                }
            });
        }
    });
});

// 3. LOGIN (admin@test.com / 123456)
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Intento de login: ${email}`);

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
    console.log(`Directorio actual: ${__dirname}`);
});
