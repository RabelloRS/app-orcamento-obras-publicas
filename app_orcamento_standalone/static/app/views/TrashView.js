import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-lg font-semibold text-gray-900">Lixeira</h2>
                    <p class="text-sm text-gray-500">Projete, restaure ou exclua definitivamente projetos e orçamentos.</p>
                </div>
                <div class="inline-flex rounded-md shadow-sm" role="group">
                    <button @click="activeTab = 'projects'; refresh()" :class="tabClass('projects')">Projetos</button>
                    <button @click="activeTab = 'budgets'; refresh()" :class="tabClass('budgets')">Orçamentos</button>
                </div>
            </div>

            <div class="bg-white shadow sm:rounded-lg border border-gray-200">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" v-if="isBudgets">Projeto</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Excluído em</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" v-if="!loading && items.length">
                            <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50">
                                <td class="px-4 py-3 text-sm text-gray-900">{{ item.name }}</td>
                                <td class="px-4 py-3 text-sm text-gray-500" v-if="isBudgets">{{ item.project_id }}</td>
                                <td class="px-4 py-3 text-sm text-gray-500">{{ formatDate(item.deleted_at) }}</td>
                                <td class="px-4 py-3 text-sm text-gray-500">{{ item.deleted_reason || '-' }}</td>
                                <td class="px-4 py-3 text-sm text-right space-x-2">
                                    <button @click="restore(item)" class="px-3 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-xs">Restaurar</button>
                                    <button @click="hardDelete(item)" class="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs">Excluir definitivamente</button>
                                </td>
                            </tr>
                        </tbody>
                        <tbody v-else-if="loading">
                            <tr><td class="px-4 py-6 text-center text-gray-500" :colspan="isBudgets ? 5 : 4">Carregando...</td></tr>
                        </tbody>
                        <tbody v-else>
                            <tr><td class="px-4 py-6 text-center text-gray-500" :colspan="isBudgets ? 5 : 4">Nenhum item na lixeira.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            activeTab: 'projects',
            projects: [],
            budgets: [],
            loading: false
        }
    },
    computed: {
        isBudgets() { return this.activeTab === 'budgets'; },
        items() { return this.isBudgets ? this.budgets : this.projects; }
    },
    mounted() {
        this.refresh();
    },
    methods: {
        tabClass(tab) {
            const active = this.activeTab === tab;
            return `px-4 py-2 text-sm font-medium border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;
        },
        formatDate(value) {
            if (!value) return '-';
            return new Date(value).toLocaleString('pt-BR');
        },
        async refresh() {
            if (this.activeTab === 'projects') {
                await this.fetchProjectsTrash();
            } else {
                await this.fetchBudgetsTrash();
            }
        },
        async fetchProjectsTrash() {
            this.loading = true;
            try {
                const res = await api.get('/projects/trash');
                this.projects = res.data.items || [];
            } catch (err) {
                console.error('Erro ao carregar lixeira de projetos', err);
            } finally {
                this.loading = false;
            }
        },
        async fetchBudgetsTrash() {
            this.loading = true;
            try {
                const res = await api.get('/budgets/trash');
                this.budgets = res.data.items || [];
            } catch (err) {
                console.error('Erro ao carregar lixeira de orçamentos', err);
            } finally {
                this.loading = false;
            }
        },
        async restore(item) {
            if (this.isBudgets) {
                try {
                    await api.post(`/budgets/${item.id}/restore`);
                    await this.fetchBudgetsTrash();
                } catch (err) {
                    alert('Erro ao restaurar orçamento');
                }
            } else {
                try {
                    await api.post(`/projects/${item.id}/restore`);
                    await this.fetchProjectsTrash();
                } catch (err) {
                    alert('Erro ao restaurar projeto');
                }
            }
        },
        async hardDelete(item) {
            const warn = this.isBudgets
                ? 'Excluir definitivamente este orçamento? Esta ação é irreversível.'
                : 'Excluir definitivamente este projeto e todos os orçamentos? Esta ação é irreversível.';
            if (!confirm(warn)) return;

            if (this.isBudgets) {
                try {
                    await api.delete(`/budgets/${item.id}/hard`);
                    await this.fetchBudgetsTrash();
                } catch (err) {
                    alert('Erro ao excluir orçamento');
                }
            } else {
                try {
                    await api.delete(`/projects/${item.id}/hard`);
                    await this.fetchProjectsTrash();
                } catch (err) {
                    alert('Erro ao excluir projeto');
                }
            }
        }
    }
}
