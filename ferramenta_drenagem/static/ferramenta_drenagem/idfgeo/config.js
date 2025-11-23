/**
 * Configuration Constants for IDFGeo RS
 * Baseado no trabalho do Programa de Pós-Graduação em Recursos Hídricos (UFPEL)
 */

import { RS_BOUNDARY } from './rs_boundary.js';

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

export const RS_MASK_POLYGON = RS_BOUNDARY;
