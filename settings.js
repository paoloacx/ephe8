/*
 * settings.js (v2.2 - Importar/Exportar)
 * Gestiona la lógica de la pantalla/modal de Ajustes.
 */

// Importar los utils de localStorage
import { saveSetting, loadSetting } from './utils.js';

// --- Variables del Módulo ---
let _settingsModal = null;
let _callbacks = {}; // Para callbacks de main.js

/**
 * Inicializa el módulo de Ajustes (lo llama main.js).
 * @param {object} mainCallbacks - Objeto con los callbacks de main.js
 */
export function initSettings(mainCallbacks) {
    _callbacks = mainCallbacks;
}

/**
 * Función principal para mostrar los ajustes.
 * Reemplaza la simple alerta por un modal real.
 */
export function showSettings() {
    console.log("Mostrando Modal de Ajustes...");

    // Crear el modal si no existe
    if (!_settingsModal) {
        _createSettingsModal();
    }

    // Cargar el estado actual de la vista
    const currentViewMode = loadSetting('viewMode', 'calendar'); // 'calendar' es el default
    const toggle = document.getElementById('view-mode-toggle');
    if (toggle) {
        toggle.checked = (currentViewMode === 'timeline');
    }

    // Mostrar el modal
    _settingsModal.style.display = 'flex';
    setTimeout(() => {
        _settingsModal.classList.add('visible');
    }, 10);
}

/**
 * Crea el HTML del modal de Ajustes y lo añade al DOM.
 */
function _createSettingsModal() {
    if (_settingsModal) return;

    _settingsModal = document.createElement('div');
    _settingsModal.id = 'settings-modal';
    _settingsModal.className = 'modal-settings'; // Usa el estilo 'Deep Blue'

    _settingsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header">
                <h3 id="settings-title">Ajustes</h3>
            </div>
            
            <div class="modal-content-scrollable">
                <div class="settings-list-group">
                    <div class="settings-list-item">
                        <label class="settings-list-item-label" for="view-mode-toggle">Vista Timeline</label>
                        <label class="ios-toggle">
                            <input type="checkbox" id="view-mode-toggle">
                            <span class="ios-toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <p class="settings-list-group-footer">Datos</p>
                <div class="settings-list-group">
                    <div class="settings-list-item settings-list-item-button" id="export-data-btn">
                        <span class="material-icons-outlined">download</span>
                        <label class="settings-list-item-label">Exportar Memorias</label>
                        <div class="list-view-chevron"></div>
                    </div>
                    <div class="settings-list-item settings-list-item-button" id="import-data-btn">
                        <span class="material-icons-outlined">upload</span>
                        <label class="settings-list-item-label">Importar Memorias</label>
                        <div class="list-view-chevron"></div>
                    </div>
                </div>
                <p class="settings-list-group-footer">Exporta tus memorias a CSV o importa desde un archivo CSV</p>
            </div>
            
            <div class="modal-main-buttons">
                <button id="close-settings-btn">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(_settingsModal);

    // Binds de eventos
    document.getElementById('close-settings-btn')?.addEventListener('click', _closeSettingsModal);
    document.getElementById('view-mode-toggle')?.addEventListener('change', _handleToggleChange);
    document.getElementById('export-data-btn')?.addEventListener('click', _handleExportClick);
    document.getElementById('import-data-btn')?.addEventListener('click', _handleImportClick);
}

/**
 * Cierra el modal de Ajustes.
 */
function _closeSettingsModal() {
    if (!_settingsModal) return;
    _settingsModal.classList.remove('visible');
    setTimeout(() => {
        _settingsModal.style.display = 'none';
    }, 300);
}

/**
 * Se activa cuando el usuario pulsa el conmutador.
 */
function _handleToggleChange(e) {
    const isTimelineView = e.target.checked;
    const newViewMode = isTimelineView ? 'timeline' : 'calendar';

    console.log("Cambiando vista a:", newViewMode);

    // 1. Guardar la preferencia
    saveSetting('viewMode', newViewMode);

    // 2. Notificar a main.js para que cambie la vista AHORA
    if (_callbacks.onViewModeChange) {
        _callbacks.onViewModeChange(newViewMode);
    }
}

/**
 * Maneja el click en "Exportar Memorias"
 */
function _handleExportClick() {
    if (_callbacks.onExportData) {
        _callbacks.onExportData();
    }
}

/**
 * Maneja el click en "Importar Memorias"
 */
function _handleImportClick() {
    // Crear input file temporal
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file && _callbacks.onImportData) {
            _callbacks.onImportData(file);
        }
    };
    input.click();
}
