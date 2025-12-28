/**
 * RECAMBIO RECICLADO IA - Global Core System
 * Versión Beta 1.2
 */

const CONFIG = {
    roles: { ADMIN: 'admin', AGENTE: 'agente', TALLER: 'taller' },
    privacidad: {
        'stats.html': ['admin', 'agente'],
        'admin-logs.html': ['admin'],
        'docs.html': ['admin', 'agente']
    }
};

// --- SEGURIDAD Y ACCESO ---
function verificarAcceso() {
    const userRole = localStorage.getItem('userRole') || 'taller'; // Por defecto taller para pruebas
    const path = window.location.pathname.split('/').pop();
    
    const permitidos = CONFIG.privacidad[path];
    if (permitidos && !permitidos.includes(userRole)) {
        window.location.href = userRole === 'taller' ? 'pedidos-taller.html' : 'landing.html';
    }
}

// --- MODO OSCURO ---
function initDarkMode() {
    if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    verificarAcceso();
    
    // Inyectar nombre de usuario si existe el elemento
    const elName = document.getElementById('nav-user-name');
    if (elName && localStorage.getItem('userName')) {
        elName.innerText = localStorage.getItem('userName');
    }
});
