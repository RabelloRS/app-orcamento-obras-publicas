import { store } from './state.js';
import { SURFACE_TYPES_DRAINAGE } from './data.js';

export const render = (container) => {
    const state = store.getState().drainage;
    const surfaceOptions = SURFACE_TYPES_DRAINAGE.map(s => `<option value="${s.c}" ${s.c === state.c ? 'selected' : ''}>${s.name} (C=${s.c})</option>`).join('');
    container.innerHTML = `
        <div class="animate-fade-in w-full">
            <h2 class="text-2xl font-bold text-slate-800 mb-6">Drenagem e Pavimento Permeável</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="card p-6">
                    <h3 class="font-semibold text-slate-700 mb-4 flex items-center gap-2"><i data-lucide="cloud-rain" class="w-5 h-5 text-blue-500"></i> Hidrologia</h3>
                    <div class="space-y-4">
                        <div><label class="label-text">Área de Contribuição ($A$)</label><div class="relative"><input type="number" id="drain-area" value="${state.area}" class="input-field" min="0"><span class="absolute right-3 top-2.5 text-slate-400 text-xs">m²</span></div></div>
                        <div><label class="label-text">Tipo de Superfície (Run-off $C$)</label><select id="drain-c" class="input-field">${surfaceOptions}</select></div>
                        <div><label class="label-text">Intensidade de Chuva ($I$)</label><div class="relative"><input type="number" id="drain-i" value="${state.rainfall_i}" class="input-field" min="0"><span class="absolute right-3 top-2.5 text-slate-400 text-xs">mm/h</span></div><p class="text-xs text-slate-400 mt-1">Para TR projetado (ex: 5 ou 10 anos)</p></div>
                    </div>
                </div>
                <div class="card p-6">
                    <h3 class="font-semibold text-slate-700 mb-4 flex items-center gap-2"><i data-lucide="layers" class="w-5 h-5 text-emerald-500"></i> Parâmetros do Solo/Base</h3>
                    <div class="space-y-4">
                        <div><label class="label-text">Permeabilidade do Solo ($K_{sat}$)</label><div class="relative"><input type="number" id="drain-k" value="${state.permeability_k}" class="input-field" min="0"><span class="absolute right-3 top-2.5 text-slate-400 text-xs">mm/h</span></div></div>
                        <div><label class="label-text">Porosidade da Base ($\eta$)</label><div class="relative"><input type="number" id="drain-p" value="${state.porosity}" class="input-field" min="0" max="1" step="0.01"><span class="absolute right-3 top-2.5 text-slate-400 text-xs">dec</span></div><p class="text-xs text-slate-400 mt-1">Brita comum \u2248 0.35 - 0.40</p></div>
                    </div>
                </div>
            </div>
            <div class="mt-6 card p-6 bg-white border-l-4 border-blue-500">
                <h3 class="text-lg font-bold text-slate-800 mb-4">Resultados de Dimensionamento</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><span class="text-xs text-slate-500 uppercase">Vazão de Pico ($Q$)</span><div class="text-3xl font-bold text-blue-600" id="res-q">-</div><span class="text-xs text-slate-400">Litros/segundo</span></div>
                    <div><span class="text-xs text-slate-500 uppercase">Volume Armazenamento</span><div class="text-3xl font-bold text-slate-700" id="res-vol">-</div><span class="text-xs text-slate-400">m³ necessários</span></div>
                    <div><span class="text-xs text-slate-500 uppercase">Espessura Camada Porosa</span><div class="text-3xl font-bold text-emerald-600" id="res-h">-</div><span class="text-xs text-slate-400">cm (se infiltração total)</span></div>
                </div>
                <div id="drain-alert" class="mt-4 text-sm p-3 bg-yellow-50 text-yellow-700 rounded hidden"></div>
            </div>
        </div>
    `;
    lucide.createIcons();
    attachListeners();
    calcDrainage();
};

function attachListeners() { ['drain-area', 'drain-c', 'drain-i', 'drain-k', 'drain-p'].forEach(id => { document.getElementById(id).addEventListener('input', (e) => { const keyMap = { 'drain-area': 'area', 'drain-c': 'c', 'drain-i': 'rainfall_i', 'drain-k': 'permeability_k', 'drain-p': 'porosity' }; store.updateNested(`drainage.${keyMap[id]}`, Number(e.target.value)); calcDrainage(); }); }); }

function calcDrainage() {
    const s = store.getState().drainage;
    const Q = (s.c * s.rainfall_i * s.area) / 3.6;
    const RainVolume_m3 = (s.rainfall_i / 1000) * s.area;
    const Infiltrated_m3 = (s.permeability_k / 1000) * s.area;
    const NetVol = Math.max(0, RainVolume_m3 - Infiltrated_m3);
    const H_m = NetVol / (s.area * s.porosity);
    const H_cm = H_m * 100;
    document.getElementById('res-q').innerText = Q.toFixed(1);
    document.getElementById('res-vol').innerText = NetVol.toFixed(1);
    document.getElementById('res-h').innerText = H_cm.toFixed(1);
    const alert = document.getElementById('drain-alert');
    if (s.permeability_k < 5) { alert.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4 inline mr-1"></i> Permeabilidade do solo muito baixa (${s.permeability_k} mm/h). Recomendado sistema de drenagem com tubos (detenção) e não infiltração total.`; alert.classList.remove('hidden'); lucide.createIcons(); } else { alert.classList.add('hidden'); }
}