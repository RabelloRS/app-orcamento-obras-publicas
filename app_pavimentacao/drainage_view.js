import { store } from './state.js';
import { SURFACE_TYPES_DRAINAGE } from './data.js';

export const render = (container) => {
    const state = store.getState().drainage;
    const surfaceOptions = SURFACE_TYPES_DRAINAGE.map(s => 
        `<option value="${s.c}" ${s.c === state.c ? 'selected' : ''}>${s.name} (C=${s.c})</option>`
    ).join('');

    container.innerHTML = `
        <div class="animate-fade-in max-w-6xl mx-auto">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-slate-800">Drenagem e Infiltração</h2>
                <span class="text-xs text-slate-500">Cálculo de Trincheiras/Pav. Permeável</span>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Inputs -->
                <div class="lg:col-span-5 space-y-6">
                    <div class="card p-6">
                        <h3 class="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <i data-lucide="cloud-drizzle" class="w-5 h-5 text-blue-500"></i> Hidrologia
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="label-text">Intensidade de Chuva (mm/h)</label>
                                <div class="flex items-center gap-3">
                                    <input type="range" id="slider-rain" min="50" max="300" value="${state.rainfall_i}" class="flex-1 accent-blue-500">
                                    <input type="number" id="input-rain" value="${state.rainfall_i}" class="input-field w-20 text-center font-bold">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="label-text">Área ($A$)</label>
                                    <div class="relative">
                                        <input type="number" id="drain-area" value="${state.area}" class="input-field">
                                        <span class="absolute right-3 top-2.5 text-xs text-slate-400">m²</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="label-text">Superfície ($C$)</label>
                                    <select id="drain-c" class="input-field">${surfaceOptions}</select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card p-6">
                        <h3 class="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                            <i data-lucide="droplets" class="w-5 h-5 text-emerald-500"></i> Solo e Base
                        </h3>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="label-text">Permeabilidade ($K$)</label>
                                <div class="relative">
                                    <input type="number" id="drain-k" value="${state.permeability_k}" class="input-field">
                                    <span class="absolute right-3 top-2.5 text-xs text-slate-400">mm/h</span>
                                </div>
                            </div>
                            <div>
                                <label class="label-text">Porosidade ($\eta$)</label>
                                <div class="relative">
                                    <input type="number" id="drain-p" value="${state.porosity}" step="0.01" class="input-field">
                                    <span class="absolute right-3 top-2.5 text-xs text-slate-400">dec</span>
                                </div>
                            </div>
                        </div>
                        <div id="perm-alert" class="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded hidden">
                            <i data-lucide="alert-triangle" class="w-3 h-3 inline"></i> Solo pouco permeável.
                        </div>
                    </div>
                </div>

                <!-- Charts & Results -->
                <div class="lg:col-span-7 flex flex-col gap-6">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div class="card p-4 border-t-4 border-blue-500 text-center">
                            <div class="text-xs text-slate-500 uppercase">Vazão de Pico</div>
                            <div class="text-2xl font-bold text-blue-700" id="res-q">-</div>
                            <div class="text-xs text-slate-400">Litros/seg</div>
                        </div>
                        <div class="card p-4 border-t-4 border-indigo-500 text-center">
                            <div class="text-xs text-slate-500 uppercase">Vol. Armazenamento</div>
                            <div class="text-2xl font-bold text-indigo-700" id="res-vol">-</div>
                            <div class="text-xs text-slate-400">m³ necessários</div>
                        </div>
                        <div class="card p-4 border-t-4 border-emerald-500 text-center">
                            <div class="text-xs text-slate-500 uppercase">Espessura Base</div>
                            <div class="text-2xl font-bold text-emerald-700" id="res-h">-</div>
                            <div class="text-xs text-slate-400">cm (Reservatório)</div>
                        </div>
                    </div>

                    <div class="card p-6 flex-1 min-h-[300px]">
                        <canvas id="drainChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    attachListeners();
    calcDrainage();
};

function attachListeners() {
    const ids = ['drain-area', 'drain-c', 'input-rain', 'drain-k', 'drain-p'];
    

    document.getElementById('slider-rain').addEventListener('input', (e) => {
        document.getElementById('input-rain').value = e.target.value;
        store.updateNested('drainage.rainfall_i', Number(e.target.value));
        calcDrainage();
    });
    
    document.getElementById('input-rain').addEventListener('input', (e) => {
        document.getElementById('slider-rain').value = e.target.value;
        store.updateNested('drainage.rainfall_i', Number(e.target.value));
        calcDrainage();
    });

    ids.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', (e) => {
            const keyMap = {
                'drain-area': 'area',
                'drain-c': 'c',
                'drain-k': 'permeability_k',
                'drain-p': 'porosity'
            };
            store.updateNested(`drainage.${keyMap[id]}`, Number(e.target.value));
            calcDrainage();
        });
    });
}

let drainChart = null;

function calcDrainage() {
    const s = store.getState().drainage;
    

    const Q_ls = (s.c * s.rainfall_i * s.area) / 3.6; 
    



    const RainVol = (s.rainfall_i / 1000) * s.area;
    const InfiltratedVol = (s.permeability_k / 1000) * s.area;
    

    const StorageVol = Math.max(0, RainVol - InfiltratedVol);
    


    const H_m = StorageVol / (s.area * s.porosity);
    const H_cm = H_m * 100;

    document.getElementById('res-q').innerText = Q_ls.toFixed(1);
    document.getElementById('res-vol').innerText = StorageVol.toFixed(2);
    document.getElementById('res-h').innerText = H_cm.toFixed(1);


    const alert = document.getElementById('perm-alert');
    if(s.permeability_k < 5) {
        alert.innerHTML = `<i data-lucide="alert-triangle" class="w-3 h-3 inline"></i> Permeabilidade ${s.permeability_k} mm/h é crítica. Utilize tubos de drenagem.`;
        alert.classList.remove('hidden');
        lucide.createIcons();
    } else {
        alert.classList.add('hidden');
    }

    renderChart(RainVol, InfiltratedVol, StorageVol);
}

function renderChart(rain, inf, storage) {
    const ctx = document.getElementById('drainChart');
    if (!ctx) return;

    if (drainChart) drainChart.destroy();

    drainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Volume Chuva', 'Infiltração Solo', 'Armazenamento Nec.'],
            datasets: [{
                label: 'Volume (m³)',
                data: [rain, inf, storage],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(99, 102, 241, 0.6)'
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(99, 102, 241)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Balanço Hídrico (Evento 1h)' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'm³' } }
            }
        }
    });
}
