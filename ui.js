/*
 * ui.js (v4.31 - Crea modales bajo demanda + Export cierres)
 * Módulo de interfaz de usuario.
 */

// --- Variables privadas del módulo ---
let callbacks = {};
let _currentDay = null;
let _currentMemories = [];
let _allDaysData = [];
let _isEditingMemory = false;
let alertPromptModal = null; // Solo referencia, se crea al usar
let _promptResolve = null;
let confirmModal = null; // Solo referencia, se crea al usar
let _confirmResolve = null;
let previewModal = null; // Se crea en init
let editModal = null; // Se crea en init
let storeModal = null; // Solo referencia, se crea al usar
let storeListModal = null; // Solo referencia, se crea al usar
let _activeMaps = [];

// --- Funciones de Inicialización ---
export function init(mainCallbacks, allDays) {
    console.log("UI Module init (v4.31 - Modales bajo demanda)"); // Cambiado
    if (typeof mainCallbacks !== 'object' || mainCallbacks === null) {
        console.error("UI CRITICAL ERROR: mainCallbacks received in init is not an object:", mainCallbacks);
        callbacks = {};
    } else {
        console.log("UI Init: Received mainCallbacks:", mainCallbacks);
        callbacks = mainCallbacks;
    }
    _allDaysData = allDays || [];

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents();
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents();

    // ***** CAMBIO: Solo crear modales principales aquí *****
    createPreviewModal();
    createEditModal();
    // Los otros (Alert, Confirm, Store, StoreList) se crearán la primera vez que se abran
    // *******************************************************

    console.log("UI Init: 'callbacks' object after binding:", callbacks);
    // ... (verificaciones de callbacks sin cambios) ...
}

// --- Binding (sin cambios) ---
function _bindHeaderEvents() { /* ... */ }
function _bindNavEvents() { /* ... */ }
function _bindFooterEvents() { /* ... */ }
function _bindCrumbieEvents() { /* ... */ }
function _bindLoginEvents() { /* ... */ }
function _bindGlobalListeners() { /* ... */ }

// --- Funciones de Renderizado Principal (sin cambios) ---
export function setLoading(message, show) { /* ... */ }
export function updateLoginUI(user) { /* ... */ }
export function drawCalendar(monthName, days, todayId) { /* ... */ }
export function updateSpotlight(dateString, dayName, memories) { /* ... */ }

// --- Modales (Funciones públicas) ---
export function openPreviewModal(dia, memories) { /* ... (sin cambios, ya usa createPreviewModal si es null) */ }
export function closePreviewModal() { /* ... (sin cambios) */ }
export function showPreviewLoading(isLoading) { /* ... (sin cambios) */ }
export function openEditModal(dia, memories) { /* ... (sin cambios, ya usa createEditModal si es null) */ }
export function closeEditModal() { /* ... (sin cambios) */ }
export function showEditLoading(isLoading) { /* ... (sin cambios) */ }

// ***** CAMBIO: Crear modal si no existe *****
export function openStoreModal() {
    if (!storeModal) createStoreModal(); // Crear al abrir por primera vez
    storeModal.style.display = 'flex';
    setTimeout(() => storeModal.classList.add('visible'), 10);
}
// ******************************************
export function closeStoreModal() { /* ... (sin cambios) */ }

// ***** CAMBIO: Crear modal si no existe *****
export function openStoreListModal(title) {
    if(!storeListModal) createStoreListModal(); // Crear al abrir por primera vez
    const titleEl = document.getElementById('store-list-title');
    const contentEl = document.getElementById('store-list-content');
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = '<p class="list-placeholder">Cargando...</p>';
    storeListModal.style.display = 'flex';
    setTimeout(() => storeListModal.classList.add('visible'), 10);
}
// ******************************************
export function closeStoreListModal() { /* ... (sin cambios) */ }

// ***** CAMBIO: Crear modal si no existe *****
export function showAlert(message, type = 'default') {
    if(!alertPromptModal) createAlertPromptModal(); // Crear al usar por primera vez
    const contentEl = alertPromptModal.querySelector('.modal-alert-content');
    if (!contentEl) { console.error("UI Error: alert modal content not found"); return; }
    contentEl.classList.remove('settings-alert', 'search-alert');
    if (type === 'settings') contentEl.classList.add('settings-alert');
    // ... (resto sin cambios) ...
    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
}
// ******************************************

// ***** CAMBIO: Crear modal si no existe *****
export function showPrompt(message, defaultValue = '', type = 'default') {
    if(!alertPromptModal) createAlertPromptModal(); // Crear al usar por primera vez
     const contentEl = alertPromptModal.querySelector('.modal-alert-content');
    if (!contentEl) { console.error("UI Error: prompt modal content not found"); return Promise.resolve(null); }
    contentEl.classList.remove('settings-alert', 'search-alert');
    if (type === 'search') contentEl.classList.add('search-alert');
    // ... (resto sin cambios) ...
    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
    return new Promise((resolve) => { _promptResolve = resolve; });
}
// ******************************************

// ***** CAMBIO: Crear modal si no existe *****
export function showConfirm(message) {
     if(!confirmModal) createConfirmModal(); // Crear al usar por primera vez
     const msgEl = document.getElementById('confirm-message');
     if (msgEl) msgEl.textContent = message;
     else { console.error("UI Error: confirm message element not found"); return Promise.resolve(false); }
    confirmModal.style.display = 'flex';
    setTimeout(() => confirmModal.classList.add('visible'), 10);
    return new Promise((resolve) => { _confirmResolve = resolve; });
}
// ******************************************

// --- Formularios y Listas (Funciones públicas - sin cambios) ---
export function updateStoreList(items, append = false, hasMore = false) { /* ... */ }
export function updateMemoryList(memories) { /* ... */ }
export function resetMemoryForm() { /* ... */ }
export function fillFormForEdit(mem) { /* ... */ }
export function showMusicResults(tracks, isSelected = false) { /* ... */ }
export function showPlaceResults(places, isSelected = false) { /* ... */ }
export function showModalStatus(elementId, message, isError) { /* ... */ }
export function handleMemoryTypeChange() { /* ... */ }

// --- Crumbie (Funciones públicas - sin cambios) ---
export function showCrumbieAnimation(message) { /* ... */ }

// --- Funciones privadas (no exportadas) ---
function createPreviewModal() {
    if (previewModal) return;
    previewModal = document.createElement('div');
    previewModal.id = 'preview-modal';
    previewModal.className = 'modal-preview';
    previewModal.innerHTML = `
        <div class="modal-preview-content">
            <div class="modal-preview-header"> <h3 id="preview-title"></h3> </div>
            <div class="modal-preview-notebook-paper">
                <div class="modal-preview-memorias">
                    <h4 style="display: none;">Memorias:</h4>
                    <div id="preview-memorias-list"> <p class="list-placeholder preview-loading" style="display: none;">Cargando...</p> </div>
                </div>
            </div>
            <div class="modal-preview-footer">
                <button id="close-preview-btn" class="aqua-button">Cerrar</button>
                <button id="edit-from-preview-btn" class="aqua-button">Editar este día</button>
            </div>
        </div>`;
    document.body.appendChild(previewModal);
    document.getElementById('close-preview-btn')?.addEventListener('click', closePreviewModal);
    document.getElementById('edit-from-preview-btn')?.addEventListener('click', () => { if (callbacks && callbacks.onEditFromPreview) callbacks.onEditFromPreview(); });
    console.log("UI: createPreviewModal finished.");
}
function createEditModal() {
    if (editModal) return;
    editModal = document.createElement('div');
    editModal.id = 'edit-add-modal';
    editModal.className = 'modal-edit';
    editModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header"> <h3 id="edit-modal-title-dynamic">Añadir/Editar</h3> </div>
            <div class="modal-content-scrollable">
                <p class="list-placeholder edit-loading" style="display: none; padding: 20px;">Cargando...</p>
                <div class="edit-content-wrapper">
                    <div class="modal-section" id="day-selection-section" style="display: none;">
                        <h3>Añadir Memoria a...</h3>
                        <label for="edit-mem-day">Día (MM-DD):</label>
                        <div class="day-selection-controls"> <select id="edit-mem-day"></select> <button type="button" id="btn-name-selected-day" class="aqua-button small">Nombrar</button> </div>
                        <p id="add-name-status" class="status-message"></p>
                    </div>
                    <div class="modal-section" id="day-name-section" style="display: none;">
                        <h3 id="edit-modal-title"></h3>
                        <label for="nombre-especial-input">Nombrar este día:</label>
                        <input type="text" id="nombre-especial-input" placeholder="Ej. Día de la Pizza" maxlength="25">
                        <button id="save-name-btn" class="aqua-button">Guardar Nombre</button>
                        <p id="save-status" class="status-message"></p>
                    </div>
                    <div class="modal-section memorias-section">
                        <h4>Memorias</h4>
                        <div id="edit-memorias-list-container"> <div id="edit-memorias-list"></div> <button type="button" id="btn-show-add-form" class="aqua-button">Añadir Nueva Memoria</button> </div>
                        <form id="memory-form" style="display: none;">
                             <p class="section-description" id="memory-form-title">Añadir/Editar Memoria</p>
                            <label for="memoria-year">Año Original:</label> <input type="number" id="memoria-year" placeholder="Año" min="1900" max="2100" required>
                            <label for="memoria-type">Tipo:</label> <select id="memoria-type"> <option value="Texto">Nota</option> <option value="Lugar">Lugar</option> <option value="Musica">Canción</option> <option value="Imagen">Foto</option> </select>
                            <div class="add-memory-input-group" id="input-type-Texto"> <label for="memoria-desc">Descripción:</label> <textarea id="memoria-desc" placeholder="Escribe tu recuerdo..."></textarea> </div>
                            <div class="add-memory-input-group" id="input-type-Lugar"> <label for="memoria-place-search">Buscar Lugar:</label> <input type="text" id="memoria-place-search" placeholder="Ej. Torre Eiffel"> <button type="button" class="aqua-button" id="btn-search-place">Buscar</button> <div id="place-results" class="search-results"></div> </div>
                            <div class="add-memory-input-group" id="input-type-Musica"> <label for="memoria-music-search">Buscar Canción:</label> <input type="text" id="memoria-music-search" placeholder="Ej. Bohemian Rhapsody"> <button type="button" class="aqua-button" id="btn-search-itunes">Buscar</button> <div id="itunes-results" class="search-results"></div> </div>
                            <div class="add-memory-input-group" id="input-type-Imagen"> <label for="memoria-image-upload">Subir Foto:</label> <input type="file" id="memoria-image-upload" accept="image/*"> <label for="memoria-image-desc">Descripción (opcional):</label> <input type="text" id="memoria-image-desc" placeholder="Añade un pie de foto..."> <div id="image-upload-status" class="status-message"></div> </div>
                            <button type="submit" id="save-memoria-btn" class="aqua-button">Añadir Memoria</button> <button type="button" id="btn-cancel-mem-edit" class="aqua-button small">Cancelar</button>
                            <p id="memoria-status" class="status-message"></p>
                        </form>
                    </div>
                </div>
            </div>
            <div class="modal-main-buttons"> <button id="close-edit-add-btn" class="aqua-button">Cerrar</button> </div>
        </div>`;
    document.body.appendChild(editModal);
    _bindEditModalEvents();
    console.log("UI: createEditModal finished.");
}
function createStoreModal() {
    if (storeModal) return;
    storeModal = document.createElement('div');
    storeModal.id = 'store-modal';
    storeModal.className = 'modal-store';
    const categories = [ { type: 'Nombres', icon: 'label', label: 'Nombres de Día' }, { type: 'Lugar', icon: 'place', label: 'Lugares' }, { type: 'Musica', icon: 'music_note', label: 'Canciones' }, { type: 'Imagen', icon: 'image', label: 'Fotos' }, { type: 'Texto', icon: 'article', label: 'Notas' } ];
    let buttonsHTML = categories.map(cat => createStoreCategoryButton(cat.type, cat.icon, cat.label)).join('');
    storeModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header"> <h3>Almacén de Memorias</h3> </div>
            <div class="modal-content-scrollable store-category-list"> ${buttonsHTML} </div>
            <div class="modal-main-buttons"> <button id="close-store-btn" class="aqua-button">Cerrar</button> </div>
        </div>`;
    document.body.appendChild(storeModal);
    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);
    storeModal.querySelector('.store-category-list')?.addEventListener('click', (e) => { const btn = e.target.closest('.store-category-button'); if (btn && callbacks && callbacks.onStoreCategoryClick) callbacks.onStoreCategoryClick(btn.dataset.type); });
    console.log("UI: createStoreModal finished.");
}
function createStoreListModal() {
    if (storeListModal) return;
    storeListModal = document.createElement('div');
    storeListModal.id = 'store-list-modal';
    storeListModal.className = 'modal-store-list';
    storeListModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header"> <h3 id="store-list-title">Resultados</h3> </div>
            <div class="modal-content-scrollable" id="store-list-content"> <p class="list-placeholder">Cargando...</p> </div>
            <div class="modal-main-buttons"> <button id="close-store-list-btn" class="aqua-button">Volver</button> </div>
        </div>`;
    document.body.appendChild(storeListModal);
    _bindStoreListModalEvents();
    console.log("UI: createStoreListModal finished.");
}
function createAlertPromptModal() {
    if (alertPromptModal) return;
    alertPromptModal = document.createElement('div');
    alertPromptModal.id = 'alert-prompt-modal';
    alertPromptModal.className = 'modal-alert-prompt';
    alertPromptModal.innerHTML = `
        <div class="modal-alert-content">
            <p id="alert-prompt-message"></p>
            <input type="text" id="alert-prompt-input" style="display: none;">
            <div class="modal-main-buttons">
                <button id="alert-prompt-cancel" style="display: none;">Cancelar</button>
                <button id="alert-prompt-ok">OK</button>
            </div>
        </div>`;
    document.body.appendChild(alertPromptModal);
    _bindAlertPromptEvents();
     console.log("UI: createAlertPromptModal finished.");
}
function createConfirmModal() {
     if (confirmModal) return;
     confirmModal = document.createElement('div');
     confirmModal.id = 'confirm-modal';
     confirmModal.className = 'modal-confirm';
     confirmModal.innerHTML = `
        <div class="modal-alert-content">
            <p id="confirm-message"></p>
            <div class="modal-main-buttons">
                <button id="confirm-cancel">Cancelar</button>
                <button id="confirm-ok" class="delete-confirm">Borrar</button>
            </div>
        </div>`;
     document.body.appendChild(confirmModal);
     _bindConfirmModalEvents();
     console.log("UI: createConfirmModal finished.");
}
async function handleNameSelectedDay() { /* ... */ }
function _bindEditModalEvents() { /* ... */ }
function _bindStoreListModalEvents() { /* ... */ }
function _bindAlertPromptEvents() { /* ... */ }
function _bindConfirmModalEvents() { /* ... */ }
function _showMemoryForm(show) { /* ... */ }
function _renderMap(containerId, lat, lon, zoom = 13) { /* ... */ }
function _initMapsInContainer(containerEl, prefix) { /* ... */ }
function _destroyActiveMaps() { /* ... */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { /* ... */ }
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { /* ... (con logs detallados) */ }
function createStoreCategoryButton(type, icon, label) { /* ... */ }
function createStoreListItem(item) { /* ... */ }
function _createLoginButton(isLoggedOut, container) { /* ... */ }
function _handleFormSubmit(e) { /* ... */ }

// ***** EXPORTACIONES para funciones de cierre *****
export function closeAlertPromptModal(isOk) {
    if (!alertPromptModal) return;
    alertPromptModal.classList.remove('visible');
    setTimeout(() => {
        alertPromptModal.style.display = 'none';
        alertPromptModal.querySelector('.modal-alert-content')?.classList.remove('settings-alert', 'search-alert');
    }, 200);
    if (_promptResolve) {
        if (isOk) {
            const input = document.getElementById('alert-prompt-input');
            _promptResolve(input?.value);
        } else {
            _promptResolve(null);
        }
        _promptResolve = null;
    }
}
export function closeConfirmModal(isConfirmed) {
    if (!confirmModal) return;
    confirmModal.classList.remove('visible');
    setTimeout(() => {
        confirmModal.style.display = 'none';
    }, 200);
    if (_confirmResolve) {
        _confirmResolve(isConfirmed);
        _confirmResolve = null;
    }
}
// ********************************************

// (No hay export const ui al final)
