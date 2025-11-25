import { store } from './state.js';
import { formatScientific } from './utils.js';

export const render = (container) => {
    const state = store.getState();

    container.innerHTML = `
        <div class="animate-fade-in w-full bg-white p-8 shadow-lg rounded-lg" id="print-area">
            <div class="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900">Relatório de Dimensionamento</h1>
                    <p class="text-slate-500 mt-1">Método DNIT (IPR-719)</p>
                </div>
                <div class="text-right">
                    <div class="text-sm text-slate-400">Data</div>
                    <div class="font-medium">${state.project.date}</div>
                </div>
            </div>

            <div class="space-y-8">
                <!-- Traffic Section -->
                <section>
                    <h3 class="text-lg font-bold text-dnit-800 border-b border-dnit-100 pb-2 mb-4">1. Parâmetros de Tráfego</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span class="block text-slate-500">Volume Médio ($V_m$)</span>
                            <span class="font-semibold">${state.traffic.Vm} vpd</span>
                        </div>
                        <div>
                            <span class="block text-slate-500">Período ($P$)</span>
                            <span class="font-semibold">${state.traffic.P} anos</span>
                        </div>
                        <div>
                            <span class="block text-slate-500">Fator Veículo ($FV$)</span>
                            <span class="font-semibold">${state.traffic.FV}</span>
                        </div>
                        <div>
                            <span class="block text-slate-500">Número N</span>
                            <span class="font-bold text-dnit-600">${formatScientific(state.traffic.calculatedN)}</span>
                        </div>
                    </div>
                </section>

                <!-- Structure Section -->
                <section>
                    <h3 class="text-lg font-bold text-dnit-800 border-b border-dnit-100 pb-2 mb-4">2. Estrutura do Pavimento</h3>
                    <div class="space-y-2">
                        <p class="text-sm text-slate-600"><strong>Subleito:</strong> CBR ${state.soil.subgradeCBR}% | Expansão ${state.soil.expansion}%</p>
                        
                        <div class="mt-4 border rounded-lg overflow-hidden">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th class="p-3">Camada</th>
                                        <th class="p-3">Material</th>
                                        <th class="p-3">Coef. (K)</th>
                                        <th class="p-3">Espessura (cm)</th>
                                        <th class="p-3">Esp. Equiv.</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${renderRow('Revestimento', state.structure.surface)}
                                    ${renderRow('Base', state.structure.base)}
                                    ${renderRow('Sub-base', state.structure.subbase)}
                                    ${renderRow('Reforço', state.structure.reinforcement)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <!-- Drainage Section -->
                <section>
                    <h3 class="text-lg font-bold text-dnit-800 border-b border-dnit-100 pb-2 mb-4">3. Drenagem</h3>
                    <p class="text-sm text-slate-600">
                        Para uma área de <strong>${state.drainage.area} m²</strong> com coeficiente C=<strong>${state.drainage.c}</strong> e chuva de <strong>${state.drainage.rainfall_i} mm/h</strong>:
                    </p>
                    <ul class="list-disc list-inside mt-2 text-sm text-slate-700">
                        <li>Vazão de Pico: ${(state.drainage.c * state.drainage.rainfall_i * state.drainage.area / 3.6).toFixed(1)} L/s</li>
                        <li>Espessura de Camada Porosa (Infiltração): ${((state.drainage.rainfall_i / 1000 * state.drainage.area - state.drainage.permeability_k / 1000 * state.drainage.area) / (state.drainage.area * state.drainage.porosity) * 100).toFixed(1)} cm</li>
                    </ul>
                </section>
            </div>

            <div class="mt-12 pt-6 border-t border-slate-200 flex justify-end">
                <button id="btn-pdf" class="bg-dnit-600 hover:bg-dnit-700 text-white px-4 py-2 rounded shadow flex items-center gap-2">
                    <i data-lucide="printer" class="w-4 h-4"></i> Gerar PDF
                </button>
            </div>
        </div>
    `;

    lucide.createIcons();

    document.getElementById('btn-pdf').addEventListener('click', generatePDF);
};

const renderRow = (name, layer) => {
    if (layer.thickness <= 0) return '';
    const k = getK(layer.materialId);
    return `
        <tr>
            <td class="p-3 font-medium">${name}</td>
            <td class="p-3 text-slate-500 capitalize">${layer.materialId}</td>
            <td class="p-3 text-slate-500">${k}</td>
            <td class="p-3 font-bold">${layer.thickness}</td>
            <td class="p-3 text-slate-500">${(layer.thickness * k).toFixed(1)}</td>
        </tr>
    `;
};


import { MATERIALS } from './data.js';
const getK = (id) => MATERIALS.find(m => m.id === id)?.k || 1.0;

const generatePDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFillColor(14, 165, 233); // dnit-500
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Relatório de Dimensionamento", 20, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Método DNIT (IPR-719)", 20, 30);

    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, 20, 50);

    const state = store.getState();
    let y = 65;

    // 1. Tráfego
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Parâmetros de Tráfego", 20, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Volume Médio (Vm): ${state.traffic.Vm} vpd`, 25, y);
    doc.text(`Período de Projeto (P): ${state.traffic.P} anos`, 110, y);
    y += 7;
    doc.text(`Taxa de Crescimento: ${state.traffic.growthRate}% (${state.traffic.growthType})`, 25, y);
    doc.text(`Fator de Veículo (FV): ${state.traffic.FV}`, 110, y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text(`Número N Calculado: ${formatScientific(state.traffic.calculatedN)}`, 25, y);
    y += 15;

    // 2. Solo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("2. Caracterização do Solo", 20, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`CBR do Subleito: ${state.soil.subgradeCBR}%`, 25, y);
    doc.text(`Expansão: ${state.soil.expansion}%`, 110, y);
    y += 7;
    doc.text(`Nível Lençol Freático: ${state.soil.waterTable} m`, 25, y);
    doc.text(`Classificação: ${state.soil.classification}`, 110, y);
    y += 15;

    // 3. Estrutura
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("3. Estrutura do Pavimento", 20, y);
    y += 10;

    const headers = ["Camada", "Material", "K", "Esp. (cm)", "Esp. Eq. (cm)"];
    let xPositions = [25, 65, 120, 140, 170];

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    headers.forEach((h, i) => doc.text(h, xPositions[i], y));
    y += 2;
    doc.line(20, y, 190, y);
    y += 6;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);

    const addLayerRow = (name, layer) => {
        if (layer.thickness > 0) {
            const k = getK(layer.materialId);
            doc.text(name, xPositions[0], y);
            doc.setFontSize(9);
            doc.text(layer.materialId.substring(0, 25), xPositions[1], y);
            doc.setFontSize(11);
            doc.text(k.toString(), xPositions[2], y);
            doc.text(layer.thickness.toString(), xPositions[3], y);
            doc.text((layer.thickness * k).toFixed(1), xPositions[4], y);
            y += 8;
        }
    };

    addLayerRow("Revestimento", state.structure.surface);
    addLayerRow("Base", state.structure.base);
    addLayerRow("Sub-base", state.structure.subbase);
    addLayerRow("Reforço", state.structure.reinforcement);

    y += 5;
    const totalThick = (state.structure.surface.thickness * getK(state.structure.surface.materialId)) +
        (state.structure.base.thickness * getK(state.structure.base.materialId)) +
        (state.structure.subbase.thickness * getK(state.structure.subbase.materialId)) +
        (state.structure.reinforcement.thickness * getK(state.structure.reinforcement.materialId));

    doc.setFont("helvetica", "bold");
    doc.text(`Espessura Equivalente Total: ${totalThick.toFixed(1)} cm`, 120, y);

    y += 15;

    // 4. Drenagem
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("4. Drenagem", 20, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const Q = (state.drainage.c * state.drainage.rainfall_i * state.drainage.area) / 3.6;
    doc.text(`Vazão de Pico (Q): ${Q.toFixed(1)} L/s`, 25, y);
    y += 7;
    doc.text(`Área: ${state.drainage.area} m²`, 25, y);
    doc.text(`Coef. Run-off (C): ${state.drainage.c}`, 110, y);

    // Save
    doc.save(`relatorio_pavimentacao_${new Date().toISOString().slice(0, 10)}.pdf`);
};
