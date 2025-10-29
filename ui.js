/*
 * ui.js (v2.67 - Form fixes, Remove Imagen Type, Map ID fix attempt)
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
    console.log("UI Module init (v2.67 - Form fixes, Remove Imagen Type)");
    callbacks = mainCallbacks;

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents();
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents();

    createPreviewModal();
    createEditModal();
    createStoreModal();
    createStoreListModal();
    createAlertPromptModal();
    createConfirmModal();
}

// --- Bindings ---
function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        if (callbacks.onFooterAction) callbacks.onFooterAction('search');
    });
}
function _bindNavEvents() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) {
        prevBtn.onclick = () => { if (callbacks.onMonthChange) callbacks.onMonthChange('prev'); };
    }
    if (nextBtn) {
        nextBtn.onclick = () => { if (callbacks.onMonthChange) callbacks.onMonthChange('next'); };
    }
}
function _bindFooterEvents() {
    document.getElementById('btn-add-memory')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('add'); });
    document.getElementById('btn-store')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('store'); });
    document.getElementById('btn-shuffle')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('shuffle'); });
    document.getElementById('btn-settings')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('settings'); });
}
function _bindCrumbieEvents() {
    document.getElementById('crumbie-btn')?.addEventListener('click', () => { if (callbacks.onCrumbieClick) callbacks.onCrumbieClick(); });
}
function _bindLoginEvents() {
    const header = document.querySelector('header');
    header?.addEventListener('click', (e) => {
        const loginBtn = e.target.closest('#login-btn');
        const userInfo = e.target.closest('#user-info');
        if (loginBtn && loginBtn.dataset.action === 'login' && callbacks.onLogin) callbacks.onLogin();
        else if (userInfo && callbacks.onLogout) callbacks.onLogout();
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
function setLoading(message, show) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    if (show) {
        appContent.innerHTML = `<p class="loading-message">${message}</p>`;
        showApp(false); // Ocultar otras partes mientras carga
    } else {
        // Solo quitar el mensaje si existe, no tocar el resto
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
        // No llamar a showApp(true) aquí
    }
}

function showApp(show) {
    const display = show ? 'block' : 'none';
    const flexDisplay = show ? 'flex' : 'none';
    const nav = document.querySelector('.month-nav');
    const spotlight = document.getElementById('spotlight-section');
    const appContent = document.getElementById('app-content');

    if (nav) nav.style.display = flexDisplay;
    if (spotlight) spotlight.style.display = display;
    if (appContent) appContent.style.display = show ? 'grid' : 'none'; // Usar grid si el calendario se renderiza

    if (show) {
         // Asegurarse de quitar el mensaje de carga si se muestra la app
         const loading = appContent?.querySelector('.loading-message');
         if (loading) loading.remove();
    }
}

function updateAllDaysData(allDays) {
    if (allDays && allDays.length > 0) {
        _allDaysData = allDays;
        console.log("UI: allDaysData actualizado en UI:", _allDaysData.length);
    } else {
        console.warn("UI: updateAllDaysData recibió datos vacíos.");
        _allDaysData = [];
    }
}

function updateLoginUI(user) {
    const loginBtnContainer = document.getElementById('login-btn-container');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userImg = document.getElementById('user-img');

    if (!loginBtnContainer || !userInfo || !userName || !userImg) return;

    if (user) {
        userInfo.style.display = 'flex';
        userName.textContent = user.displayName || 'Usuario';
        userImg.src = user.photoURL || `https://placehold.co/30x30/ccc/fff?text=${user.displayName ? user.displayName[0] : '?'}`;
        _createLoginButton(false, loginBtnContainer); // No mostrar botón login
    } else {
        userInfo.style.display = 'none';
        _createLoginButton(true, loginBtnContainer); // Mostrar botón login
    }
}

function drawCalendar(monthName, days, todayId) {
    const monthNameDisplay = document.getElementById('month-name-display');
    const appContent = document.getElementById('app-content');

    if (monthNameDisplay) monthNameDisplay.textContent = monthName;
    if (!appContent) return;

    const grid = document.createElement('div');
    grid.className = 'calendario-grid';

    if (!days || days.length === 0) {
        appContent.innerHTML = '<p class="list-placeholder" style="padding: 20px; color: #ccc;">No hay datos del calendario.</p>';
         appContent.style.display = 'block'; // Usar block para el placeholder
        return;
    }

    days.forEach(dia => {
        const btn = document.createElement('button');
        btn.className = 'dia-btn';
        btn.innerHTML = `<span class="dia-numero">${parseInt(dia.id.substring(3))}</span>`;
        if (dia.id === todayId) btn.classList.add('dia-btn-today');
        if (dia.tieneMemorias) btn.classList.add('tiene-memorias');
        btn.addEventListener('click', () => {
            if (callbacks.onDayClick) callbacks.onDayClick(dia);
        });
        grid.appendChild(btn);
    });

    appContent.innerHTML = '';
    appContent.appendChild(grid);
    appContent.style.display = 'grid'; // Usar grid para el calendario
}

function updateSpotlight(dateString, dayName, memories) {
    const titleEl = document.getElementById('spotlight-date-header');
    const listEl = document.getElementById('today-memory-spotlight');
    if (titleEl) titleEl.textContent = dateString;
    if (!listEl) return;
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
        const placeholder = document.createElement('p');
        placeholder.className = 'list-placeholder';
        placeholder.textContent = 'No hay memorias destacadas.';
        containerEl.appendChild(placeholder);
         _destroyActiveMaps();
        return;
    }
     _destroyActiveMaps();
    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'spotlight-memory-item';
        if (mem.Tipo === 'Texto') { itemEl.classList.add('spotlight-item-text'); }
        itemEl.innerHTML = createMemoryItemHTML(mem, false, 'spotlight');
        itemEl.addEventListener('click', () => {
             const diaObj = _allDaysData.find(d => d.id === mem.diaId);
             if (diaObj && callbacks.onDayClick) { callbacks.onDayClick(diaObj); }
             else { console.warn("No se encontró el objeto 'dia' para el spotlight:", mem.diaId); }
        });
        containerEl.appendChild(itemEl);
    });
    _initMapsInContainer(containerEl, 'spotlight');
}


// --- Modal: Vista Previa (Preview) ---
function createPreviewModal() {
    if (previewModal) return;
    previewModal = document.createElement('div');
    previewModal.id = 'preview-modal';
    previewModal.className = 'modal-preview';
    previewModal.innerHTML = `
        <div class="modal-preview-content">
            <div class="modal-preview-header"><h3 id="preview-title"></h3></div>
            <div class="modal-preview-notebook-paper">
                <div class="modal-preview-memorias"><div id="preview-memorias-list"><p class="list-placeholder preview-loading" style="display: none;">Cargando...</p></div></div>
            </div>
            <div class="modal-preview-footer">
                <button id="close-preview-btn" class="aqua-button small">Cerrar</button>
                <button id="edit-from-preview-btn" class="aqua-button small">Editar</button>
            </div>
        </div>`;
    document.body.appendChild(previewModal);
    document.getElementById('close-preview-btn')?.addEventListener('click', closePreviewModal);
    document.getElementById('edit-from-preview-btn')?.addEventListener('click', () => { if (callbacks.onEditFromPreview) callbacks.onEditFromPreview(); });
}
function showPreviewLoading(isLoading) { /* Sin cambios */ }
function openPreviewModal(dia, memories) { /* Sin cambios */ }
function closePreviewModal() { /* Sin cambios */ }


// --- Modal: Edición (Edit/Add) ---
function createEditModal() {
    if (editModal) return;
    editModal = document.createElement('div');
    editModal.id = 'edit-add-modal';
    editModal.className = 'modal-edit';
    editModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header"><h3 id="edit-modal-title-dynamic">Añadir/Editar</h3></div>
            <div class="modal-content-scrollable striped-background-vertical-blue">
                <p class="list-placeholder edit-loading" style="display: none; padding: 20px;">Cargando...</p>
                <div class="edit-content-wrapper">
                    <div class="modal-section" id="day-selection-section" style="display: none;">...</div>
                    <div class="modal-section" id="day-name-section" style="display: none;">...</div>
                    <div class="modal-section memorias-section">
                        <div id="add-memory-button-container" style="display: none;"><button type="button" id="btn-show-add-form" class="aqua-button">Añadir Nueva Memoria</button></div>
                        <form id="memory-form" style="display: none;">
                             <p class="section-description" id="memory-form-title">Añadir/Editar Memoria</p>
                            <label for="memoria-year">Año Original:</label><input type="number" id="memoria-year" placeholder="Año" min="1900" max="2100" required>
                            <label for="memoria-type">Tipo:</label>
                            <select id="memoria-type">
                                <option value="Texto">Nota</option>
                                <option value="Lugar">Lugar</option>
                                <option value="Musica">Canción</option>
                            </select>
                            <div class="add-memory-input-group" id="input-type-Texto" style="display: none;"><label for="memoria-desc">Descripción:</label><textarea id="memoria-desc" placeholder="Escribe tu recuerdo..."></textarea></div>
                            <div class="add-memory-input-group" id="input-type-Lugar" style="display: none;"><label for="memoria-place-search">Buscar Lugar:</label><input type="text" id="memoria-place-search" placeholder="Ej. Torre Eiffel"><button type="button" class="aqua-button" id="btn-search-place">Buscar</button><div id="place-results" class="search-results"></div></div>
                            <div class="add-memory-input-group" id="input-type-Musica" style="display: none;"><label for="memoria-music-search">Buscar Canción:</label><input type="text" id="memoria-music-search" placeholder="Ej. Bohemian Rhapsody"><button type="button" class="aqua-button" id="btn-search-itunes">Buscar</button><div id="itunes-results" class="search-results"></div></div>
                            <button type="submit" id="save-memoria-btn" class="aqua-button">Añadir Memoria</button>
                            <button type="button" id="btn-cancel-mem-edit" class="aqua-button small">Cancelar</button>
                            <p id="memoria-status" class="status-message"></p>
                        </form>
                        <div id="edit-memorias-list-container" style="margin-top: 15px;"><h4 style="margin-top: 0;">Memorias Existentes</h4><div id="edit-memorias-list"></div></div>
                    </div>
                </div>
            </div>
            <div class="modal-main-buttons"><button id="close-edit-add-btn" class="aqua-button">Cerrar</button></div>
        </div>`;
    document.body.appendChild(editModal);
    _bindEditModalEvents();
}
function showEditLoading(isLoading) { /* Sin cambios */ }
async function handleNameSelectedDay() { /* Sin cambios */ }
function _bindEditModalEvents() { /* Sin cambios */ }
function _showMemoryForm(show) { /* Sin cambios */ }
function openEditModal(dia, memories) { /* Sin cambios */ }
function closeEditModal() { /* Sin cambios */ }


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
    const categoryList = storeModal.querySelector('.store-category-list');
    if (categoryList) {
        categoryList.appendChild(createStoreCategoryButton('Nombres', 'label', 'Días Nombrados'));
        categoryList.appendChild(createStoreCategoryButton('Texto', 'article', 'Notas'));
        categoryList.appendChild(createStoreCategoryButton('Lugar', 'place', 'Lugares'));
        categoryList.appendChild(createStoreCategoryButton('Musica', 'music_note', 'Canciones'));
        categoryList.addEventListener('click', (e) => {
            const btn = e.target.closest('.store-category-button');
            if (btn && callbacks.onStoreCategoryClick) { callbacks.onStoreCategoryClick(btn.dataset.type); }
        });
    } else { console.error("Error: no se encontró '.store-category-list'"); }
    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);
}
function openStoreModal() { /* Sin cambios */ }
function closeStoreModal() { /* Sin cambios */ }

// --- Modal: Lista del Almacén (Store List) ---
function createStoreListModal() {
    if (storeListModal) return;
    storeListModal = document.createElement('div');
    storeListModal.id = 'store-list-modal';
    storeListModal.className = 'modal-store-list';
    storeListModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header"><h3 id="store-list-modal-title">Cargando...</h3></div>
            <div class="modal-content-scrollable striped-background-vertical-blue" id="store-list-content"></div>
            <div class="modal-main-buttons"><button id="close-store-list-btn" class="aqua-button">Cerrar</button></div>
        </div>`;
    document.body.appendChild(storeListModal);
    _bindStoreListModalEvents();
}
function _bindStoreListModalEvents() { /* Sin cambios */ }
function openStoreListModal(title) { /* Sin cambios */ }
function closeStoreListModal() { /* Sin cambios */ }
function updateStoreList(items, append = false, hasMore = false) { /* Sin cambios */ }

// --- Modales: Alerta, Prompt, Confirmación ---
function createAlertPromptModal() { /* Sin cambios */ }
function _bindAlertPromptEvents() { /* Sin cambios */ }
function closeAlertPromptModal(isOk) { /* Sin cambios */ }
function showAlert(message, type = 'default') { /* Sin cambios */ }
function showPrompt(message, defaultValue = '', type = 'default') { /* Sin cambios */ }
function createConfirmModal() { /* Sin cambios */ }
function _bindConfirmModalEvents() { /* Sin cambios */ }
function closeConfirmModal(isConfirmed) { /* Sin cambios */ }
function showConfirm(message) { /* Sin cambios */ }


// --- Funciones de Ayuda (Helpers) de UI ---
function _renderMap(containerId, lat, lon, zoom = 13) { /* Sin cambios */ }
function _initMapsInContainer(containerEl, prefix) { /* Sin cambios */ }
function _destroyActiveMaps() { /* Sin cambios */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { /* Sin cambios */ }
function updateMemoryList(memories) { /* Sin cambios */ }

function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') {
    // ... (Código igual que v2.67, asegurando el ID de mapa simple) ...
    if (!mem) return '';
    const memId = (mem && mem.id) ? mem.id : '';
    let yearStr = 'Año desc.';
    // ... (resto cálculo yearStr) ...
    let contentHTML = `<small>${yearStr}</small>`;
    let artworkHTML = '';
    let icon = 'article';
    let mapHTML = '';
    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            contentHTML += `${mem.LugarNombre || 'Lugar'}`;
            if (mem.LugarData?.lat && mem.LugarData?.lon) {
                const mapContainerId = `${mapIdPrefix}-map-${memId || Date.now()}`; // ID Simple
                const mapClass = (mapIdPrefix === 'spotlight') ? 'spotlight-map-container' : 'memoria-map-container';
                mapHTML = `<div id="${mapContainerId}" class="${mapClass}" data-lat="${mem.LugarData.lat}" data-lon="${mem.LugarData.lon}" data-zoom="13">Cargando mapa...</div>`;
            }
            break;
        case 'Musica': /* ... */ break;
        // case 'Imagen': eliminado
        default: /* ... */ break;
    }
    // ... (resto construcción HTML) ...
     if (!artworkHTML) { artworkHTML = `<span class="memoria-icon material-icons-outlined">${icon}</span>`; }
     const actionsHTML = (showActions && memId) ? `...` : '';
     const mainContentHTML = `...`;
     return mainContentHTML + mapHTML;
}

function createStoreCategoryButton(type, icon, label) { /* Sin cambios */ }
function createStoreListItem(item) { /* Sin cambios */ }
function _createLoginButton(isLoggedOut, container) { /* Sin cambios */ }

// --- Lógica del Formulario de Memorias ---
let _selectedMusic = null;
let _selectedPlace = null;

function _handleFormSubmit(e) {
    e.preventDefault();
    if (!callbacks.onSaveMemory) return;

    const saveBtn = document.getElementById('save-memoria-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    let diaId = _currentDay ? _currentDay.id : document.getElementById('edit-mem-day').value;
    if (!diaId) {
        // Manejo de error si no hay diaId
        console.error("No se pudo determinar el día para guardar.");
        showModalStatus('memoria-status', 'Error: Día no seleccionado.', true);
        saveBtn.disabled = false;
        saveBtn.textContent = _isEditingMemory ? 'Actualizar Memoria' : 'Añadir Memoria';
        return;
    }


    const form = document.getElementById('memory-form');
    const yearInput = document.getElementById('memoria-year').value;
    const type = document.getElementById('memoria-type').value;

    // Crear formData base
    const formData = {
        id: _isEditingMemory ? form.dataset.editingId : null,
        year: yearInput ? parseInt(yearInput) : null, // Asegurar que sea número o null
        Tipo: type,
    };

    // Añadir datos específicos del tipo
    switch (type) {
        case 'Texto':
            formData.Descripcion = document.getElementById('memoria-desc').value;
            break;
        case 'Lugar':
            if (_selectedPlace) {
                formData.LugarNombre = _selectedPlace.name;
                formData.LugarData = _selectedPlace.data; // Guardar el objeto completo
            } else {
                // Guardar solo el texto si no se seleccionó nada
                formData.LugarNombre = document.getElementById('memoria-place-search').value;
                formData.LugarData = null;
            }
            break;
        case 'Musica':
            if (_selectedMusic) {
                formData.CancionInfo = `${_selectedMusic.trackName} - ${_selectedMusic.artistName}`;
                formData.CancionData = _selectedMusic; // Guardar el objeto completo
            } else {
                formData.CancionInfo = document.getElementById('memoria-music-search').value;
                formData.CancionData = null;
            }
            break;
    }

    // Llamar al callback de main.js
    callbacks.onSaveMemory(diaId, formData, _isEditingMemory);

    // Nota: El finally en main.js reactivará el botón si todo va bien o hay error
}


function handleMemoryTypeChange() {
    const type = document.getElementById('memoria-type').value;
    // Asegurar que solo el input correcto esté visible
    ['Texto', 'Lugar', 'Musica'].forEach(id => {
        const el = document.getElementById(`input-type-${id}`);
        if (el) el.style.display = (id === type) ? 'block' : 'none';
    });
    // Limpiar resultados si se cambia de tipo
    if (type !== 'Musica') showMusicResults([]);
    if (type !== 'Lugar') showPlaceResults([]);
}

function fillFormForEdit(mem) {
    if (!mem) return;
    resetMemoryForm();
    _isEditingMemory = true;
    const form = document.getElementById('memory-form');
    const saveBtn = document.getElementById('save-memoria-btn');
    const typeSelect = document.getElementById('memoria-type');
    form.dataset.editingId = mem.id;
    saveBtn.textContent = 'Actualizar Memoria';
    // ... (resto llenado año, tipo igual) ...
     if (mem.Fecha_Original) { /* ... */ } else { /* ... */ }
     const exists = Array.from(typeSelect.options).some(o => o.value === mem.Tipo);
     typeSelect.value = exists ? mem.Tipo : 'Texto';
    handleMemoryTypeChange(); // Muy importante llamar *después* de setear el tipo

    switch (mem.Tipo) {
        case 'Texto': document.getElementById('memoria-desc').value = mem.Descripcion || ''; break;
        case 'Lugar':
            document.getElementById('memoria-place-search').value = mem.LugarNombre || '';
            if (mem.LugarData) { _selectedPlace = { name: mem.LugarNombre, data: mem.LugarData }; showPlaceResults([_selectedPlace.data], true); }
            break;
        case 'Musica':
             document.getElementById('memoria-music-search').value = mem.CancionInfo || '';
             if (mem.CancionData) { _selectedMusic = mem.CancionData; showMusicResults([_selectedMusic], true); }
            break;
    }
    _showMemoryForm(true);
    document.querySelector('.modal-content-scrollable')?.scrollTo({ top: form.offsetTop - 20, behavior: 'smooth' });
}

function resetMemoryForm() {
    _isEditingMemory = false;
    _selectedMusic = null;
    _selectedPlace = null;
    const form = document.getElementById('memory-form');
    if (!form) return;
    form.reset();
    form.dataset.editingId = '';
    document.getElementById('memoria-type').value = 'Texto';
    document.getElementById('itunes-results').innerHTML = '';
    document.getElementById('place-results').innerHTML = '';
    showModalStatus('memoria-status', '', false);
    const saveBtn = document.getElementById('save-memoria-btn');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Añadir Memoria'; }
    // Llamar aquí para asegurar que solo se muestre el campo de Texto
    handleMemoryTypeChange();
}


function showMusicResults(tracks, isSelected = false) {
    console.log("[DEBUG UI] showMusicResults:", tracks, isSelected); // Log
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) { console.error("[DEBUG UI] #itunes-results not found"); return; }
    resultsEl.innerHTML = '';
    _selectedMusic = null;

    if (isSelected && tracks && tracks.length > 0) {
        // ... (Mostrar seleccionado) ...
        const track = tracks[0]; _selectedMusic = track;
        const displayName = track.trackName || track.title || 'Canción';
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        return;
    }
    if (!tracks || tracks.length === 0) {
        // resultsEl.innerHTML = `<p>No hay resultados</p>`; // Opcional
        return;
    }
    tracks.forEach(track => {
        // ... (Crear elemento itemEl igual que antes) ...
        const itemEl = document.createElement('div'); /*...*/
        itemEl.addEventListener('click', () => {
            _selectedMusic = track;
            document.getElementById('memoria-music-search').value = `${track.trackName} - ${track.artistName}`;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${track.trackName}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}

function showPlaceResults(places, isSelected = false) {
    console.log("[DEBUG UI] showPlaceResults:", places, isSelected); // Log
    const resultsEl = document.getElementById('place-results');
    if (!resultsEl) { console.error("[DEBUG UI] #place-results not found"); return; }
    resultsEl.innerHTML = '';
    _selectedPlace = null;

    if (isSelected && places && places.length > 0) {
        // ... (Mostrar seleccionado) ...
        const placeData = places[0]; _selectedPlace = { name: placeData.display_name, data: placeData };
        const displayName = placeData.display_name ? placeData.display_name.substring(0,50)+'...' : 'Lugar';
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        return;
    }
    if (!places || places.length === 0) {
        // resultsEl.innerHTML = `<p>No hay resultados</p>`; // Opcional
        return;
    }
    places.forEach(place => {
        // ... (Crear elemento itemEl igual que antes) ...
        const itemEl = document.createElement('div'); /*...*/
        itemEl.addEventListener('click', () => {
            _selectedPlace = { name: place.display_name, data: place };
            document.getElementById('memoria-place-search').value = place.display_name;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${place.display_name.split(',')[0]}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}

function showModalStatus(elementId, message, isError) { /* Sin cambios */ }

// --- Crumbie ---
function showCrumbieAnimation(message) { /* Sin cambios */ }


// --- Exportaciones Públicas ---
// Asegúrate de que setLoading está aquí
export const ui = {
    init,
    setLoading, // <--- VERIFICA QUE ESTÁ AQUÍ
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

console.log('ui.js loaded and ui object created:', ui); // <-- Log de diagnóstico al final
