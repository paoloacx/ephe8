/*
 * ui.js (v4.27 - Verificar contenido DOM)
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
export function init(mainCallbacks, allDays) {
    console.log("UI Module init (v4.27 - Verificar DOM)"); // Cambiado
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
function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        console.log("Header Search button clicked. Checking callbacks...");
        console.log("Value of 'callbacks' inside listener:", callbacks);
        if (callbacks && callbacks.onFooterAction) {
            callbacks.onFooterAction('search');
        } else {
            console.error("UI: callbacks object or onFooterAction is missing in header search!");
        }
    });
}
function _bindNavEvents() {
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
        console.log("Footer Add Memory button clicked. Checking callbacks...");
        console.log("Value of 'callbacks' inside listener:", callbacks);
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('add');
        else console.error("UI: callbacks object or onFooterAction is missing in footer add!");
    });
    document.getElementById('btn-store')?.addEventListener('click', () => {
        console.log("Footer Store button clicked. Checking callbacks...");
        console.log("Value of 'callbacks' inside listener:", callbacks);
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('store');
        else console.error("UI: callbacks object or onFooterAction is missing in footer store!");
    });
    document.getElementById('btn-shuffle')?.addEventListener('click', () => {
        console.log("Footer Shuffle button clicked. Checking callbacks...");
        console.log("Value of 'callbacks' inside listener:", callbacks);
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('shuffle');
        else console.error("UI: callbacks object or onFooterAction is missing in footer shuffle!");
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        console.log("Footer Settings button clicked. Checking callbacks...");
        console.log("Value of 'callbacks' inside listener:", callbacks);
        if (callbacks && callbacks.onFooterAction) callbacks.onFooterAction('settings');
        else console.error("UI: callbacks object or onFooterAction is missing in footer settings!");
    });
}
function _bindCrumbieEvents() {
    document.getElementById('crumbie-btn')?.addEventListener('click', () => {
        console.log("Crumbie button clicked. Checking callbacks...");
        console.log("Value of 'callbacks' inside listener:", callbacks);
        if (callbacks && callbacks.onCrumbieClick) {
            callbacks.onCrumbieClick();
        } else {
            console.error("UI: callbacks object or onCrumbieClick is missing!");
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
            if (action === 'login' && callbacks && callbacks.onLogin) callbacks.onLogin();
        } else if (userInfo && callbacks && callbacks.onLogout) {
            callbacks.onLogout();
        }
    });
}
function _bindGlobalListeners() {
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-preview')) closePreviewModal();
        if (e.target.classList.contains('modal-edit')) closeEditModal();
        if (e.target.classList.contains('modal-store')) closeStoreModal();
        if (e.target.classList.contains('modal-store-list')) closeStoreListModal();
        if (e.target.classList.contains('modal-alert-prompt')) closeAlertPromptModal(false);
        if (e.target.classList.contains('modal-confirm')) closeConfirmModal(false);
    });
}

// --- Funciones de Renderizado Principal ---
export function setLoading(message, show) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    if (show) {
        appContent.innerHTML = `<p class="loading-message">${message}</p>`;
    } else {
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
    }
}
export function updateLoginUI(user) {
    const loginBtnContainer = document.getElementById('login-btn-container');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userImg = document.getElementById('user-img');
    if (!loginBtnContainer || !userInfo || !userName || !userImg) return;
    if (user) {
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || 'Usuario';
        userImg.src = user.photoURL || `https://placehold.co/30x30/ccc/fff?text=${user.displayName ? user.displayName[0] : '?'}`;
        _createLoginButton(true, loginBtnContainer); // Show logout button
    } else {
        userInfo.style.display = 'none';
        _createLoginButton(false, loginBtnContainer); // Show login button
    }
}
export function drawCalendar(monthName, days, todayId) {
    const monthNameDisplay = document.getElementById('month-name-display');
    const appContent = document.getElementById('app-content');
    if (monthNameDisplay) monthNameDisplay.textContent = monthName;
    if (!appContent) {
        console.error("UI ERROR: drawCalendar - #app-content not found!");
        return;
    }
    console.log("UI: drawCalendar - #app-content found.");
    try {
        const grid = document.createElement('div');
        grid.className = 'calendario-grid';
        if (!days || !Array.isArray(days)) {
             console.warn("UI WARN: drawCalendar received invalid 'days' data:", days);
             days = [];
        }
        days.forEach(dia => {
            if (!dia || typeof dia.id !== 'string') {
                 console.warn("UI WARN: drawCalendar skipping invalid 'dia' object:", dia);
                 return;
            }
            const btn = document.createElement('button');
            btn.className = 'dia-btn';
            const dayNum = parseInt(dia.id.substring(3));
            btn.innerHTML = `<span class="dia-numero">${isNaN(dayNum) ? '?' : dayNum}</span>`;
            if (dia.id === todayId) btn.classList.add('dia-btn-today');
            if (dia.tieneMemorias) btn.classList.add('tiene-memorias');
            btn.addEventListener('click', () => {
                if (callbacks && callbacks.onDayClick) callbacks.onDayClick(dia);
                else console.error("UI: callbacks missing in day click listener!");
            });
            grid.appendChild(btn);
        });
        console.log("UI: drawCalendar - Grid created, about to update innerHTML.");
        appContent.innerHTML = '';
        appContent.appendChild(grid);
        console.log("UI: drawCalendar - #app-content updated successfully.");
        if (appContent.querySelector('.calendario-grid') && appContent.querySelector('.dia-btn')) {
             console.log("UI: drawCalendar - VERIFIED: Grid and buttons are in #app-content.");
        } else {
             console.error("UI: drawCalendar - FAILED VERIFICATION: Grid or buttons NOT found in #app-content after append!");
        }
    } catch (error) {
        console.error("UI ERROR in drawCalendar:", error);
        appContent.innerHTML = '<p class="loading-message error">Error al dibujar el calendario.</p>';
    }
}
export function updateSpotlight(dateString, dayName, memories) {
    const titleEl = document.getElementById('spotlight-date-header');
    const listEl = document.getElementById('today-memory-spotlight');
    if (titleEl) titleEl.textContent = dateString;
    if (!listEl) {
         console.error("UI ERROR: updateSpotlight - #today-memory-spotlight not found!");
         return;
    }
     console.log("UI: updateSpotlight - #today-memory-spotlight found.");
    try {
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
                     return;
                 }
                const itemEl = document.createElement('div');
                itemEl.className = 'spotlight-memory-item';
                if (mem.Tipo === 'Texto') itemEl.classList.add('spotlight-item-text');
                try {
                     itemEl.innerHTML = createMemoryItemHTML(mem, false, 'spotlight');
                } catch(htmlError) {
                     console.error("UI ERROR creating HTML for memory item:", mem, htmlError);
                     itemEl.innerHTML = `<p class="error">Error al mostrar memoria</p>`;
                }
                itemEl.addEventListener('click', () => {
                    const diaObj = _allDaysData.find(d => d.id === mem.diaId);
                    if (diaObj && callbacks && callbacks.onDayClick) {
                        callbacks.onDayClick(diaObj);
                    } else if (!callbacks) {
                         console.error("UI: callbacks missing in spotlight click listener!");
                    } else {
                        console.warn("No se encontró el objeto 'dia' para el spotlight:", mem.diaId);
                    }
                });
                containerEl.appendChild(itemEl);
            });
            console.log("UI: updateSpotlight - Memories rendered, initializing maps...");
             try {
                _initMapsInContainer(containerEl, 'spotlight');
             } catch (mapError) {
                 console.error("UI ERROR initializing maps in spotlight:", mapError);
             }
        }
        if (listEl.querySelector('#spotlight-memories-container') && (listEl.querySelector('.spotlight-memory-item') || listEl.querySelector('.list-placeholder'))) {
             console.log("UI: updateSpotlight - VERIFIED: Container and items/placeholder are in #today-memory-spotlight.");
        } else {
             console.error("UI: updateSpotlight - FAILED VERIFICATION: Container or items/placeholder NOT found in #today-memory-spotlight after append!");
        }
         console.log("UI: updateSpotlight - finished successfully.");
    } catch (error) {
        console.error("UI ERROR in updateSpotlight:", error);
        listEl.innerHTML = '<p class="list-placeholder error">Error al cargar el spotlight.</p>';
    }
}

// --- Modales (Funciones públicas) ---
export function openPreviewModal(dia, memories) { /* ... (sin cambios) */ }
export function closePreviewModal() { /* ... (sin cambios) */ }
export function showPreviewLoading(isLoading) { /* ... (sin cambios) */ }
export function openEditModal(dia, memories) { /* ... (sin cambios) */ }
export function closeEditModal() { /* ... (sin cambios) */ }
export function showEditLoading(isLoading) { /* ... (sin cambios) */ }
export function openStoreModal() { /* ... (sin cambios) */ }
export function closeStoreModal() { /* ... (sin cambios) */ }
export function openStoreListModal(title) { /* ... (sin cambios) */ }
export function closeStoreListModal() { /* ... (sin cambios) */ }
export function showAlert(message, type = 'default') { /* ... (sin cambios) */ }
export function showPrompt(message, defaultValue = '', type = 'default') { /* ... (sin cambios) */ }
export function showConfirm(message) { /* ... (sin cambios) */ }

// --- Formularios y Listas (Funciones públicas) ---
export function updateStoreList(items, append = false, hasMore = false) { /* ... (sin cambios) */ }
export function updateMemoryList(memories) { /* ... (sin cambios) */ }
export function resetMemoryForm() { /* ... (sin cambios) */ }
export function fillFormForEdit(mem) { /* ... (sin cambios) */ }
export function showMusicResults(tracks, isSelected = false) { /* ... (sin cambios) */ }
export function showPlaceResults(places, isSelected = false) { /* ... (sin cambios) */ }
export function showModalStatus(elementId, message, isError) { /* ... (sin cambios) */ }
export function handleMemoryTypeChange() { /* ... (sin cambios) */ }

// --- Crumbie (Funciones públicas) ---
export function showCrumbieAnimation(message) { /* ... (sin cambios) */ }

// --- Funciones privadas (no exportadas) ---
function createPreviewModal() { /* ... (sin cambios) */ }
function createEditModal() { /* ... (sin cambios) */ }
function createStoreModal() { /* ... (sin cambios) */ }
function createStoreListModal() { /* ... (sin cambios) */ }
function createAlertPromptModal() { /* ... (sin cambios) */ }
function createConfirmModal() { /* ... (sin cambios) */ }
async function handleNameSelectedDay() { /* ... (sin cambios) */ }
function _bindEditModalEvents() { /* ... (sin cambios) */ }
function _bindStoreListModalEvents() { /* ... (sin cambios) */ }
function _bindAlertPromptEvents() { /* ... (sin cambios) */ }
function _bindConfirmModalEvents() { /* ... (sin cambios) */ }
function _showMemoryForm(show) { /* ... (sin cambios) */ }
function _renderMap(containerId, lat, lon, zoom = 13) { /* ... (sin cambios) */ }
function _initMapsInContainer(containerEl, prefix) { /* ... (sin cambios) */ }
function _destroyActiveMaps() { /* ... (sin cambios) */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { /* ... (sin cambios) */ }
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { /* ... (sin cambios) */ }
function createStoreCategoryButton(type, icon, label) { /* ... (sin cambios) */ }
function createStoreListItem(item) { /* ... (sin cambios) */ }
function _createLoginButton(isLoggedOut, container) { /* ... (sin cambios) */ }
function _handleFormSubmit(e) { /* ... (sin cambios) */ }

// No hay export const ui = { ... }
