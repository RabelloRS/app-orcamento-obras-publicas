import { store } from './state.js';
import { calculateN, formatScientific } from './utils.js';

export const render = (container) => {
    const state = store.getState().traffic;


    const N = calculateN(state.Vm, state.P, state.growthRate, state.growthType, state.FV);
    if (N !== state.calculatedN) {
        store.updateNested('traffic.calculatedN', N);
    }

    container.innerHTML = `
        <div class="animate-fade-in w-full">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Parâmetros de Tráfego</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Input Card -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold text-dnit-800 mb-4 flex items-center gap-2">
                        <i data-lucide="car" class="w-5 h-5"></i> Dados de Entrada
                    </h3>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="label-text">Volume Médio Diário ($V_m$)</label>
                            <input type="number" id="input-vm" value="${state.Vm}" class="input-field" min="0">
                            <p class="text-xs text-slate-400 mt-1">Veículos/dia (por sentido ou bidirecional)</p>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="label-text">Período de Projeto ($P$)</label>
                                <div class="relative">
                                    <input type="number" id="input-p" value="${state.P}" class="input-field pr-8" min="1" max="50">
                                    <span class="absolute right-3 top-2.5 text-xs text-slate-400">anos</span>
                                </div>
                            </div>
                            <div>
                                <label class="label-text">Taxa de Crescimento ($t$)</label>
                                <div class="relative">
                                    <input type="number" id="input-rate" value="${state.growthRate}" class="input-field pr-8" step="0.1">
                                    <span class="absolute right-3 top-2.5 text-xs text-slate-400">% a.a.</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="label-text">Tipo de Crescimento</label>
                            <select id="input-growth-type" class="input-field">
                                <option value="geometric" ${state.growthType === 'geometric' ? 'selected' : ''}>Geométrico (Exponencial)</option>
                                <option value="arithmetic" ${state.growthType === 'arithmetic' ? 'selected' : ''}>Aritmético (Linear)</option>
                            </select>
                        </div>

                        <div>
                            <label class="label-text">Fator de Veículo ($FV$)</label>
                            <input type="number" id="input-fv" value="${state.FV}" class="input-field" step="0.1">
                            <p class="text-xs text-slate-400 mt-1">Fator de equivalência de carga médio</p>
                        </div>
                    </div>
                </div>

                <!-- Result Card -->
                <div class="flex flex-col gap-6">
                    <div class="card p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none">
                        <h3 class="text-sm font-medium text-slate-300 uppercase tracking-wider mb-2">Número N (Operações)</h3>
                        <div class="text-4xl font-bold mb-1" id="display-n">${formatScientific(N)}</div>
                        <p class="text-sm text-slate-400">Repetições do eixo padrão de 8,2t</p>
                        
                        <div class="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-2 gap-4">
                            <div>
                                <span class="block text-xs text-slate-400">Volume Total ($V_t$)</span>
                                <span class="text-lg font-semibold" id="display-vt">${formatScientific(N / state.FV)}</span>
                            </div>
                            <div>
                                <span class="block text-xs text-slate-400">Classe de Tráfego</span>
                                <span class="text-lg font-semibold" id="display-class">${getTrafficClass(N)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="card p-6 flex-1">
                        <canvas id="trafficChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    attachListeners();
    renderChart(state.Vm, state.P, state.growthRate, state.growthType);
};

function getTrafficClass(N) {
    if (N < 1e6) return 'Leve';
    if (N < 1e7) return 'Médio';
    if (N < 5e7) return 'Pesado';
    return 'Muito Pesado';
}

function attachListeners() {
    const inputs = ['input-vm', 'input-p', 'input-rate', 'input-fv'];

    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateState);
    });

    document.getElementById('input-growth-type').addEventListener('change', updateState);
}

function updateState() {
    const vm = Number(document.getElementById('input-vm').value);
    const p = Number(document.getElementById('input-p').value);
    const rate = Number(document.getElementById('input-rate').value);
    const fv = Number(document.getElementById('input-fv').value);
    const type = document.getElementById('input-growth-type').value;

    const N = calculateN(vm, p, rate, type, fv);

    store.updateNested('traffic', {
        Vm: vm, P: p, growthRate: rate, growthType: type, FV: fv, calculatedN: N
    });


    document.getElementById('display-n').innerText = formatScientific(N);
    document.getElementById('display-vt').innerText = formatScientific(N / fv);
    document.getElementById('display-class').innerText = getTrafficClass(N);

    renderChart(vm, p, rate, type);
}

let trafficChart = null;

function renderChart(vm, p, rate, type) {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    const labels = Array.from({ length: p + 1 }, (_, i) => `Ano ${i}`);
    const data = labels.map((_, i) => {
        const rateDec = rate / 100;
        if (type === 'arithmetic') return vm * (1 + rateDec * i);
        return vm * Math.pow(1 + rateDec, i);
    });

    if (trafficChart) trafficChart.destroy();

    trafficChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume Diário ($V_m$)',
                data: data,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Evolução do Tráfego' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
