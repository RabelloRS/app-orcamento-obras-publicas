/**
 * Serviço para buscar e gerenciar fórmulas IDF do Banco de Dados IDF.
 */
const IDFService = {
    API_URL: (typeof window !== 'undefined' && window.__IDF_API__) ? window.__IDF_API__ : '/banco-idf/api/formulas/',

    /**
     * Busca todas as fórmulas ativas.
     * @returns {Promise<Array>} Lista de fórmulas.
     */
    async getFormulas() {
        try {
            const response = await fetch(this.API_URL);
            const data = await response.json();
            return data.formulas || [];
        } catch (error) {
            console.error('Erro ao buscar fórmulas IDF:', error);
            return [];
        }
    },

    /**
     * Popula um elemento <select> com as opções de fórmulas.
     * @param {HTMLSelectElement} selectElement - O elemento select a ser populado.
     * @param {Function} onSelect - Callback executado ao selecionar uma opção.
     */
    async populateSelect(selectElement, onSelect) {
        const preload = (typeof window !== 'undefined') ? window.__IDF_PRELOAD__ : null;
        const formulas = Array.isArray(preload) && preload.length ? preload : await this.getFormulas();
        
        // Preserva "custom" se existir e normaliza o texto
        const customOption = selectElement.querySelector('option[value="custom"]');
        selectElement.innerHTML = ''; // Limpa tudo
        
        if (customOption) {
            customOption.textContent = 'Personalizado';
            selectElement.appendChild(customOption);
        } else {
            const opt = document.createElement('option');
            opt.value = 'custom';
            opt.textContent = 'Personalizado';
            selectElement.appendChild(opt);
        }

        const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        formulas.sort((a, b) => {
            const ac = norm(a.city); const bc = norm(b.city);
            if (ac !== bc) return ac.localeCompare(bc);
            const as = norm(a.state); const bs = norm(b.state);
            if (as !== bs) return as.localeCompare(bs);
            return norm(a.name).localeCompare(norm(b.name));
        });

        formulas.forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = `${f.city}/${f.state} - ${f.name}`;
            
            option.dataset.k = f.k;
            option.dataset.a = f.a;
            option.dataset.b = f.b;
            option.dataset.c = f.c;
            option.dataset.city = f.city;
            option.dataset.state = f.state;
            
            selectElement.appendChild(option);
        });

        if (formulas.length > 0) {
            selectElement.value = String(formulas[0].id);
            const opt = selectElement.querySelector(`option[value="${String(formulas[0].id)}"]`);
            if (opt) {
                const params = {
                    k: parseFloat(opt.dataset.k),
                    a: parseFloat(opt.dataset.a),
                    b: parseFloat(opt.dataset.b),
                    c: parseFloat(opt.dataset.c),
                    city: opt.dataset.city,
                    state: opt.dataset.state
                };
                if (onSelect) onSelect(params);
            }
        }

        selectElement.addEventListener('change', (e) => {
            const selectedOption = selectElement.selectedOptions[0];
            if (selectedOption && selectedOption.value !== 'custom') {
                const params = {
                    k: parseFloat(selectedOption.dataset.k),
                    a: parseFloat(selectedOption.dataset.a),
                    b: parseFloat(selectedOption.dataset.b),
                    c: parseFloat(selectedOption.dataset.c),
                    city: selectedOption.dataset.city,
                    state: selectedOption.dataset.state
                };
                if (onSelect) onSelect(params);
            } else if (selectedOption && selectedOption.value === 'custom') {
                if (onSelect) onSelect(null);
            }
        });
    }
};

if (typeof window !== 'undefined') {
    window.IDFService = IDFService;
}

export default IDFService;
