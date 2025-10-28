/*
 * ui.js (v4.28 - Debugging createMemoryItemHTML)
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
    console.log("UI Module init (v4.28 - Debugging createMemoryItemHTML)"); // Cambiado
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
export function openPreviewModal(dia, memories) {
    _currentDay = dia;
    const titleEl = document.getElementById('preview-title');
    const listEl = document.getElementById('preview-memorias-list');
    const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
    if (titleEl) titleEl.textContent = `${dia.Nombre_Dia}${dayName}`;
    _renderMemoryList(listEl, memories, false, 'preview');
    previewModal.style.display = 'flex';
    setTimeout(() => {
        previewModal.classList.add('visible');
        _initMapsInContainer(listEl, 'preview');
    }, 10);
}
export function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove('visible');
    _destroyActiveMaps();
    const spotlightContainer = document.getElementById('spotlight-memories-container');
    if (spotlightContainer) {
        setTimeout(() => _initMapsInContainer(spotlightContainer, 'spotlight'), 250);
    }
    setTimeout(() => {
        previewModal.style.display = 'none';
        _currentDay = null;
    }, 200);
}
export function showPreviewLoading(isLoading) {
    const loadingEl = previewModal?.querySelector('.preview-loading');
    const listEl = previewModal?.querySelector('#preview-memorias-list');
    if (loadingEl && listEl) {
        if (isLoading) {
            listEl.innerHTML = '';
            loadingEl.style.display = 'block';
        } else {
            loadingEl.style.display = 'none';
        }
    }
}
export function openEditModal(dia, memories) {
    _currentDay = dia;
    _currentMemories = memories || [];
    const daySelection = document.getElementById('day-selection-section');
    const dayNameSection = document.getElementById('day-name-section');
    const titleEl = document.getElementById('edit-modal-title');
    const nameInput = document.getElementById('nombre-especial-input');
    const daySelect = document.getElementById('edit-mem-day');
    const dynamicTitleEl = document.getElementById('edit-modal-title-dynamic');
    const formTitle = document.getElementById('memory-form-title');
    if (dia) { // Edit mode
        daySelection.style.display = 'none';
        dayNameSection.style.display = 'block';
        if (dynamicTitleEl) dynamicTitleEl.textContent = 'Editar Día';
        if (formTitle) formTitle.textContent = 'Añadir/Editar Memoria';
        const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
        titleEl.textContent = `Editando: ${dia.Nombre_Dia}${dayName}`;
        nameInput.value = dia.Nombre_Especial !== 'Unnamed Day' ? dia.Nombre_Especial : '';
    } else { // Add mode
        daySelection.style.display = 'block';
        dayNameSection.style.display = 'none';
        if (dynamicTitleEl) dynamicTitleEl.textContent = 'Añadir Memoria';
        if (formTitle) formTitle.textContent = 'Añadir Memoria';
        if (_allDaysData.length > 0) {
            daySelect.innerHTML = '';
             _allDaysData.sort((a, b) => a.id.localeCompare(b.id)).forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                const displayName = d.Nombre_Especial !== 'Unnamed Day' ? `${d.Nombre_Dia} (${d.Nombre_Especial})` : d.Nombre_Dia;
                opt.textContent = displayName;
                daySelect.appendChild(opt);
            });
        }
        const today = new Date();
        const todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        daySelect.value = todayId;
    }
    _showMemoryForm(false);
    resetMemoryForm();
    _renderMemoryList(document.getElementById('edit-memorias-list'), _currentMemories, true);
    showModalStatus('save-status', '', false);
    showModalStatus('memoria-status', '', false);
    showModalStatus('add-name-status', '', false);
    showEditLoading(false);
    editModal.style.display = 'flex';
    setTimeout(() => editModal.classList.add('visible'), 10);
}
export function closeEditModal() {
    if (!editModal) return;
    editModal.classList.remove('visible');
    setTimeout(() => {
        editModal.style.display = 'none';
        _currentDay = null;
        _currentMemories = [];
        _isEditingMemory = false;
    }, 200);
}
export function showEditLoading(isLoading) {
    const loadingEl = editModal?.querySelector('.edit-loading');
    const contentWrapper = editModal?.querySelector('.edit-content-wrapper');
    if (loadingEl && contentWrapper) {
        loadingEl.style.display = isLoading ? 'block' : 'none';
        contentWrapper.style.display = isLoading ? 'none' : 'block';
    }
}
export function openStoreModal() {
    if (!storeModal) createStoreModal();
    storeModal.style.display = 'flex';
    setTimeout(() => storeModal.classList.add('visible'), 10);
}
export function closeStoreModal() {
    if (!storeModal) return;
    storeModal.classList.remove('visible');
    setTimeout(() => storeModal.style.display = 'none', 200);
}
export function openStoreListModal(title) {
    if(!storeListModal) createStoreListModal();
    const titleEl = document.getElementById('store-list-title');
    const contentEl = document.getElementById('store-list-content');
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = '<p class="list-placeholder">Cargando...</p>';
    storeListModal.style.display = 'flex';
    setTimeout(() => storeListModal.classList.add('visible'), 10);
}
export function closeStoreListModal() {
    if (!storeListModal) return;
    storeListModal.classList.remove('visible');
    setTimeout(() => storeListModal.style.display = 'none', 200);
}
export function showAlert(message, type = 'default') {
    if(!alertPromptModal) createAlertPromptModal();
    const contentEl = alertPromptModal.querySelector('.modal-alert-content');
    contentEl.classList.remove('settings-alert', 'search-alert');
    if (type === 'settings') contentEl.classList.add('settings-alert');
    document.getElementById('alert-prompt-message').textContent = message;
    document.getElementById('alert-prompt-input').style.display = 'none';
    document.getElementById('alert-prompt-cancel').style.display = 'none';
    const okBtn = document.getElementById('alert-prompt-ok');
    okBtn.textContent = 'OK';
    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
}
export function showPrompt(message, defaultValue = '', type = 'default') {
    if(!alertPromptModal) createAlertPromptModal();
    const contentEl = alertPromptModal.querySelector('.modal-alert-content');
    contentEl.classList.remove('settings-alert', 'search-alert');
    if (type === 'search') contentEl.classList.add('search-alert');
    document.getElementById('alert-prompt-message').textContent = message;
    document.getElementById('alert-prompt-input').style.display = 'block';
    document.getElementById('alert-prompt-input').value = defaultValue;
    document.getElementById('alert-prompt-cancel').style.display = 'block';
    const okBtn = document.getElementById('alert-prompt-ok');
    okBtn.textContent = 'OK';
    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
    return new Promise((resolve) => { _promptResolve = resolve; });
}
export function showConfirm(message) {
     if(!confirmModal) createConfirmModal();
    document.getElementById('confirm-message').textContent = message;
    confirmModal.style.display = 'flex';
    setTimeout(() => confirmModal.classList.add('visible'), 10);
    return new Promise((resolve) => { _confirmResolve = resolve; });
}

// --- Formularios y Listas (Funciones públicas) ---
export function updateStoreList(items, append = false, hasMore = false) { /* ... (sin cambios) */ }
export function updateMemoryList(memories) { /* ... (sin cambios) */ }
export function resetMemoryForm() {
    _isEditingMemory = false;
    _selectedMusic = null;
    _selectedPlace = null;
    const form = document.getElementById('memory-form');
    if (!form) return;
    form.reset();
    document.getElementById('memoria-year').value = '';
    form.dataset.editingId = '';
    form.dataset.existingImageUrl = '';
    document.getElementById('save-memoria-btn').textContent = 'Añadir Memoria';
    document.getElementById('save-memoria-btn').disabled = false;
    showMusicResults([]);
    showPlaceResults([]);
    showModalStatus('memoria-status', '', false);
    showModalStatus('image-upload-status', '', false);
    handleMemoryTypeChange();
    _showMemoryForm(false);
}
export function fillFormForEdit(mem) { /* ... (sin cambios) */ }
export function showMusicResults(tracks, isSelected = false) { /* ... (sin cambios) */ }
export function showPlaceResults(places, isSelected = false) { /* ... (sin cambios) */ }
export function showModalStatus(elementId, message, isError) { /* ... (sin cambios) */ }
export function handleMemoryTypeChange() { /* ... (sin cambios) */ }

// --- Crumbie (Funciones públicas) ---
export function showCrumbieAnimation(message) { /* ... (sin cambios) */ }

// --- Funciones privadas (no exportadas) ---
function createPreviewModal() {
    if (previewModal) return;
    previewModal = document.createElement('div');
    previewModal.id = 'preview-modal';
    previewModal.className = 'modal-preview';
    previewModal.innerHTML = `...`; // Contenido HTML omitido por brevedad
    document.body.appendChild(previewModal);
    document.getElementById('close-preview-btn')?.addEventListener('click', closePreviewModal);
    document.getElementById('edit-from-preview-btn')?.addEventListener('click', () => { if (callbacks && callbacks.onEditFromPreview) callbacks.onEditFromPreview(); });
}
function createEditModal() {
    if (editModal) return;
    editModal = document.createElement('div');
    editModal.id = 'edit-add-modal';
    editModal.className = 'modal-edit';
    editModal.innerHTML = `...`; // Contenido HTML omitido por brevedad
    document.body.appendChild(editModal);
    _bindEditModalEvents();
}
function createStoreModal() {
    if (storeModal) return;
    storeModal = document.createElement('div');
    storeModal.id = 'store-modal';
    storeModal.className = 'modal-store';
    const categories = [ /* ... */ ];
    let buttonsHTML = categories.map(cat => createStoreCategoryButton(cat.type, cat.icon, cat.label)).join('');
    storeModal.innerHTML = `...`; // Contenido HTML omitido por brevedad
    document.body.appendChild(storeModal);
    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);
    storeModal.querySelector('.store-category-list')?.addEventListener('click', (e) => { const btn = e.target.closest('.store-category-button'); if (btn && callbacks && callbacks.onStoreCategoryClick) callbacks.onStoreCategoryClick(btn.dataset.type); });
}
function createStoreListModal() {
    if (storeListModal) return;
    storeListModal = document.createElement('div');
    storeListModal.id = 'store-list-modal';
    storeListModal.className = 'modal-store-list';
    storeListModal.innerHTML = `...`; // Contenido HTML omitido por brevedad
    document.body.appendChild(storeListModal);
    _bindStoreListModalEvents();
}
function createAlertPromptModal() {
    if (alertPromptModal) return;
    alertPromptModal = document.createElement('div');
    alertPromptModal.id = 'alert-prompt-modal';
    alertPromptModal.className = 'modal-alert-prompt';
    alertPromptModal.innerHTML = `...`; // Contenido HTML omitido por brevedad
    document.body.appendChild(alertPromptModal);
    _bindAlertPromptEvents();
}
function createConfirmModal() {
    if (confirmModal) return;
    confirmModal = document.createElement('div');
    confirmModal.id = 'confirm-modal';
    confirmModal.className = 'modal-confirm';
    confirmModal.innerHTML = `...`; // Contenido HTML omitido por brevedad
    document.body.appendChild(confirmModal);
    _bindConfirmModalEvents();
}
async function handleNameSelectedDay() { /* ... (sin cambios) */ }
function _bindEditModalEvents() { /* ... (sin cambios, logs ya están) */ }
function _bindStoreListModalEvents() { /* ... (sin cambios) */ }
function _bindAlertPromptEvents() { /* ... (sin cambios) */ }
function _bindConfirmModalEvents() { /* ... (sin cambios) */ }
function _showMemoryForm(show) { /* ... (sin cambios) */ }
function _renderMap(containerId, lat, lon, zoom = 13) { /* ... (sin cambios) */ }
function _initMapsInContainer(containerEl, prefix) { /* ... (sin cambios) */ }
function _destroyActiveMaps() { /* ... (sin cambios) */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { /* ... (sin cambios) */ }

// ***** CAMBIO: Logs detallados dentro de createMemoryItemHTML *****
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') {
    // Log inicial del objeto recibido
    console.log(`createMemoryItemHTML: Processing mem (ID: ${mem?.id || 'N/A'}):`, JSON.stringify(mem)); // Usar stringify para ver estructura

    if (!mem || typeof mem !== 'object') {
        console.error("createMemoryItemHTML: Received invalid 'mem' object:", mem);
        return '<p class="error">Error: Datos de memoria inválidos.</p>'; // Devolver error HTML
    }
    const memId = mem.id || '';

    let yearStr = 'Año desc.';
    if (mem.Fecha_Original) {
        try {
            // Intentar crear fecha desde segundos o directamente
            const dateSource = mem.Fecha_Original.seconds ? mem.Fecha_Original.seconds * 1000 : mem.Fecha_Original;
            const date = new Date(dateSource);
            if (!isNaN(date.getFullYear())) { // Verificar si la fecha es válida
                yearStr = date.getFullYear();
            } else {
                console.warn("createMemoryItemHTML: Invalid date parsed from Fecha_Original:", mem.Fecha_Original);
            }
        } catch (e) {
             console.warn("createMemoryItemHTML: Error parsing Fecha_Original:", mem.Fecha_Original, e);
        }
    }

    let contentHTML = `<small>${yearStr}</small>`;
    let artworkHTML = '';
    let icon = 'article';
    let mapHTML = '';

    // Log antes del switch
    console.log(`createMemoryItemHTML [${memId}]: Type = ${mem.Tipo}, Year = ${yearStr}`);

    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            const lugarNombre = mem.LugarNombre || 'Lugar sin nombre';
            contentHTML += `${lugarNombre}`;
            console.log(`createMemoryItemHTML [${memId}]: LugarNombre = ${lugarNombre}`);
            if (mem.LugarData && mem.LugarData.lat && mem.LugarData.lon) {
                const lat = mem.LugarData.lat;
                const lon = mem.LugarData.lon;
                console.log(`createMemoryItemHTML [${memId}]: Map data found (Lat: ${lat}, Lon: ${lon})`);
                const mapContainerId = `${mapIdPrefix}-map-${memId || Date.now()}`;
                const mapClass = (mapIdPrefix === 'spotlight') ? 'spotlight-map-container' : 'memoria-map-container';
                mapHTML = `<div id="${mapContainerId}" class="${mapClass}" data-lat="${lat}" data-lon="${lon}" data-zoom="13"></div>`;
            } else {
                 console.log(`createMemoryItemHTML [${memId}]: No valid map data in LugarData:`, mem.LugarData);
            }
            break;
        case 'Musica':
            icon = 'music_note';
            console.log(`createMemoryItemHTML [${memId}]: Processing Musica. CancionData:`, JSON.stringify(mem.CancionData));
            const trackName = mem.CancionData?.trackName;
            const artistName = mem.CancionData?.artistName;
            const artwork = mem.CancionData?.artworkUrl60;

            if (trackName) {
                const artistText = artistName || 'Artista desc.';
                contentHTML += `<strong>${trackName}</strong> <span class="artist-name">by ${artistText}</span>`;
                console.log(`createMemoryItemHTML [${memId}]: Track = ${trackName}, Artist = ${artistText}`);
                if(artwork) {
                    artworkHTML = `<img src="${artwork}" class="memoria-artwork" alt="Artwork">`;
                }
            } else {
                 const cancionInfo = mem.CancionInfo || 'Canción sin nombre';
                 contentHTML += `${cancionInfo}`;
                 console.log(`createMemoryItemHTML [${memId}]: Using CancionInfo fallback = ${cancionInfo}`);
            }
            break;
        case 'Imagen':
            icon = 'image';
            const imgDesc = mem.Descripcion || 'Imagen';
            contentHTML += `${imgDesc}`;
            console.log(`createMemoryItemHTML [${memId}]: Imagen Desc = ${imgDesc}`);
            if (mem.ImagenURL) {
                artworkHTML = `<img src="${mem.ImagenURL}" class="memoria-artwork" alt="Memoria">`;
            }
            break;
        case 'Texto':
        default:
            icon = 'article';
            const desc = typeof mem.Descripcion === 'string' ? mem.Descripcion : 'Nota vacía';
            contentHTML += desc;
            console.log(`createMemoryItemHTML [${memId}]: Texto Desc = ${desc}`);
            if (mem.Tipo !== 'Texto') {
                 console.warn(`createMemoryItemHTML [${memId}]: Unexpected type '${mem.Tipo}' fell into default case.`);
            }
            break;
    }

    if (!artworkHTML) {
        artworkHTML = `<span class="memoria-icon material-icons-outlined">${icon}</span>`;
    }

    const actionsHTML = (showActions && memId) ? `
        <div class="memoria-actions">
            <button class="edit-btn" title="Editar" data-memoria-id="${memId}"><span class="material-icons-outlined">edit</span></button>
            <button class="delete-btn" title="Borrar" data-memoria-id="${memId}"><span class="material-icons-outlined">delete</span></button>
        </div>` : '';

    const mainContentHTML = `
        <div class="memoria-item-main-content ${mapIdPrefix === 'spotlight' ? 'spotlight-item-main-content' : ''}">
            ${artworkHTML}
            <div class="memoria-item-content">${contentHTML}</div>
            ${actionsHTML}
        </div>`;

    console.log(`createMemoryItemHTML [${memId}]: Returning HTML.`);
    return mainContentHTML + mapHTML;
}
// ***************************************************************

function createStoreCategoryButton(type, icon, label) { /* ... */ }
function createStoreListItem(item) { /* ... */ }
function _createLoginButton(isLoggedOut, container) { /* ... */ }
function _handleFormSubmit(e) { /* ... */ }

// (Fin del archivo, sin `export const ui`)
