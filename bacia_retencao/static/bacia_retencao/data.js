// CITIES_IDF removido pois agora utiliza o Banco de Dados IDF centralizado (banco_idf)
// via IDFService em idf_service.js

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
