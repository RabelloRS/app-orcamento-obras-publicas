export const formatNumber = (num, decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) return '--';
    return num.toLocaleString('pt-BR', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
    });
};


export const debounce = (func, wait) => {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const toM2 = (val, unit) => {
    if (unit === 'ha') return val * 10000;
    if (unit === 'km2') return val * 1000000;
    return val; 
};

export const toHa = (val, unit) => {
    if (unit === 'm2') return val / 10000;
    if (unit === 'km2') return val * 100;
    return val;
};
