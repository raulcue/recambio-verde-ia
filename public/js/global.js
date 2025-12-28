function cargarInterfazGlobal() {
    const userEmail = localStorage.getItem('userEmail') || 'Usuario';
    const iniciales = userEmail.substring(0, 2).toUpperCase();
    const rol = localStorage.getItem('userRol');
    const path = window.location.pathname;

    // SEGURIDAD: Bloqueo de acceso al Kanban para Talleres
    if (rol === 'taller' && path.includes('dashboard.html')) {
        alert("Acceso denegado: Tu perfil solo permite gestión de pedidos.");
        window.location.replace('pedidos-taller.html');
        return;
    }

    // 1. Inyectar Navbar estilo Google
    const navbar = `
    <nav class="h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
        <div class="flex items-center gap-4">
            <img src="/assets/logo.png" class="h-8">
            <span class="text-slate-800 font-black text-sm uppercase tracking-tighter border-l pl-4 border-slate-200">Recambio Reciclado IA</span>
        </div>
        
        <div class="flex items-center gap-6">
            <div class="relative cursor-pointer hover:bg-slate-100 p-2 rounded-full transition">
                <i class="fas fa-bell text-slate-500"></i>
                <span id="noti-count" class="absolute top-1 right-1 bg-red-500 text-white text-[8px] px-1 rounded-full hidden">0</span>
            </div>

            <div class="group relative p-2 hover:bg-slate-100 rounded-full cursor-pointer transition">
                <i class="fas fa-th text-slate-500 text-lg"></i>
                <div class="absolute right-0 mt-2 w-56 bg-white border rounded-2xl shadow-2xl hidden group-hover:block z-[60] p-2">
                    <p class="text-[9px] font-black text-slate-400 uppercase p-2 tracking-widest border-b mb-1">Aplicaciones</p>
                    ${rol !== 'taller' ? `
                    <a href="landing.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl">
                        <i class="fas fa-home text-blue-500"></i> Panel Principal
                    </a>
                    <a href="dashboard.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl">
                        <i class="fas fa-columns text-green-500"></i> Kanban Pedidos
                    </a>` : ''}
                    <a href="pedidos-taller.html" class="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50 rounded-xl">
                        <i class="fas fa-box text-purple-500"></i> Mis Recambios
                    </a>
                    <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 rounded-xl mt-2 border-t">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </button>
                </div>
            </div>

            <div class="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center font-black text-[10px] shadow-inner ring-2 ring-slate-100">
                ${iniciales}
            </div>
        </div>
    </nav>`;

    // 2. Inyectar Footer
    const footer = `
    <footer class="mt-20 py-12 border-t border-slate-200 bg-white text-center">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Desarrollado por <span class="text-slate-900">Raul C.</span></p>
        <p class="text-slate-400 text-[9px] mt-1 font-bold uppercase">raulcue@gmail.com | Versión Beta 1.0</p>
        <p class="text-slate-300 text-[8px] mt-4 uppercase">© 2026-2030 - Recambio Reciclado IA</p>
        <div class="mt-4"><a href="privacidad.html" class="text-[9px] font-black uppercase text-slate-400 hover:text-slate-900 underline tracking-widest">Política de Privacidad</a></div>
    </footer>`;

    if(!document.querySelector('nav')) document.body.insertAdjacentHTML('afterbegin', navbar);
    if(!document.querySelector('footer')) document.body.insertAdjacentHTML('beforeend', footer);
}

function logout() { localStorage.clear(); window.location.href = 'index.html'; }
document.addEventListener('DOMContentLoaded', cargarInterfazGlobal);
