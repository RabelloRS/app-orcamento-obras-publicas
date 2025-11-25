import { store } from './state.js';
import { MATERIALS, MIN_THICKNESS_SURFACE } from './data.js';
import { calculateTotalThickness } from './utils.js';

export const render = (container) => {
    const state = store.getState();
    const structure = state.structure;
    const trafficN = state.traffic.calculatedN;
    const subgradeCBR = state.soil.subgradeCBR;


    const H_total_needed = calculateTotalThickness(trafficN, subgradeCBR);


    let minSurf = MIN_THICKNESS_SURFACE.find(rule => trafficN <= rule.maxN) || MIN_THICKNESS_SURFACE[MIN_THICKNESS_SURFACE.length - 1];


    const getOptions = (selectedId, filterType = null) => {
        return MATERIALS
            .filter(m => !filterType || m.type === filterType || m.type === 'stabilized')
            .map(m => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''} data-k="${m.k}">${m.name} (K=${m.k})</option>`)
            .join('');
    };

    container.innerHTML = `
        <div class="animate-fade-in flex flex-col lg:flex-row gap-6 h-full">
            <!-- Controls -->
            <div class="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pb-8">
                <h2 class="text-2xl font-bold text-slate-800">Estrutura do Pavimento</h2>
                
                <!-- Summary KPI -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="card p-4 border-l-4 border-dnit-500">
                        <span class="text-xs text-slate-500 uppercase">Espessura Total Necessária ($H_m$)</span>
                        <div class="text-2xl font-bold text-dnit-800">${H_total_needed.toFixed(1)} cm</div>
                    </div>
                    <div class="card p-4 border-l-4 border-emerald-500">
                        <span class="text-xs text-slate-500 uppercase">Espessura Equivalente Atual</span>
                        <div class="text-2xl font-bold text-emerald-800" id="current-eq-thickness">0.0 cm</div>
                    </div>
                </div>

                <!-- Layer Inputs -->
                <div class="space-y-4">
                    ${renderLayerInput('Revestimento', 'surface', structure.surface, getOptions(structure.surface.materialId, 'surface'), minSurf.val, true)}
                    ${renderLayerInput('Base', 'base', structure.base, getOptions(structure.base.materialId, 'granular'), 15.0)}
                    ${renderLayerInput('Sub-base', 'subbase', structure.subbase, getOptions(structure.subbase.materialId, 'granular'), 15.0)}
                    ${renderLayerInput('Reforço do Subleito', 'reinforcement', structure.reinforcement, getOptions(structure.reinforcement.materialId, 'granular'), 0)}
                </div>

                <!-- Validation Messages -->
                <div id="validation-box" class="card p-4 bg-slate-50 border-slate-200 text-sm space-y-2 hidden"></div>
            </div>

            <!-- Visualization -->
            <div class="w-full lg:w-1/2 card p-6 flex flex-col sticky top-0">
                <h3 class="text-sm font-semibold text-slate-500 uppercase mb-4">Perfil Esquemático</h3>
                <div class="flex-1 bg-sky-50 rounded-lg border border-sky-100 relative overflow-hidden flex items-end justify-center p-8" id="canvas-container">
                    <canvas id="pavementCanvas" class="w-full h-full"></canvas>
                </div>
                <div class="mt-4 flex justify-between text-xs text-slate-400">
                    <span>Subleito CBR ${subgradeCBR}%</span>
                    <span>N = ${state.traffic.calculatedN.toExponential(2)}</span>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    attachListeners();
    recalculate();
};

const renderLayerInput = (label, key, data, options, minVal, isSurface = false) => `
    <div class="card p-4 layer-card" data-layer="${key}">
        <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-slate-700 flex items-center gap-2">
                <i data-lucide="${isSurface ? 'layers' : 'box'}" class="w-4 h-4 text-dnit-500"></i> ${label}
            </h4>
            <span class="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">K = <span id="k-${key}">-</span></span>
        </div>
        <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
                <label class="label-text">Material</label>
                <select id="mat-${key}" class="input-field text-sm py-1">${options}</select>
            </div>
            <div>
                <label class="label-text">Espessura (cm)</label>
                <input type="number" id="thick-${key}" value="${data.thickness}" class="input-field text-sm py-1" min="0" step="1">
            </div>
        </div>
        ${!isSurface ? `
        <div class="mt-2">
             <label class="label-text">CBR do Material (%)</label>
             <input type="number" id="cbr-${key}" value="${data.cbr || 0}" class="input-field text-sm py-1 w-1/3">
        </div>` : ''}
        ${minVal > 0 ? `<p class="text-[10px] text-slate-400 mt-2">Mínimo recomendado: ${minVal} cm</p>` : ''}
    </div>
`;

function attachListeners() {
    const layers = ['surface', 'base', 'subbase', 'reinforcement'];

    layers.forEach(layer => {
        document.getElementById(`mat-${layer}`).addEventListener('change', (e) => {
            store.updateNested(`structure.${layer}.materialId`, e.target.value);
            recalculate();
        });
        document.getElementById(`thick-${layer}`).addEventListener('input', (e) => {
            store.updateNested(`structure.${layer}.thickness`, Number(e.target.value));
            recalculate();
        });
        if (layer !== 'surface') {
            document.getElementById(`cbr-${layer}`).addEventListener('input', (e) => {
                store.updateNested(`structure.${layer}.cbr`, Number(e.target.value));
                recalculate();
            });
        }
    });
}

function recalculate() {
    const state = store.getState();
    const s = state.structure;


    const getK = (id) => MATERIALS.find(m => m.id === id)?.k || 1.0;
    const kR = getK(s.surface.materialId);
    const kB = getK(s.base.materialId);
    const kS = getK(s.subbase.materialId);
    const kRef = getK(s.reinforcement.materialId);


    document.getElementById('k-surface').innerText = kR;
    document.getElementById('k-base').innerText = kB;
    document.getElementById('k-subbase').innerText = kS;
    document.getElementById('k-reinforcement').innerText = kRef;


    const N = state.traffic.calculatedN;


    const H20 = calculateTotalThickness(N, 20); // Top of Subbase (protecting hypothetical CBR 20)
    const Hn = calculateTotalThickness(N, s.reinforcement.cbr > 0 ? s.reinforcement.cbr : state.soil.subgradeCBR); // Protecting Reinforcement (or subgrade if no reinf)
    const Hm = calculateTotalThickness(N, state.soil.subgradeCBR); // Protecting Subgrade


    const Eq_Surface_Base = (s.surface.thickness * kR) + (s.base.thickness * kB);
    const Eq_Total_Subbase = Eq_Surface_Base + (s.subbase.thickness * kS);
    const Eq_Total = Eq_Total_Subbase + (s.reinforcement.thickness * kRef);

    document.getElementById('current-eq-thickness').innerText = `${Eq_Total.toFixed(1)} cm`;


    const msgs = [];



    if (Eq_Surface_Base < H20) msgs.push(`⚠️ A estrutura (Rev + Base) é insuficiente para proteger a Sub-base (Req: ${H20.toFixed(1)} cm equivalentes). Aumente a Base.`);



    if (s.reinforcement.thickness > 0) {

        const H_reinf_req = calculateTotalThickness(N, s.reinforcement.cbr);
        if (Eq_Total_Subbase < H_reinf_req) msgs.push(`⚠️ Estrutura insuficiente sobre o Reforço (Req: ${H_reinf_req.toFixed(1)} cm eq).`);
    }


    if (Eq_Total < Hm) msgs.push(`⛔ Estrutura Total insuficiente para o Subleito (Req: ${Hm.toFixed(1)} cm eq). Faltam ${(Hm - Eq_Total).toFixed(1)} cm.`);


    if (s.base.cbr < 80) msgs.push(`⚠️ Base com CBR < 80%. DNIT exige CBR ≥ 80% para Base.`);
    if (s.subbase.cbr < 20) msgs.push(`⚠️ Sub-base com CBR < 20%.`);


    let minSurf = MIN_THICKNESS_SURFACE.find(rule => N <= rule.maxN) || MIN_THICKNESS_SURFACE[MIN_THICKNESS_SURFACE.length - 1];
    if (s.surface.thickness < minSurf.val) msgs.push(`⚠️ Revestimento menor que o mínimo (${minSurf.val} cm) para o tráfego N.`);

    const valBox = document.getElementById('validation-box');
    if (msgs.length > 0) {
        valBox.innerHTML = msgs.map(m => `<p>${m}</p>`).join('');
        valBox.classList.remove('hidden');
    } else {
        valBox.innerHTML = `<p class="text-emerald-600 font-semibold flex items-center gap-2"><i data-lucide="check-circle" class="w-4 h-4"></i> Dimensionamento atende aos critérios do DNIT.</p>`;
        valBox.classList.remove('hidden');
        lucide.createIcons();
    }

    drawPavement(s);
}

function drawPavement(layers) {
    const canvas = document.getElementById('pavementCanvas');
    const ctx = canvas.getContext('2d');


    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const totalThick = layers.surface.thickness + layers.base.thickness + layers.subbase.thickness + layers.reinforcement.thickness + 20; // +20 for subgrade visual


    const scale = (h - 40) / totalThick;

    let currentY = 20;

    const drawLayer = (thickness, color, label) => {
        if (thickness <= 0) return;
        const hPx = thickness * scale;

        ctx.fillStyle = color;
        ctx.fillRect(50, currentY, w - 100, hPx);

        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.strokeRect(50, currentY, w - 100, hPx);

        // Draw Text
        ctx.fillStyle = '#1e293b'; // Darker text
        ctx.font = 'bold 14px Inter'; // Larger font

        // Label (Right side)
        ctx.textAlign = 'left';
        ctx.fillText(label, w - 45, currentY + hPx / 2 + 5);

        // Thickness (Left side)
        ctx.textAlign = 'right';
        ctx.fillText(`${thickness} cm`, 45, currentY + hPx / 2 + 5);

        currentY += hPx;
    };

    drawLayer(layers.surface.thickness, '#334155', 'Revestimento');
    drawLayer(layers.base.thickness, '#94a3b8', 'Base');
    drawLayer(layers.subbase.thickness, '#cbd5e1', 'Sub-base');
    drawLayer(layers.reinforcement.thickness, '#e2e8f0', 'Reforço');

    // Subgrade
    ctx.fillStyle = '#885533';
    ctx.fillRect(50, currentY, w - 100, h - currentY);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Subleito', w / 2, currentY + 25);
}
