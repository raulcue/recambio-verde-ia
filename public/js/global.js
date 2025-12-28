/**
 * GLOBAL.JS - Recambio Reciclado IA
 * Gestión de Interfaz, Seguridad, Navegación y Preferencias de Usuario
 */

function cargarInterfazGlobal() {
    const userEmail = localStorage.getItem('userEmail') || 'Usuario';
    const iniciales = userEmail.substring(0, 2).toUpperCase();
    const rol = localStorage.getItem('userRol');
    const path = window.location.pathname;

    // 1. SEGURIDAD: Bloqueo de acceso al Kanban para perfiles Taller
    if (rol === 'taller' && path.includes('dashboard.html')) {
        console.warn("Acceso denegado: Redirigiendo a vista de taller.");
        window.location.replace('pedidos-taller.html');
        return;
    }

    // 2. INYECTAR NAVBAR (Estilo Google con Waffle Menu)
    const navbar = `
    <nav class="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm transition-colors duration-300 navbar-custom">
        <div class="flex items-center gap-4">
            <img src="/assets/logo.png" class="h-8 cursor-pointer" alt="Logo" onclick="window.location.href='landing.html'">
            <span class="text-slate-800 font-black text-sm uppercase tracking-tighter border-l pl-4 border-slate-200 hidden sm:inline">
                Recambio Reciclado IA
            </span>
        </div>
        
        <div class="flex items-center gap-4 sm:gap-6">
            <div class="relative cursor-pointer hover:bg-slate-100 p-2 rounded-full transition">
                <i class="fas fa-bell text-slate-500"></i>
                <span id="noti-count" class="absolute top-1 right-1 bg-red-500 text-white text-[8px] px-1 rounded-full hidden">0</span>
            </div>

            <div class="group relative p-2 hover:bg-slate-100 rounded-full cursor-pointer transition">
                <i class="fas fa-th text-slate-500 text-lg"></i>
                <div class="absolute right-0 mt-2 w-56 bg-white border rounded-2xl shadow-2xl hidden group-hover:block z-[60] overflow-hidden p-2 ring-1 ring-black/5">
                    <p class="text-[9px] font-black text-slate-400 uppercase p-2 tracking-widest border-b mb-1">Aplicaciones</p>
                    
                    ${rol !== 'taller' ? `
                    <a href="landing.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition">
                        <i class="fas fa-home text-blue-500 w-4"></i> Panel Principal
                    </a>
                    <a href="dashboard.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition">
                        <i class="fas fa-columns text-green-500 w-4"></i> Kanban Pedidos
                    </a>
                    <a href="configuracion.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition">
                        <i class="fas fa-users-cog text-amber-500 w-4"></i> Usuarios
                    </a>
                    ` : ''}

                    <a href="pedidos-taller.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl transition">
                        <i class="fas fa-box text-purple-500 w-4"></i> Mis Recambios
                    </a>

                    <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 rounded-xl mt-2 border-t transition">
                        <i class="fas fa-sign-out-alt w-4"></i> Cerrar Sesión
                    </button>
                </div>
            </div>

            <div class="flex flex-col items-center">
                <div title="${userEmail}" class="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-black text-[10px] shadow-inner border-2 border-white ring-1 ring-slate-200">
                    ${iniciales}
                </div>
            </div>
        </div>
    </nav>`;

    // 3. INYECTAR FOOTER
    const footer = `
    <footer class="mt-20 py-12 border-t border-slate-200 bg-white text-center transition-colors duration-300 footer-custom">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Desarrollado por <span class="text-slate-900 italic">Raul C.</span>
        </p>
        <p class="text-slate-400 text-[9px] mt-1 font-bold uppercase tracking-tighter">
            raulcue@gmail.com | Versión Beta 1.2
        </p>
        <p class="text-slate-300 text-[8px] mt-4 uppercase">
            © Copyright 2026-2030 - Recambio Reciclado IA
        </p>
        <div class="mt-4">
            <a href="privacidad.html" target="_blank" class="text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 underline underline-offset-4 tracking-widest transition">
                Política de Privacidad
            </a>
        </div>
    </footer>`;

    if (!document.querySelector('nav')) {
        document.body.insertAdjacentHTML('afterbegin', navbar);
    }
    if (!document.querySelector('footer')) {
        document.body.insertAdjacentHTML('beforeend', footer);
    }

    // 4. MODO OSCURO PERSISTENTE
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}

/**
 * GESTIÓN DE VISTA KANBAN (Persistencia)
 */
function obtenerPreferenciaVista() {
    return localStorage.getItem('kanban_view_preference') || 'compact';
}

function guardarPreferenciaVista(modo) {
    localStorage.setItem('kanban_view_preference', modo);
}

/**
 * Cierra la sesión y limpia el almacenamiento local
 */
function logout() {
    localStorage.clear();
    window.location.replace('index.html');
}

/**
 * Función auxiliar para notificaciones visuales
 */
function actualizarContadorNotificaciones(num) {
    const el = document.getElementById('noti-count');
    if (el) {
        if (num > 0) {
            el.innerText = num;
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', cargarInterfazGlobal);
