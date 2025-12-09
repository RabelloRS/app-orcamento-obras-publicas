import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-4">
            <div class="flex justify-between items-center flex-wrap gap-2">
                <h2 class="text-lg font-medium text-gray-900">🗂️ Navegador de Catálogo</h2>
                <div class="flex space-x-2">
                    <select v-model="selectedSource" @change="loadTypes" class="text-sm border border-gray-300 rounded-md px-3 py-1">
                        <option value="">Todas as Fontes</option>
                        <option v-for="src in sources" :key="src.id" :value="src.name">{{ src.name }}</option>
                    </select>
                    <select v-model="selectedChargeType" @change="reloadComposition" class="text-sm border border-gray-300 rounded-md px-3 py-1">
                        <option value="DESONERADO">Desonerado</option>
                        <option value="NAO_DESONERADO">Não Desonerado</option>
                    </select>
                    <select v-model="selectedState" @change="reloadComposition" class="text-sm border border-gray-300 rounded-md px-3 py-1">
                        <option value="RS">RS - Rio Grande do Sul</option>
                        <option value="SP">SP - São Paulo</option>
                        <option value="RJ">RJ - Rio de Janeiro</option>
                        <option value="MG">MG - Minas Gerais</option>
                        <option value="PR">PR - Paraná</option>
                        <option value="SC">SC - Santa Catarina</option>
                        <option value="BA">BA - Bahia</option>
                        <option value="PE">PE - Pernambuco</option>
                        <option value="CE">CE - Ceará</option>
                        <option value="GO">GO - Goiás</option>
                        <option value="DF">DF - Distrito Federal</option>
                        <option value="PA">PA - Pará</option>
                        <option value="AM">AM - Amazonas</option>
                        <option value="MA">MA - Maranhão</option>
                        <option value="MT">MT - Mato Grosso</option>
                        <option value="MS">MS - Mato Grosso do Sul</option>
                        <option value="ES">ES - Espírito Santo</option>
                        <option value="PB">PB - Paraíba</option>
                        <option value="RN">RN - Rio Grande do Norte</option>
                        <option value="PI">PI - Piauí</option>
                        <option value="AL">AL - Alagoas</option>
                        <option value="SE">SE - Sergipe</option>
                        <option value="RO">RO - Rondônia</option>
                        <option value="TO">TO - Tocantins</option>
                        <option value="AC">AC - Acre</option>
                        <option value="AP">AP - Amapá</option>
                        <option value="RR">RR - Roraima</option>
                    </select>
                </div>
            </div>

            <!-- Barra de Busca -->
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div class="flex flex-wrap gap-2">
                    <input v-model="searchQuery" 
                           @keyup.enter="searchItems" 
                           type="text" 
                           placeholder="Buscar por código ou descrição..." 
                           class="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
                    <button @click="searchItems" class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                        🔍 Buscar
                    </button>
                    <button @click="clearSearch" v-if="isSearchMode" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300">
                        ✕ Limpar
                    </button>
                    <button @click="quickServices" class="px-4 py-2 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600">
                        🛠️ Ver Serviços
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- Painel de Navegação (Árvore) -->
                <div class="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-h-[70vh] overflow-y-auto">
                    <h3 class="font-medium text-gray-700 mb-3">{{ isSearchMode ? 'Resultados da Busca' : 'Navegação por Tipo' }}</h3>
                    
                    <!-- Resultados de Busca -->
                    <div v-if="isSearchMode">
                        <div v-if="loading" class="text-center py-4 text-gray-500">Buscando...</div>
                        <div v-else-if="searchResults.length === 0" class="text-center py-4 text-gray-500">
                            Nenhum resultado encontrado.
                        </div>
                        <div v-else class="space-y-1">
                            <div v-for="item in searchResults" :key="item.id" 
                                 @click="selectItem(item)"
                                 class="p-2 rounded cursor-pointer hover:bg-blue-50 text-sm"
                                 :class="{'bg-blue-100': selectedItemId === item.id}">
                                <div class="flex justify-between items-center">
                                    <span class="font-medium text-blue-600">{{ item.code }}</span>
                                    <span class="text-xs px-2 py-0.5 rounded" 
                                          :class="item.source === 'SINAPI' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'">
                                        {{ item.source }}
                                    </span>
                                </div>
                                <div class="text-gray-600 text-xs truncate">{{ item.description }}</div>
                                <div class="text-gray-400 text-xs">{{ item.type }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Navegação por Tipo -->
                    <div v-else>
                        <!-- Breadcrumb -->
                        <div class="flex flex-wrap gap-1 mb-3 text-xs">
                            <span @click="goToRoot" class="text-blue-600 cursor-pointer hover:underline">Início</span>
                            <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
                                <span class="text-gray-400">/</span>
                                <span @click="navigateToCrumb(idx)" 
                                      class="text-blue-600 cursor-pointer hover:underline">
                                    {{ crumb.label }}
                                </span>
                            </template>
                        </div>

                        <div v-if="loading" class="text-center py-4 text-gray-500">Carregando...</div>
                        
                        <!-- Tipos (Nível 1) -->
                        <div v-else-if="currentLevel === 'types'" class="space-y-1">
                            <div v-for="type in itemTypes" :key="type.id" 
                                 @click="selectType(type)"
                                 class="p-2 rounded cursor-pointer hover:bg-blue-50 flex justify-between items-center">
                                <span class="text-sm">{{ type.label }}</span>
                                <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{{ formatNumber(type.count) }}</span>
                            </div>
                        </div>

                        <!-- Grupos/Subgrupos -->
                        <div v-else-if="currentLevel === 'groups'" class="space-y-1">
                            <div v-for="group in groups" :key="group.id" 
                                 @click="group.type === 'item' ? selectItemById(group.id) : expandGroup(group)"
                                 class="p-2 rounded cursor-pointer hover:bg-blue-50 flex justify-between items-center"
                                 :class="{'bg-green-50': group.type === 'item'}">
                                <div class="flex-1 min-w-0">
                                    <span class="text-sm" :class="{'text-green-700': group.type === 'item'}">
                                        {{ group.type === 'item' ? '📄' : '📁' }} {{ group.label }}
                                    </span>
                                </div>
                                <span v-if="group.count > 0" class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded ml-2">
                                    {{ formatNumber(group.count) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Painel de Detalhes -->
                <div class="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-gray-200 max-h-[70vh] overflow-y-auto">
                    <div v-if="!selectedItem" class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">📋</div>
                        <p>Selecione um item para ver os detalhes</p>
                    </div>

                    <div v-else>
                        <!-- Cabeçalho do Item -->
                        <div class="border-b pb-4 mb-4">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h3 class="text-lg font-bold text-blue-600">{{ selectedItem.code }}</h3>
                                    <p class="text-gray-700 mt-1">{{ selectedItem.description }}</p>
                                </div>
                                <div class="flex flex-col gap-1 items-end">
                                    <span class="px-3 py-1 text-xs rounded-full"
                                          :class="{
                                              'bg-green-100 text-green-800': selectedItem.type === 'COMPOSITION' || selectedItem.type === 'SERVICE',
                                              'bg-blue-100 text-blue-800': selectedItem.type === 'LABOR',
                                              'bg-yellow-100 text-yellow-800': selectedItem.type === 'EQUIPMENT',
                                              'bg-gray-100 text-gray-800': selectedItem.type === 'MATERIAL'
                                          }">
                                        {{ selectedItem.type }}
                                    </span>
                                    <span class="px-3 py-1 text-[11px] rounded-full bg-gray-100 text-gray-700">
                                        {{ selectedItem.charge_type === 'NAO_DESONERADO' ? 'Não Desonerado' : 'Desonerado' }}
                                    </span>
                                    <span class="px-3 py-1 text-xs rounded-full font-bold"
                                          :class="selectedItem.source_name === 'SINAPI' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'">
                                        {{ selectedItem.source_name }}
                                    </span>
                                </div>
                            </div>
                            <div class="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div class="bg-gray-50 p-2 rounded">
                                    <div class="text-gray-500 text-xs">Unidade</div>
                                    <div class="font-bold">{{ selectedItem.unit }}</div>
                                </div>
                                <div class="bg-gray-50 p-2 rounded">
                                    <div class="text-gray-500 text-xs">Preço ({{ selectedState }} • {{ selectedChargeType === 'DESONERADO' ? 'Desonerado' : 'Não Desonerado' }})</div>
                                    <div class="font-bold text-green-600">{{ formatMoney(selectedItem.price || 0) }}</div>
                                </div>
                                <div class="bg-gray-50 p-2 rounded" v-if="selectedItem.calculated_cost">
                                    <div class="text-gray-500 text-xs">Custo Calculado</div>
                                    <div class="font-bold text-blue-600">{{ formatMoney(selectedItem.calculated_cost) }}</div>
                                </div>
                                <div class="bg-gray-50 p-2 rounded">
                                    <div class="text-gray-500 text-xs">Status</div>
                                    <div class="font-bold" :class="selectedItem.is_locked ? 'text-red-500' : 'text-green-500'">
                                        {{ selectedItem.is_locked ? '🔒 Oficial' : '✏️ Editável' }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Composição Analítica -->
                        <div v-if="compositionItems.length > 0" class="mb-4">
                            <h4 class="font-medium text-gray-700 mb-2">📊 Composição Analítica (Preços: {{ selectedState }})</h4>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Tipo</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Código</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Descrição</th>
                                            <th class="px-3 py-2 text-center text-xs font-medium text-gray-500">Und</th>
                                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Coef.</th>
                                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Preço Unit.</th>
                                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        <tr v-for="comp in compositionItems" :key="comp.code" class="hover:bg-gray-50">
                                            <td class="px-3 py-2">
                                                <span class="text-xs px-2 py-0.5 rounded"
                                                      :class="{
                                                          'bg-blue-100 text-blue-700': comp.type === 'LABOR',
                                                          'bg-yellow-100 text-yellow-700': comp.type === 'EQUIPMENT',
                                                          'bg-gray-100 text-gray-700': comp.type === 'MATERIAL'
                                                      }">
                                                    {{ comp.type === 'LABOR' ? '👷' : comp.type === 'EQUIPMENT' ? '🚜' : '🧱' }}
                                                </span>
                                            </td>
                                            <td class="px-3 py-2 text-blue-600 cursor-pointer hover:underline font-mono text-xs" @click="loadItemById(comp.id)">
                                                {{ comp.code }}
                                            </td>
                                            <td class="px-3 py-2 text-gray-700 max-w-xs truncate" :title="comp.description">{{ comp.description }}</td>
                                            <td class="px-3 py-2 text-center text-gray-500">{{ comp.unit }}</td>
                                            <td class="px-3 py-2 text-right font-mono">{{ formatCoef(comp.coefficient) }}</td>
                                            <td class="px-3 py-2 text-right" :class="comp.unit_price > 0 ? 'text-green-600' : 'text-red-400'">
                                                {{ formatMoney(comp.unit_price) }}
                                            </td>
                                            <td class="px-3 py-2 text-right font-bold" :class="comp.total_price > 0 ? 'text-green-700' : 'text-red-400'">
                                                {{ formatMoney(comp.total_price) }}
                                            </td>
                                        </tr>
                                    </tbody>
                                    <tfoot class="bg-gray-100">
                                        <tr>
                                            <td colspan="6" class="px-3 py-2 text-right font-bold">TOTAL:</td>
                                            <td class="px-3 py-2 text-right font-bold text-green-700">{{ formatMoney(selectedItem.calculated_cost || 0) }}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div v-else-if="selectedItem.type === 'COMPOSITION' || selectedItem.type === 'SERVICE'" class="text-center py-4 text-gray-500">
                            <p>Nenhum item de composição encontrado.</p>
                        </div>

                        <!-- Botões de Ação -->
                        <div class="flex gap-2 mt-4 pt-4 border-t">
                            <button @click="copyToCustom" class="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700">
                                📋 Copiar para Própria
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            sources: [],
            selectedSource: '',
            selectedChargeType: 'DESONERADO',
            selectedState: 'RS',
            itemTypes: [],
            groups: [],
            searchQuery: '',
            searchResults: [],
            isSearchMode: false,
            loading: false,
            currentLevel: 'types',
            breadcrumbs: [],
            currentType: null,
            currentPrefix: null,
            selectedItem: null,
            selectedItemId: null,
            compositionItems: []
        }
    },
    async mounted() {
        await this.loadSources();
        await this.loadTypes();
    },
    methods: {
        async loadSources() {
            try {
                const res = await api.get('/catalog/navigator/sources');
                this.sources = res.data;
            } catch (err) {
                console.error("Error loading sources:", err);
            }
        },
        async loadTypes() {
            this.loading = true;
            this.currentLevel = 'types';
            this.breadcrumbs = [];
            this.currentType = null;
            this.currentPrefix = null;

            try {
                const params = this.selectedSource ? { source: this.selectedSource } : {};
                const res = await api.get('/catalog/navigator/types', { params });
                this.itemTypes = res.data;
            } catch (err) {
                console.error("Error loading types:", err);
            } finally {
                this.loading = false;
            }
        },
        async selectType(type) {
            this.loading = true;
            this.currentLevel = 'groups';
            this.currentType = type.id;
            this.breadcrumbs = [{ label: type.label, type: 'type', id: type.id }];

            try {
                const params = { item_type: type.id };
                if (this.selectedSource) params.source = this.selectedSource;

                const res = await api.get('/catalog/navigator/groups', { params });
                this.groups = res.data;
            } catch (err) {
                console.error("Error loading groups:", err);
            } finally {
                this.loading = false;
            }
        },
        async expandGroup(group) {
            this.loading = true;
            this.currentPrefix = group.id;
            this.breadcrumbs.push({ label: `Grupo ${group.id}`, type: 'group', id: group.id });

            try {
                const params = { prefix: group.id };
                if (this.currentType) params.item_type = this.currentType;
                if (this.selectedSource) params.source = this.selectedSource;

                const res = await api.get('/catalog/navigator/groups', { params });
                this.groups = res.data;
            } catch (err) {
                console.error("Error expanding group:", err);
            } finally {
                this.loading = false;
            }
        },
        async searchItems() {
            if (this.searchQuery.length < 2) return;

            this.loading = true;
            this.isSearchMode = true;

            try {
                const params = { q: this.searchQuery };
                if (this.selectedSource) params.source = this.selectedSource;

                const res = await api.get('/catalog/navigator/search', { params });
                this.searchResults = res.data;
            } catch (err) {
                console.error("Error searching:", err);
            } finally {
                this.loading = false;
            }
        },
        clearSearch() {
            this.searchQuery = '';
            this.searchResults = [];
            this.isSearchMode = false;
        },
        goToRoot() {
            this.loadTypes();
        },
        navigateToCrumb(idx) {
            const crumb = this.breadcrumbs[idx];
            this.breadcrumbs = this.breadcrumbs.slice(0, idx + 1);

            if (crumb.type === 'type') {
                this.selectType({ id: crumb.id, label: crumb.label });
            } else if (crumb.type === 'group') {
                this.expandGroup({ id: crumb.id });
            }
        },
        async selectItem(item) {
            this.selectedItemId = item.id;
            await this.loadItemDetails(item.id);
        },
        async selectItemById(id) {
            this.selectedItemId = id;
            await this.loadItemDetails(id);
        },
        async loadItemById(id) {
            this.selectedItemId = id;
            await this.loadItemDetails(id);
        },
        async quickServices() {
            // Jump directly to Serviços type when available
            if (this.itemTypes.length === 0) {
                await this.loadTypes();
            }
            const serviceType = this.itemTypes.find(t => t.id === 'SERVICE');
            if (serviceType) {
                await this.selectType(serviceType);
            }
        },
        async loadItemDetails(itemId) {
            try {
                // Usar o novo endpoint que retorna preços por estado
                const res = await api.get(`/catalog/composition/${itemId}`, {
                    params: { state: this.selectedState, charge_type: this.selectedChargeType }
                });
                this.selectedItem = res.data;
                this.compositionItems = res.data.items || [];
            } catch (err) {
                console.error("Error loading item details:", err);
                // Fallback para endpoint antigo
                try {
                    const res = await api.get(`/catalog/items/${itemId}`);
                    this.selectedItem = res.data;
                    this.compositionItems = [];
                } catch (e) {
                    console.error("Fallback also failed:", e);
                }
            }
        },
        async reloadComposition() {
            if (this.selectedItemId) {
                await this.loadItemDetails(this.selectedItemId);
            }
        },
        async copyToCustom() {
            if (!this.selectedItem) return;

            try {
                const res = await api.post(`/catalog/copy-to-custom/${this.selectedItem.id}`);
                alert(`Composição copiada!\n\nNovo código: ${res.data.code}`);
            } catch (err) {
                alert('Erro ao copiar: ' + (err.response?.data?.detail || err.message));
            }
        },
        formatNumber(num) {
            return num ? num.toLocaleString('pt-BR') : '0';
        },
        formatMoney(val) {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        },
        formatCoef(val) {
            return val ? val.toFixed(6).replace(/\.?0+$/, '') : '0';
        }
    }
}
