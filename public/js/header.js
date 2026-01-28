// ===============================
// 🧠 HEADER GLOBAL ENGINE
// ===============================

console.log('🧠 Header.js cargado');

// -------------------------------
// Normalizar estado
// -------------------------------
function normalizarEstado(txt = '') {
    return txt
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

// -------------------------------
// 🚚 Total Tránsito
// -------------------------------
async function actualizarTotalTransito() {
    try {
        const res = await fetch('/api/pedidos', { cache: 'no-store' });
        if (!res.ok) return;

        const pedidos = await res.json();

        const total = pedidos
            .filter(p => {
                const estado = normalizarEstado(p.estado);
                return estado === 'transito' || estado === 'en transito';
            })
            .reduce((sum, p) => sum + Number(p.precio || 0), 0);

        const el = document.getElementById('total-general');
        if (el) {
            el.innerText = `${total.toFixed(0)}€`;
        }

        console.log('🚚 Total Tránsito actualizado:', total);
    } catch (err) {
        console.warn('⚠️ Error calculando total tránsito:', err);
    }
}

// -------------------------------
// 🟢 Estado base de datos
// -------------------------------
async function checkDatabaseHealth() {
    const dot = document.getElementById('db-status');
    if (!dot) return;

    try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) throw new Error('Health not OK');

        const data = await res.json();

        if (data.status === 'ok') {
            dot.classList.remove('bg-red-500');
            dot.classList.add('bg-emerald-500');
            dot.title = 'Base de datos conectada';
        } else {
            throw new Error('DB warning');
        }

    } catch (err) {
        dot.classList.remove('bg-emerald-500');
        dot.classList.add('bg-red-500');
        dot.title = 'Base de datos no disponible';
        console.warn('⚠️ DB health error:', err);
    }
}

// -------------------------------
// 🔐 Cerrar sesión
// -------------------------------
function cerrarSesion() {
    console.log('🔐 Cerrando sesión...');
    localStorage.clear();
    window.location.href = 'index.html';
}

// 👉 Exponer globalmente (importante)
window.cerrarSesion = cerrarSesion;

// -------------------------------
// 🚀 Bootstrap Header
// -------------------------------
function initHeader() {
    console.log('🚀 Inicializando header...');

    actualizarTotalTransito();
    checkDatabaseHealth();

    setInterval(actualizarTotalTransito, 15000);
    setInterval(checkDatabaseHealth, 10000);
}

// Esperar a que el DOM y el header estén pintados
document.addEventListener('DOMContentLoaded', () => {
    // Espera pequeña para asegurar que el fetch del header terminó
    setTimeout(initHeader, 300);
});
