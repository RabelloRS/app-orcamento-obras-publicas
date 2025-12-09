import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-lg font-medium text-gray-900">Orçamentos</h2>
                <div v-if="selectedProject">
                    <button @click="showCreateModal = true" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        Novo Orçamento
                    </button>
                </div>
            </div>

            <!-- Project Selector (Simplification: Dropdown to filter) -->
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <label class="block text-sm font-medium text-gray-700">Selecione o Projeto</label>
                <select v-model="selectedProject" @change="fetchBudgets" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option :value="null">Selecione...</option>
                    <option v-for="proj in projects" :key="proj.id" :value="proj.id">{{ proj.name }}</option>
                </select>
            </div>

            <!-- Budgets List -->
            <div v-if="selectedProject && budgets.length > 0" class="bg-white shadow overflow-hidden sm:rounded-md">
                <ul class="divide-y divide-gray-200">
                    <li v-for="budget in budgets" :key="budget.id">
                        <div class="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-gray-50 cursor-pointer" @click="openBudget(budget)">
                            <div class="flex-1 truncate">
                                <div class="flex items-center justify-between">
                                    <p class="text-sm font-medium text-blue-600 truncate">{{ budget.name }}</p>
                                    <div class="ml-2 flex-shrink-0 flex">
                                        <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            {{ budget.status }}
                                        </p>
                                    </div>
                                </div>
                                <div class="mt-2 sm:flex sm:justify-between">
                                    <div class="sm:flex">
                                        <p class="flex items-center text-sm text-gray-500">
                                            Data Base: {{ budget.reference_date }}
                                        </p>
                                    </div>
                                    <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                        <p>Total: R$ {{ formatMoney(budget.total_value) }}</p>
                                    </div>
                                </div>
                            </div>
                            <div class="ml-4">
                                <button @click.stop="deleteBudget(budget.id)" class="text-red-600 hover:text-red-900 text-sm">🗑️ Excluir</button>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            <!-- Create Budget Modal -->
            <div v-if="showCreateModal" class="fixed z-10 inset-0 overflow-y-auto">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showCreateModal = false"></div>
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                        <form @submit.prevent="createBudget">
                            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 class="text-lg leading-6 font-medium text-gray-900">Novo Orçamento</h3>
                                <div class="mt-4 space-y-4">
                                    <input v-model="newBudget.name" type="text" placeholder="Nome do Orçamento" required class="block w-full border border-gray-300 rounded-md py-2 px-3">
                                    <label class="block text-sm font-medium text-gray-700">Data Base</label>
                                    <input v-model="newBudget.reference_date" type="date" required class="block w-full border border-gray-300 rounded-md py-2 px-3">
                                </div>
                            </div>
                            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">Criar</button>
                                <button type="button" @click="showCreateModal = false" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Budget Detail View (Overlay or Router Push) -->
            <!-- For simplicity in this SPA, we toggle view state -->
            <div v-if="currentBudget" class="fixed inset-0 bg-white z-50 overflow-auto flex flex-col">
                <!-- Header -->
                <div class="bg-gray-800 text-white px-4 py-3 shadow-md sticky top-0 z-10">
                    <div class="flex justify-between items-center mb-2">
                        <div>
                            <h1 class="text-lg font-bold">{{ currentBudget.name }}</h1>
                            <p class="text-sm text-gray-400">Total: R$ {{ formatMoney(currentBudget.total_value) }}</p>
                        </div>
                        <div class="space-x-2">
                            <button @click="downloadExcel" class="px-3 py-1 bg-green-600 rounded hover:bg-green-700 text-sm">Excel</button>
                            <button @click="showAddItem = true" class="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-sm">Adicionar Item</button>
                            <button @click="closeBudget" class="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700 text-sm">Fechar</button>
                        </div>
                    </div>
                    <!-- Configuration Fields -->
                    <div class="flex flex-wrap gap-4 text-sm items-center">
                        <div class="flex items-center gap-1">
                            <label class="text-gray-300">Estado:</label>
                            <select v-model="budgetConfig.price_region" @change="saveBudgetConfig" class="px-2 py-1 rounded text-gray-900 text-xs">
                                <option v-for="uf in estados" :key="uf" :value="uf">{{ uf }}</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-1">
                            <label class="text-gray-300">Mês/Ano:</label>
                            <select @change="onDateChange($event)" class="px-2 py-1 rounded text-gray-900 text-xs">
                                <option v-for="d in availableDates" :key="d.label" :value="d.month + '/' + d.year" :selected="d.month === budgetConfig.price_month && d.year === budgetConfig.price_year">
                                    {{ d.label }}
                                </option>
                            </select>
                        </div>
                        <div class="flex items-center gap-1">
                            <label class="text-gray-300">Encargos:</label>
                            <select v-model="budgetConfig.social_charges_type" @change="saveBudgetConfig" class="px-2 py-1 rounded text-gray-900 text-xs">
                                <option value="DESONERADO">Desonerado</option>
                                <option value="NAO_DESONERADO">Não Desonerado</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-1">
                            <label class="text-gray-300">BDI Normal (%):</label>
                            <input v-model.number="budgetConfig.bdi_normal" type="number" step="0.01" min="0" max="100" class="w-16 px-2 py-1 rounded text-gray-900 text-xs" @change="saveBudgetConfig">
                        </div>
                        <div class="flex items-center gap-1">
                            <label class="text-gray-300">BDI Diferenciado (%):</label>
                            <input v-model.number="budgetConfig.bdi_diferenciado" type="number" step="0.01" min="0" max="100" class="w-16 px-2 py-1 rounded text-gray-900 text-xs" @change="saveBudgetConfig">
                        </div>
                    </div>
                </div>

                <!-- Grid -->
                <div class="flex-1 overflow-auto p-4">
                    <table class="min-w-full divide-y divide-gray-200 border text-xs">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Item</th>
                                <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Código</th>
                                <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase w-1/3">Descrição</th>
                                <th class="px-2 py-2 text-center font-medium text-gray-500 uppercase">Fonte</th>
                                <th class="px-2 py-2 text-center font-medium text-gray-500 uppercase">Unid.</th>
                                <th class="px-2 py-2 text-right font-medium text-gray-500 uppercase">Qtd</th>
                                <th class="px-2 py-2 text-right font-medium text-gray-500 uppercase">P. Unit.</th>
                                <th class="px-2 py-2 text-right font-medium text-gray-500 uppercase">BDI %</th>
                                <th class="px-2 py-2 text-right font-medium text-gray-500 uppercase">Total</th>
                                <th class="px-2 py-2 text-center font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="(item, index) in budgetItems" :key="item.id" class="hover:bg-gray-50">
                                <td class="px-2 py-2 whitespace-nowrap text-gray-500">{{ index + 1 }}</td>
                                <td class="px-2 py-2 whitespace-nowrap text-blue-600 cursor-pointer" @click="viewComposition(item)">
                                    {{ item.reference_item ? item.reference_item.code : item.custom_code || '-' }}
                                </td>
                                <td class="px-2 py-2 text-gray-900">
                                    {{ item.custom_description || (item.reference_item ? item.reference_item.description : '') }}
                                </td>
                                <td class="px-2 py-2 whitespace-nowrap text-center text-gray-500">
                                    {{ item.reference_item?.source_name || '-' }}
                                </td>
                                <td class="px-2 py-2 whitespace-nowrap text-center text-gray-500">
                                    {{ item.reference_item ? item.reference_item.unit : '-' }}
                                </td>
                                <td class="px-2 py-2 whitespace-nowrap text-right text-gray-900">
                                    <input v-model.number="item.quantity" type="number" step="0.0001" @change="updateItem(item, 'quantity')" class="w-20 text-right border rounded px-1">
                                </td>
                                <td class="px-2 py-2 whitespace-nowrap text-right text-gray-500">
                                    {{ formatMoney(item.unit_price) }}
                                </td>
                                <td class="px-2 py-2 whitespace-nowrap text-center text-gray-500">
                                    <select v-model="item.bdi_type" @change="updateItemBdiType(item)" class="text-xs border rounded px-1 py-0.5">
                                        <option value="NORMAL">Normal</option>
                                        <option value="DIFERENCIADO">Dif.</option>
                                    </select>
                                    <span class="text-xs ml-1">({{ item.bdi_type === 'DIFERENCIADO' ? budgetConfig.bdi_diferenciado : budgetConfig.bdi_normal }}%)</span>
                                </td>
                                <td class="px-2 py-2 whitespace-nowrap text-right text-gray-900 font-bold">
                                    {{ formatMoney(item.total_price) }}
                                </td>
                                <td class="px-2 py-2 whitespace-nowrap text-center">
                                    <button @click="deleteItem(item.id)" class="text-red-600 hover:text-red-900">🗑️</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Add Item Modal (Search) -->
            <div v-if="showAddItem" class="fixed z-50 inset-0 overflow-y-auto">
                <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" @click="showAddItem = false"></div>
                    <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 h-[60vh] flex flex-col">
                            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Adicionar Serviço</h3>
                            
                            <!-- Advanced Filters -->
                            <div class="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-xs font-medium text-gray-700">Fonte</label>
                                    <select v-model="filters.source" class="mt-1 block w-full border border-gray-300 rounded-md py-1 px-2 text-sm">
                                        <option value="">Todas</option>
                                        <option value="SINAPI">SINAPI</option>
                                        <option value="SICRO">SICRO</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700">Tipo</label>
                                    <select v-model="filters.type" class="mt-1 block w-full border border-gray-300 rounded-md py-1 px-2 text-sm">
                                        <option value="">Todos</option>
                                        <option value="COMPOSITION">Composição</option>
                                        <option value="INPUT">Insumo</option>
                                    </select>
                                </div>
                                <div v-if="filters.type !== 'COMPOSITION'">
                                    <label class="block text-xs font-medium text-gray-700">Tipo de Insumo</label>
                                    <select v-model="filters.inputType" class="mt-1 block w-full border border-gray-300 rounded-md py-1 px-2 text-sm">
                                        <option value="">Todos</option>
                                        <option value="MATERIAL">Material</option>
                                        <option value="LABOR">Mão de Obra</option>
                                        <option value="EQUIPMENT">Equipamento</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-700">Unidade</label>
                                    <input v-model="filters.unit" type="text" placeholder="Ex: M3, H" class="mt-1 block w-full border border-gray-300 rounded-md py-1 px-2 text-sm">
                                </div>
                            </div>

                            <div class="flex gap-2 mb-4">
                                <div class="w-24">
                                    <input v-model.number="searchQuantity" type="number" step="0.01" min="0.01" placeholder="Qtd" class="block w-full border border-gray-300 rounded-md py-2 px-3" title="Quantidade a adicionar">
                                </div>
                                <input v-model="searchQuery" @keyup.enter="searchCatalog" type="text" placeholder="Buscar por código ou descrição..." class="flex-1 block w-full border border-gray-300 rounded-md py-2 px-3">
                                <button @click="searchCatalog" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Buscar</button>
                            </div>

                            <div class="flex-1 overflow-y-auto border rounded-md">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        <tr v-for="res in searchResults" :key="res.id" class="hover:bg-gray-50 cursor-pointer" @click="selectItemToAdd(res)">
                                            <td class="px-3 py-2 text-xs font-bold text-gray-900">{{ res.code }}</td>
                                            <td class="px-3 py-2 text-xs text-gray-700">{{ res.description }}</td>
                                            <td class="px-3 py-2 text-xs text-gray-500">{{ res.unit }}</td>
                                            <td class="px-3 py-2 text-xs text-right">
                                                <button @click.stop="selectItemToAdd(res)" class="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">Adicionar</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div v-if="searchResults.length === 0 && searchQuery" class="p-4 text-center text-gray-500">Nenhum resultado.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Composition Detail Modal -->
            <div v-if="showComposition" class="fixed z-50 inset-0 overflow-y-auto">
                <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" @click="showComposition = false"></div>
                    <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                    <div class="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                        <div class="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
                            <div class="sm:flex sm:items-start">
                                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 class="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                                        <span v-if="compositionHistory.length > 0" @click="goBackComposition" class="cursor-pointer text-blue-600 hover:underline mr-2">← Voltar</span>
                                        {{ compositionData?.code }} - {{ compositionData?.description }}
                                    </h3>
                                    <div class="mt-2 text-sm text-gray-500">
                                        <p>Unidade: {{ compositionData?.unit }} | Tipo: {{ compositionData?.type }}</p>
                                        <p v-if="compositionData?.production_hourly">Produção Equipe: {{ compositionData.production_hourly }} {{ compositionData.unit }}/h</p>
                                    </div>

                                    <div class="mt-4 border-t pt-4">
                                        <h4 class="font-bold text-sm mb-2">Composição Analítica</h4>
                                        <table class="min-w-full divide-y divide-gray-200">
                                            <thead class="bg-gray-50">
                                                <tr>
                                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500">Código</th>
                                                    <th class="px-2 py-1 text-left text-xs font-medium text-gray-500">Descrição</th>
                                                    <th class="px-2 py-1 text-right text-xs font-medium text-gray-500">Coeficiente</th>
                                                    <th class="px-2 py-1 text-right text-xs font-medium text-gray-500">Preço Unit.</th>
                                                    <th class="px-2 py-1 text-right text-xs font-medium text-gray-500">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="compItem in compositionData?.items" :key="compItem.id" class="border-b hover:bg-gray-50">
                                                    <td class="px-2 py-1 text-xs cursor-pointer" 
                                                        :class="isSubcomposition(compItem) ? 'text-blue-600 hover:underline font-medium' : 'text-gray-600'"
                                                        @click="openSubcomposition(compItem)">
                                                        {{ compItem.child_code }}
                                                        <span v-if="isSubcomposition(compItem)" class="ml-1">🔗</span>
                                                    </td>
                                                    <td class="px-2 py-1 text-xs text-gray-700">{{ compItem.child_description }}</td>
                                                    <td class="px-2 py-1 text-xs text-right">{{ compItem.coefficient }}</td>
                                                    <td class="px-2 py-1 text-xs text-right">{{ formatMoney(compItem.child_price || 0) }}</td>
                                                    <td class="px-2 py-1 text-xs text-right">{{ formatMoney((compItem.child_price || 0) * compItem.coefficient) }}</td>
                                                </tr>
                                            </tbody>
                                            <tfoot class="bg-gray-100">
                                                <tr>
                                                    <td colspan="3" class="px-2 py-2 text-xs font-bold text-gray-700 text-right">TOTAL:</td>
                                                    <td class="px-2 py-2 text-xs text-right"></td>
                                                    <td class="px-2 py-2 text-xs text-right font-bold text-gray-900">{{ formatMoney(compositionData?.price || 0) }}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="px-4 py-3 bg-gray-50 sm:px-6 flex justify-between items-center">
                            <div>
                                <button type="button" class="text-xs text-gray-500 hover:text-gray-700 underline" @click="copyToCustom(compositionData?.id)">
                                    Copiar para Própria
                                </button>
                            </div>
                            <div class="flex gap-2">
                                <button v-if="compositionHistory.length > 0" type="button" class="inline-flex justify-center px-4 py-2 text-base font-medium text-white bg-gray-500 border border-transparent rounded-md shadow-sm hover:bg-gray-600 focus:outline-none sm:text-sm" @click="goBackComposition">
                                    ← Voltar
                                </button>
                                <button type="button" class="inline-flex justify-center px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none sm:text-sm" @click="showComposition = false">
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            projects: [],
            selectedProject: null,
            budgets: [],
            showCreateModal: false,
            newBudget: { name: '', reference_date: new Date().toISOString().split('T')[0] },

            // Detail View State
            currentBudget: null,
            budgetItems: [],

            // Add Item Modal
            showAddItem: false,
            searchQuery: '',
            searchQuantity: 1,
            filters: {
                source: '',
                type: '',
                inputType: '',
                unit: ''
            },
            searchResults: [],

            // Budget Configuration
            estados: ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'],
            budgetConfig: {
                price_region: 'RS',
                price_month: 1,
                price_year: 2024,
                social_charges_type: 'DESONERADO',
                bdi_normal: 25.0,
                bdi_diferenciado: 15.0
            },

            // Composition Modal
            showComposition: false,
            compositionData: null,
            compositionHistory: [],  // Stack for back navigation

            // Available price data from DB
            availableDates: [],
            availableRegions: []
        }
    },
    async mounted() {
        await this.fetchProjects();
        await this.fetchAvailableDates();
        if (this.$route.query.projectId) {
            this.selectedProject = this.$route.query.projectId;
            this.fetchBudgets();
        }
    },
    methods: {
        formatMoney(value) {
            if (value === undefined || value === null) return '0,00';
            return parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        async fetchProjects() {
            try {
                const res = await api.get('/projects/');
                this.projects = res.data.items || [];
            } catch (err) {
                console.error("Failed to fetch projects");
            }
        },
        async fetchAvailableDates() {
            try {
                const res = await api.get('/budgets/config/available-dates');
                this.availableDates = res.data.dates || [];
                this.availableRegions = res.data.regions || [];

                // Update estados with only available regions if we have them
                if (this.availableRegions.length > 0) {
                    this.estados = this.availableRegions;
                }
            } catch (err) {
                console.error("Failed to fetch available dates:", err);
            }
        },
        onDateChange(event) {
            const [month, year] = event.target.value.split('/').map(Number);
            this.budgetConfig.price_month = month;
            this.budgetConfig.price_year = year;
            this.saveBudgetConfig();
        },
        async fetchBudgets() {
            if (!this.selectedProject) return;
            try {
                const res = await api.get(`/budgets/project/${this.selectedProject}`);

                this.budgets = res.data.items || [];
            } catch (err) {
                console.error("Failed to fetch budgets");
            }
        },
        async createBudget() {
            try {
                await api.post('/budgets/', { ...this.newBudget, project_id: this.selectedProject });
                this.showCreateModal = false;
                this.fetchBudgets();
            } catch (err) {
                alert('Erro ao criar orçamento');
            }
        },
        async openBudget(budget) {
            this.currentBudget = budget;

            // Load budget configuration
            this.budgetConfig = {
                price_region: budget.price_region || 'RS',
                price_month: budget.price_month || 1,
                price_year: budget.price_year || 2024,
                social_charges_type: budget.social_charges_type || 'DESONERADO',
                bdi_normal: budget.bdi_normal || 25.0,
                bdi_diferenciado: budget.bdi_diferenciado || 15.0
            };

            try {
                const res = await api.get(`/budgets/${budget.id}/items`);
                this.budgetItems = res.data;
            } catch (err) {
                alert('Erro ao carregar itens');
            }
        },
        async saveBudgetConfig() {
            if (!this.currentBudget) return;

            try {
                await api.patch(`/budgets/${this.currentBudget.id}`, this.budgetConfig);

                // Recalculate all item prices based on new config
                await api.post(`/budgets/${this.currentBudget.id}/recalculate-prices`);

                // Refresh budget and items
                const budgetRes = await api.get(`/budgets/${this.currentBudget.id}`);
                this.currentBudget = budgetRes.data;

                const itemsRes = await api.get(`/budgets/${this.currentBudget.id}/items`);
                this.budgetItems = itemsRes.data;
            } catch (err) {
                console.error('Failed to save budget config:', err);
            }
        },
        closeBudget() {
            this.currentBudget = null;
            this.budgetItems = [];
            this.fetchBudgets(); // Refresh totals
        },
        async deleteBudget(budgetId) {
            if (!confirm('Tem certeza que deseja excluir este orçamento? Todos os itens serão perdidos.')) return;

            try {
                await api.delete(`/budgets/${budgetId}`);
                await this.fetchBudgets();
            } catch (err) {
                console.error("Delete budget error:", err);
                alert('Erro ao excluir orçamento');
            }
        },
        async searchCatalog() {
            // Allow empty query if filters are present? Maybe. But usually user wants to search text too.
            // Let's allow empty text if filters are set.
            if (this.searchQuery.length < 3 && !this.filters.source && !this.filters.type) return;

            try {
                const params = new URLSearchParams();
                if (this.searchQuery) params.append('q', this.searchQuery);
                if (this.filters.source) params.append('source', this.filters.source);

                // If specific input type selected, use that as type filter if generic type is INPUT or empty
                // Our backend just has 'type' which is enum (MATERIAL, LABOR, COMPOSITION, ETC)
                // 'INPUT' isn't a type in DB. It's a category.
                // If user selects 'COMPOSITION', type=COMPOSITION.
                // If user selects 'INPUT', we might want to exclude COMPOSITION? Or just show all non-compositions?
                // Backend 'type' filter is exact match.

                if (this.filters.inputType) {
                    params.append('type', this.filters.inputType);
                } else if (this.filters.type === 'COMPOSITION') {
                    params.append('type', 'COMPOSITION');
                } else if (this.filters.type === 'INPUT') {
                    // How to filter "NOT COMPOSITION"? Backend doesn't support 'ne'.
                    // For now, let's just not filter by type if generic 'INPUT' is selected, 
                    // or maybe we implement a custom logic?
                    // Let's assuming for MVP we just don't send type if it is 'INPUT' generic, the user will filter by subtype.
                }

                if (this.filters.unit) params.append('unit', this.filters.unit);

                const res = await api.get(`/budgets/catalog/search?${params.toString()}`);

                this.searchResults = res.data;
            } catch (err) {
                console.error(err);
            }
        },
        async selectItemToAdd(item) {
            console.log("selectItemToAdd:", item);

            // Use quantity from input field instead of prompt
            const qty = this.searchQuantity || 1;

            if (!item || !item.id) {
                alert("Erro: Item sem ID válido.");
                return;
            }

            if (qty <= 0) {
                alert("Informe uma quantidade válida no campo 'Qtd'.");
                return;
            }

            if (!this.currentBudget || !this.currentBudget.id) {
                alert("Erro: Nenhum orçamento selecionado.");
                return;
            }

            try {
                console.log("Enviando para API...", {
                    reference_item_id: item.id,
                    quantity: parseFloat(qty),
                    unit_price: 0
                });

                await api.post(`/budgets/${this.currentBudget.id}/items`, {
                    reference_item_id: item.id,
                    quantity: parseFloat(qty),
                    unit_price: 0
                });

                // Refresh items list
                const res = await api.get(`/budgets/${this.currentBudget.id}/items`);
                this.budgetItems = res.data;

                // Refresh budget to update total_value
                const budgetRes = await api.get(`/budgets/${this.currentBudget.id}`);
                this.currentBudget = budgetRes.data;
            } catch (err) {
                console.error("Erro API:", err);
                const msg = err.response?.data?.detail || err.message || 'Erro desconhecido';
                alert(`Erro: ${msg}`);
            }
        },
        async deleteItem(itemId) {
            console.log("deleteItem called with:", itemId);
            if (!confirm('Remover este item?')) return;

            try {
                await api.delete(`/budgets/${this.currentBudget.id}/items/${itemId}`);

                // Refresh items list
                const res = await api.get(`/budgets/${this.currentBudget.id}/items`);
                this.budgetItems = res.data;

                // Refresh budget to update total_value
                const budgetRes = await api.get(`/budgets/${this.currentBudget.id}`);
                this.currentBudget = budgetRes.data;
            } catch (err) {
                console.error("Delete error:", err);
                alert('Erro ao excluir');
            }
        },
        async updateItemBdiType(item) {
            // Calculate BDI value based on type
            const bdiValue = item.bdi_type === 'DIFERENCIADO'
                ? this.budgetConfig.bdi_diferenciado
                : this.budgetConfig.bdi_normal;

            try {
                await api.patch(`/budgets/${this.currentBudget.id}/items/${item.id}`, {
                    bdi_type: item.bdi_type,
                    bdi_applied: bdiValue
                });

                // Refresh items and budget
                const res = await api.get(`/budgets/${this.currentBudget.id}/items`);
                this.budgetItems = res.data;

                const budgetRes = await api.get(`/budgets/${this.currentBudget.id}`);
                this.currentBudget = budgetRes.data;
            } catch (err) {
                console.error("Update BDI type error:", err);
            }
        },
        async viewComposition(item) {
            if (!item.reference_item_id) return;

            // Check if it's a composition type first (optimization)
            // SINAPI imports compositions as 'SERVICE', so allow both
            const allowedTypes = ['COMPOSITION', 'SERVICE'];
            if (item.reference_item && !allowedTypes.includes(item.reference_item.type)) {
                alert('Este item é um insumo básico, não possui composição.');
                return;
            }

            try {
                // Reset history when opening from budget list
                this.compositionHistory = [];
                const res = await api.get(`/budgets/composition/${item.reference_item_id}`);
                this.compositionData = res.data;
                this.showComposition = true;
            } catch (err) {
                alert('Não foi possível carregar a composição.');
            }
        },
        isSubcomposition(compItem) {
            // Check if child is a composition/service type (has its own breakdown)
            const compositionTypes = ['COMPOSITION', 'SERVICE'];
            return compositionTypes.includes(compItem.child_type);
        },
        async openSubcomposition(compItem) {
            if (!this.isSubcomposition(compItem)) {
                // It's a basic input, no subcomposition
                return;
            }

            try {
                // Save current state to history for back navigation
                this.compositionHistory.push({ ...this.compositionData });

                const res = await api.get(`/budgets/composition/${compItem.child_item_id}`);
                this.compositionData = res.data;
            } catch (err) {
                // Remove from history if failed
                this.compositionHistory.pop();
                alert('Não foi possível carregar a subcomposição.');
            }
        },
        goBackComposition() {
            if (this.compositionHistory.length > 0) {
                this.compositionData = this.compositionHistory.pop();
            }
        },
        async updateItem(item, field) {
            try {
                const payload = {};
                payload[field] = item[field];

                await api.patch(`/budgets/${this.currentBudget.id}/items/${item.id}`, payload);

                // Refresh items and budget to update totals
                const res = await api.get(`/budgets/${this.currentBudget.id}/items`);
                this.budgetItems = res.data;

                const budgetRes = await api.get(`/budgets/${this.currentBudget.id}`);
                this.currentBudget = budgetRes.data;
            } catch (err) {
                console.error("Update error:", err);
                alert('Erro ao atualizar item');
            }
        },
        async copyToCustom(itemId) {
            if (!itemId) {
                alert('Item inválido');
                return;
            }

            try {
                const res = await api.post(`/catalog/copy-to-custom/${itemId}`);
                alert(`Composição copiada com sucesso!\n\nNovo código: ${res.data.code}\n\nAgora você pode editar livremente esta composição em "Composições Próprias".`);
                this.showComposition = false;
            } catch (err) {
                console.error("Copy error:", err);
                const msg = err.response?.data?.detail || err.message || 'Erro desconhecido';
                alert(`Erro ao copiar: ${msg}`);
            }
        },
        async applyBDI() {
            // Apply BDI to all items based on their checkbox (TODO: add differentiated flag)
            // For now, just placeholder
            console.log("BDI Normal:", this.bdiNormal, "BDI Diferenciado:", this.bdiDiferenciado);
        },
        async downloadExcel() {
            if (!this.currentBudget) return;
            try {
                const response = await api.get(`/export/budget/${this.currentBudget.id}/excel`, {

                    responseType: 'blob'
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `orcamento_${this.currentBudget.name}.xlsx`);

                document.body.appendChild(link);
                link.click();
            } catch (err) {
                alert('Erro ao exportar excel');
            }
        }
    }
}
