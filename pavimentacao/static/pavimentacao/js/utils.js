export const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

export const formatScientific = (num) => {
    if (num === 0) return '0';
    if (num < 10000 && num > 0.01) return formatNumber(num, 2);

    const exponent = Math.floor(Math.log10(num));
    const mantissa = num / Math.pow(10, exponent);
    return `${mantissa.toFixed(2)} x 10^${exponent}`;
};


export const calculateReqThickness = (N, CBR) => {
    if (CBR <= 0 || N <= 0) return 0;


    return 77.67 * Math.pow(N, 0.0482) * Math.pow(CBR, -0.598);
};

export const calculateN = (Vm, P, rate, type, FV) => {
    const days = 365;
    let Vt = 0;
    const rateDec = rate / 100;

    if (type === 'arithmetic') {




        Vt = 365 * P * Vm * (1 + (rateDec * (P - 1) / 2));
    } else {
        if (rateDec === 0) {
            Vt = 365 * Vm * P;
        } else {
            Vt = 365 * Vm * ((Math.pow(1 + rateDec, P) - 1) / rateDec);
        }
    }

    return Vt * FV * 0.5; // 0.5 factor for directional split (standard practice unless Vm is already directional)
};
