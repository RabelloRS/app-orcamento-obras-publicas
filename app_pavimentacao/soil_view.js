import { store } from './state.js';

export const render = (container) => {
    const state = store.getState().soil;

    container.innerHTML = `
        <div class="animate-fade-in max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Caracterização do Subleito</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- CBR Section -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold text-slate-700 mb-4">Índice de Suporte (CBR)</h3>
                    
                    <div class="flex flex-col gap-6">
                        <div class="relative pt-6 pb-2">
                            <input type="range" id="slider-cbr" min="1" max="40" step="1" value="${state.subgradeCBR}" class="w-full accent-emerald-500">
                            <div class="flex justify-between text-xs text-slate-400 mt-1">
                                <span>1%</span>
                                <span>20%</span>
                                <span>40%+</span>
                            </div>
                        </div>

                        <div class="flex items-center gap-4">
                            <div class="relative w-32">
                                <input type="number" id="input-cbr" value="${state.subgradeCBR}" class="input-field text-center font-bold text-xl h-12">
                                <span class="absolute right-3 top-3 text-slate-400 text-sm">%</span>
                            </div>
                            <div class="flex-1">
                                <div class="text-sm font-medium text-slate-600 mb-1">Classificação Mecânica</div>
                                <div id="cbr-quality" class="badge px-3 py-1 rounded-full text-xs font-bold uppercase inline-block">Calculando...</div>
                            </div>
                        </div>

                        <div class="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-800 hidden" id="cbr-alert">
                            <i data-lucide="alert-triangle" class="w-3 h-3 inline mr-1"></i> CBR muito baixo. Reforço obrigatório.
                        </div>
                    </div>
                </div>

                <!-- Physical Parameters -->
                <div class="card p-6">
                    <h3 class="text-lg font-semibold text-slate-700 mb-4">Parâmetros Físicos</h3>
                    
                    <div class="space-y-5">
                        <div>
                            <label class="label-text">Expansão (%)</label>
                            <input type="number" id="input-exp" value="${state.expansion}" class="input-field" step="0.1">
                            <p class="text-xs text-red-500 mt-1 hidden" id="exp-alert">Expansão > 2% exige tratamento com cal/cimento.</p>
                        </div>

                        <div>
                            <label class="label-text">Nível do Lençol Freático (m)</label>
                            <div class="flex items-center gap-3">
                                <input type="number" id="input-wt" value="${state.waterTable}" class="input-field" step="0.1">
                                <div class="h-2 w-24 bg-blue-100 rounded-full overflow-hidden border border-blue-200">
                                    <div class="h-full bg-blue-500 transition-all" style="width: ${Math.min(100, (3 - state.waterTable) * 33)}%"></div>
                                </div>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">Profundidade em relação ao greide</p>
                            <p class="text-xs text-red-500 mt-1 hidden" id="wt-alert">Nível freático crítico (< 1.5m). Necessário dreno profundo.</p>
                        </div>

                        <div>
                            <label class="label-text">Classificação TRB (AASHTO)</label>
                            <select id="input-class" class="input-field">
                                <option value="A-1-a" ${state.classification === 'A-1-a' ? 'selected' : ''}>A-1-a (Pedregulho)</option>
                                <option value="A-2-4" ${state.classification === 'A-2-4' ? 'selected' : ''}>A-2-4 (Areia siltosa)</option>
                                <option value="A-4" ${state.classification === 'A-4' ? 'selected' : ''}>A-4 (Silte)</option>
                                <option value="A-6" ${state.classification === 'A-6' ? 'selected' : ''}>A-6 (Argila)</option>
                                <option value="A-7-5" ${state.classification === 'A-7-5' ? 'selected' : ''}>A-7-5 (Argila elástica)</option>
                                <option value="A-7-6" ${state.classification === 'A-7-6' ? 'selected' : ''}>A-7-6 (Argila plástica)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    attachListeners();
    updateVisuals(state.subgradeCBR, state.expansion, state.waterTable);
}

function attachListeners() {
    const slider = document.getElementById('slider-cbr');
    const input = document.getElementById('input-cbr');

    const syncCBR = (val) => {
        slider.value = val;
        input.value = val;
        store.updateNested('soil.subgradeCBR', Number(val));
        const s = store.getState().soil;
        updateVisuals(val, s.expansion, s.waterTable);
    };

    slider.addEventListener('input', (e) => syncCBR(e.target.value));
    input.addEventListener('input', (e) => syncCBR(e.target.value));

    document.getElementById('input-exp').addEventListener('input', (e) => {
        store.updateNested('soil.expansion', Number(e.target.value));
        updateVisuals(store.getState().soil.subgradeCBR, Number(e.target.value), store.getState().soil.waterTable);
    });

    document.getElementById('input-wt').addEventListener('input', (e) => {
        store.updateNested('soil.waterTable', Number(e.target.value));
        updateVisuals(store.getState().soil.subgradeCBR, store.getState().soil.expansion, Number(e.target.value));
    });

    document.getElementById('input-class').addEventListener('change', (e) => {
        store.updateNested('soil.classification', e.target.value);
    });
}

function updateVisuals(cbr, exp, wt) {
    const badge = document.getElementById('cbr-quality');
    const cbrAlert = document.getElementById('cbr-alert');
    
    if (cbr < 2) {
        badge.innerText = 'INADEQUADO';
        badge.className = 'badge px-3 py-1 rounded-full text-xs font-bold uppercase inline-block bg-red-100 text-red-700';
        cbrAlert.classList.remove('hidden');
    } else if (cbr < 6) {
        badge.innerText = 'FRACO';
        badge.className = 'badge px-3 py-1 rounded-full text-xs font-bold uppercase inline-block bg-orange-100 text-orange-700';
        cbrAlert.classList.add('hidden');
    } else if (cbr < 12) {
        badge.innerText = 'REGULAR';
        badge.className = 'badge px-3 py-1 rounded-full text-xs font-bold uppercase inline-block bg-yellow-100 text-yellow-700';
        cbrAlert.classList.add('hidden');
    } else {
        badge.innerText = 'BOM';
        badge.className = 'badge px-3 py-1 rounded-full text-xs font-bold uppercase inline-block bg-green-100 text-green-700';
        cbrAlert.classList.add('hidden');
    }

    const expAlert = document.getElementById('exp-alert');
    expAlert.classList.toggle('hidden', exp <= 2.0);

    const wtAlert = document.getElementById('wt-alert');
    wtAlert.classList.toggle('hidden', wt >= 1.5);
}
