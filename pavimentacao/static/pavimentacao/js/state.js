class Store {
    constructor() {
        this.state = this.getInitialState();
        this.listeners = [];
    }

    getInitialState() {
        return {
            project: {
                name: 'Novo Projeto',
                date: new Date().toISOString().split('T')[0],
                engineer: ''
            },
            traffic: {
                Vm: 2000,
                P: 10,
                growthRate: 3,
                growthType: 'geometric',
                FV: 2.5,
                calculatedN: 0,
                isDirectional: false // Assume bidirectional input by default
            },
            soil: {
                subgradeCBR: 5,
                expansion: 0.5,
                waterTable: 3.0,
                classification: 'A-6'
            },
            structure: {
                surface: { materialId: 'cbuq', thickness: 5.0 },
                base: { materialId: 'brita', thickness: 15.0, cbr: 80 },
                subbase: { materialId: 'solo_melhorado', thickness: 15.0, cbr: 20 },
                reinforcement: { materialId: 'solo_local', thickness: 0, cbr: 8 }
            },
            drainage: {
                area: 500,
                c: 0.90,
                rainfall_i: 120,
                permeability_k: 10,
                porosity: 0.35
            }
        };
    }

    loadDemoData() {

        const demo = {
            project: { name: 'Exemplo DNIT - Rodovia BR-RJ', date: new Date().toISOString().split('T')[0], engineer: 'Eng. Padrão' },
            traffic: { Vm: 3500, P: 10, growthRate: 4, growthType: 'geometric', FV: 3.2, isDirectional: false },
            soil: { subgradeCBR: 3, expansion: 1.2, waterTable: 2.5, classification: 'A-7-6' },
            structure: {
                surface: { materialId: 'cbuq', thickness: 7.5 }, // CBUQ
                base: { materialId: 'brita', thickness: 20.0, cbr: 80 }, // Brita
                subbase: { materialId: 'solo_brita', thickness: 20.0, cbr: 40 }, // Solo-Brita
                reinforcement: { materialId: 'solo_melhorado', thickness: 15.0, cbr: 12 } // Reforço
            },
            drainage: { area: 1200, c: 0.95, rainfall_i: 150, permeability_k: 15, porosity: 0.40 }
        };

        this.state = { ...this.state, ...demo };
        this.notify();
    }

    getState() {
        return this.state;
    }

    updateNested(path, value) {
        const keys = path.split('.');
        let current = this.state;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        this.notify();
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }
}

export const store = new Store();
