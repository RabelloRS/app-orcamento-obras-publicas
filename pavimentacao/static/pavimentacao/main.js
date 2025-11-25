import { initRouter } from './router.js';
import { store } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    initRouter();

    // Sidebar Logic
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const btnMenu = document.getElementById('btn-menu');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');

    const toggleSidebar = () => {
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarBackdrop.classList.remove('hidden', 'opacity-0');
        } else {
            sidebar.classList.add('-translate-x-full');
            sidebarBackdrop.classList.add('opacity-0');
            setTimeout(() => sidebarBackdrop.classList.add('hidden'), 300);
        }
    };

    if (btnMenu) btnMenu.addEventListener('click', toggleSidebar);
    if (btnCloseSidebar) btnCloseSidebar.addEventListener('click', toggleSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', toggleSidebar);

    document.getElementById('btn-save').addEventListener('click', () => {
        const data = JSON.stringify(store.getState(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pavimentacao_br_${new Date().getTime()}.json`;
        a.click();
    });
});