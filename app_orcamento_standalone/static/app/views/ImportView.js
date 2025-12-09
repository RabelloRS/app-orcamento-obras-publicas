import api from '../../js/api.js';

export default {
    template: `
        <div class="space-y-6">
            <h2 class="text-lg font-medium text-gray-900">Importação de Dados</h2>

            <!-- Tabs -->
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                    <button @click="activeTab = 'SINAPI'" 
                        :class="[activeTab === 'SINAPI' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm']">
                        SINAPI
                    </button>
                    <button @click="activeTab = 'SICRO'"
                        :class="[activeTab === 'SICRO' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300', 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm']">
                        SICRO
                    </button>
                </nav>
            </div>

            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                
                <!-- SINAPI Form (apenas upload) -->
                <div v-if="activeTab === 'SINAPI'" class="space-y-4">
                    <p class="text-sm text-gray-600">Importação SINAPI multi-UF: basta escolher o arquivo ZIP/XLSX (o sistema lê mês/ano e todas as UFs presentes).</p>
                </div>

                <!-- SICRO Form -->
                <div v-if="activeTab === 'SICRO'">
                     <p class="text-sm text-gray-600 mb-4">Importação Automática do SICRO (DNIT). Selecione a referência para baixar e importar.</p>
                     
                     <!-- Loading Available Months -->
                     <div v-if="loadingDnitMonths" class="text-center py-4">
                         <span class="text-gray-500">🔄 Consultando meses disponíveis no DNIT...</span>
                     </div>
                     
                     <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Estado (UF)</label>
                            <select v-model="sicroData.state" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <option value="RS">RS</option><option value="SP">SP</option><option value="RJ">RJ</option><option value="MG">MG</option><option value="SC">SC</option><option value="PR">PR</option>
                                <option value="BA">BA</option><option value="PE">PE</option><option value="CE">CE</option><option value="GO">GO</option><option value="DF">DF</option><option value="PA">PA</option>
                                <option value="AM">AM</option><option value="MT">MT</option><option value="MS">MS</option><option value="ES">ES</option><option value="MA">MA</option><option value="PB">PB</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Mês/Ano de Referência</label>
                            <select v-model="sicroData.selectedMonth" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                <option v-for="m in dnitAvailableMonths" :key="m.year + '-' + m.month" :value="m">
                                    {{ m.month_name }} / {{ m.year }}
                                </option>
                            </select>
                        </div>
                    </div>
                    
                    <!-- Refresh Button -->
                    <button @click="fetchDnitMonths" class="text-sm text-blue-600 hover:text-blue-800 mb-4">
                        🔄 Atualizar lista de meses disponíveis
                    </button>
                </div>

                <!-- File Input (SINAPI Only) -->
                <div v-if="activeTab === 'SINAPI'" class="space-y-2">
                    <div>
                         <label class="block text-sm font-medium text-gray-700">Arquivo ZIP/XLSX (SINAPI)</label>
                         <input type="file" ref="fileInput" @change="handleFileChange" accept=".zip,.xls,.xlsx" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                    </div>
                    <div class="text-xs text-gray-600" v-if="selectedFile">Arquivo selecionado: {{ selectedFile.name }}</div>
                    <div class="text-xs text-gray-500" v-else>Nenhum arquivo selecionado.</div>
                </div>

                <!-- Action Buttons -->
                <div class="mt-4">
                    <!-- SINAPI Upload -->
                    <button v-if="activeTab === 'SINAPI'" @click="uploadFile" :disabled="!selectedFile || uploading" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                        {{ uploading ? 'Enviando...' : 'Carregar SINAPI localmente' }}
                    </button>

                    <!-- SICRO Download -->
                    <button v-if="activeTab === 'SICRO'" @click="syncSicro" :disabled="uploading" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
                        {{ uploading ? 'Processando...' : 'Baixar e Importar do DNIT' }}
                    </button>
                    
                    <!-- Progress Bar (Shared) -->
                    <div v-if="uploadProgress > 0" class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
                        <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: uploadProgress + '%' }"></div>
                    </div>

                    <div v-if="message" :class="{'text-green-600': !isError, 'text-red-600': isError}" class="text-sm font-medium mt-2">
                        {{ message }}
                    </div>
                </div>
            </div>

            <!-- Painel de Dados Importados -->
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-md font-medium text-gray-900">📊 Dados Importados</h3>
                    <button @click="fetchImportedSummary" class="text-sm text-blue-600 hover:text-blue-800">
                        🔄 Atualizar
                    </button>
                </div>
                
                <div v-if="loadingSummary" class="text-center py-4">
                    <span class="text-gray-500">Carregando...</span>
                </div>
                
                <div v-else-if="importedSummary">
                    <!-- Totais Gerais -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div class="bg-blue-50 p-3 rounded-lg text-center">
                            <div class="text-2xl font-bold text-blue-600">{{ formatNumber(importedSummary.totals.items) }}</div>
                            <div class="text-xs text-gray-600">Itens Totais</div>
                        </div>
                        <div class="bg-green-50 p-3 rounded-lg text-center">
                            <div class="text-2xl font-bold text-green-600">{{ formatNumber(importedSummary.totals.active_prices) }}</div>
                            <div class="text-xs text-gray-600">Preços Ativos</div>
                        </div>
                        <div v-for="(count, source) in importedSummary.sources" :key="source" class="bg-gray-50 p-3 rounded-lg text-center">
                            <div class="text-2xl font-bold text-gray-700">{{ formatNumber(count) }}</div>
                            <div class="text-xs text-gray-600">{{ source }}</div>
                        </div>
                    </div>
                    
                    <!-- Períodos Importados -->
                    <div v-if="importedSummary.prices_by_period.length > 0" class="mt-4">
                        <h4 class="text-sm font-medium text-gray-700 mb-2">📅 Meses/Anos Importados</h4>
                        <div class="flex flex-wrap gap-2">
                            <div v-for="(period, idx) in importedSummary.prices_by_period" :key="idx"
                                 class="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                {{ getMonthName(period.month) }}/{{ period.year }}
                                <span class="text-xs text-green-600 ml-1">({{ formatNumber(period.price_count) }} preços)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div v-else class="text-center py-4 text-gray-500">
                        Nenhum dado importado ainda.
                    </div>
                </div>
            </div>
            
             <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mt-6">
                <h3 class="text-md font-medium text-gray-900 mb-2">Instruções</h3>
                <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Baixe o arquivo ZIP da referência desejada (SINAPI/SICRO).</li>
                    <li>Não descompacte o arquivo.</li>
                    <li>Certifique-se de selecionar o Estado, Mês e Ano corretos correspondentes ao arquivo.</li>
                </ul>
            </div>
        </div>
    `,
    data() {
        return {
            activeTab: 'SINAPI',
            selectedFile: null,
            uploading: false,
            uploadProgress: 0,
            message: '',
            isError: false,
            loadingDnitMonths: false,
            dnitAvailableMonths: [],
            loadingSummary: false,
            importedSummary: null,
            sinapiData: {
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear()
            },
            sicroData: {
                state: 'RS',
                selectedMonth: null
            }
        }
    },
    async mounted() {
        // Fetch DNIT months and imported summary when component loads
        await Promise.all([
            this.fetchDnitMonths(),
            this.fetchImportedSummary()
        ]);
    },
    methods: {
        handleFileChange(event) {
            this.selectedFile = event.target.files[0];
            this.message = '';
            this.uploadProgress = 0;
        },
        async uploadFile() {
            // SINAPI Only now
            if (!this.selectedFile) return;

            this.uploading = true;
            this.message = 'Enviando arquivo...';
            this.isError = false;

            const formData = new FormData();
            formData.append('file', this.selectedFile);

            let url = '/data/import/sinapi';
            let params = {};

            try {
                const res = await api.post(url, formData, {
                    params: params,
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        this.uploadProgress = Math.max(5, percentCompleted);
                    }
                });

                this.message = 'Importação iniciada com sucesso! Job ID: ' + res.data.job_id;
                this.pollProgress(res.data.job_id); // Start polling
                this.selectedFile = null;
                this.$refs.fileInput.value = null;
                this.uploadProgress = 5; // reset to polling progress rather than full bar

            } catch (err) {
                this.isError = true;
                this.message = err.response?.data?.detail || 'Erro ao importar arquivo.';
                this.uploading = false;
            }
        },
        async fetchDnitMonths() {
            this.loadingDnitMonths = true;
            try {
                const res = await api.get('/catalog/dnit/available-months');
                this.dnitAvailableMonths = res.data;
                // Auto-select first (most recent)
                if (this.dnitAvailableMonths.length > 0 && !this.sicroData.selectedMonth) {
                    this.sicroData.selectedMonth = this.dnitAvailableMonths[0];
                }
            } catch (err) {
                console.error("Error fetching DNIT months:", err);
                // Fallback to current month
                const now = new Date();
                this.dnitAvailableMonths = [{
                    year: now.getFullYear(),
                    month: now.getMonth() + 1,
                    month_name: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][now.getMonth()]
                }];
                this.sicroData.selectedMonth = this.dnitAvailableMonths[0];
            } finally {
                this.loadingDnitMonths = false;
            }
        },
        async syncSicro() {
            if (!this.sicroData.selectedMonth) {
                this.isError = true;
                this.message = 'Selecione um mês/ano de referência.';
                return;
            }

            this.uploading = true;
            this.message = 'Iniciando sincronização com DNIT...';
            this.isError = false;
            this.uploadProgress = 0;

            try {
                const params = {
                    state: this.sicroData.state,
                    month: this.sicroData.selectedMonth.month,
                    year: this.sicroData.selectedMonth.year
                };
                const res = await api.post('/data/sync/sicro_start', null, { params });
                this.message = 'Job iniciado! ID: ' + res.data.job_id;
                this.pollProgress(res.data.job_id);
            } catch (err) {
                this.isError = true;
                this.message = 'Erro ao iniciar sincronização: ' + (err.response?.data?.detail || err.message);
                this.uploading = false;
            }
        },
        async pollProgress(jobId) {
            const interval = setInterval(async () => {
                try {
                    const res = await api.get(`/data/import/progress/${jobId}`);
                    const job = res.data;
                    this.uploadProgress = job.progress;
                    this.message = `${job.message} (${job.progress}%)`;

                    if (job.status === 'completed' || job.status === 'error') {
                        clearInterval(interval);
                        this.uploading = false;
                        if (job.status === 'error') this.isError = true;
                        // Refresh summary after import completes
                        if (job.status === 'completed') {
                            await this.fetchImportedSummary();
                        }
                    }
                } catch (e) {
                    clearInterval(interval);
                    this.uploading = false;
                }
            }, 1000);
        },
        async fetchImportedSummary() {
            this.loadingSummary = true;
            try {
                const res = await api.get('/data/imported-summary');
                this.importedSummary = res.data;
            } catch (err) {
                console.error("Error fetching imported summary:", err);
            } finally {
                this.loadingSummary = false;
            }
        },
        formatNumber(num) {
            if (num === null || num === undefined) return '0';
            return num.toLocaleString('pt-BR');
        },
        getMonthName(month) {
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return month ? months[month - 1] : '-';
        }
    }
}
