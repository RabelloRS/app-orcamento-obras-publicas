import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-6">
            <h2 class="text-lg font-medium text-gray-900">Administração Geral (Super Admin)</h2>

            <div class="bg-white shadow overflow-hidden sm:rounded-md">
                <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900">Tenants (Empresas)</h3>
                </div>
                <ul class="divide-y divide-gray-200">
                    <li v-for="tenant in tenants" :key="tenant.id" class="px-4 py-4 sm:px-6">
                        <div class="flex items-center justify-between">
                            <div class="text-sm font-medium text-blue-600 truncate">{{ tenant.name }}</div>
                            <div class="ml-2 flex-shrink-0 flex">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                    :class="tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                                    {{ tenant.is_active ? 'Ativo' : 'Inativo' }}
                                </span>
                            </div>
                        </div>
                        <div class="mt-2 sm:flex sm:justify-between">
                            <div class="sm:flex">
                                <p class="flex items-center text-sm text-gray-500">
                                    CNPJ: {{ tenant.cnpj }}
                                </p>
                            </div>
                            <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <!-- Actions like Approve/Block could go here -->
                            </div>
                        </div>
                    </li>
                </ul>
                <div v-if="tenants.length === 0" class="p-4 text-center text-gray-500">
                    Nenhuma empresa encontrada.
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            tenants: []
        }
    },
    mounted() {
        this.fetchTenants();
    },
    methods: {
        async fetchTenants() {
            try {
                const res = await api.get('/auth/tenants');
                this.tenants = res.data;
            } catch (err) {
                console.error("Failed to fetch tenants (Likely not authorized)");
            }
        }
    }
}
