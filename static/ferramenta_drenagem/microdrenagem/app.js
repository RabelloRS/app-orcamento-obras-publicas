import { loadRainData, materials } from './database.js';
import { calculateSlope, calculateIntensity, calculateRationalFlow, dimensionPipe, verifyHydraulics, calculateKirpichUrbanAccum } from './calculator.js';
import { populateRegions, renderTable, renderQuantitiesDetailed, updateRainInfo, setupGlobalParams, initRainModal } from './ui_renderer.js';

let sections = [];
let rainData = loadRainData();

document.addEventListener('DOMContentLoaded', () => {
    setupGlobalParams();
    refreshRainData();
    initRainModal(refreshRainData);

    if (window.lucide) {
        window.lucide.createIcons();
    }
    if (window.mermaid) {
        window.mermaid.initialize({ startOnLoad: true });
    }

    window.removeRow = (index) => {
        sections.splice(index, 1);
        updateUI();
    };

    const ctInputs = ['ct_up', 'ct_down'];
    ctInputs.forEach(id => {
        const input = document.getElementById(id);
        if (!input) {
            return;
        }
        input.addEventListener('change', (e) => {
            const suffix = id.split('_')[1];
            const cfInput = document.getElementById(`cf_${suffix}`);

            if (!cfInput.value && e.target.value) {
                const ct = parseFloat(e.target.value);
                cfInput.value = (ct - 1.6).toFixed(2); // 1.0m cover + 0.6m default diameter approx
            }
        });
    });

    document.getElementById('region-select').addEventListener('change', (e) => {
        updateRainInfo(rainData, e.target.value);
    });
    
    document.getElementById('tr-input').addEventListener('change', () => {
        const region = document.getElementById('region-select').value;
        updateRainInfo(rainData, region);
    });
    
    document.getElementById('tr-input').addEventListener('keyup', () => {
        const region = document.getElementById('region-select').value;
        updateRainInfo(rainData, region);
    });
});

function refreshRainData() {
    rainData = loadRainData();
    populateRegions(rainData);
}

document.getElementById('drainage-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const regionKey = document.getElementById('region-select').value;
    const tr = parseFloat(document.getElementById('tr-input').value);
    const tcIniInput = parseFloat(document.getElementById('tc-ini-input').value);
    const materialKey = document.getElementById('global-material').value;
    const cValue = parseFloat(document.getElementById('global-c-value').value);
    
    const length = parseFloat(formData.get('length'));
    const pvStart = formData.get('pv_start');
    

    const ctUp = parseFloat(formData.get('ct_up'));
    let cfUp = parseFloat(formData.get('cf_up'));
    const ctDown = parseFloat(formData.get('ct_down'));
    let cfDown = parseFloat(formData.get('cf_down'));
    





    if (isNaN(cfUp)) cfUp = ctUp - 1.6;
    if (isNaN(cfDown)) cfDown = ctDown - 1.6; 


    let slope = calculateSlope(cfUp, cfDown, length);



    const areaOwn = parseFloat(formData.get('area_own'));
    const areaAccumPrev = parseFloat(formData.get('area_accum_prev')) || 0;
    const areaTotal = areaAccumPrev + areaOwn;


    let tcCalc = tcIniInput;
    


    const prevSection = sections.find(s => s.id.endsWith(pvStart));
    if (prevSection) {
        tcCalc = prevSection.tcAccum; // Start with output of prev
    }




    const tcIncrement = calculateKirpichUrbanAccum(length, slope, areaOwn); 

    const tcAccumulated = tcCalc + tcIncrement;




    const intensity = calculateIntensity(rainData[regionKey], tr, tcAccumulated);

    const flowM3s = calculateRationalFlow(cValue, intensity, areaTotal);
    
    const n = materials[materialKey].n;
    

    const hydraulics = dimensionPipe(flowM3s, slope, n);
    


    
    const checks = verifyHydraulics(
        hydraulics.diameter, 
        slope, 
        hydraulics.velocity, 
        hydraulics.fillRatio, 
        hydraulics.tau,
        ctDown,
        cfDown
    );

    const newSection = {
        id: `${pvStart} -> ${formData.get('pv_end')}`,
        material: materialKey,
        length: length,
        slope: slope,
        flow: flowM3s,
        diameter: hydraulics.diameter,
        velocity: hydraulics.velocity,
        fillRatio: hydraulics.fillRatio,
        tau: hydraulics.tau,
        status: hydraulics.status,
        ctUp: ctUp,
        cfUp: cfUp,
        ctDown: ctDown,
        cfDown: cfDown,
        depthStart: ctUp - cfUp,
        depthEnd: ctDown - cfDown,
        checks: checks,
        c: cValue,
        tcAccum: tcAccumulated
    };
    
    sections.push(newSection);
    updateUI();
    

    const form = e.target;
    form.elements['pv_start'].value = form.elements['pv_end'].value;
    

    const lastPv = form.elements['pv_end'].value;
    const numMatch = lastPv.match(/(\d+)$/);
    if (numMatch) {
        const nextNum = parseInt(numMatch[0]) + 1;
        const prefix = lastPv.substring(0, numMatch.index);
        const pad = numMatch[0].length;
        form.elements['pv_end'].value = prefix + String(nextNum).padStart(pad, '0');
    } else {
        form.elements['pv_end'].value = '';
    }

    form.elements['ct_up'].value = ctDown;
    form.elements['cf_up'].value = cfDown;
    form.elements['ct_down'].value = '';
    form.elements['cf_down'].value = '';
    form.elements['area_accum_prev'].value = areaTotal.toFixed(4);
    form.elements['area_own'].value = '';
});

document.getElementById('clear-btn').addEventListener('click', () => {
    sections = [];
    updateUI();
});

function updateUI() {
    renderTable(sections);
    renderQuantitiesDetailed(sections);
}
