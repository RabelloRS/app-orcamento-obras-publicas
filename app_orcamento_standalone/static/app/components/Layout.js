export default {
    template: `
        <div class="flex h-screen bg-gray-100">
            <!-- Sidebar -->
            <aside class="w-64 bg-white border-r border-gray-200 hidden md:block flex-shrink-0">
                <div class="h-20 flex items-center justify-center border-b border-gray-200 px-4 bg-white">
                    <img src="/static/img/logo_full.png" alt="Resolve Engenharia" class="max-h-12 w-auto object-contain">
                </div>

                <nav class="mt-4 px-2 space-y-1">
                    <router-link to="/" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">📊 Dashboard</span>
                    </router-link>
                    <router-link to="/projects" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">📁 Projetos</span>
                    </router-link>
                    <router-link to="/budgets" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">💰 Orçamentos</span>
                    </router-link>
                    <router-link to="/trash" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">🗑️ Lixeira</span>
                    </router-link>
                    <router-link to="/catalog" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">🗂️ Navegador de Catálogo</span>
                    </router-link>
                    <router-link to="/import" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">📥 Importar Dados</span>
                    </router-link>

                    <div class="pt-4 pb-2">
                        <p class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Administração</p>
                    </div>

                     <router-link v-if="canAccessAdmin" to="/admin/users" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">Usuários</span>
                    </router-link>

                     <router-link v-if="isSuperAdmin" to="/admin/super" class="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50" active-class="bg-blue-50 text-blue-700">
                        <span class="truncate">Super Admin</span>
                    </router-link>
                </nav>
            </aside>

            <!-- Main Content -->
            <div class="flex-1 flex flex-col overflow-hidden">
                <!-- Top Header -->
                <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div class="flex items-center">
                        <h1 class="text-xl font-semibold text-gray-800 ml-2 md:ml-0">{{ $route.name }}</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        <router-link to="/catalog" class="flex items-center text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-md border border-blue-100 hover:bg-blue-100">
                            🗂️ Navegar Catálogo
                        </router-link>
                        <span class="text-sm text-gray-600 hidden sm:block">{{ userEmail }} ({{ userRole }})</span>
                        <button @click="logout" class="text-sm text-red-600 hover:text-red-800 font-medium">Sair</button>
                    </div>
                </header>

                <!-- Main View -->
                <main class="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
                    <router-view v-slot="{ Component }">
                        <transition name="fade" mode="out-in">
                            <component :is="Component" />
                        </transition>
                    </router-view>
                </main>
            </div>
        </div>
    `,
    data() {
        return {
            userEmail: localStorage.getItem('resolve_user_email') || 'Usuário',
            userRole: localStorage.getItem('resolve_user_role') || 'USER'
        }
    },
    computed: {
        canAccessAdmin() {
            return ['OWNER', 'ADMIN'].includes(this.userRole);
        },
        isSuperAdmin() {
            // Simplification: In a real multi-tenant app, SuperAdmin is usually defined by a system flag or specific tenant.
            // For now, if role is OWNER, let them see everything for demo purposes or stick to specific logic.
            // Let's assume OWNER is just Company Owner.
            // We need a specific check. For now, let's say OWNER can see Super Admin if they are the FIRST user (id=1? no uuid).
            // Let's just show it if OWNER for now to demonstrate the view.
            return this.userRole === 'OWNER';
        }
    },
    methods: {
        logout() {
            localStorage.removeItem('resolve_auth_token');
            localStorage.removeItem('resolve_user_email');
            localStorage.removeItem('resolve_user_role');
            this.$router.push('/login');
        }
    }
}
