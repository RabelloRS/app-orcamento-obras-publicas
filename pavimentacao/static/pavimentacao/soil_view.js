import { store } from './state.js';

export const render = (container) => {
    const state = store.getState().soil;
    container.innerHTML = `
        <div class="animate-fade-in w-full">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Caracterização do Subleito</h2>
            <div class="card p-8">
                <div class="grid grid-cols-1 gap-8">
                    <div>
                        <label class="label-text text-lg mb-2">Índice de Suporte Califórnia (CBR/ISC)</label>
                        <div class="flex items-center gap-4">
                            <div class="relative flex-1">
                                <input type="number" id="input-cbr" value="${state.subgradeCBR}" class="input-field text-lg py-3" min="1" max="100">
                                <span class="absolute right-4 top-3.5 text-slate-400 font-medium">%</span>
                            </div>
                            <div class="w-1/2 h-12 bg-slate-100 rounded-lg relative overflow-hidden border border-slate-200">
                                <div id="cbr-bar" class="absolute top-0 left-0 h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 transition-all duration-500" style="width: ${Math.min(state.subgradeCBR, 20) * 5}%"></div>
                                <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                                    <span id="cbr-label">Fraco</span>
                                </div>
                            </div>
                        </div>
                        <p class="text-sm text-slate-500 mt-2">
                            <i data-lucide="info" class="w-3 h-3 inline mr-1"></i>
                            O DNIT recomenda substituição para CBR < 2%.
                        </p>
                    </div>
                    <div class="h-px bg-slate-100"></div>
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label class="label-text">Expansão</label>
                            <div class="relative">
                                <input type="number" id="input-exp" value="${state.expansion}" class="input-field" step="0.1">
                                <span class="absolute right-3 top-2.5 text-slate-400">%</span>
                            </div>
                            <p id="exp-warning" class="text-xs text-red-500 mt-1 hidden">Atenção: Expansão > 2% exige tratamento.</p>
                        </div>
                        <div>
                            <label class="label-text">Nível do Lençol Freático</label>
                            <div class="relative">
                                <input type="number" id="input-wt" value="${state.waterTable}" class="input-field" step="0.1">
                                <span class="absolute right-3 top-2.5 text-slate-400">m</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">Profundidade em relação ao greide</p>
                        </div>
                    </div>
                    <div>
                        <label class="label-text">Classificação TRB/AASHTO (Estimada)</label>
                        <select id="input-class" class="input-field">
                            <option value="A-1-a" ${state.classification === 'A-1-a' ? 'selected' : ''}>A-1-a (Pedregulho bem graduado)</option>
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
    `;
    lucide.createIcons();
    attachListeners();
    updateVisuals(state.subgradeCBR, state.expansion);
};

function attachListeners() {
    document.getElementById('input-cbr').addEventListener('input', (e) => { const val = Number(e.target.value); store.updateNested('soil.subgradeCBR', val); updateVisuals(val, store.getState().soil.expansion); });
    document.getElementById('input-exp').addEventListener('input', (e) => { const val = Number(e.target.value); store.updateNested('soil.expansion', val); updateVisuals(store.getState().soil.subgradeCBR, val); });
    document.getElementById('input-wt').addEventListener('input', (e) => { store.updateNested('soil.waterTable', Number(e.target.value)); });
    document.getElementById('input-class').addEventListener('change', (e) => { store.updateNested('soil.classification', e.target.value); });
}

function updateVisuals(cbr, exp) {
    const bar = document.getElementById('cbr-bar');
    const label = document.getElementById('cbr-label');
    let width = Math.min(cbr, 20) * 5; bar.style.width = `${width}%`;
    let text = 'Fraco'; if (cbr >= 5) text = 'Regular'; if (cbr >= 10) text = 'Bom'; if (cbr >= 20) text = 'Excelente'; label.innerText = text;
    const expWarn = document.getElementById('exp-warning'); if (exp > 2.0) expWarn.classList.remove('hidden'); else expWarn.classList.add('hidden');
}