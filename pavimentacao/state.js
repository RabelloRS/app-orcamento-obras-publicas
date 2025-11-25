
class Store {
    constructor() {
        this.state = {
            project: {
                name: 'Projeto Exemplo Rodovia BR-101',
                date: new Date().toISOString().split('T')[0],
                engineer: ''
            },
            traffic: {
                Vm: 2500,
                P: 10,
                growthRate: 3,
                growthType: 'geometric', // 'arithmetic' or 'geometric'
                FV: 2.5,
                calculatedN: 0
            },
            soil: {
                subgradeCBR: 4,
                expansion: 1.5,
                waterTable: 2.0, // meters depth
                classification: 'A-7-6'
            },
            structure: {
                surface: { materialId: 'cbuq', thickness: 5.0 },
                base: { materialId: 'brita', thickness: 15.0, cbr: 80 },
                subbase: { materialId: 'solo_melhorado', thickness: 15.0, cbr: 20 },
                reinforcement: { materialId: null, thickness: 0, cbr: 10 },
                results: {
                    hTotal: 0,
                    isValid: false,
                    messages: []
                }
            },
            drainage: {
                area: 1000, // m2
                c: 0.95,
                rainfall_i: 150, // mm/h
                permeability_k: 15, // mm/h
                trenchWidth: 1.0,
                porosity: 0.35
            }
        };
        this.listeners = [];
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
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
