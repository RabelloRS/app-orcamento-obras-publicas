const defaultRainData = {
    "campinas_sp": {
        id: "campinas_sp",
        name: "Campinas - SP",
        k: 2524.86,
        a: 0.1562,
        b: 20,
        c: 0.865,
        minDuration: 10,
        maxDuration: 1440,
        returnPeriod: 100
    },
    "sao_paulo_sp": {
        id: "sao_paulo_sp",
        name: "São Paulo - SP",
        k: 3628.32,
        a: 0.172,
        b: 25,
        c: 1.02,
        minDuration: 5,
        maxDuration: 1440,
        returnPeriod: 100
    },
    "montenegro_rs": {
        id: "montenegro_rs",
        name: "Montenegro - RS (Bacia 1)",
        k: 565.047,
        a: 0.232,
        b: 9.307,
        c: 0.708,
        minDuration: 5,
        maxDuration: 1440,
        returnPeriod: 50
    }
};

let rainDataCache = null;

export async function loadRainDataFromAPI() {
    if (rainDataCache) return rainDataCache;
    
    try {
        const response = await fetch('/ferramenta-drenagem/api/rain-equations/');
        if (response.ok) {
            const apiData = await response.json();
            rainDataCache = { ...defaultRainData, ...apiData };
            localStorage.setItem('smdu_rain_db', JSON.stringify(rainDataCache));
            return rainDataCache;
        }
    } catch (error) {
        console.warn("Erro ao carregar equações do banco de dados, usando dados locais:", error);
    }
    return loadRainData();
}

export function loadRainData() {
    const stored = localStorage.getItem('smdu_rain_db');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            return { ...defaultRainData, ...parsed };
        } catch (e) {
            console.error("Erro ao carregar DB local", e);
            return defaultRainData;
        }
    }
    return defaultRainData;
}


export function saveRainData(data) {
    const current = loadRainData();
    const id = data.id || data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
    current[id] = { ...data, id };
    localStorage.setItem('smdu_rain_db', JSON.stringify(current));
    return current;
}

export function getRainFormulaText(params) {
    return `I = ${params.k} · Tr^${params.a} / (t + ${params.b})^${params.c}`;
}

export const materials = {
    "concreto": { name: "Concreto (NBR 8890)", n: 0.013 },
    "pvc": { name: "PVC (NBR 10570)", n: 0.010 },
    "pead": { name: "PEAD (Corrugado)", n: 0.012 },
    "aco": { name: "Aço Corrugado", n: 0.024 }
};

export const surfaceTypes = {
    "roof": { name: "Telhados (C=0.90)", value: 0.90 },
    "pavement": { name: "Pavimentos/Asfalto (C=0.80)", value: 0.80 },
    "concrete": { name: "Concreto (C=0.70)", value: 0.70 },
    "soil_sandy": { name: "Solo Arenoso (C=0.30)", value: 0.30 },
    "soil_clay": { name: "Solo Argiloso (C=0.40)", value: 0.40 },
    "custom": { name: "Personalizado", value: 0.00 }
};

export const commercialDiameters = [0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5];
