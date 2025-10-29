/*
 * ui.js (v4.30 - Add Debugging Logs for Events & Rendering)
 * Módulo de interfaz de usuario.
 */

// --- Variables privadas del módulo (Estado de la UI) ---
let callbacks = {}; 
let _currentDay = null; 
let _currentMemories = []; 
let _allDaysData = []; 
let _isEditingMemory = false; 

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

let _activeMaps = [];

// --- Funciones de Inicialización ---

function init(mainCallbacks) {
    console.log("UI Module init (v4.30 - Add Logs)"); // Cambio versión
    callbacks = mainCallbacks;
    console.log("[DEBUG UI] Callbacks received in init:", callbacks); // Log Callbacks

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents(); 
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents(); 

    // Pre-crear modales principales
    createPreviewModal();
    createEditModal();
    createStoreModal(); 
    createStoreListModal();
    createAlertPromptModal();
    createConfirmModal();
}

// ... (resto de funciones _bind... sin cambios, pero con logs internos) ...
function _bindHeaderEvents() {
    console.log("[DEBUG UI] Binding Header Events..."); // Log añadido
    const searchBtn = document.getElementById('header-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
             console.log("[DEBUG UI] Header Search Button Clicked"); // Log añadido
            if (callbacks.onFooterAction) callbacks.onFooterAction('search');
        });
    } else {
        console.warn("[DEBUG UI] Header Search Button not found during binding.");
    }
}

function _bindNavEvents() {
    console.log("[DEBUG UI] Binding Nav Events..."); // Log añadido
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.onclick = () => {
             console.log("[DEBUG UI] Prev Month Button Clicked"); // Log añadido
            if (callbacks.onMonthChange) callbacks.onMonthChange('prev');
        };
    } else {
         console.warn("[DEBUG UI] Prev Month Button not found during binding.");
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            console.log("[DEBUG UI] Next Month Button Clicked"); // Log añadido
            if (callbacks.onMonthChange) callbacks.onMonthChange('next');
        };
    } else {
         console.warn("[DEBUG UI] Next Month Button not found during binding.");
    }
}

function _bindFooterEvents() {
    console.log("[DEBUG UI] Binding Footer Events..."); // Log añadido
    const addBtn = document.getElementById('btn-add-memory');
    const storeBtn = document.getElementById('btn-store');
    const shuffleBtn = document.getElementById('btn-shuffle');
    const settingsBtn = document.getElementById('btn-settings');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
             console.log("[DEBUG UI] Footer Add Button Clicked"); // Log añadido
            if (callbacks.onFooterAction) callbacks.onFooterAction('add');
        });
    } else { console.warn("[DEBUG UI] Footer Add Button not found."); }

    if (storeBtn) {
         storeBtn.addEventListener('click', () => {
             console.log("[DEBUG UI] Footer Store Button Clicked"); // Log añadido
            if (callbacks.onFooterAction) callbacks.onFooterAction('store');
        });
    } else { console.warn("[DEBUG UI] Footer Store Button not found."); }

     if (shuffleBtn) {
         shuffleBtn.addEventListener('click', () => {
             console.log("[DEBUG UI] Footer Shuffle Button Clicked"); // Log añadido
            if (callbacks.onFooterAction) callbacks.onFooterAction('shuffle');
        });
    } else { console.warn("[DEBUG UI] Footer Shuffle Button not found."); }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            console.log("[DEBUG UI] Footer Settings Button Clicked"); // Log añadido
            if (callbacks.onFooterAction) callbacks.onFooterAction('settings');
        });
    } else { console.warn("[DEBUG UI] Footer Settings Button not found."); }
}

function _bindCrumbieEvents() { /* ... */ }
function _bindLoginEvents() { /* ... */ }
function _bindGlobalListeners() { /* ... */ }


// --- Funciones de Renderizado Principal ---

function setLoading(message, show) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    if (show) {
        appContent.innerHTML = `<p class="loading-message">${message}</p>`;
        showApp(false);
    } else {
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
    }
}

function showApp(show) {
    console.log(`[DEBUG UI] showApp called with: ${show}`); // Log añadido
    const display = show ? 'block' : 'none';
    const nav = document.querySelector('.month-nav');
    const spotlight = document.getElementById('spotlight-section');
    const appContent = document.getElementById('app-content'); 

    if (nav) nav.style.display = show ? 'flex' : 'none';
    if (spotlight) spotlight.style.display = display;
    if (appContent) appContent.style.display = display;
    
    if (show) {
         const loading = appContent?.querySelector('.loading-message');
         if (loading) loading.remove();
    }
}

function updateAllDaysData(allDays) {
    if (allDays && allDays.length > 0) {
        _allDaysData = allDays;
        console.log("[DEBUG UI] updateAllDaysData received:", _allDaysData.length, "days."); // Log mejorado
    } else {
        console.warn("[DEBUG UI] updateAllDaysData received empty or invalid data.");
    }
}


function updateLoginUI(user) {
    const loginBtnContainer = document.getElementById('login-btn-container');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userImg = document.getElementById('user-img');

    if (!loginBtnContainer || !userInfo || !userName || !userImg) {
        console.error("[DEBUG UI] UpdateLoginUI failed: Missing elements.");
        return;
    }

    if (user) {
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || 'Usuario';
        userImg.src = user.photoURL || `https://placehold.co/30x30/ccc/fff?text=${user.displayName ? user.displayName[0] : '?'}`;
        _createLoginButton(true, loginBtnContainer);
    } else {
        userInfo.style.display = 'none';
        _createLoginButton(false, loginBtnContainer);
    }
}

function drawCalendar(monthName, days, todayId) {
    console.log(`[DEBUG UI] Drawing calendar for ${monthName} with ${days.length} days.`); // Log añadido
    const monthNameDisplay = document.getElementById('month-name-display');
    const appContent = document.getElementById('app-content');

    if (monthNameDisplay) monthNameDisplay.textContent = monthName;
    if (!appContent) {
        console.error("[DEBUG UI] drawCalendar failed: #app-content not found.");
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'calendario-grid';

    days.forEach(dia => {
        const btn = document.createElement('button');
        btn.className = 'dia-btn';
        btn.innerHTML = `<span class="dia-numero">${parseInt(dia.id.substring(3))}</span>`;

        if (dia.id === todayId) btn.classList.add('dia-btn-today');
        if (dia.tieneMemorias) btn.classList.add('tiene-memorias');

        btn.addEventListener('click', () => {
             console.log("[DEBUG UI] Day Button Clicked:", dia.id); // Log añadido
            if (callbacks.onDayClick) callbacks.onDayClick(dia);
        });

        grid.appendChild(btn);
    });

    appContent.innerHTML = '';
    appContent.appendChild(grid);
}

function updateSpotlight(dateString, dayName, memories) {
    console.log(`[DEBUG UI] Updating Spotlight. Date: ${dateString}, Day Name: ${dayName}, Memories Count: ${memories ? memories.length : 0}`); // Log añadido
    const titleEl = document.getElementById('spotlight-date-header');
    const listEl = document.getElementById('today-memory-spotlight'); 

    if (titleEl) titleEl.textContent = dateString; 
    if (!listEl) {
        console.error("[DEBUG UI] updateSpotlight failed: #today-memory-spotlight not found.");
        return;
    }

    listEl.innerHTML = ''; 

    if (dayName) {
        const dayNameEl = document.createElement('h3');
        dayNameEl.className = 'spotlight-day-name';
        dayNameEl.textContent = `- ${dayName} -`;
        listEl.appendChild(dayNameEl);
    }

    const containerEl = document.createElement('div');
    containerEl.id = 'spotlight-memories-container';
    listEl.appendChild(containerEl);


    if (!memories || memories.length === 0) {
        console.log("[DEBUG UI] No spotlight memories to display."); // Log añadido
        const placeholder = document.createElement('p');
        placeholder.className = 'list-placeholder';
        placeholder.textContent = 'No hay memorias destacadas.';
        containerEl.appendChild(placeholder);
        return;
    }

    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'spotlight-memory-item';

        if (mem.Tipo === 'Texto') {
            itemEl.classList.add('spotlight-item-text');
        }

        itemEl.innerHTML = createMemoryItemHTML(mem, false, 'spotlight');

        itemEl.addEventListener('click', () => {
             console.log("[DEBUG UI] Spotlight Item Clicked, navigating to day:", mem.diaId); // Log añadido
             const diaObj = _allDaysData.find(d => d.id === mem.diaId); 
             if (diaObj && callbacks.onDayClick) {
                 callbacks.onDayClick(diaObj);
            } else {
                console.warn("[DEBUG UI] Could not find day object for spotlight item:", mem.diaId);
            }
        });

        containerEl.appendChild(itemEl);
    });
    
    console.log("[DEBUG UI] Initializing maps in spotlight..."); // Log añadido
    _initMapsInContainer(containerEl, 'spotlight');
}


// --- Modal: Vista Previa (Preview) ---
function createPreviewModal() { /* ... (Sin cambios internos, ya tiene logs básicos) ... */ }
function showPreviewLoading(isLoading) { /* ... (Sin cambios) ... */ }

function openPreviewModal(dia, memories) {
    console.log(`[DEBUG UI] Opening Preview Modal for day ${dia.id}. Memories count: ${memories ? memories.length : 0}`); // Log añadido
    _currentDay = dia;

    const titleEl = document.getElementById('preview-title');
    const listEl = document.getElementById('preview-memorias-list');

    const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
    if (titleEl) titleEl.textContent = `${dia.Nombre_Dia}${dayName}`;

    _renderMemoryList(listEl, memories, false, 'preview'); 

    previewModal.style.display = 'flex';
    setTimeout(() => {
        previewModal.classList.add('visible');
         console.log("[DEBUG UI] Initializing maps in preview modal..."); // Log añadido
        _initMapsInContainer(listEl, 'preview');
    }, 10);
}

function closePreviewModal() { /* ... (Sin cambios) ... */ }


// --- Modal: Edición (Edit/Add) ---

function createEditModal() { /* ... (Sin cambios internos, logs en bind) ... */ }
function showEditLoading(isLoading) { /* ... (Sin cambios) ... */ }
async function handleNameSelectedDay() { /* ... (Sin cambios) ... */ }
function _bindEditModalEvents() { /* ... (Sin cambios, ya tiene logs) ... */ }
function _showMemoryForm(show) { /* ... (Sin cambios) ... */ }
function openEditModal(dia, memories) { 
     console.log(`[DEBUG UI] Opening Edit Modal. Day: ${dia ? dia.id : 'null (Add Mode)'}. Memories count: ${memories ? memories.length : 0}`); // Log añadido
     /* ... resto de la función sin cambios ... */ 
}
function closeEditModal() { /* ... (Sin cambios) ... */ }


// --- Modal: Almacén (Store) ---
function createStoreModal() { /* ... (Sin cambios internos, logs en bind) ... */ }
function openStoreModal() { 
    console.log("[DEBUG UI] Opening Store Modal."); // Log añadido
    if (!storeModal) createStoreModal(); 
    storeModal.style.display = 'flex';
    setTimeout(() => storeModal.classList.add('visible'), 10);
}
function closeStoreModal() { /* ... (Sin cambios) ... */ }
 // --- Modal: Store List ---
function createStoreListModal() { /* ... (Sin cambios internos, logs en bind) ... */ }
function _bindStoreListModalEvents() { /* ... (Sin cambios, ya tiene logs) ... */ }
function openStoreListModal(title) { 
     console.log(`[DEBUG UI] Opening Store List Modal for: ${title}`); // Log añadido
     /* ... resto de la función sin cambios ... */ 
}
function closeStoreListModal() { /* ... (Sin cambios) ... */ }
function updateStoreList(items, append = false, hasMore = false) { 
     console.log(`[DEBUG UI] Updating Store List. Items count: ${items.length}, Append: ${append}, HasMore: ${hasMore}`); // Log añadido
     /* ... resto de la función sin cambios ... */ 
}
// --- Modales Alert, Prompt, Confirm ---
function createAlertPromptModal() { /* ... (Sin cambios) ... */ }
function _bindAlertPromptEvents() { /* ... (Sin cambios) ... */ }
function closeAlertPromptModal(isOk) { /* ... (Sin cambios) ... */ }
function showAlert(message, type = 'default') { 
     console.log(`[DEBUG UI] Showing Alert (Type: ${type}): ${message.substring(0, 50)}...`); // Log añadido
     /* ... resto de la función sin cambios ... */ 
}
function showPrompt(message, defaultValue = '', type = 'default') { 
     console.log(`[DEBUG UI] Showing Prompt (Type: ${type}): ${message.substring(0, 50)}...`); // Log añadido
     /* ... resto de la función sin cambios ... */ 
}
function createConfirmModal() { /* ... (Sin cambios) ... */ }
function _bindConfirmModalEvents() { /* ... (Sin cambios) ... */ }
function closeConfirmModal(isConfirmed) { /* ... (Sin cambios) ... */ }
function showConfirm(message) { 
     console.log(`[DEBUG UI] Showing Confirm: ${message.substring(0, 50)}...`); // Log añadido
     /* ... resto de la función sin cambios ... */ 
}



// --- Funciones de Ayuda (Helpers) de UI ---

function _renderMap(containerId, lat, lon, zoom = 13) { /* ... (Sin cambios) ... */ }
function _initMapsInContainer(containerEl, prefix) { /* ... (Sin cambios) ... */ }
function _destroyActiveMaps() { /* ... (Sin cambios) ... */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { 
    console.log(`[DEBUG UI] Rendering memory list. Count: ${memories ? memories.length : 0}, Show Actions: ${showActions}`); // Log añadido
    /* ... resto de la función sin cambios ... */ 
}
function updateMemoryList(memories) { 
    console.log(`[DEBUG UI] Updating memory list internally with ${memories ? memories.length : 0} memories.`); // Log añadido
    /* ... resto de la función sin cambios ... */ 
}
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { /* ... (Sin cambios) ... */ }
function createStoreCategoryButton(type, icon, label) { /* ... (Sin cambios) ... */ }
function createStoreListItem(item) { /* ... (Sin cambios) ... */ }
function _createLoginButton(isLoggedOut, container) { /* ... (Sin cambios) ... */ }


// --- Lógica del Formulario de Memorias ---
let _selectedMusic = null;
let _selectedPlace = null;

function _handleFormSubmit(e) { /* ... (Sin cambios) ... */ }
function handleMemoryTypeChange() { /* ... (Sin cambios) ... */ }
function fillFormForEdit(mem) { /* ... (Sin cambios) ... */ }
function resetMemoryForm() { /* ... (Sin cambios) ... */ }
function showMusicResults(tracks, isSelected = false) { /* ... (Sin cambios, ya tiene logs) ... */ }
function showPlaceResults(places, isSelected = false) { /* ... (Sin cambios, ya tiene logs) ... */ }
function showModalStatus(elementId, message, isError) { /* ... (Sin cambios) ... */ }
function showCrumbieAnimation(message) { /* ... (Sin cambios) ... */ }


// --- Exportaciones Públicas ---
export const ui = {
    init,
    setLoading,
    showApp,
    updateAllDaysData,
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
