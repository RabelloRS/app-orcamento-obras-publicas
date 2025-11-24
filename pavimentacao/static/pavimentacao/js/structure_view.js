import { store } from './state.js';
import { MATERIALS, MIN_THICKNESS_SURFACE } from './data.js';
import { calculateReqThickness } from './utils.js';

export const render = (container) => {
    const state = store.getState();
    const structure = state.structure;
    const trafficN = state.traffic.calculatedN;
    const subgradeCBR = state.soil.subgradeCBR;


    let minSurfRule = MIN_THICKNESS_SURFACE.find(rule => trafficN <= rule.maxN) || MIN_THICKNESS_SURFACE[MIN_THICKNESS_SURFACE.length - 1];

    const getOptions = (selectedId, filterType = null) => {
        return MATERIALS
            .filter(m => !filterType || m.type === filterType || m.type === 'stabilized')
            .map(m => `<option value="${m.id}" ${m.id === selectedId ? 'selected' : ''}>${m.name} (K=${m.k})</option>`)
            .join('');
    };

    container.innerHTML = `
        <div class="animate-fade-in flex flex-col lg:flex-row gap-6 h-full">
            <!-- Controls -->
            <div class="w-full lg:w-5/12 flex flex-col gap-4 overflow-y-auto pb-8 pr-2">
                <div class="flex justify-between items-baseline">
                    <h2 class="text-2xl font-bold text-slate-800">Estrutura</h2>
                    <span class="text-xs text-slate-500">N = ${trafficN.toExponential(2)}</span>
                </div>

                <!-- Layer Inputs -->
                <div class="space-y-3">
                    ${renderLayerInput('Revestimento', 'surface', structure.surface, getOptions(structure.surface.materialId, 'surface'), minSurfRule.val)}
                    ${renderLayerInput('Base', 'base', structure.base, getOptions(structure.base.materialId, 'granular'), 15.0)}
                    ${renderLayerInput('Sub-base', 'subbase', structure.subbase, getOptions(structure.subbase.materialId, 'granular'), 15.0)}
                    ${renderLayerInput('Reforço do Subleito', 'reinforcement', structure.reinforcement, getOptions(structure.reinforcement.materialId, 'granular'), 0)}
                </div>

                <!-- Validation Output -->
                <div id="validation-box" class="card p-4 bg-slate-50 border-slate-200 text-sm space-y-2 transition-all duration-300"></div>
            </div>

            <!-- Visualization -->
            <div class="w-full lg:w-7/12 flex flex-col gap-4">
                <div class="card p-6 flex-1 flex flex-col relative min-h-[400px] bg-white border border-slate-200">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Perfil Esquemático</h3>
                        <div class="flex gap-2 text-[10px]">
                            <span class="flex items-center gap-1"><span class="w-2 h-2 bg-slate-700 rounded-full"></span> Material</span>
                            <span class="flex items-center gap-1"><span class="w-2 h-2 border border-red-400 rounded-full"></span> Necessário</span>
                        </div>
                    </div>

                    <div class="flex-1 bg-sky-50/30 rounded-lg border border-slate-100 relative overflow-hidden w-full" id="canvas-container">
                        <canvas id="pavementCanvas" class="w-full h-full"></canvas>
                    </div>

                    <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                         <div class="bg-slate-50 p-1 rounded">Subleito CBR ${subgradeCBR}%</div>
                         <div class="bg-slate-50 p-1 rounded">Expansão ${state.soil.expansion}%</div>
                         <div class="bg-slate-50 p-1 rounded">Eq. Total: <span id="eq-total-display" class="font-bold text-slate-700">-</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    attachListeners();
    recalculate();


    new ResizeObserver(() => {
        drawPavement(store.getState().structure);
    }).observe(document.getElementById('canvas-container'));
};

const renderLayerInput = (label, key, data, options, minVal) => `
    <div class="card p-3 layer-card border-l-4 ${key === 'surface' ? 'border-slate-700' : 'border-slate-300'}" data-layer="${key}">
        <div class="flex justify-between items-center mb-2">
            <h4 class="font-semibold text-sm text-slate-700 flex items-center gap-2">
                <i data-lucide="${key === 'surface' ? 'layers' : 'box'}" class="w-3 h-3"></i> ${label}
            </h4>
            <div class="flex gap-2">
                <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">K=<span id="k-${key}">-</span></span>
                ${key !== 'surface' ? `<span class="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">CBR <span id="lbl-cbr-${key}">${data.cbr}</span>%</span>` : ''}
            </div>
        </div>
        <div class="grid grid-cols-12 gap-2">
            <div class="col-span-7">
                <select id="mat-${key}" class="input-field text-xs py-1.5 h-8">${options}</select>
            </div>
            <div class="col-span-5 flex items-center gap-2">
                <input type="number" id="thick-${key}" value="${data.thickness}" class="input-field text-xs py-1.5 h-8 font-bold text-center" min="0" step="1">
                <span class="text-xs text-slate-400">cm</span>
            </div>
        </div>

        ${key !== 'surface' ? `
        <div class="mt-2 flex items-center gap-2 bg-slate-50 p-1.5 rounded">
             <label class="text-[10px] text-slate-500 whitespace-nowrap">CBR Real:</label>
             <input type="range" id="range-cbr-${key}" min="2" max="100" value="${data.cbr || 20}" class="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500">
        </div>` : ''}
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
            const range = document.getElementById(`range-cbr-${layer}`);
            range.addEventListener('input', (e) => {
                const val = Number(e.target.value);
                store.updateNested(`structure.${layer}.cbr`, val);
                document.getElementById(`lbl-cbr-${layer}`).innerText = val;
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
    const msgs = [];






    if (s.base.cbr < 80) msgs.push({ type: 'warn', text: `Atenção: Base com CBR ${s.base.cbr}% < 80% (Mínimo DNIT).` });



    const H_req_subbase = calculateReqThickness(N, s.subbase.cbr);
    const H_above_subbase = (s.surface.thickness * kR) + (s.base.thickness * kB);

    if (H_above_subbase < H_req_subbase - 0.5) { // -0.5 tolerance
        msgs.push({
            type: 'error',
            text: `Espessura sobre Sub-base insuficiente. <br><b>Real: ${H_above_subbase.toFixed(1)} cm</b> vs <b>Nec: ${H_req_subbase.toFixed(1)} cm</b>.`
        });
    }


    let H_above_reinf = H_above_subbase + (s.subbase.thickness * kS);
    let targetCBR_for_reinf = s.reinforcement.thickness > 0 ? s.reinforcement.cbr : state.soil.subgradeCBR;

    if (s.reinforcement.thickness > 0) {
        const H_req_reinf = calculateReqThickness(N, s.reinforcement.cbr);
        if (H_above_reinf < H_req_reinf - 0.5) {
            msgs.push({
                type: 'error',
                text: `Espessura sobre Reforço insuficiente. <br><b>Real: ${H_above_reinf.toFixed(1)} cm</b> vs <b>Nec: ${H_req_reinf.toFixed(1)} cm</b>.`
            });
        }

        const H_req_subgrade = calculateReqThickness(N, state.soil.subgradeCBR);
        const H_total = H_above_reinf + (s.reinforcement.thickness * kRef);

        if (H_total < H_req_subgrade - 0.5) {
            msgs.push({
                type: 'error',
                text: `Espessura Total insuficiente para Subleito CBR ${state.soil.subgradeCBR}%. <br><b>Real: ${H_total.toFixed(1)} cm</b> vs <b>Nec: ${H_req_subgrade.toFixed(1)} cm</b>.`
            });
        }
        document.getElementById('eq-total-display').innerText = `${H_total.toFixed(1)} cm`;
    } else {

        const H_req_subgrade = calculateReqThickness(N, state.soil.subgradeCBR);
        if (H_above_reinf < H_req_subgrade - 0.5) {
             msgs.push({
                type: 'error',
                text: `Espessura Total insuficiente para Subleito CBR ${state.soil.subgradeCBR}%. <br><b>Real: ${H_above_reinf.toFixed(1)} cm</b> vs <b>Nec: ${H_req_subgrade.toFixed(1)} cm</b>.`
            });
        }
        document.getElementById('eq-total-display').innerText = `${H_above_reinf.toFixed(1)} cm`;
    }


    let minSurfRule = MIN_THICKNESS_SURFACE.find(rule => N <= rule.maxN) || MIN_THICKNESS_SURFACE[MIN_THICKNESS_SURFACE.length - 1];
    if (s.surface.thickness < minSurfRule.val) {
        msgs.push({ type: 'warn', text: `Revestimento menor que o recomendado (${minSurfRule.val} cm) para o tráfego.` });
    }


    const box = document.getElementById('validation-box');
    if (msgs.length > 0) {
        box.innerHTML = msgs.map(m => `
            <div class="flex items-start gap-2 ${m.type === 'error' ? 'text-red-600' : 'text-amber-600'}">
                <i data-lucide="${m.type === 'error' ? 'x-circle' : 'alert-triangle'}" class="w-4 h-4 mt-0.5 shrink-0"></i>
                <span>${m.text}</span>
            </div>
        `).join('');
        box.classList.remove('hidden');
    } else {
        box.innerHTML = `<div class="flex items-center gap-2 text-emerald-600 font-medium"><i data-lucide="check-circle" class="w-5 h-5"></i> Estrutura Aprovada!</div>`;
    }
    lucide.createIcons();

    drawPavement(s, H_req_subbase, calculateReqThickness(N, s.reinforcement.thickness > 0 ? s.reinforcement.cbr : state.soil.subgradeCBR));
}

function drawPavement(layers, hReqSubbase, hReqSubgrade) {
    const canvas = document.getElementById('pavementCanvas');
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);


    const colors = {
        surface: '#334155',
        base: '#94a3b8',
        subbase: '#cbd5e1',
        reinforcement: '#e2e8f0',
        subgrade: '#f8fafc' // using fillRect background logic instead
    };


    const totalThick = layers.surface.thickness + layers.base.thickness + layers.subbase.thickness + layers.reinforcement.thickness + 30;
    const scale = (h - 20) / totalThick;

    let y = 10;
    const xStart = 60;
    const layerWidth = w - 80;

    const draw = (thickness, color, label) => {
        if (thickness <= 0) return;
        const hPx = thickness * scale;


        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(xStart + 5, y + 5, layerWidth, hPx);


        ctx.fillStyle = color;
        ctx.fillRect(xStart, y, layerWidth, hPx);


        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(xStart, y, layerWidth, hPx);


        ctx.fillStyle = color === '#334155' ? '#fff' : '#475569';
        ctx.font = '12px Inter';
        ctx.fillText(label, xStart + 10, y + hPx/2 + 4);


        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText(`${thickness} cm`, xStart - 10, y + hPx/2 + 4);
        ctx.textAlign = 'left';

        y += hPx;
    };

    draw(layers.surface.thickness, colors.surface, 'Revestimento');
    draw(layers.base.thickness, colors.base, 'Base');
    draw(layers.subbase.thickness, colors.subbase, 'Sub-base');
    draw(layers.reinforcement.thickness, colors.reinforcement, 'Reforço');


    ctx.fillStyle = '#78350f';
    ctx.fillRect(xStart, y, layerWidth, h - y);
    ctx.fillStyle = '#fff';
    ctx.fillText('Subleito', xStart + 10, y + 20);
}
