/*
 * settings.js (v3.0 - Con Google Drive Backup)
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

    // Actualizar estado de Google Drive
    _updateGDriveStatus();

    // Mostrar el modal
    _settingsModal.style.display = 'flex';
    setTimeout(() => {
        _settingsModal.classList.add('visible');
    }, 10);
}

/**
 * Actualiza el estado de Google Drive en el modal
 */
function _updateGDriveStatus() {
    const statusEl = document.getElementById('gdrive-status');
    const loginBtn = document.getElementById('gdrive-login-btn');
    const backupBtn = document.getElementById('gdrive-backup-btn');
    const restoreBtn = document.getElementById('gdrive-restore-btn');
    const logoutBtn = document.getElementById('gdrive-logout-btn');

    if (_callbacks.onGDriveCheckAuth && _callbacks.onGDriveCheckAuth()) {
        // Autorizado
        if (statusEl) statusEl.textContent = 'Conectado a Google Drive';
        if (loginBtn) loginBtn.style.display = 'none';
        if (backupBtn) backupBtn.style.display = 'block';
        if (restoreBtn) restoreBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
        // No autorizado
        if (statusEl) statusEl.textContent = 'No conectado';
        if (loginBtn) loginBtn.style.display = 'block';
        if (backupBtn) backupBtn.style.display = 'none';
        if (restoreBtn) restoreBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
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
                <!-- Vista -->
                <div class="settings-list-group">
                    <div class="settings-list-item">
                        <label class="settings-list-item-label" for="view-mode-toggle">Vista Timeline</label>
                        <label class="ios-toggle">
                            <input type="checkbox" id="view-mode-toggle">
                            <span class="ios-toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <!-- Google Drive -->
                <p class="settings-list-group-footer">Google Drive Backup</p>
                <div class="settings-list-group">
                    <div class="settings-list-item">
                        <span class="material-icons-outlined" style="margin-right: 10px; color: #fff;">cloud</span>
                        <span id="gdrive-status" style="flex-grow: 1; color: #ccc; font-size: 14px;">No conectado</span>
                    </div>
                </div>
                <div class="settings-gdrive-buttons">
                    <button id="gdrive-login-btn">
                        <span class="material-icons-outlined">login</span>
                        Conectar Drive
                    </button>
                    <button id="gdrive-backup-btn" style="display: none;">
                        <span class="material-icons-outlined">backup</span>
                        Hacer Backup
                    </button>
                    <button id="gdrive-restore-btn" style="display: none;">
                        <span class="material-icons-outlined">restore</span>
                        Restaurar
                    </button>
                    <button id="gdrive-logout-btn" style="display: none;">
                        <span class="material-icons-outlined">logout</span>
                        Desconectar
                    </button>
                </div>
                <p class="settings-list-group-footer">Guarda y restaura tus memorias en Google Drive</p>
                
                <!-- Importar/Exportar CSV -->
                <p class="settings-list-group-footer">Datos Locales</p>
                <div class="settings-list-group">
                    <div class="settings-list-item settings-list-item-button" id="export-data-btn">
                        <span class="material-icons-outlined">download</span>
                        <label class="settings-list-item-label">Exportar CSV</label>
                        <div class="list-view-chevron"></div>
                    </div>
                    <div class="settings-list-item settings-list-item-button" id="import-data-btn">
                        <span class="material-icons-outlined">upload</span>
                        <label class="settings-list-item-label">Importar CSV</label>
                        <div class="list-view-chevron"></div>
                    </div>
                </div>
                <p class="settings-list-group-footer">Exporta o importa memorias en formato CSV</p>
            </div>
            
            <div class="modal-main-buttons">
                <button id="close-settings-btn">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(_settingsModal);

    // Binds de eventos
    document.getElementById('close-settings-btn')?.addEventListener('click', _closeSettingsModal);
    _settingsModal.addEventListener('click', (e) => {
        if (e.target === _settingsModal) {
            _closeSettingsModal();
        }
    });
    
    document.getElementById('view-mode-toggle')?.addEventListener('change', _handleToggleChange);
    document.getElementById('export-data-btn')?.addEventListener('click', _handleExportClick);
    document.getElementById('import-data-btn')?.addEventListener('click', _handleImportClick);
    
    // Google Drive
    document.getElementById('gdrive-login-btn')?.addEventListener('click', _handleGDriveLogin);
    document.getElementById('gdrive-backup-btn')?.addEventListener('click', _handleGDriveBackup);
    document.getElementById('gdrive-restore-btn')?.addEventListener('click', _handleGDriveRestore);
    document.getElementById('gdrive-logout-btn')?.addEventListener('click', _handleGDriveLogout);
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

/**
 * Maneja el login de Google Drive
 */
async function _handleGDriveLogin() {
    if (_callbacks.onGDriveLogin) {
        await _callbacks.onGDriveLogin();
        _updateGDriveStatus();
    }
}

/**
 * Maneja el backup a Google Drive
 */
async function _handleGDriveBackup() {
    if (_callbacks.onGDriveBackup) {
        await _callbacks.onGDriveBackup();
    }
}

/**
 * Maneja el restore desde Google Drive
 */
async function _handleGDriveRestore() {
    if (_callbacks.onGDriveRestore) {
        await _callbacks.onGDriveRestore();
    }
}

/**
 * Maneja el logout de Google Drive
 */
async function _handleGDriveLogout() {
    if (_callbacks.onGDriveLogout) {
        await _callbacks.onGDriveLogout();
        _updateGDriveStatus();
    }
}
