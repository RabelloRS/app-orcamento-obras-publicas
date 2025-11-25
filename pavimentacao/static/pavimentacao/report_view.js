import { store } from './state.js';
import { formatScientific, calculateTotalThickness } from './utils.js';
import { MATERIALS, MIN_THICKNESS_SURFACE } from './data.js';

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
                <section>
                    <h3 class="text-lg font-bold text-dnit-800 border-b border-dnit-100 pb-2 mb-4">1. Parâmetros de Tráfego</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span class="block text-slate-500">Volume Médio ($V_m$)</span><span class="font-semibold">${state.traffic.Vm} vpd</span></div>
                        <div><span class="block text-slate-500">Período ($P$)</span><span class="font-semibold">${state.traffic.P} anos</span></div>
                        <div><span class="block text-slate-500">Fator Veículo ($FV$)</span><span class="font-semibold">${state.traffic.FV}</span></div>
                        <div><span class="block text-slate-500">Número N</span><span class="font-bold text-dnit-600">${formatScientific(state.traffic.calculatedN)}</span></div>
                    </div>
                </section>
                <section>
                    <h3 class="text-lg font-bold text-dnit-800 border-b border-dnit-100 pb-2 mb-4">2. Estrutura do Pavimento</h3>
                    <div class="space-y-2">
                        <p class="text-sm text-slate-600"><strong>Subleito:</strong> CBR ${state.soil.subgradeCBR}% | Expansão ${state.soil.expansion}%</p>
                        <div class="mt-4 border rounded-lg overflow-hidden">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-slate-50 text-slate-600">
                                    <tr><th class="p-3">Camada</th><th class="p-3">Material</th><th class="p-3">Coef. (K)</th><th class="p-3">Espessura (cm)</th><th class="p-3">Esp. Equiv.</th></tr>
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
                <section>
                    <h3 class="text-lg font-bold text-dnit-800 border-b border-dnit-100 pb-2 mb-4">3. Drenagem</h3>
                    <p class="text-sm text-slate-600">Para uma área de <strong>${state.drainage.area} m²</strong> com coeficiente C=<strong>${state.drainage.c}</strong> e chuva de <strong>${state.drainage.rainfall_i} mm/h</strong>:</p>
                    <ul class="list-disc list-inside mt-2 text-sm text-slate-700">
                        <li>Vazão de Pico: ${(state.drainage.c * state.drainage.rainfall_i * state.drainage.area / 3.6).toFixed(1)} L/s</li>
                        <li>Espessura de Camada Porosa (Infiltração): ${((state.drainage.rainfall_i / 1000 * state.drainage.area - state.drainage.permeability_k / 1000 * state.drainage.area) / (state.drainage.area * state.drainage.porosity) * 100).toFixed(1)} cm</li>
                    </ul>
                </section>
            </div>
            <div class="mt-12 pt-6 border-t border-slate-200 flex justify-end">
                <button id="btn-pdf" class="bg-dnit-600 hover:bg-dnit-700 text-white px-4 py-2 rounded shadow flex items-center gap-2"><i data-lucide="printer" class="w-4 h-4"></i> Gerar PDF</button>
            </div>
        </div>`;
    lucide.createIcons();
    document.getElementById('btn-pdf').addEventListener('click', generatePDF);
};

const getK = (id) => MATERIALS.find(m => m.id === id)?.k || 1.0;
const renderRow = (name, layer) => { if (layer.thickness <= 0) return ''; const k = getK(layer.materialId); return `<tr><td class="p-3 font-medium">${name}</td><td class="p-3 text-slate-500 capitalize">${layer.materialId}</td><td class="p-3 text-slate-500">${k}</td><td class="p-3 font-bold">${layer.thickness}</td><td class="p-3 text-slate-500">${(layer.thickness * k).toFixed(1)}</td></tr>`; };

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

    y += 15;

    // 5. Memória de Cálculo Detalhada
    doc.addPage();
    y = 20;

    doc.setFillColor(14, 165, 233);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Memória de Cálculo", 20, 20);

    y = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("5.1. Determinação do Número N", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`O número N é calculado considerando o volume de tráfego e sua evolução:`, 20, y);
    y += 6;
    doc.text(`- Volume Médio Diário ($V_m$): ${state.traffic.Vm}`, 25, y);
    y += 5;
    doc.text(`- Período de Projeto ($P$): ${state.traffic.P} anos`, 25, y);
    y += 5;
    doc.text(`- Fator de Veículo ($FV$): ${state.traffic.FV}`, 25, y);
    y += 8;
    doc.setFont("courier", "normal");
    doc.text(`N = ${formatScientific(state.traffic.calculatedN)}`, 25, y);

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("5.2. Espessura Total Necessária ($H_m$)", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Calculada para proteger o subleito (CBR ${state.soil.subgradeCBR}%) contra o tráfego N.`, 20, y);
    y += 6;
    doc.text(`Fórmula: Hm = 77.67 * N^0.0482 * CBR^-0.598`, 25, y);
    y += 6;
    const Hm = calculateTotalThickness(state.traffic.calculatedN, state.soil.subgradeCBR);
    doc.setFont("courier", "normal");
    doc.text(`Hm = ${Hm.toFixed(1)} cm`, 25, y);

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("5.3. Verificação das Camadas", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const s = state.structure;
    const kR = getK(s.surface.materialId);
    const kB = getK(s.base.materialId);
    const kS = getK(s.subbase.materialId);
    const kRef = getK(s.reinforcement.materialId);

    // Revestimento
    let minSurf = MIN_THICKNESS_SURFACE.find(rule => state.traffic.calculatedN <= rule.maxN) || MIN_THICKNESS_SURFACE[MIN_THICKNESS_SURFACE.length - 1];
    doc.text(`a) Revestimento:`, 20, y);
    y += 5;
    doc.text(`   Espessura Adotada: ${s.surface.thickness} cm`, 25, y);
    doc.text(`   Mínimo Exigido: ${minSurf.val} cm`, 100, y);
    doc.setTextColor(s.surface.thickness >= minSurf.val ? 0 : 200, s.surface.thickness >= minSurf.val ? 100 : 0, 0);
    doc.text(s.surface.thickness >= minSurf.val ? "OK" : "INSUFICIENTE", 160, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Base Check (H20)
    const H20 = calculateTotalThickness(state.traffic.calculatedN, 20);
    const Eq_Surface_Base = (s.surface.thickness * kR) + (s.base.thickness * kB);
    doc.text(`b) Proteção da Sub-base (CBR 20% -> H20):`, 20, y);
    y += 5;
    doc.text(`   H20 Necessário: ${H20.toFixed(1)} cm`, 25, y);
    y += 5;
    doc.text(`   Esp. Equiv. (Rev + Base): ${Eq_Surface_Base.toFixed(1)} cm`, 25, y);
    doc.setTextColor(Eq_Surface_Base >= H20 ? 0 : 200, Eq_Surface_Base >= H20 ? 100 : 0, 0);
    doc.text(Eq_Surface_Base >= H20 ? "OK" : "INSUFICIENTE", 160, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Sub-base Check
    const Eq_Total_Subbase = Eq_Surface_Base + (s.subbase.thickness * kS);
    if (s.reinforcement.thickness > 0) {
        const H_reinf = calculateTotalThickness(state.traffic.calculatedN, s.reinforcement.cbr);
        doc.text(`c) Proteção do Reforço (CBR ${s.reinforcement.cbr}%):`, 20, y);
        y += 5;
        doc.text(`   H Necessário: ${H_reinf.toFixed(1)} cm`, 25, y);
        y += 5;
        doc.text(`   Esp. Equiv. Acumulada: ${Eq_Total_Subbase.toFixed(1)} cm`, 25, y);
        doc.setTextColor(Eq_Total_Subbase >= H_reinf ? 0 : 200, Eq_Total_Subbase >= H_reinf ? 100 : 0, 0);
        doc.text(Eq_Total_Subbase >= H_reinf ? "OK" : "INSUFICIENTE", 160, y);
    } else {
        doc.text(`c) Proteção do Subleito (Sub-base):`, 20, y);
        y += 5;
        doc.text(`   Verificado na espessura total.`, 25, y);
    }
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Total Check
    const Eq_Total = Eq_Total_Subbase + (s.reinforcement.thickness * kRef);
    doc.text(`d) Espessura Total Equivalente:`, 20, y);
    y += 5;
    doc.text(`   Hm Necessário: ${Hm.toFixed(1)} cm`, 25, y);
    y += 5;
    doc.text(`   Esp. Equiv. Total Fornecida: ${Eq_Total.toFixed(1)} cm`, 25, y);
    doc.setTextColor(Eq_Total >= Hm ? 0 : 200, Eq_Total >= Hm ? 100 : 0, 0);
    doc.text(Eq_Total >= Hm ? "OK" : "INSUFICIENTE", 160, y);
    doc.setTextColor(0, 0, 0);

    // Save
    doc.save(`relatorio_pavimentacao_${new Date().toISOString().slice(0, 10)}.pdf`);
};