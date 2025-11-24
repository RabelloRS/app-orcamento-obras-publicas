import { store } from './state.js';
import * as trafficView from './traffic_view.js';
import * as soilView from './soil_view.js';
import * as structureView from './structure_view.js';
import * as drainageView from './drainage_view.js';
import * as reportView from './report_view.js';

const routes = {
    'traffic': { title: 'Tráfego (N)', icon: 'car', render: trafficView.render },
    'soil': { title: 'Subleito e Solo', icon: 'shovel', render: soilView.render },
    'structure': { title: 'Estrutura DNIT', icon: 'layers', render: structureView.render },
    'drainage': { title: 'Drenagem', icon: 'cloud-rain', render: drainageView.render },
    'report': { title: 'Relatório', icon: 'file-text', render: reportView.render }
};

let currentRoute = 'traffic';

document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    initSidebar();
    initGlobalListeners();
    navigateTo('traffic');
});

function initRouter() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = Object.entries(routes).map(([key, route]) => `
        <a href="#" data-route="${key}" class="nav-link flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-dnit-600 transition-all group">
            <i data-lucide="${route.icon}" class="w-5 h-5 text-slate-400 group-hover:text-dnit-500 transition-colors"></i>
            ${route.title}
        </a>
    `).join('');

    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.route);
            if (window.innerWidth < 1024) toggleSidebar(false);
        });
    });
}

function navigateTo(routeKey) {
    if (!routes[routeKey]) return;
    currentRoute = routeKey;


    document.querySelectorAll('.nav-link').forEach(l => {
        if (l.dataset.route === routeKey) {
            l.classList.add('bg-dnit-50', 'text-dnit-700');
            l.querySelector('i').classList.remove('text-slate-400');
            l.querySelector('i').classList.add('text-dnit-600');
        } else {
            l.classList.remove('bg-dnit-50', 'text-dnit-700');
            l.querySelector('i').classList.add('text-slate-400');
            l.querySelector('i').classList.remove('text-dnit-600');
        }
    });

    document.getElementById('page-title').innerText = routes[routeKey].title;

    const container = document.getElementById('app-container');
    container.innerHTML = ''; // Clear
    routes[routeKey].render(container);
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const btn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('close-sidebar');

    function toggle(show) {
        if (show) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        }
    }

    btn.addEventListener('click', () => toggle(true));
    closeBtn.addEventListener('click', () => toggle(false));
    overlay.addEventListener('click', () => toggle(false));
}

function initGlobalListeners() {
    document.getElementById('btn-demo').addEventListener('click', () => {
        if(confirm('Carregar dados de exemplo da norma DNIT? O trabalho atual será substituído.')) {
            store.loadDemoData();
            navigateTo(currentRoute); // Refresh view
        }
    });
}


window.navigateTo = navigateTo;
