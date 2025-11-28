export const CITIES_IDF = {
    "curitiba": {
        name: "Curitiba - PR (Fendrich, 1984)",
        k: 3221.07,
        a: 0.258,
        b: 26,
        c: 1.01
    },
    "saopaulo": {
        name: "São Paulo - SP (DAEE/USP)",
        k: 3462.7, 
        a: 0.172,
        b: 22,
        c: 1.025
    },
    "brasilia": {
        name: "Brasília - DF (ADASA)",
        k: 1574.7,
        a: 0.207,
        b: 11,
        c: 0.884
    },
    "aracaju": {
        name: "Aracaju - SE (Aragão)",
        k: 2084.8,
        a: 0.188,
        b: 10.52,
        c: 0.753
    },
    "bh": {
        name: "Belo Horizonte - MG (Ramos, 1995)",
        k: 5802,
        a: 0.15,
        b: 30,
        c: 1.08
    },
    "rj": {
        name: "Rio de Janeiro - RJ (Prefeitura)",
        k: 1400, // Generic approx for coastal zone, needs specific validation
        a: 0.2,
        b: 20,
        c: 0.8
    }
};



export const PIPES = [
    { dn: 300, inner: 0.30 },
    { dn: 400, inner: 0.40 },
    { dn: 500, inner: 0.50 },
    { dn: 600, inner: 0.60 },
    { dn: 800, inner: 0.80 },
    { dn: 1000, inner: 1.00 },
    { dn: 1200, inner: 1.20 },
    { dn: 1500, inner: 1.50 }
];

export const RUNOFF_GUIDE = {
    "Áreas Verdes / Parques": 0.20,
    "Residencial Unifamiliar": 0.50,
    "Residencial Denso": 0.70,
    "Comercial / Industrial": 0.90,
    "Pavimentos / Telhados": 0.95
};
