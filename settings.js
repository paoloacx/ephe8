/*
 * settings.js (v5.0 - Local First con opción de borrar ejemplos)
 * Gestiona la lógica de la pantalla/modal de Ajustes.
 */

import { saveSetting, loadSetting } from './utils.js';

// --- Variables del Módulo ---
let _settingsModal = null;
let _callbacks = {};

/**
 * Inicializa el módulo de Ajustes
 */
export function initSettings(mainCallbacks) {
    _callbacks = mainCallbacks;
}

/**
 * Muestra el modal de ajustes
 */
export function showSettings() {
    console.log("Mostrando Modal de Ajustes...");

    if (!_settingsModal) {
        _createSettingsModal();
    }

    // Cargar estado actual
    const currentViewMode = loadSetting('viewMode', 'calendar');
    const toggle = document.getElementById('view-mode-toggle');
    if (toggle) {
        toggle.checked = (currentViewMode === 'timeline');
    }

    _settingsModal.style.display = 'flex';
    setTimeout(() => {
        _settingsModal.classList.add('visible');
    }, 10);
}

/**
 * Crea el HTML del modal de Ajustes
 */
function _createSettingsModal() {
    if (_settingsModal) return;

    _settingsModal = document.createElement('div');
    _settingsModal.id = 'settings-modal';
    _settingsModal.className = 'modal-settings';

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
                    <div class="settings-list-item settings-list-item-button" id="clear-examples-btn">
                        <span class="material-icons-outlined">delete_sweep</span>
                        <label class="settings-list-item-label">Borrar Ejemplos</label>
                        <div class="list-view-chevron"></div>
                    </div>
                </div>
                <p class="settings-list-group-footer">Exporta tus memorias a CSV, importa desde un archivo CSV o borra las efemérides de ejemplo</p>
                
                <p class="settings-list-group-footer">Acerca de</p>
                <div class="settings-list-group">
                    <div class="settings-list-item">
                        <label class="settings-list-item-label">Versión</label>
                        <span class="settings-list-item-value">5.0 (Local First)</span>
                    </div>
                </div>
                <p class="settings-list-group-footer">Ephemerides funciona completamente offline. Tus datos se guardan en tu dispositivo.</p>
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
    document.getElementById('clear-examples-btn')?.addEventListener('click', _handleClearExamplesClick);
}

/**
 * Cierra el modal de Ajustes
 */
function _closeSettingsModal() {
    if (!_settingsModal) return;
    _settingsModal.classList.remove('visible');
    setTimeout(() => {
        _settingsModal.style.display = 'none';
    }, 300);
}

/**
 * Maneja el cambio del toggle de vista
 */
function _handleToggleChange(e) {
    const isTimelineView = e.target.checked;
    const newViewMode = isTimelineView ? 'timeline' : 'calendar';

    console.log("Cambiando vista a:", newViewMode);

    saveSetting('viewMode', newViewMode);

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

/**
 * Maneja el click en "Borrar Ejemplos"
 */
function _handleClearExamplesClick() {
    if (_callbacks.onClearExamples) {
        _callbacks.onClearExamples();
    }
}
