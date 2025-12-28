const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar datos JSON en el login
app.use(express.json());

/**
 * 1. CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS
 * Según tu estructura, los archivos están en la carpeta 'public'.
 * Esto permite que el navegador encuentre /assets/logo.png y /js/global.js
 */
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname)));

/**
 * 2. RUTA PRINCIPAL
 * Envía el archivo index.html ubicado dentro de la carpeta public.
 */
app.get('/', (req, res) => {
    const indexPath = path.resolve(__dirname, 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            // Si no está en public, intenta en la raíz por seguridad
            res.sendFile(path.resolve(__dirname, 'index.html'), (err2) => {
                if (err2) {
                    res.status(404).send("Error crítico: index.html no encontrado.");
                }
            });
        }
    });
});

/**
 * 3. LÓGICA DE AUTENTICACIÓN
 * Credenciales:
 * - admin@recambio.com / 1234
 * - taller@test.com / 1234
 */
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    console.log(`Intento de acceso: ${email}`);

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

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Recambio Reciclado listo en puerto ${PORT}`);
    console.log(`Directorio base: ${__dirname}`);
});
