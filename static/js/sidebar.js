// Sidebar behavior extracted from templates/base.html
(function(){
    const sidebar = document.getElementById('appSidebar');
    const collapseBtn = document.getElementById('sidebarCollapse');
    const toggleTop = document.getElementById('sidebarToggleTop');

    function setCollapsed(collapsed) {
        if (!sidebar) return;
        if (collapsed) {
            sidebar.classList.add('collapsed');
            localStorage.setItem('sidebarCollapsed','1');
        } else {
            sidebar.classList.remove('collapsed');
            localStorage.removeItem('sidebarCollapsed');
        }
    }

    function updateCollapseIcon() {
        if (!collapseBtn) return;
        const ic = collapseBtn.querySelector('i');
        if (!ic) return;
        if (sidebar.classList.contains('collapsed')) {
            ic.classList.remove('bi-chevron-left');
            ic.classList.add('bi-chevron-right');
        } else {
            ic.classList.remove('bi-chevron-right');
            ic.classList.add('bi-chevron-left');
        }
    }

    if (collapseBtn) collapseBtn.addEventListener('click', () => { setCollapsed(!sidebar.classList.contains('collapsed')); updateCollapseIcon(); });
    if (toggleTop) toggleTop.addEventListener('click', () => sidebar.classList.toggle('open'));
    if (localStorage.getItem('sidebarCollapsed') === '1') setCollapsed(true);
    updateCollapseIcon();
})();
