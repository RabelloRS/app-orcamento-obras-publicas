import { DEFAULT_IDF } from './data.js';
import { calculateTc, calculateIntensity, generateHuffDistribution, calculateSCSAbstractions, generateTriangularUH, convolve, validateInputs } from './math.js';
import { renderHydrograph, renderHyetograph, renderQuartiles, getChartImages } from './charts.js';

let currentData = {
    inputs: {},
    results: {}
};

const DEBOUNCE_DELAY = 400;
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setupUI();
    setupIDFDefaults();
    performCalculation(); // Initial calc
});

function setupIDFDefaults() {
    document.getElementById('idf-k').value = DEFAULT_IDF.K;
    document.getElementById('idf-a').value = DEFAULT_IDF.a;
    document.getElementById('idf-b').value = DEFAULT_IDF.b;
    document.getElementById('idf-c').value = DEFAULT_IDF.c;
}

function setupUI() {

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('text-blue-600', 'border-blue-600');
                b.classList.add('text-slate-500', 'border-transparent');
            });
            e.currentTarget.classList.remove('text-slate-500', 'border-transparent');
            e.currentTarget.classList.add('text-blue-600', 'border-blue-600');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
            

            if(targetId === 'tab-memorial') updateMemorial();
        });
    });


    document.querySelectorAll('.input-calc').forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(performCalculation, DEBOUNCE_DELAY);
        });
    });

    document.getElementById('in-cn').addEventListener('input', (e) => {
        document.getElementById('val-cn').textContent = e.target.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(performCalculation, DEBOUNCE_DELAY);
    });

    document.getElementById('chk-custom-idf').addEventListener('change', (e) => {
        const box = document.getElementById('box-idf-params');
        if (e.target.checked) {
            box.classList.remove('hidden');
            box.classList.add('grid');
        } else {
            box.classList.add('hidden');
            box.classList.remove('grid');
            setupIDFDefaults();
            performCalculation();
        }
    });

    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
    
    // Save/Load project buttons
    document.getElementById('btn-save-project').addEventListener('click', saveProject);
    document.getElementById('btn-load-project').addEventListener('click', loadProject);

    document.getElementById('btn-load-example').addEventListener('click', loadExampleData);
}

function saveProject() {
    const inputs = getInputs();
    const projectData = {
        appName: 'HidroCalc Pro',
        inputs: inputs,
        results: currentData.results ? {
            maxFlow: currentData.results.maxFlow,
            peakTime: currentData.results.peakTime,
            totalVol: currentData.results.totalVol,
            totalPe: currentData.results.totalPe,
            tc: currentData.results.tc,
            intensity: currentData.results.intensity
        } : null
    };
    
    if (window.ResolveDataManager) {
        window.ResolveDataManager.downloadProjectFile('hidrograma_projeto', projectData);
    } else {
        const content = JSON.stringify(projectData, null, 2);
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hidrograma_projeto_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

function loadProject() {
    if (window.ResolveDataManager) {
        window.ResolveDataManager.openLoadDialog();
    } else {
        alert('Sistema de carregamento não disponível.');
    }
}

// Listen for project load event
window.addEventListener('resolveProjectLoaded', (event) => {
    const data = event.detail;
    if (data.custom && data.custom.inputs) {
        const inputs = data.custom.inputs;
        if (inputs.area) document.getElementById('in-area').value = inputs.area;
        if (inputs.length) document.getElementById('in-length').value = inputs.length;
        if (inputs.slope) document.getElementById('in-slope').value = inputs.slope;
        if (inputs.cn) {
            document.getElementById('in-cn').value = inputs.cn;
            document.getElementById('val-cn').textContent = inputs.cn;
        }
        if (inputs.tr) document.getElementById('in-tr').value = inputs.tr;
        if (inputs.duration) document.getElementById('in-duration').value = inputs.duration;
        if (inputs.idf && inputs.idf.K !== DEFAULT_IDF.K) {
            document.getElementById('chk-custom-idf').checked = true;
            document.getElementById('box-idf-params').classList.remove('hidden');
            document.getElementById('box-idf-params').classList.add('grid');
            document.getElementById('idf-k').value = inputs.idf.K;
            document.getElementById('idf-a').value = inputs.idf.a;
            document.getElementById('idf-b').value = inputs.idf.b;
            document.getElementById('idf-c').value = inputs.idf.c;
        }
        performCalculation();
    }
});

function loadExampleData() {

    document.getElementById('in-area').value = "10.00";
    document.getElementById('in-length').value = "5.00";
    document.getElementById('in-slope').value = "100";
    document.getElementById('in-cn').value = "70";
    document.getElementById('val-cn').textContent = "70";
    

    document.getElementById('in-tr').value = "10";
    document.getElementById('in-duration').value = "65"; // Matches Reference adoption
    

    document.getElementById('chk-custom-idf').checked = false;
    document.getElementById('box-idf-params').classList.add('hidden');
    setupIDFDefaults();

    performCalculation();
    

    const btn = document.getElementById('btn-load-example');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="check" class="h-3 w-3"></i> Carregado`;
    lucide.createIcons();
    setTimeout(() => {
        btn.innerHTML = originalText;
        lucide.createIcons();
    }, 2000);
}

function getInputs() {
    const val = (id) => parseFloat(document.getElementById(id).value);
    const isCustomIdf = document.getElementById('chk-custom-idf').checked;

    return {
        area: val('in-area'),
        length: val('in-length'),
        slope: val('in-slope'),
        cn: val('in-cn'),
        tr: val('in-tr'),
        duration: val('in-duration'),
        idf: isCustomIdf ? {
            K: val('idf-k'), a: val('idf-a'), b: val('idf-b'), c: val('idf-c')
        } : DEFAULT_IDF
    };
}

function performCalculation() {
    const inputs = getInputs();
    const validation = validateInputs(inputs);
    
    const validBox = document.getElementById('validation-box');
    const validList = document.getElementById('validation-list');
    validList.innerHTML = '';
    
    if (validation.msgs.length > 0) {
        validBox.classList.remove('hidden');
        validation.msgs.forEach(msg => {
            const li = document.createElement('li');
            li.textContent = msg;
            validList.appendChild(li);
        });
    } else {
        validBox.classList.add('hidden');
    }

    if (!validation.valid) return;

    try {
        const tc = calculateTc(inputs.length, inputs.slope);
        const intensity = calculateIntensity(inputs.tr, inputs.duration, inputs.idf);
        const totalPrecip = intensity * (inputs.duration / 60);
        const huffData = generateHuffDistribution(totalPrecip, inputs.duration);
        const scsData = calculateSCSAbstractions(inputs.cn, huffData.steps);
        const uhData = generateTriangularUH(inputs.area, tc, huffData.dt);
        const finalFlow = convolve(scsData.steps, uhData.ordinates);

        const maxFlow = Math.max(...finalFlow);
        const maxFlowIndex = finalFlow.indexOf(maxFlow);
        const peakTime = maxFlowIndex * huffData.dt;
        const totalVol = finalFlow.reduce((a,b) => a+b, 0) * huffData.dt * 60; 
        const totalPe = scsData.steps.reduce((a,b) => a+b.PeInc, 0);

        currentData.inputs = inputs;
        currentData.results = {
            tc, intensity, totalPrecip, huffData, scsData, uhData, finalFlow, maxFlow, peakTime, totalVol, totalPe
        };

        updateUI();

    } catch (e) {
        console.error("Calculation error:", e);
    }
}

function updateUI() {
    const res = currentData.results;
    

    document.getElementById('res-qp').textContent = res.maxFlow.toFixed(2);
    document.getElementById('res-tp').textContent = res.peakTime.toFixed(0);
    document.getElementById('res-vol').textContent = res.totalVol.toLocaleString('pt-BR', {maximumFractionDigits: 0});
    document.getElementById('res-pe').textContent = res.totalPe.toFixed(1);


    const times = res.finalFlow.map((_, i) => i * res.huffData.dt);
    renderHydrograph('chart-hydrograph', times, res.finalFlow);
    renderHyetograph('chart-hyetograph', res.scsData.steps);
    renderQuartiles('chart-quartiles');


    updateDetailedTable(res.scsData.steps, res.uhData.ordinates, res.finalFlow, res.huffData.dt);



    if(!document.getElementById('tab-memorial').classList.contains('hidden')) {
        updateMemorial();
    }
}

function updateDetailedTable(rainSteps, uhOrds, flow, dt) {
    const tbody = document.getElementById('table-detailed-body');
    tbody.innerHTML = '';
    const displayLimit = 200; 
    const len = Math.min(flow.length, displayLimit);

    for(let i=0; i<len; i++) {
        const t = i * dt;
        const pInc = rainSteps[i] ? rainSteps[i].incRain : 0;
        const peInc = rainSteps[i] ? rainSteps[i].PeInc : 0;
        const uh = uhOrds[i] || 0;
        const q = flow[i];

        if (q < 0.01 && pInc < 0.01 && i > 20) continue; 

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        tr.innerHTML = `
            <td class="px-4 py-1 border-b">${t.toFixed(1)}</td>
            <td class="px-4 py-1 border-b text-slate-500">${pInc.toFixed(2)}</td>
            <td class="px-4 py-1 border-b text-blue-600">${peInc.toFixed(2)}</td>
            <td class="px-4 py-1 border-b text-slate-400">${uh.toFixed(3)}</td>
            <td class="px-4 py-1 border-b text-right font-bold text-slate-700">${q.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    }
}

function updateMemorial() {
    const r = currentData.results;
    const i = currentData.inputs;
    if(!r.tc) return;

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.textContent = val;
    };


    setText('mem-date', new Date().toLocaleDateString('pt-BR'));
    setText('mem-area', i.area.toFixed(2));
    setText('mem-length', i.length.toFixed(2));
    setText('mem-slope', i.slope.toFixed(1));
    setText('mem-cn', i.cn);
    setText('mem-tc', r.tc.toFixed(1));


    setText('mem-tr', i.tr);
    setText('mem-td', i.duration);
    setText('mem-i', r.intensity.toFixed(1));
    setText('mem-p', r.totalPrecip.toFixed(1));


    setText('mem-s', r.scsData.S.toFixed(1));
    setText('mem-ia', r.scsData.Ia.toFixed(1));
    setText('mem-pe-total', r.totalPe.toFixed(1));


    setText('mem-hutp', r.uhData.tp.toFixed(1));
    setText('mem-hutb', r.uhData.tb.toFixed(1));
    setText('mem-huqp', r.uhData.qp.toFixed(3));


    setText('mem-final-qp', r.maxFlow.toFixed(2));
    setText('mem-final-tp', r.peakTime.toFixed(1));
    setText('mem-final-vol', r.totalVol.toLocaleString('pt-BR', {maximumFractionDigits: 0}));


    const memTable = document.getElementById('mem-table-huff');
    memTable.innerHTML = '';
    

    const totalSteps = r.huffData.steps.length;
    const stepSize = Math.max(1, Math.floor(totalSteps / 10));
    
    for(let k=0; k < totalSteps; k += stepSize) {
        if (k >= totalSteps) break;
        const s = r.huffData.steps[k];
        const tr = document.createElement('tr');
        const pct = ((s.time / i.duration)*100).toFixed(0) + '%';
        tr.innerHTML = `
            <td>${(k/stepSize + 1).toFixed(0)}</td>
            <td>${s.time.toFixed(1)}</td>
            <td>${pct}</td>
            <td>${s.accumRain.toFixed(2)}</td>
        `;
        memTable.appendChild(tr);
    }


    const chartImages = getChartImages();
    const hydroImg = document.getElementById('img-chart-hydrograph');
    const quartImg = document.getElementById('img-chart-quartiles');
    
    if(hydroImg && chartImages.hydrograph) hydroImg.src = chartImages.hydrograph;
    if(quartImg && chartImages.quartiles) quartImg.src = chartImages.quartiles;


    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // Clear previous
    new QRCode(qrContainer, {
        text: window.location.href,
        width: 64,
        height: 64,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
}

function exportCSV() {
    if (!currentData.results.finalFlow) return;

    const r = currentData.results;
    const dt = r.huffData.dt;
    const len = r.finalFlow.length;
    
    const data = [];
    for(let i=0; i<len; i++) {
        data.push({
            "Tempo (min)": (i * dt).toFixed(2),
            "Chuva Inc (mm)": (r.scsData.steps[i]?.incRain || 0).toFixed(3),
            "Chuva Efe (mm)": (r.scsData.steps[i]?.PeInc || 0).toFixed(3),
            "Ord HU (m3/s)": (r.uhData.ordinates[i] || 0).toFixed(4),
            "Vazão (m3/s)": r.finalFlow[i].toFixed(3)
        });
    }

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `hidrocalc_mem_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function exportPDF() {

    const memorialBtn = document.querySelector('[data-target="tab-memorial"]');
    memorialBtn.click();
    

    await new Promise(resolve => setTimeout(resolve, 800));
    
    const element = document.getElementById('print-area');
    

    const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; 
    const pageHeight = 297;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }
    
    pdf.save('memorial_hidrologico.pdf');
}
