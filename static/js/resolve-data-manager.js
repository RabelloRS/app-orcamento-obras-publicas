/**
 * Resolve Data Manager
 * Handles saving and loading project data in a proprietary format (.resolve)
 * The format uses Base64 encoding with a custom header for identification
 */

const RESOLVE_FILE_VERSION = '1.0';
const RESOLVE_FILE_MAGIC = 'RESOLVE_ENG';

/**
 * Collects all localStorage data that belongs to the Resolve platform
 * @returns {Object} All collected data from localStorage
 */
function collectLocalStorageData() {
    const data = {};
    const resolveKeys = [
        'smdu_rain_db',
        'resolve_drenagem_data',
        'resolve_hidrograma_data',
        'resolve_pavimentacao_data',
        'resolve_user_prefs'
    ];
    
    /**
     * Safely parses a localStorage value, returning parsed JSON or raw value
     * @param {string} value - The localStorage value to parse
     * @returns {*} Parsed JSON object or raw string value
     */
    const parseStorageValue = (value) => {
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    };
    
    for (const key of resolveKeys) {
        const value = localStorage.getItem(key);
        if (value) {
            data[key] = parseStorageValue(value);
        }
    }
    
    // Collect any other localStorage keys that start with 'resolve_'
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('resolve_') && !data[key]) {
            const value = localStorage.getItem(key);
            data[key] = parseStorageValue(value);
        }
    }
    
    return data;
}

/**
 * Collects app-specific data from the current page context
 * @returns {Object} App-specific data
 */
function collectAppData() {
    const appData = {};
    
    // Try to get current app type from URL
    const path = window.location.pathname;
    
    if (path.includes('/drenagem/')) {
        appData.currentApp = 'drenagem';
        // Get form data if available
        const form = document.getElementById('calcForm') || document.getElementById('drainage-form');
        if (form) {
            appData.formData = {};
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.name || input.id) {
                    appData.formData[input.name || input.id] = input.value;
                }
            });
        }
    } else if (path.includes('/hidrograma/')) {
        appData.currentApp = 'hidrograma';
        // Collect hidrograma inputs
        const inputs = document.querySelectorAll('.input-calc');
        if (inputs.length > 0) {
            appData.formData = {};
            inputs.forEach(input => {
                if (input.id) {
                    appData.formData[input.id] = input.value;
                }
            });
        }
    } else if (path.includes('/pavimentacao/')) {
        appData.currentApp = 'pavimentacao';
        // The state is managed by state.js module
        if (window.pavimentacaoState) {
            appData.stateData = window.pavimentacaoState.getState();
        }
    }
    
    return appData;
}

/**
 * Creates a Resolve file with all project data
 * @param {Object} customData - Optional custom data to include
 * @returns {Object} The complete project data object
 */
function createProjectData(customData = {}) {
    const projectData = {
        version: RESOLVE_FILE_VERSION,
        magic: RESOLVE_FILE_MAGIC,
        timestamp: new Date().toISOString(),
        localStorage: collectLocalStorageData(),
        appData: collectAppData(),
        custom: customData
    };
    
    return projectData;
}

/**
 * Encodes project data to the proprietary .resolve format
 * Uses Base64 encoding with a custom header
 * @param {Object} data - The project data to encode
 * @returns {string} Encoded string ready for file download
 */
function encodeResolveFile(data) {
    const jsonString = JSON.stringify(data);
    // Use TextEncoder for proper UTF-8 handling
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(jsonString);
    // Convert to Base64
    let binaryString = '';
    uint8Array.forEach(byte => {
        binaryString += String.fromCharCode(byte);
    });
    const base64 = btoa(binaryString);
    // Add magic header
    return `${RESOLVE_FILE_MAGIC}::${RESOLVE_FILE_VERSION}::${base64}`;
}

/**
 * Decodes a .resolve file content
 * @param {string} fileContent - The encoded file content
 * @returns {Object|null} Decoded project data or null if invalid
 */
function decodeResolveFile(fileContent) {
    try {
        const parts = fileContent.split('::');
        if (parts.length < 3 || parts[0] !== RESOLVE_FILE_MAGIC) {
            console.error('Invalid Resolve file format');
            return null;
        }
        
        const base64 = parts.slice(2).join('::'); // In case content has ::
        const binaryString = atob(base64);
        // Convert back to UTF-8
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder();
        const jsonString = decoder.decode(bytes);
        
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Error decoding Resolve file:', e);
        return null;
    }
}

/**
 * Downloads project data as a .resolve file
 * @param {string} filename - Optional filename (without extension)
 * @param {Object} customData - Optional custom data to include
 */
function downloadProjectFile(filename = null, customData = {}) {
    const data = createProjectData(customData);
    const encoded = encodeResolveFile(data);
    
    const defaultFilename = `resolve_projeto_${new Date().toISOString().split('T')[0]}`;
    const finalFilename = (filename || defaultFilename) + '.resolve';
    
    const blob = new Blob([encoded], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Projeto salvo com sucesso!', 'success');
}

/**
 * Loads project data from a .resolve file
 * @param {File} file - The file object to read
 * @returns {Promise<Object|null>} Decoded project data or null if invalid
 */
async function loadProjectFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            const data = decodeResolveFile(content);
            
            if (data) {
                resolve(data);
            } else {
                reject(new Error('Arquivo inválido ou corrompido'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        reader.readAsText(file);
    });
}

/**
 * Applies loaded project data to the application
 * @param {Object} data - The decoded project data
 */
function applyProjectData(data) {
    if (!data) return false;
    
    // Restore localStorage data
    if (data.localStorage) {
        for (const [key, value] of Object.entries(data.localStorage)) {
            try {
                const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                localStorage.setItem(key, stringValue);
            } catch (e) {
                console.error(`Error restoring localStorage key ${key}:`, e);
            }
        }
    }
    
    // Restore form data if on the same app
    if (data.appData && data.appData.formData) {
        for (const [key, value] of Object.entries(data.appData.formData)) {
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (element) {
                element.value = value;
                // Trigger input event for reactive updates
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }
    
    // Emit custom event for apps to handle their own data restoration
    window.dispatchEvent(new CustomEvent('resolveProjectLoaded', { detail: data }));
    
    showNotification('Projeto carregado com sucesso!', 'success');
    return true;
}

/**
 * Opens a file picker dialog for loading a .resolve file
 */
function openLoadDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.resolve';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const data = await loadProjectFile(file);
            applyProjectData(data);
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
    
    input.click();
}

/**
 * Shows a notification to the user
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showNotification(message, type = 'info') {
    // Try to use existing notification system or create a simple one
    const existingContainer = document.querySelector('.alert-container') || document.querySelector('.content') || document.body;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show shadow-sm border-0 rounded-3 mb-4`;
    alert.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px; animation: slideIn 0.3s ease-out;';
    alert.innerHTML = `
        <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}-fill me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    // Add animation styles
    if (!document.getElementById('resolve-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'resolve-notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    existingContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, 5000);
    
    // Allow manual close
    const closeBtn = alert.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        });
    }
}

/**
 * Creates the save/load toolbar UI
 * @param {HTMLElement} container - The container element to insert the toolbar
 */
function createToolbar(container) {
    if (!container) return;
    
    const toolbar = document.createElement('div');
    toolbar.className = 'resolve-toolbar d-flex gap-2 flex-wrap align-items-center';
    toolbar.innerHTML = `
        <div class="btn-group" role="group" aria-label="Gerenciamento de projeto">
            <button type="button" class="btn btn-outline-primary btn-sm" id="resolve-btn-save" title="Salvar projeto">
                <i class="bi bi-download me-1"></i>
                <span class="d-none d-md-inline">Salvar Projeto</span>
            </button>
            <button type="button" class="btn btn-outline-primary btn-sm" id="resolve-btn-load" title="Carregar projeto">
                <i class="bi bi-upload me-1"></i>
                <span class="d-none d-md-inline">Carregar Projeto</span>
            </button>
        </div>
    `;
    
    container.appendChild(toolbar);
    
    // Add event listeners
    document.getElementById('resolve-btn-save').addEventListener('click', () => downloadProjectFile());
    document.getElementById('resolve-btn-load').addEventListener('click', openLoadDialog);
}

/**
 * Generates a detailed calculation memory report
 * @param {Object} calculationData - The calculation data to include
 * @param {string} appName - Name of the application
 * @returns {Object} Report data structure
 */
function generateCalculationReport(calculationData, appName) {
    return {
        header: {
            title: `Memória de Cálculo - ${appName}`,
            generatedAt: new Date().toISOString(),
            platform: 'Resolve Engenharia',
            version: RESOLVE_FILE_VERSION
        },
        calculations: calculationData,
        metadata: {
            url: window.location.href,
            userAgent: navigator.userAgent
        }
    };
}

/**
 * Downloads calculation memory as a text/JSON file
 * @param {Object} calculationData - The calculation data
 * @param {string} appName - Name of the application
 * @param {string} format - 'json' or 'txt'
 */
function downloadCalculationMemory(calculationData, appName, format = 'json') {
    const report = generateCalculationReport(calculationData, appName);
    const filename = `memoria_calculo_${appName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    
    let content, mimeType, extension;
    
    if (format === 'json') {
        content = JSON.stringify(report, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    } else {
        // Format as readable text
        content = formatReportAsText(report);
        mimeType = 'text/plain';
        extension = 'txt';
    }
    
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Memória de cálculo baixada!', 'success');
}

/**
 * Formats a report object as readable text
 * @param {Object} report - The report object
 * @returns {string} Formatted text
 */
function formatReportAsText(report) {
    let text = '';
    text += '='.repeat(60) + '\n';
    text += `${report.header.title}\n`;
    text += '='.repeat(60) + '\n';
    text += `Gerado em: ${new Date(report.header.generatedAt).toLocaleString('pt-BR')}\n`;
    text += `Plataforma: ${report.header.platform}\n`;
    text += `Versão: ${report.header.version}\n`;
    text += '-'.repeat(60) + '\n\n';
    
    text += 'DADOS DO CÁLCULO:\n';
    text += '-'.repeat(60) + '\n';
    text += formatObjectAsText(report.calculations, 0);
    
    text += '\n' + '='.repeat(60) + '\n';
    text += 'Documento gerado automaticamente pela plataforma Resolve Engenharia\n';
    text += `URL: ${report.metadata.url}\n`;
    
    return text;
}

/**
 * Recursively formats an object as indented text
 * @param {Object} obj - The object to format
 * @param {number} indent - Current indentation level
 * @returns {string} Formatted text
 */
function formatObjectAsText(obj, indent = 0) {
    let text = '';
    const spaces = '  '.repeat(indent);
    
    /**
     * Formats a key into a human-readable label
     * Converts snake_case and camelCase to title case with spaces
     * @param {string} key - The key to format
     * @returns {string} Formatted label
     */
    const formatLabel = (key) => {
        return key
            .replace(/_/g, ' ')           // snake_case to spaces
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase to spaces
            .replace(/\b\w/g, c => c.toUpperCase())  // Capitalize first letter of each word
            .trim();
    };
    
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;
        
        const label = formatLabel(key);
        
        if (typeof value === 'object' && !Array.isArray(value)) {
            text += `${spaces}${label}:\n`;
            text += formatObjectAsText(value, indent + 1);
        } else if (Array.isArray(value)) {
            text += `${spaces}${label}: [${value.length} itens]\n`;
            if (value.length <= 10) {
                value.forEach((item, i) => {
                    if (typeof item === 'object') {
                        text += `${spaces}  [${i + 1}]:\n`;
                        text += formatObjectAsText(item, indent + 2);
                    } else {
                        text += `${spaces}  - ${item}\n`;
                    }
                });
            }
        } else {
            text += `${spaces}${label}: ${value}\n`;
        }
    }
    
    return text;
}

// Export functions for use in other modules
window.ResolveDataManager = {
    downloadProjectFile,
    loadProjectFile,
    openLoadDialog,
    applyProjectData,
    createToolbar,
    showNotification,
    downloadCalculationMemory,
    generateCalculationReport,
    collectLocalStorageData,
    collectAppData,
    RESOLVE_FILE_VERSION
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Look for a designated toolbar container
    const toolbarContainer = document.getElementById('resolve-toolbar-container');
    if (toolbarContainer) {
        createToolbar(toolbarContainer);
    }
    
    // Attach event listeners to global navbar buttons if they exist
    const globalSaveBtn = document.getElementById('resolve-btn-save');
    const globalLoadBtn = document.getElementById('resolve-btn-load');
    
    if (globalSaveBtn) {
        globalSaveBtn.addEventListener('click', () => downloadProjectFile());
    }
    if (globalLoadBtn) {
        globalLoadBtn.addEventListener('click', openLoadDialog);
    }
});
