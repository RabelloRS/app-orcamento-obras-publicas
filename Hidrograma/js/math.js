import { HUFF_QUARTILES } from './data.js';

export const validateInputs = (inputs) => {
    const msgs = [];
    let valid = true;

    if (inputs.area <= 0 || isNaN(inputs.area)) { msgs.push("Área da bacia inválida."); valid = false; }
    if (inputs.area > 500) msgs.push("Aviso: Área > 500km² pode reduzir precisão do método SCS.");
    
    if (inputs.length <= 0) { msgs.push("Comprimento do talvegue inválido."); valid = false; }
    if (inputs.slope <= 0) { msgs.push("Desnível inválido."); valid = false; }
    
    if (inputs.cn < 30 || inputs.cn > 100) { msgs.push("CN fora dos limites (30-100)."); valid = false; }
    if (inputs.cn < 40) msgs.push("Aviso: CN muito baixo (<40) é atípico.");
    
    if (inputs.duration < 10) { msgs.push("Duração mínima 10 min."); valid = false; }
    
    return { valid, msgs };
};

export const calculateTc = (lengthKm, heightDiffM) => {



    if (lengthKm <= 0 || heightDiffM <= 0) return 10;

    const factor = Math.pow(lengthKm, 3) / heightDiffM;
    const tc = 57 * Math.pow(factor, 0.385);
    
    return Math.max(tc, 10); // Constraint: Min 10 min
};

export const calculateIntensity = (tr, durationMin, params) => {

    const num = params.K * Math.pow(tr, params.a);
    const den = Math.pow(durationMin + params.b, params.c);
    return num / den; // mm/h
};

export const generateHuffDistribution = (totalRainMm, durationMin, numSteps = 50) => {

    const huffProfile = HUFF_QUARTILES.first;
    const dt = durationMin / numSteps;
    const steps = [];
    let prevAccum = 0;

    for (let i = 1; i <= numSteps; i++) {
        const t = i * dt;
        const pctTime = (t / durationMin) * 100;
        

        let lower = huffProfile[0];
        let upper = huffProfile[huffProfile.length - 1];
        
        for (let j = 0; j < huffProfile.length - 1; j++) {
            if (pctTime >= huffProfile[j].pct_time && pctTime <= huffProfile[j+1].pct_time) {
                lower = huffProfile[j];
                upper = huffProfile[j+1];
                break;
            }
        }

        const range = upper.pct_time - lower.pct_time;
        const ratio = range === 0 ? 0 : (pctTime - lower.pct_time) / range;
        const pctRain = lower.pct_rain + ratio * (upper.pct_rain - lower.pct_rain);
        
        const accumRain = (pctRain / 100) * totalRainMm;
        const incRain = Math.max(0, accumRain - prevAccum);
        
        steps.push({
            time: t,
            accumRain,
            incRain
        });
        prevAccum = accumRain;
    }
    return { steps, dt };
};

export const calculateSCSAbstractions = (cn, rainSteps) => {

    const S = (25400 / cn) - 254;
    const Ia = 0.2 * S;
    
    let prevPe = 0;
    const processedSteps = rainSteps.map(step => {
        let PeAccum = 0;

        if (step.accumRain > Ia) {
            PeAccum = Math.pow(step.accumRain - Ia, 2) / (step.accumRain - Ia + S);
        }
        const PeInc = Math.max(0, PeAccum - prevPe);
        prevPe = PeAccum;
        
        return { ...step, PeAccum, PeInc };
    });

    return { S, Ia, steps: processedSteps };
};

export const generateTriangularUH = (areaKm2, tcMin, dtMin) => {

    const t_lag = 0.6 * tcMin;
    const tp = (dtMin / 2) + t_lag; // Time to peak
    const tb = 2.67 * tp;           // Base time
    


    const qp = (0.208 * areaKm2) / (tp / 60); 

    const ordinates = [];

    const numOrdinates = Math.ceil((tb * 1.2) / dtMin);

    for (let i = 0; i < numOrdinates; i++) {
        const t = i * dtMin;
        let q = 0;
        if (t <= tp) {

            q = qp * (t / tp);
        } else if (t <= tb) {

            q = qp * ((tb - t) / (tb - tp));
        } else {
            q = 0;
        }
        ordinates.push(q);
    }

    return { ordinates, tp, tb, qp };
};

export const convolve = (rainProfile, uhOrdinates) => {
    const nRain = rainProfile.length;
    const nUH = uhOrdinates.length;
    const totalLen = nRain + nUH - 1;
    const flow = new Array(totalLen).fill(0);

    for (let i = 0; i < nRain; i++) {
        const rain = rainProfile[i].PeInc; // Incremental Effective Rain
        if (rain <= 0.00001) continue;

        for (let j = 0; j < nUH; j++) {
            flow[i + j] += rain * uhOrdinates[j];
        }
    }

    return flow;
};
