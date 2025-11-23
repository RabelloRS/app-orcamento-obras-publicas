import { HUFF_QUARTILES } from './data.js';

let chartHydro = null;
let chartHyeto = null;
let chartQuartiles = null;

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 0 } // Disable animation for instant updates/export
};

function getCssVar(name){
    const v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return v && v.trim() ? v.trim() : undefined;
}

export const renderHydrograph = (canvasId, times, flowData) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const success = getCssVar('--color-success') || '#059669';
    const successRgb = getCssVar('--color-primary-rgb') || '5,150,105';
    
    const data = {
        labels: times.map(t => t.toFixed(0)),
        datasets: [{
            label: 'Vazão SCS (m³/s)',
            data: flowData,
            borderColor: success,
            backgroundColor: `rgba(${successRgb}, 0.2)`,
            borderWidth: 2,
            fill: true,
            pointRadius: 0,
            tension: 0.3
        }]
    };

    if (chartHydro) {
        chartHydro.data = data;
        chartHydro.update();
    } else {
        chartHydro = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                ...commonOptions,
                scales: {
                    x: { title: { display: true, text: 'Tempo (min)' }, ticks: { maxTicksLimit: 12 } },
                    y: { title: { display: true, text: 'Vazão (m³/s)' }, beginAtZero: true }
                }
            }
        });
    }
};

export const renderHyetograph = (canvasId, rainSteps) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const primary = getCssVar('--color-primary') || '#2563eb';
    const neutral = getCssVar('--color-border-strong') || '#cbd5e1';
    
    const labels = rainSteps.map(s => s.time.toFixed(0));
    const effData = rainSteps.map(s => s.PeInc);
    const lossData = rainSteps.map(s => Math.max(0, s.incRain - s.PeInc));

    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Efetiva (mm)',
                data: effData,
                backgroundColor: primary,
                stack: 'Stack 0'
            },
            {
                label: 'Perdas (mm)',
                data: lossData,
                backgroundColor: neutral,
                stack: 'Stack 0'
            }
        ]
    };

    if (chartHyeto) {
        chartHyeto.data = data;
        chartHyeto.update();
    } else {
        chartHyeto = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                ...commonOptions,
                scales: {
                    x: { title: { display: true, text: 'Tempo (min)' }, ticks: { maxTicksLimit: 12 } },
                    y: { title: { display: true, text: 'Precipitação (mm)' } }
                }
            }
        });
    }
};

export const renderQuartiles = (canvasId) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const success = getCssVar('--color-success') || '#059669';
    const accent = getCssVar('--color-accent') || '#3b82f6';
    const warning = getCssVar('--color-warning') || '#f59e0b';
    const danger = getCssVar('--color-danger') || '#ef4444';
    
    if (chartQuartiles) {
        chartQuartiles.update();
        return;
    }

    const generateDataset = (quartileData, color, label, dash = []) => ({
        label: label,
        data: quartileData.map(q => ({ x: q.pct_time, y: q.pct_rain })),
        borderColor: color,
        borderWidth: 2,
        borderDash: dash,
        pointRadius: 0,
        fill: false,
        tension: 0.3
    });

    chartQuartiles = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                generateDataset(HUFF_QUARTILES.first, success, '1º Quartil (Adotado)', []),
                generateDataset(HUFF_QUARTILES.second, accent, '2º Quartil', [5, 5]),
                generateDataset(HUFF_QUARTILES.third, warning, '3º Quartil', [5, 5]),
                generateDataset(HUFF_QUARTILES.fourth, danger, '4º Quartil', [5, 5])
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: { type: 'linear', min: 0, max: 100, title: { display: true, text: '% Tempo' } },
                y: { min: 0, max: 100, title: { display: true, text: '% Chuva Acumulada' } }
            }
        }
    });
};

export const getChartImages = () => {
    return {
        hydrograph: chartHydro ? chartHydro.toBase64Image() : null,
        hyetograph: chartHyeto ? chartHyeto.toBase64Image() : null,
        quartiles: chartQuartiles ? chartQuartiles.toBase64Image() : null
    };
};
