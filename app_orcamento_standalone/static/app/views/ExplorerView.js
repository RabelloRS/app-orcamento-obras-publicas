import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-6">
            <h2 class="text-lg font-medium text-gray-900">Explorador de Composições</h2>

            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div class="flex gap-4 mb-6">
                    <input v-model="query" @keyup.enter="search" type="text" placeholder="Pesquisar código ou descrição..." class="flex-1 block w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <button @click="search" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        Pesquisar
                    </button>
                </div>

                <div v-if="loading" class="text-center text-gray-500">Carregando...</div>

                <div v-else-if="results.length > 0" class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidade</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="item in results" :key="item.id" class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 cursor-pointer" @click="copyCode(item.code)">
                                    {{ item.code }}
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-900">{{ item.description }}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ item.unit }}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                                          :class="item.type === 'COMPOSITION' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'">
                                        {{ item.type }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-else class="text-center text-gray-500 mt-4">
                    Digite algo para pesquisar na base de dados (SINAPI/SICRO).
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            query: '',
            results: [],
            loading: false
        }
    },
    methods: {
        async search() {
            if (this.query.length < 3) return;
            this.loading = true;
            try {
                const res = await api.get(`/budgets/catalog/search?q=${this.query}`);

                this.results = res.data;
            } catch (err) {
                alert('Erro na pesquisa');
            } finally {
                this.loading = false;
            }
        },
        copyCode(code) {
            navigator.clipboard.writeText(code);
            // Optional: Toast notification
        }
    }
}
