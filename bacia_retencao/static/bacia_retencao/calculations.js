import { PIPES } from './data.js';

export const calculateKirpich = (L, H) => {
    if (!L || !H || L <= 0 || H <= 0) return 0;
    const S = H / L;
    const tc = 0.0195 * Math.pow(L, 0.77) * Math.pow(S, -0.385);
    return Math.max(5, tc);
};

export const calculateIntensity = (idf, tr, t) => {
    const { k, a, b, c } = idf;
    if (t <= 0) return 0;
    return (k * Math.pow(tr, a)) / Math.pow((t + b), c);
};

export const calculateRationalQ = (C, i, areaHa) => {
    return (C * i * areaHa) / 360;
};

export const manningQFull = (diameter_m, slope_S, n = 0.013) => {
    if (!diameter_m || diameter_m <= 0 || !slope_S || slope_S <= 0) return { Q: 0, A: 0, Rh: 0, V: 0 };
    const A = Math.PI * Math.pow(diameter_m, 2) / 4;
    const Rh = diameter_m / 4;
    const Q = (1 / n) * A * Math.pow(Rh, 2/3) * Math.pow(slope_S, 1/2);
    const V = Q / A;
    return { Q, A, Rh, V };
};

export const selectPipe = (Q_m3s, slope_S = 0.005, n = 0.013, maxV = 5.0) => {
    if (!Q_m3s || Q_m3s <= 0) return null;
    let pipe = null;
    for (const p of PIPES) {
        const { Q, V } = manningQFull(p.inner, slope_S, n);
        if (Q >= Q_m3s && V <= maxV) { pipe = p; break; }
    }
    if (!pipe) pipe = PIPES[PIPES.length - 1];
    const { Q, V } = manningQFull(pipe.inner, slope_S, n);
    return { dn: pipe.dn, inner: pipe.inner, v: V, capacity: Q };
};

export const calculateEnvelope = (areaHa, C, idf, tr, limitQ_m3s, availableVol_m3, mode) => {
    const results = [];
    let maxStorage = 0;
    let criticalTime = 0;
    let calculatedLimitQ = 0;
    const times = [];
    for (let t = 5; t <= 180; t += 5) times.push(t);

    if (mode === 'volume') {
        for (const t of times) {
            const i = calculateIntensity(idf, tr, t);
            const Q_in = calculateRationalQ(C, i, areaHa);
            const Vol_in = Q_in * t * 60;
            const Vol_out = limitQ_m3s * t * 60;
            const Storage = Math.max(0, Vol_in - Vol_out);
            if (Storage > maxStorage) { maxStorage = Storage; criticalTime = t; }
            results.push({ t, vol: Storage, q_in: Q_in, vol_in: Vol_in, q_out: limitQ_m3s, vol_out: Vol_out });
        }
        return { maxStorage, criticalTime, results, qOut: limitQ_m3s };
    } else {
        let low = 0;
        let high = calculateRationalQ(C, calculateIntensity(idf, tr, 5), areaHa) * 1.5;
        let bestQ = 0;
        const tolerance = 0.001;
        for (let k = 0; k < 20; k++) {
            let midQ = (low + high) / 2;
            let currentMaxVol = 0;
            for (const t of times) {
                const i = calculateIntensity(idf, tr, t);
                const Q_in = calculateRationalQ(C, i, areaHa);
                const Vol_in = Q_in * t * 60;
                const Vol_out = midQ * t * 60;
                const S = Math.max(0, Vol_in - Vol_out);
                if (S > currentMaxVol) currentMaxVol = S;
            }
            if (currentMaxVol > availableVol_m3) {
                low = midQ;
            } else {
                bestQ = midQ;
                high = midQ;
            }
        }
        calculatedLimitQ = bestQ;
        results.length = 0;
        maxStorage = 0;
        for (const t of times) {
            const i = calculateIntensity(idf, tr, t);
            const Q_in = calculateRationalQ(C, i, areaHa);
            const Vol_in = Q_in * t * 60;
            const Vol_out = calculatedLimitQ * t * 60;
            const Storage = Math.max(0, Vol_in - Vol_out);
            if (Storage > maxStorage) { maxStorage = Storage; criticalTime = t; }
            results.push({ t, vol: Storage, q_in: Q_in, vol_in: Vol_in, q_out: calculatedLimitQ, vol_out: Vol_out });
        }
        return { maxStorage, criticalTime, results, qOut: calculatedLimitQ };
    }
};
