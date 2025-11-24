import { store } from './state.js';
import { formatScientific, calculateReqThickness } from './utils.js';
import { MATERIALS } from './data.js';

export const render = (container) => {
    const state = store.getState();
    
    container.innerHTML = `
        <div class="animate-fade-in max-w-4xl mx-auto bg-white p-8 shadow-xl rounded-lg relative" id="print-area">
            <!-- PDF Decoration -->
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-dnit-600 to-dnit-800 rounded-t-lg"></div>
            
            <div class="flex justify-between items-start border-b border-slate-100 pb-6 mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Relatório de Dimensionamento</h1>
                    <p class="text-slate-500 mt-1">Método DNIT (IPR-719) - Pavimentação Flexível</p>
                </div>
                <div class="text-right">
                    <div class="text-xs uppercase tracking-wide text-slate-400 font-semibold">Projeto</div>
                    <div class="font-medium text-slate-800">${state.project.name}</div>
                    <div class="text-sm text-slate-500 mt-1">${new Date().toLocaleDateString()}</div>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-8">
                <!-- Section 1: Traffic -->
                <section>
                    <h3 class="text-sm font-bold text-dnit-700 uppercase tracking-wider border-b border-dnit-100 pb-2 mb-4">1. Parâmetros de Tráfego</h3>
                    <div class="bg-slate-50 p-4 rounded-lg border border-slate-100 grid grid-cols-4 gap-4 text-sm">
                        <div>
                            <span class="block text-slate-400 text-xs">Volume Médio</span>
                            <strong class="text-slate-700">${state.traffic.Vm} vpd</strong>
                        </div>
                         <div>
                            <span class="block text-slate-400 text-xs">Período (P)</span>
                            <strong class="text-slate-700">${state.traffic.P} anos</strong>
                        </div>
                        <div>
                            <span class="block text-slate-400 text-xs">N Calculado</span>
                            <strong class="text-dnit-600 text-lg">${formatScientific(state.traffic.calculatedN)}</strong>
                        </div>
                         <div>
                            <span class="block text-slate-400 text-xs">Classe</span>
                            <strong class="text-slate-700">${getTrafficClass(state.traffic.calculatedN)}</strong>
                        </div>
                    </div>
                </section>

                <!-- Section 2: Structure -->
                <section>
                    <h3 class="text-sm font-bold text-dnit-700 uppercase tracking-wider border-b border-dnit-100 pb-2 mb-4">2. Estrutura Definida</h3>
                    <div class="mb-4 text-sm">
                        <span class="font-semibold text-slate-700">Subleito:</span> CBR ${state.soil.subgradeCBR}% | Expansão ${state.soil.expansion}%
                    </div>
                    
                    <div class="border rounded-lg overflow-hidden">
                        <table class="w-full text-sm text-left">
                            <thead class="bg-slate-100 text-slate-600 font-semibold">
                                <tr>
                                    <th class="p-3 w-1/4">Camada</th>
                                    <th class="p-3 w-1/3">Material</th>
                                    <th class="p-3 text-center">Espessura</th>
                                    <th class="p-3 text-center">Coef (K)</th>
                                    <th class="p-3 text-center">Esp. Equiv.</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${renderRow('Revestimento', state.structure.surface)}
                                ${renderRow('Base', state.structure.base)}
                                ${renderRow('Sub-base', state.structure.subbase)}
                                ${renderRow('Reforço', state.structure.reinforcement)}
                            </tbody>
                            <tfoot class="bg-slate-50 font-semibold text-slate-700">
                                <tr>
                                    <td colspan="4" class="p-3 text-right">Total Equivalente:</td>
                                    <td class="p-3 text-center text-dnit-600">${calculateTotalEquivalent(state.structure).toFixed(1)} cm</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </section>

                <!-- Section 3: Verification -->
                <section>
                     <h3 class="text-sm font-bold text-dnit-700 uppercase tracking-wider border-b border-dnit-100 pb-2 mb-4">3. Verificação de Critérios</h3>
                     <div class="space-y-2 text-sm">
                        ${renderVerification(state)}
                     </div>
                </section>
                
                <!-- Footer -->
                <div class="mt-8 pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                    Gerado por Pavimentação.br - Ferramenta Auxiliar de Dimensionamento
                </div>
            </div>
        </div>
        
        <div class="max-w-4xl mx-auto mt-6 flex justify-end">
            <button id="btn-pdf" class="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded shadow-lg flex items-center gap-2 transition-colors">
                <i data-lucide="printer" class="w-5 h-5"></i> Imprimir / Salvar PDF
            </button>
        </div>
    `;

    lucide.createIcons();
    document.getElementById('btn-pdf').addEventListener('click', generatePDF);
};

const getK = (id) => MATERIALS.find(m => m.id === id)?.k || 1.0;

const renderRow = (name, layer) => {
    if (layer.thickness <= 0) return '';
    const k = getK(layer.materialId);
    const materialName = MATERIALS.find(m => m.id === layer.materialId)?.name || layer.materialId;
    return `
        <tr class="hover:bg-slate-50">
            <td class="p-3 font-medium text-slate-700">${name}</td>
            <td class="p-3 text-slate-600">${materialName}</td>
            <td class="p-3 text-center font-bold">${layer.thickness} cm</td>
            <td class="p-3 text-center text-slate-500">${k}</td>
            <td class="p-3 text-center text-slate-500">${(layer.thickness * k).toFixed(1)}</td>
        </tr>
    `;
};

const calculateTotalEquivalent = (s) => {
    return (s.surface.thickness * getK(s.surface.materialId)) +
           (s.base.thickness * getK(s.base.materialId)) +
           (s.subbase.thickness * getK(s.subbase.materialId)) +
           (s.reinforcement.thickness * getK(s.reinforcement.materialId));
};

const renderVerification = (state) => {
    const N = state.traffic.calculatedN;
    const s = state.structure;
    const CBR_sub = state.soil.subgradeCBR;
    
    const reqSubgrade = calculateReqThickness(N, CBR_sub);
    const total = calculateTotalEquivalent(s);
    
    const isOk = total >= reqSubgrade - 0.5;
    
    return `
        <div class="flex justify-between items-center p-3 rounded ${isOk ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">
            <span>Proteção do Subleito (CBR ${CBR_sub}%)</span>
            <span><strong>${total.toFixed(1)}</strong> / ${reqSubgrade.toFixed(1)} cm</span>
        </div>
    `;
};

function getTrafficClass(N) {
    if (N < 1e6) return 'Leve';
    if (N < 1e7) return 'Médio';
    if (N < 5e7) return 'Pesado';
    return 'Muito Pesado';
}

const generatePDF = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const element = document.getElementById('print-area');
    
    doc.html(element, {
        callback: function (doc) {
            doc.save('relatorio-dnit.pdf');
        },
        x: 10,
        y: 10,
        width: 190,
        windowWidth: 1000 // Important for styling
    });
};
