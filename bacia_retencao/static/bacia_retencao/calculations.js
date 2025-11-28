import { PIPES } from './data.js';

// --- Constantes de Engenharia ---
const KIRPICH_CONSTANTS = { K: 0.0195, EXP_L: 0.77, EXP_S: -0.385 };
const RATIONAL_DENOMINATOR = 360; // Converte (mm/h * ha) para m³/s
const MIN_TC_MINUTES = 10; // Recomendação usual para áreas urbanas
const SECONDS_IN_MINUTE = 60;

/**
 * Calcula o Tempo de Concentração (Tc) usando a fórmula de Kirpich.
 * @param {number} L - Comprimento do talvegue (m)
 * @param {number} H - Desnível (m)
 * @returns {number} Tc em minutos
 */
export const calculateKirpich = (L, H) => {
    if (!L || !H || L <= 0 || H <= 0) return MIN_TC_MINUTES;
    const S = H / L; // Declividade (m/m)
    // Fórmula: Tc = 0.0195 * L^0.77 * S^-0.385
    const tc = KIRPICH_CONSTANTS.K * Math.pow(L, KIRPICH_CONSTANTS.EXP_L) * Math.pow(S, KIRPICH_CONSTANTS.EXP_S);
    return Math.max(MIN_TC_MINUTES, tc);
};

/**
 * Calcula a intensidade pluviométrica (Equação de Chuva).
 * i = (K * Tr^a) / (t + b)^c
 */
export const calculateIntensity = (idf, tr, t) => {
    const { k, a, b, c } = idf;
    if (t <= 0) return 0;
    return (k * Math.pow(tr, a)) / Math.pow((t + b), c);
};

/**
 * Método Racional: Q = (C * i * A) / 360
 * Retorna Q em m³/s
 */
export const calculateRationalQ = (C, i, areaHa) => {
    return (C * i * areaHa) / RATIONAL_DENOMINATOR;
};

/**
 * Calcula a capacidade plena de um tubo (Manning).
 */
export const manningQFull = (diameter_m, slope_S, n = 0.013) => {
    if (!diameter_m || diameter_m <= 0 || !slope_S || slope_S <= 0) return { Q: 0, A: 0, Rh: 0, V: 0 };
    const A = Math.PI * Math.pow(diameter_m, 2) / 4;
    const Rh = diameter_m / 4; // Para seção circular cheia, Rh = D/4

    // Q = (1/n) * A * Rh^(2/3) * S^(1/2)
    const Q = (1 / n) * A * Math.pow(Rh, 2/3) * Math.pow(slope_S, 1/2);
    const V = Q / A;
    return { Q, A, Rh, V };
};

/**
 * Seleciona o menor tubo comercial que atende a vazão.
 */
export const selectPipe = (Q_m3s, slope_S = 0.005, n = 0.013, maxV = 5.0) => {
    if (!Q_m3s || Q_m3s <= 0) return null;

    // Encontra o primeiro tubo onde a capacidade > demanda e velocidade < max
    const pipe = PIPES.find(p => {
        const { Q, V } = manningQFull(p.inner, slope_S, n);
        return Q >= Q_m3s && V <= maxV;
    }) || PIPES[PIPES.length - 1]; // Fallback para o maior tubo se nenhum servir

    const { Q, V } = manningQFull(pipe.inner, slope_S, n);
    return { dn: pipe.dn, inner: pipe.inner, v: V, capacity: Q };
};

/**
 * Gera a tabela de dimensionamento (Envelope de Volume).
 * * MELHORIA:
 * 1. Removeu a busca binária. Agora calcula a vazão permitida algebricamente.
 * 2. Suporta cálculo reverso (Dado Volume -> Achar Vazão) de forma exata.
 */
export const calculateEnvelope = (areaHa, C, idf, tr, limitQ_m3s, availableVol_m3, mode) => {
    const results = [];
    const times = [];
    // Gera tempos de 5 a 180 min
    for (let t = 5; t <= 180; t += 5) times.push(t);

    if (mode === 'volume') {
        // MODO 1: Temos a vazão de saída limitada, queremos saber o volume necessário.
        // Método Racional / Método das Chuvas (Simplificado)
        // V_armazenado = (V_entrada - V_saida)
        // V_entrada = Q_racional(t) * t * 60
        // V_saida = Q_limite * t * 60

        let maxStorage = 0;
        let criticalTime = 0;

        for (const t of times) {
            const i = calculateIntensity(idf, tr, t);
            const Q_in = calculateRationalQ(C, i, areaHa);

            const Vol_in = Q_in * t * SECONDS_IN_MINUTE;
            const Vol_out = limitQ_m3s * t * SECONDS_IN_MINUTE;

            // O volume necessário é o excedente entre entrada e saída
            const Storage = Math.max(0, Vol_in - Vol_out);

            if (Storage > maxStorage) {
                maxStorage = Storage;
                criticalTime = t;
            }
            results.push({ t, vol: Storage, q_in: Q_in, vol_in: Vol_in, q_out: limitQ_m3s, vol_out: Vol_out });
        }
        return { maxStorage, criticalTime, results, qOut: limitQ_m3s };

    } else {
        // MODO 2: Temos um volume disponível (piscina pronta), qual a vazão de saída mínima para não transbordar?
        // Solução Algébrica:
        // Max(V_in - Q_out * t * 60) <= V_disponivel
        // V_in - V_disponivel <= Q_out * t * 60
        // Q_out >= (V_in - V_disponivel) / (t * 60)
        // Devemos encontrar o MAIOR Q_out necessário entre todos os tempos 't' para garantir que o reservatório nunca estoure.

        let requiredQOut = 0;

        // Passo 1: Descobrir a vazão de saída necessária (Gargalo)
        for (const t of times) {
            const i = calculateIntensity(idf, tr, t);
            const Q_in = calculateRationalQ(C, i, areaHa);
            const Vol_in = Q_in * t * SECONDS_IN_MINUTE;

            // Se o volume de chuva for maior que o buraco, a diferença tem que sair pelo tubo
            if (Vol_in > availableVol_m3) {
                const qNeed = (Vol_in - availableVol_m3) / (t * SECONDS_IN_MINUTE);
                if (qNeed > requiredQOut) requiredQOut = qNeed;
            }
        }

        // Passo 2: Recalcular a tabela final usando essa vazão descoberta
        let maxStorage = 0;
        let criticalTime = 0;

        for (const t of times) {
            const i = calculateIntensity(idf, tr, t);
            const Q_in = calculateRationalQ(C, i, areaHa);
            const Vol_in = Q_in * t * SECONDS_IN_MINUTE;
            const Vol_out = requiredQOut * t * SECONDS_IN_MINUTE;

            const Storage = Math.max(0, Vol_in - Vol_out);

            if (Storage > maxStorage) {
                maxStorage = Storage;
                criticalTime = t;
            }
            results.push({ t, vol: Storage, q_in: Q_in, vol_in: Vol_in, q_out: requiredQOut, vol_out: Vol_out });
        }

        return { maxStorage, criticalTime, results, qOut: requiredQOut };
    }
};
