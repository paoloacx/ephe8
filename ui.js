/*
 * ui.js (v4.26 - Exportaciones individuales)
 * Módulo de interfaz de usuario.
 */

// --- Variables privadas del módulo ---
let callbacks = {};
let _currentDay = null;
let _currentMemories = [];
let _allDaysData = [];
let _isEditingMemory = false;
let alertPromptModal = null;
let _promptResolve = null;
let confirmModal = null;
let _confirmResolve = null;
let previewModal = null;
let editModal = null;
let storeModal = null;
let storeListModal = null;
let _activeMaps = [];

// --- Funciones de Inicialización ---

// ***** CAMBIO: Añadido export *****
export function init(mainCallbacks, allDays) {
    console.log("UI Module init (v4.26 - Exportaciones individuales)");
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

    createPreviewModal();
    createEditModal();
    createAlertPromptModal();
    createConfirmModal();

    console.log("UI Init: 'callbacks' object after binding:", callbacks);
    if (!(callbacks && typeof callbacks.onFooterAction === 'function')) {
        console.error("UI Init ERROR: callbacks.onFooterAction is NOT a function or callbacks is missing!");
    }
    if (!(callbacks && typeof callbacks.onCrumbieClick === 'function')) {
         console.error("UI Init ERROR: callbacks.onCrumbieClick is NOT a function or callbacks is missing!");
    }
}

// --- Binding (no necesitan exportarse) ---
function _bindHeaderEvents() { /* ... */ }
function _bindNavEvents() { /* ... */ }
function _bindFooterEvents() { /* ... */ }
function _bindCrumbieEvents() { /* ... */ }
function _bindLoginEvents() { /* ... */ }
function _bindGlobalListeners() { /* ... */ }

// --- Funciones de Renderizado Principal ---

// ***** CAMBIO: Añadido export *****
export function setLoading(message, show) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    if (show) {
        appContent.innerHTML = `<p class="loading-message">${message}</p>`;
    } else {
        // Remove only if it exists
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
    }
}

// ***** CAMBIO: Añadido export *****
export function updateLoginUI(user) { /* ... (sin cambios internos) */ }

// ***** CAMBIO: Añadido export *****
export function drawCalendar(monthName, days, todayId) { /* ... (sin cambios internos, try/catch ya está) */ }

// ***** CAMBIO: Añadido export *****
export function updateSpotlight(dateString, dayName, memories) { /* ... (sin cambios internos, try/catch ya está) */ }


// --- Modales (Funciones públicas) ---

// ***** CAMBIO: Añadido export *****
export function openPreviewModal(dia, memories) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function closePreviewModal() { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function showPreviewLoading(isLoading) { /* ... (sin cambios internos) */ }

// ***** CAMBIO: Añadido export *****
export function openEditModal(dia, memories) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function closeEditModal() { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function showEditLoading(isLoading) { /* ... (sin cambios internos) */ }

// ***** CAMBIO: Añadido export *****
export function openStoreModal() { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function closeStoreModal() { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function openStoreListModal(title) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function closeStoreListModal() { /* ... (sin cambios internos) */ }

// ***** CAMBIO: Añadido export *****
export function showAlert(message, type = 'default') { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function showPrompt(message, defaultValue = '', type = 'default') { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function showConfirm(message) { /* ... (sin cambios internos) */ }


// --- Formularios y Listas (Funciones públicas) ---

// ***** CAMBIO: Añadido export *****
export function updateStoreList(items, append = false, hasMore = false) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function updateMemoryList(memories) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function resetMemoryForm() { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function fillFormForEdit(mem) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function showMusicResults(tracks, isSelected = false) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function showPlaceResults(places, isSelected = false) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function showModalStatus(elementId, message, isError) { /* ... (sin cambios internos) */ }
// ***** CAMBIO: Añadido export *****
export function handleMemoryTypeChange() { /* ... (sin cambios internos) */ } // Aunque se llama internamente, puede ser útil exportarla si se necesita

// --- Crumbie (Funciones públicas) ---

// ***** CAMBIO: Añadido export *****
export function showCrumbieAnimation(message) { /* ... (sin cambios internos) */ }


// --- Funciones privadas (no exportadas) ---
// (Estas funciones no necesitan `export`)
function createPreviewModal() { /* ... */ }
function createEditModal() { /* ... */ }
function createStoreModal() { /* ... */ }
function createStoreListModal() { /* ... */ }
function createAlertPromptModal() { /* ... */ }
function createConfirmModal() { /* ... */ }
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
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { /* ... */ }
function createStoreCategoryButton(type, icon, label) { /* ... */ }
function createStoreListItem(item) { /* ... */ }
function _createLoginButton(isLoggedOut, container) { /* ... */ }
function _handleFormSubmit(e) { /* ... */ }

// ***** CAMBIO: Eliminada la exportación del objeto ui *****
// export const ui = { ... }; // <-- BORRADO
