/**
 * GLOBAL.JS - Recambio Reciclado IA
 * Gestión de Interfaz, Seguridad (2FA Latente), Navegación y Preferencias
 */

const CONFIG_SEGURIDAD = {
    // CAMBIAR A 'true' cuando haya servidor de correo para obligar el uso de 2FA
    force2FA: false, 
    version: "Beta 1.2"
};

function cargarInterfazGlobal() {
    const userEmail = localStorage.getItem('userEmail') || 'Usuario';
    const iniciales = userEmail.substring(0, 2).toUpperCase();
    const rol = localStorage.getItem('userRol');
    const path = window.location.pathname;

    // 1. SEGURIDAD: Bloqueo de acceso al Kanban para perfiles Taller
    if (rol === 'taller' && path.includes('dashboard.html')) {
        window.location.replace('pedidos-taller.html');
        return;
    }

    // 2. SEGURIDAD: Lógica de 2FA Latente (Solo si force2FA es true)
    if (CONFIG_SEGURIDAD.force2FA && (rol === 'admin' || rol === 'gestor')) {
        if (!sessionStorage.getItem('2fa_verified') && !path.includes('login-2fa.html') && !path.includes('index.html')) {
            window.location.href = 'login-2fa.html';
            return;
        }
    }

    // 3. INYECTAR NAVBAR (Actualizada con Toggle Dark Mode)
    const navbar = `
    <nav class="h-16 bg-white dark:bg-slate-900 border-b dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div class="flex items-center gap-4">
            <img src="/assets/logo.png" class="h-8 cursor-pointer dark:brightness-0 dark:invert" alt="Logo" onclick="window.location.href='landing.html'">
            <span class="text-slate-800 dark:text-white font-black text-sm uppercase tracking-tighter border-l pl-4 border-slate-200 dark:border-slate-700 hidden sm:inline">
                Recambio Reciclado IA
            </span>
        </div>
        
        <div class="flex items-center gap-3 sm:gap-4">
            <button onclick="toggleDarkMode()" class="w-9 h-9 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all">
                <i class="fas fa-moon dark:hidden"></i>
                <i class="fas fa-sun hidden dark:block text-yellow-500"></i>
            </button>

            <div class="group relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition">
                <i class="fas fa-th text-slate-500 text-lg"></i>
                <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-2xl shadow-2xl hidden group-hover:block z-[60] overflow-hidden p-2">
                    <p class="text-[9px] font-black text-slate-400 uppercase p-2 tracking-widest border-b dark:border-slate-800 mb-1">Aplicaciones</p>
                    ${rol !== 'taller' ? `
                    <a href="landing.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                        <i class="fas fa-home text-blue-500 w-4"></i> Panel Principal
                    </a>
                    <a href="dashboard.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                        <i class="fas fa-columns text-green-500 w-4"></i> Kanban Pedidos
                    </a>
                    <a href="configuracion.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                        <i class="fas fa-users-cog text-amber-500 w-4"></i> Usuarios
                    </a>
                    <a href="stats.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                        <i class="fas fa-chart-pie text-red-500 w-4"></i> Estadísticas BI
                    </a>
                    ` : ''}
                    <a href="pedidos-taller.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition">
                        <i class="fas fa-box text-purple-500 w-4"></i> Mis Recambios
                    </a>
                    <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl mt-2 border-t dark:border-slate-800 transition">
                        <i class="fas fa-sign-out-alt w-4"></i> Cerrar Sesión
                    </button>
                </div>
            </div>

            <div class="w-10 h-10 bg-slate-800 dark:bg-white dark:text-slate-900 text-white rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white dark:border-slate-700 shadow-sm">
                ${iniciales}
            </div>
        </div>
    </nav>`;

    // 4. INYECTAR FOOTER
    const footer = `
    <footer class="mt-20 py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center transition-colors">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Desarrollado por <span class="text-slate-900 dark:text-white italic">Raul C.</span>
        </p>
        <p class="text-slate-400 dark:text-slate-500 text-[9px] mt-1 font-bold uppercase">
            raulcue@gmail.com | Versión ${CONFIG_SEGURIDAD.version}
        </p>
        <p class="text-slate-300 dark:text-slate-600 text-[8px] mt-4 uppercase">
            © 2026-2030 - Recambio Reciclado IA
        </p>
    </footer>`;

    if (!document.querySelector('nav')) document.body.insertAdjacentHTML('afterbegin', navbar);
    if (!document.querySelector('footer')) document.body.insertAdjacentHTML('beforeend', footer);

    aplicarPreferenciaColor();
}

/**
 * GESTIÓN DE MODO OSCURO
 */
function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

function aplicarPreferenciaColor() {
    if (localStorage.getItem('theme') === 'dark' || 
       (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

function logout() {
    localStorage.clear();
    window.location.replace('index.html');
}

document.addEventListener('DOMContentLoaded', cargarInterfazGlobal);
