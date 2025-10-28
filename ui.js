/*
 * ui.js (v4.24 - Blindaje try/catch en renderizado)
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
    console.log("UI Module init (v4.24 - Blindaje render)"); // Cambiado
    // ***** CAMBIO: Asegurarse de que mainCallbacks es un objeto *****
    if (typeof mainCallbacks !== 'object' || mainCallbacks === null) {
        console.error("UI CRITICAL ERROR: mainCallbacks received in init is not an object:", mainCallbacks);
        callbacks = {}; // Establecer a objeto vacío para evitar errores posteriores
    } else {
        callbacks = mainCallbacks;
    }
    // ***************************************************************
    _allDaysData = allDays || [];

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents();
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents();

    // Pre-crear modales principales
    createPreviewModal();
    createEditModal();
    createAlertPromptModal();
    createConfirmModal();
}

function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        console.log("Header Search button clicked");
        // ***** Añadido chequeo callbacks *****
        if (callbacks && callbacks.onFooterAction) {
            callbacks.onFooterAction('search');
        } else {
            console.error("UI: callbacks object or onFooterAction is missing in header search!");
        }
        // ***********************************
    });
}

function _bindNavEvents() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.onclick = () => {
            console.log("Prev Month button clicked");
            if (callbacks && callbacks.onMonthChange) callbacks.onMonthChange('prev');
            else console.error("UI: callbacks missing in prev month!");
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            console.log("Next Month button clicked");
            if (callbacks && callbacks.onMonthChange) callbacks.onMonthChange('next');
            else console.error("UI: callbacks missing in next month!");
        };
    }
}

function _bindFooterEvents() {
    document.getElementById('btn-add-memory')?.addEventListener('click', () => {
        console.log("Footer Add Memory button clicked");
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('add');
        else console.error("UI: callbacks object or onFooterAction is missing in footer add!");
    });
    document.getElementById('btn-store')?.addEventListener('click', () => {
        console.log("Footer Store button clicked");
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('store');
        else console.error("UI: callbacks object or onFooterAction is missing in footer store!");
    });
    document.getElementById('btn-shuffle')?.addEventListener('click', () => {
        console.log("Footer Shuffle button clicked");
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('shuffle');
        else console.error("UI: callbacks object or onFooterAction is missing in footer shuffle!");
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        console.log("Footer Settings button clicked");
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('settings');
        else console.error("UI: callbacks object or onFooterAction is missing in footer settings!");
    });
}

function _bindCrumbieEvents() { /* ... (sin cambios) */ }
function _bindLoginEvents() { /* ... (sin cambios) */ }
function _bindGlobalListeners() { /* ... (sin cambios) */ }

// --- Funciones de Renderizado Principal ---
function setLoading(message, show) { /* ... (sin cambios) */ }
function updateLoginUI(user) { /* ... (sin cambios) */ }

function drawCalendar(monthName, days, todayId) {
    const monthNameDisplay = document.getElementById('month-name-display');
    const appContent = document.getElementById('app-content');

    if (monthNameDisplay) monthNameDisplay.textContent = monthName;
    if (!appContent) {
        console.error("UI ERROR: drawCalendar - #app-content not found!");
        return;
    }
    console.log("UI: drawCalendar - #app-content found.");

    // ***** AÑADIDO TRY...CATCH *****
    try {
        const grid = document.createElement('div');
        grid.className = 'calendario-grid';

        if (!days || !Array.isArray(days)) {
             console.warn("UI WARN: drawCalendar received invalid 'days' data:", days);
             days = []; // Prevenir error en forEach
        }

        days.forEach(dia => {
            if (!dia || typeof dia.id !== 'string') {
                 console.warn("UI WARN: drawCalendar skipping invalid 'dia' object:", dia);
                 return; // Saltar este día
            }
            const btn = document.createElement('button');
            btn.className = 'dia-btn';
            // Extraer número de día de forma segura
            const dayNum = parseInt(dia.id.substring(3));
            btn.innerHTML = `<span class="dia-numero">${isNaN(dayNum) ? '?' : dayNum}</span>`;

            if (dia.id === todayId) btn.classList.add('dia-btn-today');
            if (dia.tieneMemorias) btn.classList.add('tiene-memorias');

            btn.addEventListener('click', () => {
                // Chequeo añadido aquí también
                if (callbacks && callbacks.onDayClick) callbacks.onDayClick(dia);
                else console.error("UI: callbacks missing in day click listener!");
            });

            grid.appendChild(btn);
        });

        console.log("UI: drawCalendar - Grid created, about to update innerHTML.");
        appContent.innerHTML = ''; // Clear previous content
        appContent.appendChild(grid); // Add the new grid
        console.log("UI: drawCalendar - #app-content updated successfully.");
    } catch (error) {
        console.error("UI ERROR in drawCalendar:", error);
        appContent.innerHTML = '<p class="loading-message error">Error al dibujar el calendario.</p>';
    }
    // **********************************
}

function updateSpotlight(dateString, dayName, memories) {
    const titleEl = document.getElementById('spotlight-date-header');
    const listEl = document.getElementById('today-memory-spotlight');

    if (titleEl) titleEl.textContent = dateString;
    if (!listEl) {
         console.error("UI ERROR: updateSpotlight - #today-memory-spotlight not found!");
         return;
    }
     console.log("UI: updateSpotlight - #today-memory-spotlight found.");

    // ***** AÑADIDO TRY...CATCH *****
    try {
        listEl.innerHTML = ''; // Clear

        if (dayName) {
            const dayNameEl = document.createElement('h3');
            dayNameEl.className = 'spotlight-day-name';
            dayNameEl.textContent = `- ${dayName} -`;
            listEl.appendChild(dayNameEl);
        }

        const containerEl = document.createElement('div');
        containerEl.id = 'spotlight-memories-container';
        listEl.appendChild(containerEl);

        // Asegurarse que memories es un array
        if (!memories || !Array.isArray(memories)) {
            console.warn("UI WARN: updateSpotlight received invalid 'memories' data:", memories);
            memories = [];
        }

        if (memories.length === 0) {
            const placeholder = document.createElement('p');
            placeholder.className = 'list-placeholder';
            placeholder.textContent = 'No hay memorias destacadas.';
            containerEl.appendChild(placeholder);
        } else {
            memories.forEach(mem => {
                 if (!mem || typeof mem.Tipo !== 'string') {
                     console.warn("UI WARN: updateSpotlight skipping invalid 'mem' object:", mem);
                     return; // Saltar esta memoria
                 }
                const itemEl = document.createElement('div');
                itemEl.className = 'spotlight-memory-item';
                if (mem.Tipo === 'Texto') {
                    itemEl.classList.add('spotlight-item-text');
                }
                // Usar try/catch dentro del loop por si createMemoryItemHTML falla
                try {
                     itemEl.innerHTML = createMemoryItemHTML(mem, false, 'spotlight');
                } catch(htmlError) {
                     console.error("UI ERROR creating HTML for memory item:", mem, htmlError);
                     itemEl.innerHTML = `<p class="error">Error al mostrar memoria</p>`; // Mostrar error en lugar del item
                }


                itemEl.addEventListener('click', () => {
                    const diaObj = _allDaysData.find(d => d.id === mem.diaId);
                    if (diaObj && callbacks && callbacks.onDayClick) {
                        callbacks.onDayClick(diaObj);
                    } else if (!callbacks) {
                         console.error("UI: callbacks missing in spotlight click listener!");
                    }
                    else {
                        console.warn("No se encontró el objeto 'dia' para el spotlight:", mem.diaId);
                    }
                });
                containerEl.appendChild(itemEl);
            });
            console.log("UI: updateSpotlight - Memories rendered, initializing maps...");
             // Usar try/catch para _initMapsInContainer también
             try {
                _initMapsInContainer(containerEl, 'spotlight');
             } catch (mapError) {
                 console.error("UI ERROR initializing maps in spotlight:", mapError);
             }
        }
         console.log("UI: updateSpotlight - finished successfully.");
    } catch (error) {
        console.error("UI ERROR in updateSpotlight:", error);
        listEl.innerHTML = '<p class="list-placeholder error">Error al cargar el spotlight.</p>';
    }
    // **********************************
}


// --- Modal: Vista Previa (Preview) ---
function createPreviewModal() { /* ... (sin cambios) */ }
function showPreviewLoading(isLoading) { /* ... (sin cambios) */ }
function openPreviewModal(dia, memories) { /* ... (sin cambios) */ }
function closePreviewModal() { /* ... (sin cambios, la lógica de mapas está bien aquí) */ }

// --- Modal: Edición (Edit/Add) ---
function createEditModal() { /* ... (sin cambios) */ }
function showEditLoading(isLoading) { /* ... (sin cambios) */ }
async function handleNameSelectedDay() { /* ... (sin cambios) */ }
function _bindEditModalEvents() { /* ... (sin cambios, los logs ya están) */ }
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
