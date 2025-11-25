import { store } from './state.js';
import { calculateN, formatScientific } from './utils.js';

export const render = (container) => {
    const state = store.getState().traffic;


    const N = calculateN(state.Vm, state.P, state.growthRate, state.growthType, state.FV) * (state.isDirectional ? 1 : 1);
    if (N !== state.calculatedN) {

        setTimeout(() => store.updateNested('traffic.calculatedN', N), 0);
    }

    container.innerHTML = `
        <div class="animate-fade-in max-w-5xl mx-auto space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold text-slate-800">Análise de Tráfego</h2>
                <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">Método USACE/DNIT</span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Inputs -->
                <div class="lg:col-span-5 space-y-6">
                    <div class="card p-6 border-l-4 border-dnit-500">
                        <h3 class="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <i data-lucide="settings-2" class="w-4 h-4 text-slate-400"></i> Parâmetros
                        </h3>

                        <div class="space-y-4">
                            <div>
                                <label class="label-text flex justify-between">Volume Médio Diário (Vm) <span class="text-slate-400 font-normal">Veíc/dia</span></label>
                                <input type="range" id="slider-vm" min="100" max="20000" step="100" value="${state.Vm}" class="w-full accent-dnit-600 mb-2">
                                <input type="number" id="input-vm" value="${state.Vm}" class="input-field font-bold text-dnit-700">
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="label-text">Período (P)</label>
                                    <div class="relative">
                                        <input type="number" id="input-p" value="${state.P}" class="input-field" min="1" max="50">
                                        <span class="absolute right-3 top-2.5 text-xs text-slate-400">anos</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="label-text">Crescimento (t)</label>
                                    <div class="relative">
                                        <input type="number" id="input-rate" value="${state.growthRate}" class="input-field" step="0.1">
                                        <span class="absolute right-3 top-2.5 text-xs text-slate-400">% a.a.</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="label-text">Modelo de Crescimento</label>
                                <div class="flex gap-4 mt-1">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="growth" value="geometric" ${state.growthType === 'geometric' ? 'checked' : ''} class="text-dnit-600 focus:ring-dnit-500">
                                        <span class="text-sm text-slate-600">Geométrico</span>
                                    </label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="growth" value="arithmetic" ${state.growthType === 'arithmetic' ? 'checked' : ''} class="text-dnit-600 focus:ring-dnit-500">
                                        <span class="text-sm text-slate-600">Aritmético</span>
                                    </label>
                                </div>
                            </div>

                            <div class="pt-4 border-t border-slate-100">
                                <label class="label-text">Fator de Veículo (FV)</label>
                                <div class="flex gap-2 items-center">
                                    <input type="number" id="input-fv" value="${state.FV}" class="input-field w-24" step="0.1">
                                    <p class="text-xs text-slate-400 flex-1">Carga média por eixo comercial (USACE/AASHTO)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Results & Chart -->
                <div class="lg:col-span-7 flex flex-col gap-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="card p-5 bg-slate-800 text-white relative overflow-hidden group">
                            <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <i data-lucide="hash" class="w-16 h-16"></i>
                            </div>
                            <div class="relative z-10">
                                <div class="text-sm text-slate-400 uppercase tracking-wider mb-1">Número N</div>
                                <div class="text-3xl font-bold text-white tracking-tight" id="res-n">${formatScientific(N)}</div>
                                <div class="text-xs text-emerald-400 mt-2 font-medium" id="res-class">Tráfego ${getTrafficClass(N)}</div>
                            </div>
                        </div>

                        <div class="card p-5 flex flex-col justify-center">
                            <div class="text-sm text-slate-500 uppercase tracking-wider mb-1">Tráfego Acumulado</div>
                            <div class="text-2xl font-semibold text-slate-700" id="res-total">${formatScientific(N / state.FV)}</div>
                            <div class="text-xs text-slate-400 mt-1">Veículos Comerciais Totais</div>
                        </div>
                    </div>

                    <div class="card p-4 flex-1 min-h-[300px]">
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
    if (N <= 1e6) return 'Leve';
    if (N <= 1e7) return 'Médio';
    if (N <= 5e7) return 'Pesado';
    return 'Muito Pesado';
}

function attachListeners() {
    const update = () => {
        const vm = Number(document.getElementById('input-vm').value);
        const p = Number(document.getElementById('input-p').value);
        const rate = Number(document.getElementById('input-rate').value);
        const fv = Number(document.getElementById('input-fv').value);
        const type = document.querySelector('input[name="growth"]:checked').value;

        store.updateNested('traffic', { Vm: vm, P: p, growthRate: rate, growthType: type, FV: fv });


        document.getElementById('slider-vm').value = vm;


        const N = calculateN(vm, p, rate, type, fv);
        document.getElementById('res-n').innerText = formatScientific(N);
        document.getElementById('res-total').innerText = formatScientific(N/fv);
        document.getElementById('res-class').innerText = `Tráfego ${getTrafficClass(N)}`;

        renderChart(vm, p, rate, type);
    };

    ['input-vm', 'input-p', 'input-rate', 'input-fv'].forEach(id => {
        document.getElementById(id).addEventListener('input', update);
    });

    document.getElementById('slider-vm').addEventListener('input', (e) => {
        document.getElementById('input-vm').value = e.target.value;
        update();
    });

    document.querySelectorAll('input[name="growth"]').forEach(el => {
        el.addEventListener('change', update);
    });
}

let chartInstance = null;

function renderChart(vm, p, rate, type) {
    const ctx = document.getElementById('trafficChart');
    if (!ctx) return;

    const labels = Array.from({length: p + 1}, (_, i) => `Ano ${i}`);
    const data = labels.map((_, i) => {
        const rateDec = rate / 100;
        if (type === 'arithmetic') return vm * (1 + rateDec * i);
        return vm * Math.pow(1 + rateDec, i);
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Volume Diário (VPD)',
                data: data,
                borderColor: '#0ea5e9',
                backgroundColor: (context) => {
                    const bg = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    bg.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
                    bg.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
                    return bg;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (ctx) => `${Math.round(ctx.raw)} veíc/dia`
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [4, 4] } },
                x: { grid: { display: false } }
            }
        }
    });
}
