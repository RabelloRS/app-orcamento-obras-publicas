/**
 * Configuration Constants for IDFGeo RS
 * Source: Rodrigues et al. (2023) - UFPEL
 */


export const RS_BOUNDS = [
    [-33.752, -57.649], // SW (Chuí)
    [-27.080, -49.691]  // NE (Torres)
];

export const MAP_CONFIG = {
    center: [-30.3, -53.5],
    zoom: 7,
    minZoom: 6,
    maxZoom: 10,

    tileLayer: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO | UFPEL'
};


export const IDF_CONSTANTS = {
    c: 9.791,
    d: 0.7294
};


export const LIMITS = {
    a: {
        min: 507.6,
        max: 1254.6,
        label: 'Coeficiente A',
        unit: 'K',
        description: 'Parâmetro ligado à <strong>magnitude</strong> da precipitação. Valores mais altos indicam chuvas mais intensas em geral.',
        gradient: 'blue-red'
    },
    b: {
        min: 0.0593,
        max: 0.3738,
        label: 'Fator B',
        unit: 'Exp',
        description: 'Parâmetro de <strong>frequência</strong>. Define o quão rapidamente a intensidade aumenta com o Tempo de Retorno (Risco).',
        gradient: 'blue-red'
    }
};



export const ANCHORS = [
    { lat: -28.26, lon: -52.40, a: 1220.0, b: 0.35 }, // Passo Fundo
    { lat: -29.16, lon: -51.17, a: 1180.0, b: 0.32 }, // Caxias
    { lat: -29.33, lon: -49.72, a: 1240.0, b: 0.36 }, // Torres region
    { lat: -30.03, lon: -51.23, a: 980.0, b: 0.24 },  // Porto Alegre
    { lat: -29.68, lon: -53.80, a: 890.0, b: 0.19 },  // Santa Maria
    { lat: -31.76, lon: -52.33, a: 740.0, b: 0.14 },  // Pelotas
    { lat: -32.03, lon: -52.09, a: 700.0, b: 0.12 },  // Rio Grande
    { lat: -29.76, lon: -57.08, a: 550.0, b: 0.08 },  // Uruguaiana
    { lat: -28.65, lon: -56.00, a: 600.0, b: 0.10 },  // São Borja
    { lat: -30.88, lon: -55.53, a: 620.0, b: 0.09 },  // Livramento
    { lat: -31.33, lon: -54.10, a: 640.0, b: 0.11 },  // Bagé
    { lat: -33.69, lon: -53.45, a: 650.0, b: 0.07 },  // Chuí
    { lat: -27.63, lon: -52.27, a: 1150.0, b: 0.30 }, // Erechim
    { lat: -27.87, lon: -54.47, a: 1000.0, b: 0.28 }, // Santa Rosa
    { lat: -29.37, lon: -50.87, a: 1100.0, b: 0.29 }, // Gramado/Canela
    { lat: -28.00, lon: -51.00, a: 1100.0, b: 0.31 }, // Vacaria area (interpolated)
    { lat: -30.50, lon: -56.50, a: 580.0, b: 0.09 },  // West border fill
    { lat: -32.50, lon: -53.50, a: 680.0, b: 0.10 }   // South fill
];
