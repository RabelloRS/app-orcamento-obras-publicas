/**
 * Data constants derived from DNIT IPR-719 Manual
 */

export const MATERIALS = [
    { id: 'cbuq', name: 'Concreto Betuminoso (CBUQ)', k: 2.0, minCBR: 80, type: 'surface' },
    { id: 'pmq', name: 'Pré-misturado a Quente', k: 1.7, minCBR: 80, type: 'surface' },
    { id: 'pmf', name: 'Pré-misturado a Frio', k: 1.4, minCBR: 60, type: 'surface' },
    { id: 'ts', name: 'Tratamento Superficial', k: 1.2, minCBR: 60, type: 'surface' },
    { id: 'brita', name: 'Brita Graduada', k: 1.0, minCBR: 80, type: 'granular' },
    { id: 'solo_brita', name: 'Solo-Brita', k: 1.0, minCBR: 60, type: 'granular' },
    { id: 'solo_cimento_high', name: 'Solo-Cimento (Rc > 45kg/cm²)', k: 1.7, minCBR: 100, type: 'stabilized' },
    { id: 'solo_cimento_med', name: 'Solo-Cimento (28 < Rc < 45)', k: 1.4, minCBR: 100, type: 'stabilized' },
    { id: 'solo_cimento_low', name: 'Solo-Cimento (21 < Rc < 28)', k: 1.2, minCBR: 100, type: 'stabilized' },
    { id: 'solo_melhorado', name: 'Solo Melhorado', k: 1.0, minCBR: 20, type: 'granular' },
    { id: 'solo_local', name: 'Solo Local (Subleito)', k: 1.0, minCBR: 2, type: 'soil' }
];

export const MIN_THICKNESS_SURFACE = [
    { maxN: 1.0e6, val: 0, desc: 'Tratamento Superficial' },
    { maxN: 5.0e6, val: 5.0, desc: 'Revestimento 5.0 cm' },
    { maxN: 1.0e7, val: 7.5, desc: 'CBUQ 7.5 cm' },
    { maxN: 5.0e7, val: 10.0, desc: 'CBUQ 10.0 cm' },
    { maxN: Infinity, val: 12.5, desc: 'CBUQ 12.5 cm' }
];

export const VEHICLE_FACTORS = {
    'car': 0.0001, // Negligible
    'bus': 1.8,
    'truck_2ax': 2.5,
    'truck_3ax': 4.0,
    'truck_semi': 6.0
};

export const SURFACE_TYPES_DRAINAGE = [
    { id: 'roof', name: 'Telhados / Impermeável', c: 0.95 },
    { id: 'asphalt', name: 'Asfalto / Concreto', c: 0.90 },
    { id: 'paver', name: 'Blocos / Pav. Permeável', c: 0.50 },
    { id: 'soil', name: 'Solo Exposto', c: 0.40 },
    { id: 'green', name: 'Área Verde', c: 0.15 }
];
