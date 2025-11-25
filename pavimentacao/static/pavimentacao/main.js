import { initRouter } from './router.js';
import { store } from './state.js';

// Make store available globally for the data manager
window.pavimentacaoState = store;

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

    // Save button
    document.getElementById('btn-save').addEventListener('click', () => {
        const stateData = store.getState();
        if (window.ResolveDataManager) {
            window.ResolveDataManager.downloadProjectFile('pavimentacao_projeto', {
                appName: 'Pavimentação.br',
                state: stateData
            });
        } else {
            // Fallback to original behavior
            const data = JSON.stringify(stateData, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pavimentacao_br_${new Date().getTime()}.json`;
            a.click();
        }
    });

    // Load button
    document.getElementById('btn-load').addEventListener('click', () => {
        if (window.ResolveDataManager) {
            window.ResolveDataManager.openLoadDialog();
        } else {
            // Fallback: create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.resolve';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        if (data.state) {
                            store.setState(data.state);
                        } else {
                            store.setState(data);
                        }
                        alert('Projeto carregado com sucesso!');
                        location.reload();
                    } catch (err) {
                        alert('Erro ao carregar arquivo: ' + err.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }
    });

    // Listen for project load event from ResolveDataManager
    window.addEventListener('resolveProjectLoaded', (event) => {
        const data = event.detail;
        if (data.custom && data.custom.state) {
            store.setState(data.custom.state);
            // Reload to apply state
            location.reload();
        }
    });
});