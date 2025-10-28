/*
 * ui.js (v4.23 - Debugging botones delete y footer)
 * Módulo de interfaz de usuario.
 */

// --- Variables privadas del módulo (Estado de la UI) ---
let callbacks = {}; // Almacena las funciones de main.js
let _currentDay = null; // El día abierto en el modal de edición O preview
let _currentMemories = []; // Las memorias del día abierto
let _allDaysData = []; // Referencia a todos los días (ahora se llena en init)
let _isEditingMemory = false; // Estado del formulario (Añadir vs Editar)

// Variables para modales de diálogo
let alertPromptModal = null;
let _promptResolve = null;
let confirmModal = null;
let _confirmResolve = null;

// Referencias a los modales principales
let previewModal = null;
let editModal = null;
let storeModal = null;
let storeListModal = null;

// INICIO v17.6: Array para gestionar mapas Leaflet
let _activeMaps = [];
// FIN v17.6

// --- Funciones de Inicialización ---

function init(mainCallbacks, allDays) { // ***** CAMBIO: Recibe allDays *****
    console.log("UI Module init (v4.23 - Debugging botones)"); // Cambiado
    callbacks = mainCallbacks;
    _allDaysData = allDays || []; // ***** CAMBIO: Almacena allDays *****

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents(); // Asegura que settings se conecta
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents(); // <-- Conectar Crumbie

    // Pre-crear modales principales
    createPreviewModal();
    createEditModal();
    createAlertPromptModal();
    createConfirmModal();
}

function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        console.log("Header Search button clicked"); // DEBUG
        if (callbacks.onFooterAction) callbacks.onFooterAction('search');
    });
}

function _bindNavEvents() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.onclick = () => {
            console.log("Prev Month button clicked"); // DEBUG
            if (callbacks.onMonthChange) callbacks.onMonthChange('prev');
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            console.log("Next Month button clicked"); // DEBUG
            if (callbacks.onMonthChange) callbacks.onMonthChange('next');
        };
    }
}

function _bindFooterEvents() {
    // ***** DEBUG: Añadidos console.log a todos *****
    document.getElementById('btn-add-memory')?.addEventListener('click', () => {
        console.log("Footer Add Memory button clicked");
        if (callbacks.onFooterAction) callbacks.onFooterAction('add');
    });
    document.getElementById('btn-store')?.addEventListener('click', () => {
        console.log("Footer Store button clicked");
        if (callbacks.onFooterAction) callbacks.onFooterAction('store');
    });
    document.getElementById('btn-shuffle')?.addEventListener('click', () => {
        console.log("Footer Shuffle button clicked");
        if (callbacks.onFooterAction) callbacks.onFooterAction('shuffle');
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        console.log("Footer Settings button clicked");
        if (callbacks.onFooterAction) callbacks.onFooterAction('settings');
    });
    // ***********************************************
}

function _bindCrumbieEvents() {
    document.getElementById('crumbie-btn')?.addEventListener('click', () => {
        console.log("Crumbie button clicked"); // DEBUG
        if (callbacks.onCrumbieClick) {
            callbacks.onCrumbieClick();
        }
    });
}

function _bindLoginEvents() {
    const header = document.querySelector('header');
    header?.addEventListener('click', (e) => {
        const loginBtn = e.target.closest('#login-btn');
        const userInfo = e.target.closest('#user-info');

        if (loginBtn) {
            const action = loginBtn.dataset.action;
            if (action === 'login' && callbacks.onLogin) {
                console.log("Login button clicked"); // DEBUG
                callbacks.onLogin();
            }
        } else if (userInfo && callbacks.onLogout) {
            console.log("User Info (Logout) clicked"); // DEBUG
            callbacks.onLogout();
        }
    });
}

function _bindGlobalListeners() {
    document.body.addEventListener('click', (e) => {
        // Cierre de modales al hacer clic fuera
        if (e.target.classList.contains('modal-preview')) closePreviewModal();
        if (e.target.classList.contains('modal-edit')) closeEditModal();
        if (e.target.classList.contains('modal-store')) closeStoreModal();
        if (e.target.classList.contains('modal-store-list')) closeStoreListModal();
        if (e.target.classList.contains('modal-alert-prompt')) closeAlertPromptModal(false);
        if (e.target.classList.contains('modal-confirm')) closeConfirmModal(false);
    });
}

// --- Funciones de Renderizado Principal ---
function setLoading(message, show) { /* ... (sin cambios) */ }
function updateLoginUI(user) { /* ... (sin cambios) */ }
function drawCalendar(monthName, days, todayId) { /* ... (sin cambios) */ }
function updateSpotlight(dateString, dayName, memories) { /* ... (sin cambios) */ }

// --- Modal: Vista Previa (Preview) ---
function createPreviewModal() { /* ... (sin cambios) */ }
function showPreviewLoading(isLoading) { /* ... (sin cambios) */ }
function openPreviewModal(dia, memories) { /* ... (sin cambios) */ }
function closePreviewModal() { /* ... (sin cambios) */ }

// --- Modal: Edición (Edit/Add) ---
function createEditModal() { /* ... (sin cambios) */ }
function showEditLoading(isLoading) { /* ... (sin cambios) */ }
async function handleNameSelectedDay() { /* ... (sin cambios) */ }

function _bindEditModalEvents() {
    document.getElementById('close-edit-add-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
        if (callbacks.onSaveDayName && _currentDay) {
            const input = document.getElementById('nombre-especial-input');
            callbacks.onSaveDayName(_currentDay.id, input.value.trim(), 'save-status');
        }
    });

    document.getElementById('btn-name-selected-day')?.addEventListener('click', handleNameSelectedDay);

    document.getElementById('btn-show-add-form')?.addEventListener('click', () => {
        resetMemoryForm();
        _showMemoryForm(true);
    });

    document.getElementById('btn-cancel-mem-edit')?.addEventListener('click', () => {
        _showMemoryForm(false);
    });

    document.getElementById('memory-form')?.addEventListener('submit', _handleFormSubmit);
    document.getElementById('memoria-type')?.addEventListener('change', handleMemoryTypeChange);

    document.getElementById('btn-search-itunes')?.addEventListener('click', () => {
        console.log("Search Music button clicked in modal"); // DEBUG
        if (callbacks.onSearchMusic) {
            const term = document.getElementById('memoria-music-search').value;
            if (term) callbacks.onSearchMusic(term);
        }
    });
    document.getElementById('btn-search-place')?.addEventListener('click', () => {
        console.log("Search Place button clicked in modal"); // DEBUG
        if (callbacks.onSearchPlace) {
            const term = document.getElementById('memoria-place-search').value;
            if (term) callbacks.onSearchPlace(term);
        }
    });

    const listEl = document.getElementById('edit-memorias-list');
    listEl?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const memoriaId = editBtn.dataset.memoriaId;
            console.log("Edit button clicked for memory:", memoriaId); // DEBUG
            if (!memoriaId) {
                console.error("ID de memoria inválido en el botón de editar.");
                return;
            }
            if (_currentMemories && _currentMemories.length > 0) {
                const memToEdit = _currentMemories.find(m => m.id === memoriaId);
                if (memToEdit) {
                    fillFormForEdit(memToEdit);
                } else {
                    console.error("No se encontró la memoria en _currentMemories:", memoriaId);
                    showModalStatus('memoria-status', 'Error: Memoria no encontrada.', true);
                }
            }
        }

        if (deleteBtn) {
            const memoriaId = deleteBtn.dataset.memoriaId;
            // ***** DEBUG: Añadido console.log *****
            console.log("Delete button clicked for memory:", memoriaId);
            console.log("Current Day (_currentDay) in Edit Modal:", _currentDay);
            // ************************************
            if (!memoriaId) {
                console.error("ID de memoria inválido en el botón de borrar.");
                return;
            }
            const mem = _currentMemories.find(m => m.id === memoriaId);

            if (!mem) {
                console.error("No se encontró la memoria para borrar:", memoriaId);
                return;
            }

            if (!callbacks.onDeleteMemory) {
                 console.error("Callback onDeleteMemory no está definido.");
                 return;
            }

            // Determinar el día ID
            let diaIdToDeleteFrom = null;
            if (_currentDay) { // Modo Editar Día
                diaIdToDeleteFrom = _currentDay.id;
            } else { // Modo Añadir Memoria (día seleccionado en el <select>)
                const daySelect = document.getElementById('edit-mem-day');
                diaIdToDeleteFrom = daySelect?.value;
            }

            if (diaIdToDeleteFrom) {
                 console.log(`Calling onDeleteMemory for diaId: ${diaIdToDeleteFrom}, memId: ${mem.id}`); // DEBUG
                 callbacks.onDeleteMemory(diaIdToDeleteFrom, mem);
            } else {
                 console.error("No se pudo determinar el ID del día para borrar la memoria.");
                 showModalStatus('memoria-status', 'Error: No se pudo determinar el día.', true);
            }
        }
    });
}

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
export const ui = {
    init,
    setLoading,
    updateLoginUI,
    drawCalendar,
    updateSpotlight,

    // Modales
    openPreviewModal,
    closePreviewModal,
    showPreviewLoading,
    openEditModal,
    closeEditModal,
    showEditLoading,
    openStoreModal,
    closeStoreModal,
    openStoreListModal,
    closeStoreListModal,
    showAlert,
    showPrompt,
    showConfirm,

    // Formularios y Listas
    updateStoreList,
    updateMemoryList,
    resetMemoryForm,
    fillFormForEdit,
    showMusicResults,
    showPlaceResults,
    showModalStatus,
    handleMemoryTypeChange,

    // Crumbie
    showCrumbieAnimation
};
