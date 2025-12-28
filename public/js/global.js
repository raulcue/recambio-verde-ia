/**
 * GLOBAL.JS - Recambio Reciclado IA
 * Este archivo gestiona la lógica compartida entre todas las vistas.
 */

// 1. GESTIÓN DE MODO OSCURO
// -------------------------------------------------------------------------
function toggleDarkMode() {
    // Alterna la clase 'dark' en la etiqueta <html>
    document.documentElement.classList.toggle('dark');
    
    // Guarda la preferencia en el navegador del usuario
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    console.log(`Modo oscuro: ${isDark ? 'Activado' : 'Desactivado'}`);
}

// Aplicar el tema guardado inmediatamente al cargar la página
(function applyTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
})();


// 2. INICIALIZACIÓN DE INTERFAZ (Iniciales y Roles)
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Recuperamos los datos guardados durante el login (en index.html)
    const userEmail = localStorage.getItem('userEmail');
    const userRol = localStorage.getItem('userRol');

    // Buscamos el círculo de las iniciales en el navbar
    const userBadge = document.getElementById('userInitials');

    if (userBadge && userEmail) {
        // Generamos las iniciales (ej: taller@test.com -> TA)
        const initials = userEmail.substring(0, 2).toUpperCase();
        userBadge.innerText = initials;
    }

    // Si estamos en una página de admin pero el usuario es taller, lo protegemos
    // (Opcional: puedes descomentar esto si quieres seguridad básica en el cliente)
    /*
    const path = window.location.pathname;
    if (path.includes('dashboard') || path.includes('stats')) {
        if (userRol !== 'admin') {
            window.location.replace('pedidos-taller.html');
        }
    }
    */
});


// 3. CIERRE DE SESIÓN (LOGOUT)
// -------------------------------------------------------------------------
function logout() {
    console.log("Cerrando sesión...");
    
    // Limpiamos los datos de sesión
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRol');
    localStorage.removeItem('theme'); // Opcional: puedes dejar el tema guardado
    
    // Redirigimos al login
    window.location.href = '/index.html';
}

// 4. UTILIDADES COMUNES (Formateo de fechas, etc.)
// -------------------------------------------------------------------------
function formatFechaIA(fecha) {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(fecha));
}
