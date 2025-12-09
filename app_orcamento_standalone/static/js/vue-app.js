import LoginView from '../app/views/LoginView.js?v=2';
import RegisterView from '../app/views/RegisterView.js?v=2';
import ForgotPasswordView from '../app/views/ForgotPasswordView.js?v=2';
import DashboardView from '../app/views/DashboardView.js?v=2';
import ProjectsView from '../app/views/ProjectsView.js?v=3';
import BudgetsView from '../app/views/BudgetsView.js?v=14';
import TrashView from '../app/views/TrashView.js?v=1';
import ImportView from '../app/views/ImportView.js?v=16';
import ExplorerView from '../app/views/ExplorerView.js?v=2';
import CatalogNavigatorView from '../app/views/CatalogNavigatorView.js?v=2';
import AdminUsersView from '../app/views/AdminUsersView.js?v=2';
import SuperAdminView from '../app/views/SuperAdminView.js?v=2';
import Layout from '../app/components/Layout.js';

const routes = [
    {
        path: '/login',
        component: LoginView,
        name: 'Login'
    },
    {
        path: '/register',
        component: RegisterView,
        name: 'Registro'
    },
    {
        path: '/forgot-password',
        component: ForgotPasswordView,
        name: 'Recuperar Senha'
    },
    {
        path: '/',
        component: Layout,
        children: [
            { path: '', component: DashboardView, name: 'Dashboard' },
            { path: 'projects', component: ProjectsView, name: 'Projetos' },
            { path: 'budgets', component: BudgetsView, name: 'Orçamentos' },
            { path: 'trash', component: TrashView, name: 'Lixeira' },
            { path: 'import', component: ImportView, name: 'Importar Dados' },
            { path: 'explorer', component: ExplorerView, name: 'Explorador' },
            { path: 'catalog', component: CatalogNavigatorView, name: 'Navegador de Catálogo' },

            // Admin Routes
            { path: 'admin/users', component: AdminUsersView, name: 'Gerenciar Usuários' },
            { path: 'admin/super', component: SuperAdminView, name: 'Super Admin' },
        ],
        meta: { requiresAuth: true }
    }
];

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const isAuthenticated = !!localStorage.getItem('resolve_auth_token');

    // Public routes
    if (['/login', '/register', '/forgot-password'].includes(to.path)) {
        if (isAuthenticated) {
            next('/');
        } else {
            next();
        }
        return;
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login');
    } else {
        next();
    }
});

const app = Vue.createApp({
    template: '<router-view></router-view>'
});
app.use(router);
app.mount('#app');


