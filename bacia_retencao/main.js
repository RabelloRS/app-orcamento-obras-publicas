import { CITIES_IDF } from './data.js';
import { toHa, formatNumber } from './utils.js';
import { calculateKirpich, calculateIntensity, calculateRationalQ, selectPipe, calculateEnvelope } from './calculations.js';
import { debounce } from './utils.js';

let state = {
    area: 0,
    areaUnit: 'ha',
    c: 0.75,
    tr: 25,
    city: 'curitiba',
    tcMode: 'manual',
    tc: 10,
    tcL: 0,
    tcH: 0,
    simMode: 'volume',
    limitQ: 0, // L/s
    limitV: 0, // m3
    slopeS: 0.005,
    manningN: 0.013,
};

let volumeChart = null;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    loadCities();
    setupEventListeners();
    loadFromStorage();
    
    if(!localStorage.getItem('bannerClosed')) {
        document.getElementById('privacy-banner').classList.remove('hidden');
    }
    

    updateCalculation();
});

function loadCities() {
    const select = document.getElementById('select-city');
    Object.keys(CITIES_IDF).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.text = CITIES_IDF[key].name;
        select.appendChild(option);
    });
    select.value = state.city;
}

function setupEventListeners() {
    const els = {
        area: document.getElementById('input-area'),
        unit: document.getElementById('select-unit'),
        cSlider: document.getElementById('slider-c'),
        trSlider: document.getElementById('slider-tr'),
        city: document.getElementById('select-city'),
        tcMode: document.getElementById('check-calc-tc'),
        tcInput: document.getElementById('input-tc'),
        tcL: document.getElementById('input-L'),
        tcH: document.getElementById('input-H'),
        limitQ: document.getElementById('input-limit-q'),
        limitV: document.getElementById('input-limit-v'),
        modeVol: document.getElementById('mode-volume'),
        modeFlow: document.getElementById('mode-flow'),
        slope: document.getElementById('input-slope'),
        nManning: document.getElementById('input-n'),
    };


    const debouncedUpdate = debounce(() => updateCalculation(), 300);

    els.area.addEventListener('input', (e) => { state.area = parseFloat(e.target.value); debouncedUpdate(); });
    els.unit.addEventListener('change', (e) => { state.areaUnit = e.target.value; debouncedUpdate(); });

    els.cSlider.addEventListener('input', (e) => { 
        state.c = parseFloat(e.target.value); 
        document.getElementById('val-c').innerText = state.c.toFixed(2);
        debouncedUpdate(); 
    });
    
    els.trSlider.addEventListener('input', (e) => { 
        state.tr = parseInt(e.target.value); 
        document.getElementById('val-tr').innerText = state.tr;
        debouncedUpdate(); 
    });

    els.city.addEventListener('change', (e) => {
        state.city = e.target.value;
        const customDiv = document.getElementById('idf-params');
        customDiv.classList.toggle('hidden', state.city !== 'custom');
        debouncedUpdate();
    });

    ['k','a','b','c'].forEach(p => {
        document.getElementById(`idf-${p}`).addEventListener('input', debouncedUpdate);
    });

    els.tcMode.addEventListener('change', (e) => {
        state.tcMode = e.target.checked ? 'calc' : 'manual';
        document.getElementById('tc-manual-group').classList.toggle('hidden', state.tcMode === 'calc');
        document.getElementById('tc-calc-group').classList.toggle('hidden', state.tcMode === 'manual');
        debouncedUpdate();
    });
    
    els.tcInput.addEventListener('input', (e) => { state.tc = parseFloat(e.target.value); debouncedUpdate(); });
    els.tcL.addEventListener('input', (e) => { state.tcL = parseFloat(e.target.value); debouncedUpdate(); });
    els.tcH.addEventListener('input', (e) => { state.tcH = parseFloat(e.target.value); debouncedUpdate(); });

    const toggleMode = (mode) => {
        state.simMode = mode;
        els.modeVol.classList.toggle('bg-white', mode === 'volume');
        els.modeVol.classList.toggle('text-hydro-700', mode === 'volume');
        els.modeFlow.classList.toggle('bg-white', mode === 'flow');
        els.modeFlow.classList.toggle('text-hydro-700', mode === 'flow');

        document.getElementById('input-container-limit').classList.toggle('hidden', mode !== 'volume');
        document.getElementById('input-container-volume').classList.toggle('hidden', mode !== 'flow');
        
        document.getElementById('label-main-result').innerText = mode === 'volume' ? 'Volume Útil Necessário' : 'Vazão de Saída Permitida';
        debouncedUpdate();
    };

    els.modeVol.addEventListener('click', () => toggleMode('volume'));
    els.modeFlow.addEventListener('click', () => toggleMode('flow'));

    els.limitQ.addEventListener('input', (e) => { state.limitQ = parseFloat(e.target.value); debouncedUpdate(); });
    els.limitV.addEventListener('input', (e) => { state.limitV = parseFloat(e.target.value); debouncedUpdate(); });


    document.getElementById('btn-reset').addEventListener('click', () => { localStorage.clear(); location.reload(); });
    document.getElementById('btn-export').addEventListener('click', exportJSON);
    document.getElementById('btn-print').addEventListener('click', generatePDF);
    const modal = document.getElementById('modal-methodology');
    document.getElementById('btn-methodology').addEventListener('click', () => { modal.classList.remove('hidden'); modal.classList.add('flex'); });
    document.getElementById('close-methodology').addEventListener('click', () => { modal.classList.add('hidden'); modal.classList.remove('flex'); });
    
    document.getElementById('close-banner').addEventListener('click', () => {
        document.getElementById('privacy-banner').classList.add('hidden');
        localStorage.setItem('bannerClosed', 'true');
    });


    const tooltip = document.getElementById('tooltip');
    document.querySelectorAll('.tooltip-trigger').forEach(el => {
        el.addEventListener('mouseenter', (e) => {
            tooltip.innerText = e.target.dataset.tip;
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY + 10) + 'px';
            tooltip.classList.remove('hidden');
            requestAnimationFrame(() => tooltip.classList.remove('opacity-0'));
        });
        el.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.pageX + 10) + 'px';
            tooltip.style.top = (e.pageY + 10) + 'px';
        });
        el.addEventListener('mouseleave', () => {
            tooltip.classList.add('opacity-0');
            setTimeout(() => tooltip.classList.add('hidden'), 200);
        });
    });
}

function getIDF() {
    if(state.city !== 'custom') return CITIES_IDF[state.city];
    return {
        k: parseFloat(document.getElementById('idf-k').value) || 0,
        a: parseFloat(document.getElementById('idf-a').value) || 0,
        b: parseFloat(document.getElementById('idf-b').value) || 0,
        c: parseFloat(document.getElementById('idf-c').value) || 0,
    };
}

function updateCalculation() {
    saveToStorage();

    const areaHa = toHa(state.area, state.areaUnit);
    

    let tc = state.tc;
    if (state.tcMode === 'calc') {
        tc = calculateKirpich(state.tcL, state.tcH);
        document.getElementById('tc-result-display').innerText = `Tc calculado: ${tc.toFixed(2)} min`;
    }
    if (!tc || tc < 0) tc = 10; // Safety fallback

    const idf = getIDF();
    

    const i_tc = calculateIntensity(idf, state.tr, tc);
    const q_peak_m3s = calculateRationalQ(state.c, i_tc, areaHa);
    const q_peak_Ls = q_peak_m3s * 1000;
    
    document.getElementById('res-q-peak').innerText = formatNumber(q_peak_Ls, 1);


    const limitQ_m3s = (state.limitQ || 0) / 1000;
    const availableV_m3 = state.limitV || 0;

    let simResult = null;
    
    if (state.simMode === 'volume') {
        if (limitQ_m3s > 0 && areaHa > 0) {
            simResult = calculateEnvelope(areaHa, state.c, idf, state.tr, limitQ_m3s, 0, 'volume');
            document.getElementById('res-volume').innerText = formatNumber(simResult.maxStorage, 1);
            document.getElementById('res-crit-time').innerText = simResult.criticalTime;
        } else {
            document.getElementById('res-volume').innerText = "--";
        }
    } else {
        if (availableV_m3 > 0 && areaHa > 0) {
            simResult = calculateEnvelope(areaHa, state.c, idf, state.tr, 0, availableV_m3, 'flow');


            document.getElementById('res-volume').innerText = formatNumber(simResult.qOut * 1000, 1) + " L/s";
            document.getElementById('res-crit-time').innerText = simResult.criticalTime;
        } else {
            document.getElementById('res-volume').innerText = "--";
        }
    }


    const pipeIn = selectPipe(q_peak_m3s, state.slopeS, state.manningN);
    updatePipeUI('in', pipeIn);

    const qOut_final = state.simMode === 'volume' ? limitQ_m3s : (simResult ? simResult.qOut : 0);
    const pipeOut = selectPipe(qOut_final, state.slopeS, state.manningN);
    updatePipeUI('out', pipeOut);


    if (simResult) updateChart(simResult.results);
    else if (volumeChart) { volumeChart.destroy(); volumeChart = null; }
}

function updatePipeUI(type, pipeData) {
    const diamEl = document.getElementById(`pipe-${type}-diam`);
    const velEl = document.getElementById(`pipe-${type}-vel`);
    const iconEl = document.getElementById(`pipe-${type}-icon`);

    if(pipeData) {
        diamEl.innerText = pipeData.dn;
        velEl.innerText = `V = ${pipeData.v.toFixed(2)} m/s`;
        iconEl.innerText = "DN" + pipeData.dn;
        iconEl.className = `w-12 h-12 rounded-full bg-hydro-50 flex items-center justify-center border-4 border-hydro-200 text-xs font-bold text-hydro-700`;
    } else {
        diamEl.innerText = "--";
        velEl.innerText = "V = -- m/s";
        iconEl.innerText = "--";
        iconEl.className = `w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-300 text-xs font-bold text-slate-600`;
    }
}

function updateChart(data) {
    const ctx = document.getElementById('chart-volume').getContext('2d');
    
    if (volumeChart) volumeChart.destroy();

    const labels = data.map(d => d.t);
    const volumes = data.map(d => d.vol);

    volumeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Volume Necessário (m³)',
                    data: volumes,
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Vol: ${ctx.raw.toFixed(1)} m³`
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Duração da Chuva (min)' }, grid: { display: false } },
                y: { title: { display: true, text: 'Volume de Armazenamento (m³)' }, beginAtZero: true }
            }
        }
    });
}

function saveToStorage() {
    localStorage.setItem('hydrocalc_state', JSON.stringify(state));
}

function loadFromStorage() {
    const saved = localStorage.getItem('hydrocalc_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };

        document.getElementById('input-area').value = state.area || '';
        document.getElementById('select-unit').value = state.areaUnit;
        document.getElementById('slider-c').value = state.c;
        document.getElementById('val-c').innerText = state.c;
        document.getElementById('slider-tr').value = state.tr;
        document.getElementById('val-tr').innerText = state.tr;
        document.getElementById('select-city').value = state.city;
        
        if (state.tcMode === 'calc') {
            document.getElementById('check-calc-tc').checked = true;
            document.getElementById('tc-manual-group').classList.add('hidden');
            document.getElementById('tc-calc-group').classList.remove('hidden');
        }
        document.getElementById('input-tc').value = state.tc;
        document.getElementById('input-L').value = state.tcL;
        document.getElementById('input-H').value = state.tcH;
        document.getElementById('input-limit-q').value = state.limitQ || '';
        document.getElementById('input-limit-v').value = state.limitV || '';
        document.getElementById('input-slope').value = state.slopeS;
        document.getElementById('input-n').value = state.manningN;

        if (state.simMode === 'flow') {
            document.getElementById('mode-flow').click();
        }
        if (state.city === 'custom') {
            document.getElementById('idf-params').classList.remove('hidden');
        }
    }
}

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "projeto_piscinao.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
}

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    let y = margin;
    const areaHa = toHa(state.area, state.areaUnit);
    const idf = getIDF();
    const tc = state.tcMode === 'calc' ? calculateKirpich(state.tcL, state.tcH) : state.tc;
    const i_tc = calculateIntensity(idf, state.tr, tc);
    const q_peak_m3s = calculateRationalQ(state.c, i_tc, areaHa);
    const sim = state.simMode === 'volume'
        ? calculateEnvelope(areaHa, state.c, idf, state.tr, (state.limitQ||0)/1000, 0, 'volume')
        : calculateEnvelope(areaHa, state.c, idf, state.tr, 0, (state.limitV||0), 'flow');

    doc.setFontSize(16);
    doc.text('Memória de Cálculo – Bacia de Retenção', margin, y); y += 8;
    doc.setFontSize(10);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, margin, y); y += 6;
    doc.text(`Área: ${formatNumber(areaHa, 2)} ha | C: ${state.c.toFixed(2)} | TR: ${state.tr} anos`, margin, y); y += 6;
    doc.text(`Tc: ${tc.toFixed(2)} min | i(Tc): ${i_tc.toFixed(2)} mm/h | Qpico: ${(q_peak_m3s*1000).toFixed(1)} L/s`, margin, y); y += 10;

    doc.setFontSize(12);
    doc.text('Metodologia', margin, y); y += 6;
    doc.setFontSize(10);
    doc.text('Método Racional para Qpico e Método das Chuvas para detenção. Fórmulas e parâmetros:', margin, y); y += 5;
    doc.text(`i = K·TR^a / (t + b)^c  | K=${idf.k}, a=${idf.a}, b=${idf.b}, c=${idf.c}, TR=${state.tr}, t=${tc.toFixed(2)}`, margin, y); y += 5;
    if (state.tcMode === 'calc') doc.text(`Kirpich: tc = 0.0195·L^0.77·(H/L)^-0.385 | L=${state.tcL} m, H=${state.tcH} m`, margin, y);
    y += 8;

    doc.setFontSize(12);
    doc.text('Tabela de Volume (Envelope)', margin, y); y += 6;
    const rows = sim.results.map(r => [r.t, r.q_in.toFixed(3), r.vol_in.toFixed(1), r.q_out.toFixed(3), r.vol_out.toFixed(1), r.vol.toFixed(1)]);
    doc.autoTable({ startY: y, head: [['t (min)', 'Q_in (m³/s)', 'Vol_in (m³)', 'Q_out (m³/s)', 'Vol_out (m³)', 'Armazenamento (m³)']], body: rows, styles: { fontSize: 8 } });
    y = doc.lastAutoTable.finalY + 8;

    doc.setFontSize(12);
    doc.text('Conclusão', margin, y); y += 6;
    doc.setFontSize(10);
    if (state.simMode === 'volume') {
        doc.text(`Volume útil necessário: ${sim.maxStorage.toFixed(1)} m³ (duração crítica: ${sim.criticalTime} min).`, margin, y);
    } else {
        doc.text(`Vazão de saída permitida: ${(sim.qOut*1000).toFixed(1)} L/s (duração crítica: ${sim.criticalTime} min).`, margin, y);
    }
    y += 8;

    const pipeIn = selectPipe(q_peak_m3s, state.slopeS, state.manningN);
    const qOut_final = state.simMode === 'volume' ? (state.limitQ||0)/1000 : sim.qOut;
    const pipeOut = selectPipe(qOut_final, state.slopeS, state.manningN);
    doc.text(`Tubulação (Manning n=${state.manningN}, S=${state.slopeS} m/m): Entrada DN${pipeIn.dn}mm, Saída DN${pipeOut.dn}mm.`, margin, y);
    y += 6;

    doc.save('memoria_calculo_bacia_retencao.pdf');
}
    els.slope.addEventListener('input', (e) => { state.slopeS = parseFloat(e.target.value); debouncedUpdate(); });
    els.nManning.addEventListener('input', (e) => { state.manningN = parseFloat(e.target.value); debouncedUpdate(); });
