import { materials, surfaceTypes, saveRainData } from './database.js';
import * as Quantities from './quantities.js';

let profileChart = null;

export function populateRegions(rainData) {
    const select = document.getElementById('region-select');
    const currentVal = select.value;
    select.innerHTML = '';
    
    const entries = Object.entries(rainData)
        .map(([key, data]) => ({ key, data }))
        .sort((a, b) => a.data.name.localeCompare(b.data.name, 'pt-BR'));

    entries.forEach(({ key, data }) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = data.name;
        select.appendChild(option);
    });

    if (currentVal && rainData[currentVal]) {
        select.value = currentVal;
    } else {
        const normalize = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s\-]/g, '').toLowerCase();
        const target = normalize('Nova Petropolis - RS');
        const defaultEntry = entries.find(e => normalize(e.data.name) === target);
        if (defaultEntry) {
            select.value = defaultEntry.key;
        } else {
            const keys = entries.map(e => e.key);
            if (keys.length > 0) select.value = keys[0];
        }
    }
    
    updateRainInfo(rainData, select.value);
}

export function updateRainInfo(rainData, key) {
    const infoContainer = document.getElementById('rain-info-display');
    const data = rainData[key];
    const trInput = document.getElementById('tr-input');
    
    if (!data) return;

    const tr = parseFloat(trInput.value) || 10;
    const numerator = data.k * Math.pow(tr, data.a);
    const formulaDynamic = `I = ${numerator.toFixed(2)} / (t + ${data.b})^${data.c}`;

    infoContainer.innerHTML = `
        <div class="text-xs font-mono text-blue-700 bg-blue-50 p-2 rounded border border-blue-100 flex flex-col gap-1">
            <div class="flex justify-between items-center">
                <span><strong>IDF (TR=${tr}):</strong> ${formulaDynamic}</span>
                <span class="text-[10px] bg-white px-1 rounded border border-blue-100 text-slate-400" title="Calculado com K=${data.k} e a=${data.a}">Auto</span>
            </div>
            <span class="text-slate-500 text-[10px] border-t border-blue-100 pt-1 mt-1 block">
                Params Base: K=${data.k}, a=${data.a}, b=${data.b}, c=${data.c}
            </span>
        </div>
    `;
}

export function setupGlobalParams() {
    const matSelect = document.getElementById('global-material');
    Object.entries(materials).forEach(([key, val]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = val.name;
        matSelect.appendChild(opt);
    });

    const cSelect = document.getElementById('global-c-type');
    const cInput = document.getElementById('global-c-value');
    
    Object.entries(surfaceTypes).forEach(([key, val]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = val.name;
        cSelect.appendChild(opt);
    });

    cSelect.addEventListener('change', (e) => {
        const val = surfaceTypes[e.target.value].value;
        cInput.value = val;
        cInput.readOnly = e.target.value !== 'custom';
        if (e.target.value === 'custom') cInput.focus();
    });
    
    cInput.value = surfaceTypes[cSelect.value].value;
    cInput.readOnly = true;
}

export function initRainModal(onSaveCallback) {
    const modal = document.getElementById('rain-modal');
    const btnOpen = document.getElementById('btn-open-rain-modal');
    const btnClose = document.getElementById('btn-close-rain-modal');
    const form = document.getElementById('rain-form');

    btnOpen.addEventListener('click', () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    const closeModal = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    };

    btnClose.addEventListener('click', closeModal);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newData = {
            name: fd.get('name'),
            k: parseFloat(fd.get('k')),
            a: parseFloat(fd.get('a')),
            b: parseFloat(fd.get('b')),
            c: parseFloat(fd.get('c')),
            minDuration: parseFloat(fd.get('minDuration')),
            maxDuration: parseFloat(fd.get('maxDuration')),
            returnPeriod: parseFloat(fd.get('returnPeriod'))
        };
        
        saveRainData(newData);
        onSaveCallback();
        closeModal();
        form.reset();
    });
}

export function renderTable(sections) {
    const tbody = document.getElementById('results-body');
    const emptyState = document.getElementById('empty-state');
    
    if (sections.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        renderProfileChart([]);
        return;
    }
    
    emptyState.style.display = 'none';
    tbody.innerHTML = sections.map((row, index) => {
        
        const warningsHtml = row.checks.warnings.map(w => 
            `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800" title="${w}">${w}</span>`
        ).join(' ');

        let statusHtml = row.checks.valid ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">OK</span>' : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Atenção</span>';
        

        const tauClass = row.tau < 1.0 ? "text-red-600 font-bold" : "text-slate-600";

        return `
            <tr class="hover:bg-slate-50 transition-colors text-xs sm:text-sm">
                <td class="px-4 py-3 font-medium text-slate-700">
                    ${row.id}<br>
                    <span class="text-[10px] text-slate-400" title="Tempo de Concentração Acumulado">tc: ${row.tcAccum.toFixed(2)} min</span>
                </td>
                <td class="px-4 py-3 text-right font-mono text-slate-600">${(row.flow * 1000).toFixed(1)}</td>
                <td class="px-4 py-3 text-right font-mono text-slate-600">${(row.slope * 100).toFixed(2)}</td>
                <td class="px-4 py-3 text-center font-bold text-blue-700 bg-blue-50/30 rounded-lg">${(row.diameter * 1000).toFixed(0)}</td>
                <td class="px-4 py-3 text-right font-mono text-slate-600">${row.velocity.toFixed(2)}</td>
                <td class="px-4 py-3 text-right font-mono ${tauClass}">${row.tau.toFixed(2)}</td>
                <td class="px-4 py-3 text-center flex flex-col gap-1 items-center">
                    ${statusHtml}
                    <div class="flex flex-wrap gap-1 justify-center">${warningsHtml}</div>
                </td>
                <td class="px-4 py-3 text-center">
                    <button onclick="window.removeRow(${index})" class="text-slate-300 hover:text-red-500 transition-colors p-1">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
    renderProfileChart(sections);
}

function renderProfileChart(sections) {
    const canvas = document.getElementById('profileChart');
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext('2d');
    
    if (profileChart) {
        profileChart.destroy();
    }

    if (sections.length === 0) return;




    
    const labels = [];
    const dataCT = [];
    const dataCF = [];
    
    let cumLength = 0;
    
    sections.forEach((sec, i) => {
        if (i === 0) {
            labels.push(`PV-${sec.id.split('->')[0].trim()}`);
            dataCT.push({ x: cumLength, y: sec.ctUp, detail: sec });
            dataCF.push({ x: cumLength, y: sec.cfUp, detail: sec });
        }
        
        cumLength += sec.length;
        
        labels.push(`PV-${sec.id.split('->')[1].trim()}`);
        dataCT.push({ x: cumLength, y: sec.ctDown, detail: sec });
        dataCF.push({ x: cumLength, y: sec.cfDown, detail: sec });
    });

    profileChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Terreno (CT)',
                    data: dataCT,
                    borderColor: '#64748b',
                    backgroundColor: 'rgba(100, 116, 139, 0.1)',
                    fill: false,
                    tension: 0.1,
                    borderDash: [5, 5]
                },
                {
                    label: 'Fundo (CF)',
                    data: dataCF,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    fill: 'origin',
                    tension: 0,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Distância Acumulada (m)' }
                },
                y: {
                    title: { display: true, text: 'Elevação (m)' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        afterBody: function(context) {
                            const idx = context[0].dataIndex;




                            if (idx > 0 && idx <= sections.length) {
                                const sec = sections[idx - 1];
                                return `Trecho Anterior:\nDN: ${sec.diameter*1000}mm\nV: ${sec.velocity.toFixed(2)} m/s\nτ: ${sec.tau.toFixed(2)} Pa`;
                            }
                            return '';
                        }
                    }
                }
            }
        }
    });
}

export function renderQuantitiesDetailed(sections) {
    const report = Quantities.generateTotalReport(sections);
    const tbody = document.getElementById('quantities-body');
    const tfoot = document.getElementById('quantities-foot');
    const summary = document.getElementById('quantities-summary');
    const btnCsv = document.getElementById('btn-export-csv');
    const btnPdf = document.getElementById('btn-export-pdf');

    if (!sections.length) {
        tbody.innerHTML = '';
        tfoot.classList.add('hidden');
        summary.innerHTML = '';
        btnCsv.disabled = true;
        btnPdf.disabled = true;
        return;
    }

    btnCsv.disabled = false;
    btnPdf.disabled = false;

    tbody.innerHTML = report.items.map(item => `
        <tr class="hover:bg-slate-50 border-b border-slate-50 last:border-0">
            <td class="px-2 py-2 font-medium text-slate-700 break-words">${item.id}</td>
            <td class="px-2 py-2 text-center text-slate-500">${item.length.toFixed(2)}</td>
            <td class="px-2 py-2 text-center font-bold text-slate-600">${(item.diameter*1000).toFixed(0)}</td>
            <td class="px-2 py-2 text-right bg-orange-50/30 font-mono text-slate-600">${item.vol_0_15.toFixed(2)}</td>
            <td class="px-2 py-2 text-right bg-orange-50/30 font-mono text-slate-600">${item.vol_15_30.toFixed(2)}</td>
            <td class="px-2 py-2 text-right bg-orange-50/30 font-mono text-slate-600">${item.vol_30_plus.toFixed(2)}</td>
            <td class="px-2 py-2 text-right font-mono text-slate-500">${item.shoring.toFixed(2)}</td>
            <td class="px-2 py-2 text-right font-mono text-slate-500">${item.bedding.toFixed(2)}</td>
            <td class="px-2 py-2 text-right font-mono text-slate-500">${item.joints}</td>
        </tr>
    `).join('');

    tfoot.innerHTML = `
        <tr>
            <td class="px-2 py-3">TOTAL</td>
            <td class="px-2 py-3 text-center">${report.totals.pipeLen.toFixed(2)}</td>
            <td class="px-2 py-3 text-center">-</td>
            <td class="px-2 py-3 text-right">${report.totals.vol_0_15.toFixed(2)}</td>
            <td class="px-2 py-3 text-right">${report.totals.vol_15_30.toFixed(2)}</td>
            <td class="px-2 py-3 text-right">${report.totals.vol_30_plus.toFixed(2)}</td>
            <td class="px-2 py-3 text-right">${report.totals.shoring.toFixed(2)}</td>
            <td class="px-2 py-3 text-right">${report.totals.bedding.toFixed(2)}</td>
            <td class="px-2 py-3 text-right">${report.totals.joints}</td>
        </tr>
    `;
    tfoot.classList.remove('hidden');

    const totalExc = report.totals.vol_0_15 + report.totals.vol_15_30 + report.totals.vol_30_plus;
    const cards = [
        { label: 'Escavação Total', value: totalExc.toFixed(2), unit: 'm³' },
        { label: 'Escoramento', value: report.totals.shoring.toFixed(2), unit: 'm²' },
        { label: 'Berço Concreto', value: report.totals.bedding.toFixed(2), unit: 'm³' },
        { label: 'Extensão Tubos', value: report.totals.pipeLen.toFixed(2), unit: 'm' }
    ];

    summary.innerHTML = cards.map(c => `
        <div class="qty-card">
            <span class="qty-label">${c.label}</span>
            <div class="flex items-baseline">
                <span class="qty-value">${c.value}</span>
                <span class="qty-unit">${c.unit}</span>
            </div>
        </div>
    `).join('');

    const newBtnCsv = btnCsv.cloneNode(true);
    const newBtnPdf = btnPdf.cloneNode(true);
    btnCsv.parentNode.replaceChild(newBtnCsv, btnCsv);
    btnPdf.parentNode.replaceChild(newBtnPdf, btnPdf);
    
    newBtnCsv.addEventListener('click', () => Quantities.exportToCSV(report));
    newBtnPdf.addEventListener('click', () => Quantities.exportToPDF(report));
}
