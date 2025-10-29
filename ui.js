/*
 * ui.js (v2.68 - Fix createStoreModal timing issue)
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

function init(mainCallbacks) {
    console.log("UI Module init (v2.68 - Fix createStoreModal timing)"); // Versión
    callbacks = mainCallbacks;

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents();
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents();

    createPreviewModal();
    createEditModal();
    createStoreModal(); // Llama a la versión corregida
    createStoreListModal();
    createAlertPromptModal();
    createConfirmModal();
}

// --- Bindings ---
// ... (Sin cambios) ...
function _bindHeaderEvents() { /* ... */ }
function _bindNavEvents() { /* ... */ }
function _bindFooterEvents() { /* ... */ }
function _bindCrumbieEvents() { /* ... */ }
function _bindLoginEvents() { /* ... */ }
function _bindGlobalListeners() { /* ... */ }


// --- Funciones de Renderizado Principal ---
// ... (Sin cambios) ...
function setLoading(message, show) { /* ... */ }
function showApp(show) { /* ... */ }
function updateAllDaysData(allDays) { /* ... */ }
function updateLoginUI(user) { /* ... */ }
function drawCalendar(monthName, days, todayId) { /* ... */ }
function updateSpotlight(dateString, dayName, memories) { /* ... */ }


// --- Modal: Vista Previa (Preview) ---
// ... (Sin cambios) ...
function createPreviewModal() { /* ... */ }
function showPreviewLoading(isLoading) { /* ... */ }
function openPreviewModal(dia, memories) { /* ... */ }
function closePreviewModal() { /* ... */ }


// --- Modal: Edición (Edit/Add) ---
// ... (Sin cambios) ...
function createEditModal() { /* ... */ }
function showEditLoading(isLoading) { /* ... */ }
async function handleNameSelectedDay() { /* ... */ }
function _bindEditModalEvents() { /* ... */ }
function _showMemoryForm(show) { /* ... */ }
function openEditModal(dia, memories) { /* ... */ }
function closeEditModal() { /* ... */ }


// --- Modal: Almacén (Store) ---
function createStoreModal() {
    if (storeModal) return;
    storeModal = document.createElement('div');
    storeModal.id = 'store-modal';
    storeModal.className = 'modal-store';
    storeModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header"><h3 id="store-modal-title">Almacén</h3></div>
            <div class="modal-content-scrollable store-category-list striped-background-vertical-blue"></div>
            <div class="modal-main-buttons"><button id="close-store-btn" class="aqua-button">Cerrar</button></div>
        </div>`;
    document.body.appendChild(storeModal);

    // ***** CAMBIO: Retrasar la manipulación del contenido *****
    setTimeout(() => {
        const categoryList = storeModal.querySelector('.store-category-list');
        if (categoryList) {
            try { // Añadido try-catch para diagnóstico
                categoryList.appendChild(createStoreCategoryButton('Nombres', 'label', 'Días Nombrados'));
                categoryList.appendChild(createStoreCategoryButton('Texto', 'article', 'Notas'));
                categoryList.appendChild(createStoreCategoryButton('Lugar', 'place', 'Lugares'));
                categoryList.appendChild(createStoreCategoryButton('Musica', 'music_note', 'Canciones'));

                categoryList.addEventListener('click', (e) => {
                    const btn = e.target.closest('.store-category-button');
                    if (btn && callbacks.onStoreCategoryClick) {
                        callbacks.onStoreCategoryClick(btn.dataset.type);
                    }
                });
            } catch (error) {
                console.error("Error adding category buttons inside setTimeout:", error);
            }
        } else {
            console.error("Error inside setTimeout: '.store-category-list' not found after delay.");
        }
    }, 0); // Retraso mínimo

    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);
}
// ... (openStoreModal y closeStoreModal sin cambios) ...
function openStoreModal() { if (!storeModal) createStoreModal(); storeModal.style.display = 'flex'; setTimeout(() => storeModal.classList.add('visible'), 10); }
function closeStoreModal() { if (!storeModal) return; storeModal.classList.remove('visible'); setTimeout(() => { storeModal.style.display = 'none'; }, 200); }


// --- Modal: Lista del Almacén (Store List) ---
// ... (Sin cambios) ...
function createStoreListModal() { /* ... */ }
function _bindStoreListModalEvents() { /* ... */ }
function openStoreListModal(title) { /* ... */ }
function closeStoreListModal() { /* ... */ }
function updateStoreList(items, append = false, hasMore = false) { /* ... */ }

// --- Modales: Alerta, Prompt, Confirmación ---
// ... (Sin cambios) ...
function createAlertPromptModal() { /* ... */ }
function _bindAlertPromptEvents() { /* ... */ }
function closeAlertPromptModal(isOk) { /* ... */ }
function showAlert(message, type = 'default') { /* ... */ }
function showPrompt(message, defaultValue = '', type = 'default') { /* ... */ }
function createConfirmModal() { /* ... */ }
function _bindConfirmModalEvents() { /* ... */ }
function closeConfirmModal(isConfirmed) { /* ... */ }
function showConfirm(message) { /* ... */ }


// --- Funciones de Ayuda (Helpers) de UI ---
// ... (Sin cambios significativos, _renderMap, _initMapsInContainer, _destroyActiveMaps, _renderMemoryList, updateMemoryList, createMemoryItemHTML, createStoreCategoryButton, createStoreListItem, _createLoginButton) ...
function _renderMap(containerId, lat, lon, zoom = 13) { /* ... */ }
function _initMapsInContainer(containerEl, prefix) { /* ... */ }
function _destroyActiveMaps() { /* ... */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { /* ... */ }
function updateMemoryList(memories) { /* ... */ }
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { /* ... */ }
function createStoreCategoryButton(type, icon, label) { /* ... */ }
function createStoreListItem(item) { /* ... */ }
function _createLoginButton(isLoggedOut, container) { /* ... */ }


// --- Lógica del Formulario de Memorias ---
// ... (Sin cambios, _selectedMusic, _selectedPlace, _handleFormSubmit, handleMemoryTypeChange, fillFormForEdit, resetMemoryForm, showMusicResults, showPlaceResults, showModalStatus) ...
let _selectedMusic = null;
let _selectedPlace = null;
function _handleFormSubmit(e) { /* ... */ }
function handleMemoryTypeChange() { /* ... */ }
function fillFormForEdit(mem) { /* ... */ }
function resetMemoryForm() { /* ... */ }
function showMusicResults(tracks, isSelected = false) { /* ... */ }
function showPlaceResults(places, isSelected = false) { /* ... */ }
function showModalStatus(elementId, message, isError) { /* ... */ }

// --- Crumbie ---
function showCrumbieAnimation(message) { /* ... */ }


// --- Exportaciones Públicas ---
// Asegurarse de que setLoading está aquí
export const ui = {
    init,
    setLoading, // <--- Exportada
    showApp,
    updateAllDaysData,
    updateLoginUI,
    drawCalendar,
    updateSpotlight,
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
    updateStoreList,
    updateMemoryList,
    resetMemoryForm,
    fillFormForEdit,
    showMusicResults,
    showPlaceResults,
    showModalStatus,
    handleMemoryTypeChange,
    showCrumbieAnimation
};

console.log('ui.js loaded and ui object created:', ui);
