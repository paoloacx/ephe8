/*
 * ui.js (v4.25 - Logging callbacks inside listeners)
 * Módulo de interfaz de usuario.
 */

// --- Variables privadas del módulo (Estado de la UI) ---
let callbacks = {}; // Almacena las funciones de main.js
let _currentDay = null;
let _currentMemories = [];
let _allDaysData = [];
let _isEditingMemory = false;

// Variables para modales
let alertPromptModal = null;
let _promptResolve = null;
let confirmModal = null;
let _confirmResolve = null;

// Referencias a modales
let previewModal = null;
let editModal = null;
let storeModal = null;
let storeListModal = null;

// Mapas Leaflet
let _activeMaps = [];

// --- Funciones de Inicialización ---

function init(mainCallbacks, allDays) {
    console.log("UI Module init (v4.25 - Logging listeners)"); // Cambiado
    if (typeof mainCallbacks !== 'object' || mainCallbacks === null) {
        console.error("UI CRITICAL ERROR: mainCallbacks received in init is not an object:", mainCallbacks);
        callbacks = {};
    } else {
        // ***** DEBUG: Log callbacks object *before* assigning *****
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

    // Pre-crear modales
    createPreviewModal();
    createEditModal();
    createAlertPromptModal();
    createConfirmModal();

    // ***** DEBUG: Log callbacks object *after* all binding *****
    console.log("UI Init: 'callbacks' object after binding:", callbacks);
    // Verificar si las funciones esperadas existen
    if (callbacks && typeof callbacks.onFooterAction === 'function') {
        console.log("UI Init: callbacks.onFooterAction is a function.");
    } else {
        console.error("UI Init ERROR: callbacks.onFooterAction is NOT a function or callbacks is missing!");
    }
    if (callbacks && typeof callbacks.onCrumbieClick === 'function') {
        console.log("UI Init: callbacks.onCrumbieClick is a function.");
    } else {
        console.error("UI Init ERROR: callbacks.onCrumbieClick is NOT a function or callbacks is missing!");
    }
    // ********************************************************
}

function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        console.log("Header Search button clicked. Checking callbacks..."); // DEBUG
        console.log("Value of 'callbacks' inside listener:", callbacks); // DEBUG
        if (callbacks && callbacks.onFooterAction) {
            callbacks.onFooterAction('search');
        } else {
            console.error("UI: callbacks object or onFooterAction is missing in header search!");
        }
    });
}

function _bindNavEvents() {
    // ... (no changes needed here, assuming nav works)
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) {
        prevBtn.onclick = () => { if (callbacks && callbacks.onMonthChange) callbacks.onMonthChange('prev'); };
    }
    if (nextBtn) {
        nextBtn.onclick = () => { if (callbacks && callbacks.onMonthChange) callbacks.onMonthChange('next'); };
    }
}


function _bindFooterEvents() {
    document.getElementById('btn-add-memory')?.addEventListener('click', () => {
        console.log("Footer Add Memory button clicked. Checking callbacks..."); // DEBUG
        console.log("Value of 'callbacks' inside listener:", callbacks); // DEBUG
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('add');
        else console.error("UI: callbacks object or onFooterAction is missing in footer add!");
    });
    document.getElementById('btn-store')?.addEventListener('click', () => {
        console.log("Footer Store button clicked. Checking callbacks..."); // DEBUG
        console.log("Value of 'callbacks' inside listener:", callbacks); // DEBUG
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('store');
        else console.error("UI: callbacks object or onFooterAction is missing in footer store!");
    });
    document.getElementById('btn-shuffle')?.addEventListener('click', () => {
        console.log("Footer Shuffle button clicked. Checking callbacks..."); // DEBUG
        console.log("Value of 'callbacks' inside listener:", callbacks); // DEBUG
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('shuffle');
        else console.error("UI: callbacks object or onFooterAction is missing in footer shuffle!");
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        console.log("Footer Settings button clicked. Checking callbacks..."); // DEBUG
        console.log("Value of 'callbacks' inside listener:", callbacks); // DEBUG
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('settings');
        else console.error("UI: callbacks object or onFooterAction is missing in footer settings!");
    });
}

function _bindCrumbieEvents() {
    document.getElementById('crumbie-btn')?.addEventListener('click', () => {
        console.log("Crumbie button clicked. Checking callbacks..."); // DEBUG
        console.log("Value of 'callbacks' inside listener:", callbacks); // DEBUG
        if (callbacks && callbacks.onCrumbieClick) {
            callbacks.onCrumbieClick();
        } else {
            console.error("UI: callbacks object or onCrumbieClick is missing!");
        }
    });
}

function _bindLoginEvents() { /* ... (sin cambios) */ }
function _bindGlobalListeners() { /* ... (sin cambios) */ }

// --- Funciones de Renderizado Principal ---
function setLoading(message, show) { /* ... (sin cambios) */ }
function updateLoginUI(user) { /* ... (sin cambios) */ }
function drawCalendar(monthName, days, todayId) { /* ... (sin cambios, try/catch ya añadido) */ }
function updateSpotlight(dateString, dayName, memories) { /* ... (sin cambios, try/catch ya añadido) */ }

// --- Modal: Vista Previa (Preview) ---
function createPreviewModal() { /* ... (sin cambios) */ }
function showPreviewLoading(isLoading) { /* ... (sin cambios) */ }
function openPreviewModal(dia, memories) { /* ... (sin cambios) */ }
function closePreviewModal() { /* ... (sin cambios) */ }

// --- Modal: Edición (Edit/Add) ---
function createEditModal() { /* ... (sin cambios) */ }
function showEditLoading(isLoading) { /* ... (sin cambios) */ }
async function handleNameSelectedDay() { /* ... (sin cambios) */ }
function _bindEditModalEvents() { /* ... (sin cambios, logs de delete ya están) */ }
function _showMemoryForm(show) { /* ... (sin cambios) */ }
function openEditModal(dia, memories) { /* ... (sin cambios) */ }
function closeEditModal() { /* ... (sin cambios) */ }

// --- Modales Almacén, Alerta, Confirmación ---
function createStoreModal() { /* ... (sin cambios) */ }
function openStoreModal() { /* ... (sin cambios) */ }
function closeStoreModal() { /* ... (sin cambios) */ }
function createStoreListModal() { /* ... (sin cambios) */ }
function _bindStoreListModalEvents() { /* ... (sin cambios) */ }
function openStoreListModal(title) { /* ... (sin cambios) */ }
function closeStoreListModal() { /* ... (sin cambios) */ }
function updateStoreList(items, append = false, hasMore = false) { /* ... (sin cambios) */ }
function createAlertPromptModal() { /* ... (sin cambios) */ }
function _bindAlertPromptEvents() { /* ... (sin cambios) */ }
function closeAlertPromptModal(isOk) { /* ... (sin cambios) */ }
function showAlert(message, type = 'default') { /* ... (sin cambios) */ }
function showPrompt(message, defaultValue = '', type = 'default') { /* ... (sin cambios) */ }
function createConfirmModal() { /* ... (sin cambios) */ }
function _bindConfirmModalEvents() { /* ... (sin cambios) */ }
function closeConfirmModal(isConfirmed) { /* ... (sin cambios) */ }
function showConfirm(message) { /* ... (sin cambios) */ }

// --- Funciones de Ayuda (Helpers) de UI ---
function _renderMap(containerId, lat, lon, zoom = 13) { /* ... (sin cambios) */ }
function _initMapsInContainer(containerEl, prefix) { /* ... (sin cambios) */ }
function _destroyActiveMaps() { /* ... (sin cambios) */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { /* ... (sin cambios) */ }
function updateMemoryList(memories) { /* ... (sin cambios) */ }
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { /* ... (sin cambios) */ }
function createStoreCategoryButton(type, icon, label) { /* ... (sin cambios) */ }
function createStoreListItem(item) { /* ... (sin cambios) */ }
function _createLoginButton(isLoggedOut, container) { /* ... (sin cambios) */ }

// --- Lógica del Formulario de Memorias ---
let _selectedMusic = null;
let _selectedPlace = null;
function _handleFormSubmit(e) { /* ... (sin cambios) */ }
function handleMemoryTypeChange() { /* ... (sin cambios) */ }
function fillFormForEdit(mem) { /* ... (sin cambios) */ }
function resetMemoryForm() { /* ... (sin cambios) */ }
function showMusicResults(tracks, isSelected = false) { /* ... (sin cambios) */ }
function showPlaceResults(places, isSelected = false) { /* ... (sin cambios) */ }
function showModalStatus(elementId, message, isError) { /* ... (sin cambios) */ }
function showCrumbieAnimation(message) { /* ... (sin cambios) */ }

// --- Exportaciones Públicas ---
export const ui = { /* ... (sin cambios) */ };
