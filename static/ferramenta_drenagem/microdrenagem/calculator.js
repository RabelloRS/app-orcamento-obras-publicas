export function calculateSlope(cfUp, cfDown, length) {
    if (length <= 0) return 0;
    return (cfUp - cfDown) / length;
}

export function calculateIntensity(idf, tr, tc) {

    const num = idf.k * Math.pow(tr, idf.a);
    const den = Math.pow(tc + idf.b, idf.c);
    return num / den;
}

export function calculateRationalFlow(c, i, area) {


    return (c * i * area) / 360;
}

export function calculateKirpichUrbanAccum(length, slope, area) {

    const s = Math.max(slope, 0.0001);
    const base = 0.0078 * Math.pow(length / Math.sqrt(s), 0.77);
    const areaFactor = Math.pow(area, 0.385);
    return base * areaFactor * 1.2; // Returns tc increment in minutes
}

export function dimensionPipe(flow, slope, n) {
    const s = Math.max(slope, 0.0001);
    const K = 0.3117 / n;
    

    const dTheo = Math.pow(flow / (K * Math.sqrt(s)), 1/2.667);
    
    const commercial = [0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0];
    let dReal = commercial.find(d => d >= dTheo);
    if (!dReal) dReal = 2.0; // Max fallback


    const area = Math.PI * Math.pow(dReal/2, 2);
    const rh = dReal / 4;
    const vFull = (1/n) * Math.pow(rh, 2/3) * Math.sqrt(s);
    const qFull = area * vFull;
    const fillRatio = flow / qFull;
    



    const tau = 1000 * 9.81 * rh * s;


    let status = 'ok';
    if (fillRatio > 1.0) status = 'insufficient';
    
    return {
        diameter: dReal,
        velocity: vFull, // Using full flow velocity as standard ref
        qFull: qFull,
        fillRatio: fillRatio,
        status: status,
        tau: tau,
        rh: rh
    };
}

export function verifyHydraulics(diameter, slope, velocity, fillRatio, tau, ctDown, cfDown) {
    const checks = {
        valid: true,
        warnings: []
    };

    if (fillRatio > 0.85) checks.warnings.push('Lâmina > 85%');
    

    if (velocity > 5.0) checks.warnings.push('V > 5m/s');
    if (velocity < 0.75) checks.warnings.push('V < 0.75m/s');

    const cover = ctDown - (cfDown + diameter);
    if (cover < 1.0) {
        checks.warnings.push(`Recob. < 1m (${cover.toFixed(2)})`);
        checks.valid = false;
    }

    if (tau < 1.0) {
        checks.warnings.push(`τ < 1.0Pa (${tau.toFixed(2)})`);
        checks.valid = false; // Critical risk of sedimentation
    }

    return checks;
}
