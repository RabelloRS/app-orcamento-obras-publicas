import { IDF_CONSTANTS, LIMITS } from './config.js';

/**
 * UI Manager for Popups, Calculator and Exports.
 * Uses 'jspdf' from global window object (via CDN).
 */

let currentPopup = null;

export function openPopup(lat, lng, values, map, cityName = null) {

    if (currentPopup) {
        map.removeLayer(currentPopup);
        currentPopup = null;
    }

    const { a, b } = values;
    const { c, d } = IDF_CONSTANTS;
    const locationTitle = cityName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;


    const container = document.createElement('div');
    container.className = 'w-full group';

    container.innerHTML = `
        <!-- Header -->
        <div class="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start">
            <div>
                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <i data-lucide="map-pin" class="w-3 h-3 text-blue-500"></i>
                    ${cityName ? cityName : 'Local Selecionado'}
                </h3>
                <p class="text-[10px] text-slate-500 font-mono mt-0.5">${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
            </div>
            <button data-action="export-pdf" class="text-[10px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm transition-colors flex items-center gap-1">
                <i data-lucide="file-down" class="w-3 h-3"></i> Relatório
            </button>
        </div>

        <!-- Values Grid -->
        <div class="p-4 grid grid-cols-2 gap-3">
            <div class="bg-blue-50/50 rounded-lg p-2 border border-blue-100 text-center hover:bg-blue-50 transition-colors">
                <span class="text-[9px] text-blue-600 font-bold uppercase tracking-wider block mb-0.5">Coeficiente A</span>
                <span class="text-xl font-bold text-slate-800 tracking-tight">${a}</span>
            </div>
            <div class="bg-red-50/50 rounded-lg p-2 border border-red-100 text-center hover:bg-red-50 transition-colors">
                <span class="text-[9px] text-red-600 font-bold uppercase tracking-wider block mb-0.5">Fator B</span>
                <span class="text-xl font-bold text-slate-800 tracking-tight">${b}</span>
            </div>
        </div>

        <!-- Calculator -->
        <div class="px-4 pb-4">
            <div class="bg-slate-50 rounded-xl border border-slate-200 p-3 shadow-inner">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        <i data-lucide="calculator" class="w-3 h-3"></i> Calculadora de Intensidade
                    </h4>
                    <div class="text-[9px] font-mono text-slate-400">i = (a·TRᵇ) / (t+c)ᵈ</div>
                </div>

                <!-- Sliders -->
                <div class="space-y-3">
                    <div>
                        <div class="flex justify-between text-[10px] mb-1">
                            <span class="text-slate-500">Retorno (TR)</span>
                            <span class="font-bold text-blue-600" data-label-tr>10 anos</span>
                        </div>
                        <input type="range" data-input-tr min="2" max="100" step="1" value="10">
                    </div>
                    <div>
                        <div class="flex justify-between text-[10px] mb-1">
                            <span class="text-slate-500">Duração (t)</span>
                            <span class="font-bold text-blue-600" data-label-t>60 min</span>
                        </div>
                        <input type="range" data-input-t min="5" max="1440" step="5" value="60">
                    </div>
                </div>

                <!-- Result -->
                <div class="mt-3 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                    <span class="text-[10px] font-medium text-slate-500">Intensidade Resultante</span>
                    <div class="text-right">
                        <span data-result class="text-2xl font-bold text-slate-800">--</span>
                        <span class="text-[10px] text-slate-400 ml-1 font-medium">mm/h</span>
                    </div>
                </div>
            </div>
        </div>
    `;


    const popup = L.popup({
        offset: [0, -5],
        className: 'premium-popup',
        maxWidth: 320,
        minWidth: 300,
        closeButton: true,
        autoPan: true
    })
    .setLatLng([lat, lng])
    .setContent(container);

    popup.once('add', () => {
        lucide.createIcons({ root: container });
        attachCalculatorLogic(container, values);
        const exportBtn = container.querySelector('[data-action="export-pdf"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => exportPDF(lat, lng, values, cityName));
        }
    });

    popup.openOn(map);
    currentPopup = popup;
}

function attachCalculatorLogic(container, values) {
    const inputTR = container.querySelector('[data-input-tr]');
    const inputT = container.querySelector('[data-input-t]');
    const labelTR = container.querySelector('[data-label-tr]');
    const labelT = container.querySelector('[data-label-t]');
    const resultEl = container.querySelector('[data-result]');

    if (!inputTR || !inputT || !resultEl) return;

    const calculate = () => {
        const tr = parseInt(inputTR.value);
        const t = parseInt(inputT.value);

        labelTR.textContent = `${tr} anos`;
        labelT.textContent = `${t} min`;

        const { a, b } = values;
        const { c, d } = IDF_CONSTANTS;


        const i = (a * Math.pow(tr, b)) / Math.pow((t + c), d);

        resultEl.textContent = i.toFixed(1);


        if (i > 100) resultEl.className = 'text-2xl font-bold text-red-600 transition-colors';
        else resultEl.className = 'text-2xl font-bold text-slate-800 transition-colors';
    };

    inputTR.addEventListener('input', calculate);
    inputT.addEventListener('input', calculate);
    calculate(); // Initial run
}

async function exportPDF(lat, lng, values, cityName) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('pt-BR');
    const { a, b } = values;
    const { c, d } = IDF_CONSTANTS;


    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Relatório de Equação IDF", 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado via IDFGeo RS | Data: ${date}`, 20, 26);


    doc.setDrawColor(200);
    doc.line(20, 30, 190, 30);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Localização", 20, 40);

    doc.setFontSize(10);
    doc.text(`Localidade: ${cityName || 'Coordenada Personalizada'}`, 20, 48);
    doc.text(`Latitude: ${lat.toFixed(4)}`, 20, 54);
    doc.text(`Longitude: ${lng.toFixed(4)}`, 80, 54);


    doc.text("Parâmetros da Equação", 20, 70);
    doc.autoTable ? doc.autoTable({ /* if autotable plugin existed */ }) : null; // Fallback manual

    const startY = 75;
    doc.setFillColor(245, 247, 250);
    doc.rect(20, startY, 170, 30, 'F');

    doc.setFont("courier", "bold");
    doc.text(`a = ${a}`, 30, startY + 10);
    doc.text(`b = ${b}`, 30, startY + 20);
    doc.text(`c = ${c}`, 100, startY + 10);
    doc.text(`d = ${d}`, 100, startY + 20);


    doc.setFont("helvetica", "normal");
    doc.text("Modelo Matemático:", 20, 120);
    doc.setFontSize(14);
    doc.setFont("times", "italic");
    doc.text(`i = (${a} × TR^${b}) / (t + ${c})^${d}`, 40, 130);


    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Fonte dos dados: Rodrigues et al. (2023) - UFPEL", 20, 280);
    doc.text("Nota: Uso indicativo. Projetos de engenharia requerem validação local.", 20, 284);


    doc.save(`IDF_Relatorio_${lat.toFixed(3)}_${lng.toFixed(3)}.pdf`);
}

export function updateLegend(type) {
    const config = LIMITS[type];

    document.getElementById('legend-title').textContent = config.label;
    document.getElementById('legend-min').textContent = config.min;
    document.getElementById('legend-max').textContent = config.max;
    document.getElementById('legend-desc').innerHTML = config.description;


    const grad = document.getElementById('legend-gradient');

    grad.style.background = `linear-gradient(to top, hsl(240,90%,60%), hsl(0,90%,60%))`;
}
