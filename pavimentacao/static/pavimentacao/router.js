const routes = {
    'traffic': { title: 'Tráfego', icon: 'car', view: () => import('./traffic_view.js') },
    'soil': { title: 'Solo e Leito', icon: 'shovel', view: () => import('./soil_view.js') },
    'structure': { title: 'Estrutura', icon: 'layers', view: () => import('./structure_view.js') },
    'drainage': { title: 'Drenagem', icon: 'cloud-rain', view: () => import('./drainage_view.js') },
    'report': { title: 'Relatório', icon: 'file-text', view: () => import('./report_view.js') }
};

let currentRoute = null;

export const initRouter = () => {
    renderSidebar();
    navigate('traffic');
};

export const navigate = async (routeKey) => {
    if (!routes[routeKey]) return;
    currentRoute = routeKey;
    document.querySelectorAll('.nav-item').forEach(el => {
        if (el.dataset.route === routeKey) {
            el.classList.add('bg-dnit-50', 'text-dnit-600', 'border-r-4', 'border-dnit-600');
            el.classList.remove('text-slate-600', 'hover:bg-slate-50');
        } else {
            el.classList.remove('bg-dnit-50', 'text-dnit-600', 'border-r-4', 'border-dnit-600');
            el.classList.add('text-slate-600', 'hover:bg-slate-50');
        }
    });
    const container = document.getElementById('app-container');
    container.innerHTML = '<div class="flex items-center justify-center h-full text-slate-400">Carregando...</div>';
    const module = await routes[routeKey].view();
    document.getElementById('page-title').innerText = routes[routeKey].title;
    module.render(container);
};

const renderSidebar = () => {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = Object.entries(routes).map(([key, route]) => `
        <button class="nav-item w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all group" data-route="${key}">
            <i data-lucide="${route.icon}" class="w-5 h-5 text-slate-400 group-hover:text-dnit-500 transition-colors"></i>
            ${route.title}
        </button>
    `).join('');
    lucide.createIcons();
    nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.route));
    });
};