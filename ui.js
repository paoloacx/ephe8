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
    console.log("UI Module init (v2.67 - Form fixes, Remove Imagen Type)"); // Versión
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
// ... (Sin cambios aquí, iguales a v2.66) ...
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
// ... (Sin cambios aquí, iguales a v2.66) ...
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
    const display = show ? 'block' : 'none';
    const flexDisplay = show ? 'flex' : 'none';
    const nav = document.querySelector('.month-nav');
    const spotlight = document.getElementById('spotlight-section');
    const appContent = document.getElementById('app-content');
    if (nav) nav.style.display = flexDisplay;
    if (spotlight) spotlight.style.display = display;
    if (appContent) appContent.style.display = show ? 'grid' : 'none';
    if (show) {
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
        _createLoginButton(false, loginBtnContainer);
    } else {
        userInfo.style.display = 'none';
        _createLoginButton(true, loginBtnContainer);
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
         appContent.style.display = 'block';
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
    appContent.style.display = 'grid';
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
        if (mem.Tipo === 'Texto') {
            itemEl.classList.add('spotlight-item-text');
        }
        itemEl.innerHTML = createMemoryItemHTML(mem, false, 'spotlight');
        itemEl.addEventListener('click', () => {
             const diaObj = _allDaysData.find(d => d.id === mem.diaId);
             if (diaObj && callbacks.onDayClick) {
                 callbacks.onDayClick(diaObj);
            } else {
                console.warn("No se encontró el objeto 'dia' para el spotlight:", mem.diaId);
            }
        });
        containerEl.appendChild(itemEl);
    });
    _initMapsInContainer(containerEl, 'spotlight');
}


// --- Modal: Vista Previa (Preview) ---
// ... (Sin cambios aquí, iguales a v2.65) ...
function createPreviewModal() {
    if (previewModal) return;
    previewModal = document.createElement('div');
    previewModal.id = 'preview-modal';
    previewModal.className = 'modal-preview';
    previewModal.innerHTML = `...`; // Mismo HTML que v2.65
    document.body.appendChild(previewModal);
    document.getElementById('close-preview-btn')?.addEventListener('click', closePreviewModal);
    document.getElementById('edit-from-preview-btn')?.addEventListener('click', () => {
        if (callbacks.onEditFromPreview) callbacks.onEditFromPreview();
    });
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
            <div class="modal-preview-header">
                 <h3 id="edit-modal-title-dynamic">Añadir/Editar</h3>
            </div>
            <div class="modal-content-scrollable striped-background-vertical-blue"> <p class="list-placeholder edit-loading" style="display: none; padding: 20px;">Cargando...</p>
                <div class="edit-content-wrapper">
                    <div class="modal-section" id="day-selection-section" style="display: none;">
                        <label for="edit-mem-day">Día (MM-DD):</label>
                        <div class="day-selection-controls">
                            <select id="edit-mem-day"></select>
                            <button type="button" id="btn-name-selected-day" class="aqua-button small" title="Nombrar Día Seleccionado">Nombrar</button>
                        </div>
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
                        <div id="add-memory-button-container" style="display: none;">
                           <button type="button" id="btn-show-add-form" class="aqua-button">Añadir Nueva Memoria</button>
                        </div>
                        <form id="memory-form" style="display: none;">
                             <p class="section-description" id="memory-form-title">Añadir/Editar Memoria</p>
                            <label for="memoria-year">Año Original:</label>
                            <input type="number" id="memoria-year" placeholder="Año" min="1900" max="2100" required>
                            <label for="memoria-type">Tipo:</label>
                            <select id="memoria-type">
                                <option value="Texto">Nota</option>
                                <option value="Lugar">Lugar</option>
                                <option value="Musica">Canción</option>
                                </select>
                            <div class="add-memory-input-group" id="input-type-Texto" style="display: none;"> <label for="memoria-desc">Descripción:</label>
                                <textarea id="memoria-desc" placeholder="Escribe tu recuerdo..."></textarea>
                            </div>
                            <div class="add-memory-input-group" id="input-type-Lugar" style="display: none;">
                                <label for="memoria-place-search">Buscar Lugar:</label>
                                <input type="text" id="memoria-place-search" placeholder="Ej. Torre Eiffel">
                                <button type="button" class="aqua-button" id="btn-search-place">Buscar</button>
                                <div id="place-results" class="search-results"></div>
                            </div>
                            <div class="add-memory-input-group" id="input-type-Musica" style="display: none;">
                                <label for="memoria-music-search">Buscar Canción:</label>
                                <input type="text" id="memoria-music-search" placeholder="Ej. Bohemian Rhapsody">
                                <button type="button" class="aqua-button" id="btn-search-itunes">Buscar</button>
                                <div id="itunes-results" class="search-results"></div>
                            </div>
                            <button type="submit" id="save-memoria-btn" class="aqua-button">Añadir Memoria</button>
                            <button type="button" id="btn-cancel-mem-edit" class="aqua-button small">Cancelar</button>
                            <p id="memoria-status" class="status-message"></p>
                        </form>
                        <div id="edit-memorias-list-container" style="margin-top: 15px;">
                            <h4 style="margin-top: 0;">Memorias Existentes</h4>
                            <div id="edit-memorias-list"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-main-buttons">
                <button id="close-edit-add-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
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
            <div class="modal-preview-header">
                 <h3 id="store-modal-title">Almacén</h3>
            </div>
            <div class="modal-content-scrollable store-category-list striped-background-vertical-blue"> </div>
            <div class="modal-main-buttons">
                <button id="close-store-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(storeModal);

    const categoryList = storeModal.querySelector('.store-category-list');
    if (categoryList) {
        categoryList.appendChild(createStoreCategoryButton('Nombres', 'label', 'Días Nombrados'));
        categoryList.appendChild(createStoreCategoryButton('Texto', 'article', 'Notas'));
        categoryList.appendChild(createStoreCategoryButton('Lugar', 'place', 'Lugares'));
        categoryList.appendChild(createStoreCategoryButton('Musica', 'music_note', 'Canciones'));
        // ***** CAMBIO: Botón Imagen eliminado *****
        // categoryList.appendChild(createStoreCategoryButton('Imagen', 'image', 'Imágenes'));

        categoryList.addEventListener('click', (e) => {
            const btn = e.target.closest('.store-category-button');
            if (btn && callbacks.onStoreCategoryClick) {
                callbacks.onStoreCategoryClick(btn.dataset.type);
            }
        });
    } else {
        console.error("Error al crear modal de almacén: no se encontró '.store-category-list'");
    }

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
            <div class="modal-preview-header">
                 <h3 id="store-list-modal-title">Cargando...</h3>
            </div>
             <div class="modal-content-scrollable striped-background-vertical-blue" id="store-list-content"> </div>
            <div class="modal-main-buttons">
                <button id="close-store-list-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(storeListModal);
    _bindStoreListModalEvents();
}
function _bindStoreListModalEvents() { /* Sin cambios */ }
function openStoreListModal(title) { /* Sin cambios */ }
function closeStoreListModal() { /* Sin cambios */ }
function updateStoreList(items, append = false, hasMore = false) { /* Sin cambios */ }

// --- Modales: Alerta, Prompt, Confirmación ---
// ... (Sin cambios) ...

// --- Funciones de Ayuda (Helpers) de UI ---
function _renderMap(containerId, lat, lon, zoom = 13) { /* Sin cambios */ }
function _initMapsInContainer(containerEl, prefix) { /* Sin cambios */ }
function _destroyActiveMaps() { /* Sin cambios */ }
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { /* Sin cambios */ }
function updateMemoryList(memories) { /* Sin cambios */ }

function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') {
    if (!mem) return '';
    const memId = (mem && mem.id) ? mem.id : '';

    let yearStr = 'Año desc.';
    if (mem.Fecha_Original) {
        try {
            const date = mem.Fecha_Original.seconds ? new Date(mem.Fecha_Original.seconds * 1000) : new Date(mem.Fecha_Original);
            if (!isNaN(date)) {
                yearStr = date.getFullYear();
            }
        } catch (e) { console.warn("Fecha inválida:", mem.Fecha_Original, e); }
    }

    let contentHTML = `<small>${yearStr}</small>`;
    let artworkHTML = '';
    let icon = 'article';
    let mapHTML = '';

    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            contentHTML += `${mem.LugarNombre || 'Lugar sin nombre'}`;
            if (mem.LugarData && mem.LugarData.lat && mem.LugarData.lon) {
                const lat = mem.LugarData.lat;
                const lon = mem.LugarData.lon;
                // ***** CAMBIO: ID de mapa simplificado (revertido) *****
                const mapContainerId = `${mapIdPrefix}-map-${memId || Date.now()}`;
                const mapClass = (mapIdPrefix === 'spotlight') ? 'spotlight-map-container' : 'memoria-map-container';
                mapHTML = `<div id="${mapContainerId}"
                                class="${mapClass}"
                                data-lat="${lat}"
                                data-lon="${lon}"
                                data-zoom="13">Cargando mapa...</div>`;
            }
            break;
        case 'Musica':
            // ... (lógica Musica sin cambios) ...
            icon = 'music_note';
            const trackName = mem.CancionData?.trackName || mem.CancionData?.title;
            const artistName = mem.CancionData?.artistName || mem.CancionData?.artist?.name;
            const artwork = mem.CancionData?.artworkUrl60 || mem.CancionData?.album?.cover_small;
            if (trackName) {
                contentHTML += `<strong>${trackName}</strong> <span class="artist-name">by ${artistName || 'Artista desc.'}</span>`;
                if(artwork) { artworkHTML = `<img src="${artwork}" class="memoria-artwork" alt="Artwork">`; }
            } else { contentHTML += `${mem.CancionInfo || 'Canción sin nombre'}`; }
            break;
        // ***** CAMBIO: Case Imagen eliminado *****
        case 'Texto':
        default:
            icon = 'article';
            contentHTML += mem.Descripcion || 'Nota vacía';
            break;
    }

    if (!artworkHTML) {
        artworkHTML = `<span class="memoria-icon material-icons-outlined">${icon}</span>`;
    }

    const actionsHTML = (showActions && memId) ? `...` : ''; // Sin cambios

    const mainContentHTML = `...`; // Sin cambios
    
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
    if (callbacks.onSaveMemory) {
        const saveBtn = document.getElementById('save-memoria-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        let diaId;
         if (_currentDay) {
             diaId = _currentDay.id;
        } else {
            diaId = document.getElementById('edit-mem-day').value;
             // Intentar encontrar el día en _allDaysData para actualizar estado local si es necesario después
            _currentDay = _allDaysData.find(d => d.id === diaId) || null;
            if(!_currentDay && diaId) { // Fallback si no se encontró, crear objeto temporal
                 _currentDay = { id: diaId, Nombre_Dia: diaId }; // Necesitamos al menos el ID
                 console.warn("Día no encontrado en _allDaysData al guardar, usando objeto temporal:", diaId);
            } else if (!diaId) {
                console.error("Error crítico: No se pudo determinar el día para guardar la memoria.");
                showModalStatus('memoria-status', 'Error: Día no válido.', true);
                 saveBtn.disabled = false;
                 saveBtn.textContent = 'Añadir Memoria';
                return;
            }
        }

        const form = document.getElementById('memory-form');
        const year = document.getElementById('memoria-year').value;

        const formData = {
            id: _isEditingMemory ? form.dataset.editingId : null,
            year: year ? parseInt(year) : null,
            Tipo: document.getElementById('memoria-type').value,
        };

        switch (formData.Tipo) {
            case 'Texto':
                formData.Descripcion = document.getElementById('memoria-desc').value;
                break;
            case 'Lugar':
                if (_selectedPlace) {
                    formData.LugarNombre = _selectedPlace.name;
                    formData.LugarData = { /* ... */ };
                } else {
                    formData.LugarNombre = document.getElementById('memoria-place-search').value;
                    formData.LugarData = null;
                }
                break;
            case 'Musica':
                 if (_selectedMusic) {
                    formData.CancionInfo = `${_selectedMusic.trackName} - ${_selectedMusic.artistName}`;
                    formData.CancionData = { /* ... */ };
                } else {
                    formData.CancionInfo = document.getElementById('memoria-music-search').value;
                    formData.CancionData = null;
                }
                break;
            // ***** CAMBIO: Case Imagen eliminado *****
        }

        callbacks.onSaveMemory(diaId, formData, _isEditingMemory);
    }
}

function handleMemoryTypeChange() {
    const type = document.getElementById('memoria-type').value;
    // ***** CAMBIO: Array actualizado sin 'Imagen' *****
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

    if (mem.Fecha_Original) {
        try {
            const date = mem.Fecha_Original.seconds ? new Date(mem.Fecha_Original.seconds * 1000) : new Date(mem.Fecha_Original);
             if (!isNaN(date)) document.getElementById('memoria-year').value = date.getFullYear();
             else document.getElementById('memoria-year').value = '';
        } catch(e) { document.getElementById('memoria-year').value = ''; }
    } else {
         document.getElementById('memoria-year').value = '';
    }

    // Asegurarse de que el tipo exista en el select antes de asignarlo
    const exists = Array.from(typeSelect.options).some(option => option.value === mem.Tipo);
    if (exists) {
        typeSelect.value = mem.Tipo;
    } else {
        console.warn(`Tipo de memoria inválido o no soportado al editar: ${mem.Tipo}. Se usará 'Texto'.`);
        typeSelect.value = 'Texto'; // Fallback a Texto
    }
    handleMemoryTypeChange(); // Mostrar campos correctos

    switch (mem.Tipo) {
        case 'Texto':
            document.getElementById('memoria-desc').value = mem.Descripcion || '';
            break;
        case 'Lugar':
            document.getElementById('memoria-place-search').value = mem.LugarNombre || '';
            if (mem.LugarData) {
                _selectedPlace = { name: mem.LugarNombre, data: mem.LugarData };
                showPlaceResults([_selectedPlace.data], true);
            }
            break;
        case 'Musica':
             document.getElementById('memoria-music-search').value = mem.CancionInfo || '';
             if (mem.CancionData) {
                _selectedMusic = mem.CancionData;
                showMusicResults([_selectedMusic], true);
             }
            break;
        // ***** CAMBIO: Case Imagen eliminado *****
    }

    _showMemoryForm(true); // Mostrar el formulario lleno

    // Scroll al formulario
    document.querySelector('.modal-content-scrollable')?.scrollTo({
        top: form.offsetTop - 20, // Pequeño offset superior
        behavior: 'smooth'
    });
}

function resetMemoryForm() {
    _isEditingMemory = false;
    _selectedMusic = null;
    _selectedPlace = null;

    const form = document.getElementById('memory-form');
    if (!form) return;

    form.reset();
    form.dataset.editingId = '';
    // ***** CAMBIO: Eliminar dataset de Imagen *****
    // form.dataset.existingImageUrl = '';

    document.getElementById('memoria-type').value = 'Texto'; // Valor por defecto

    document.getElementById('itunes-results').innerHTML = '';
    document.getElementById('place-results').innerHTML = '';
    showModalStatus('memoria-status', '', false);
    // ***** CAMBIO: Eliminar estado de Imagen *****
    // showModalStatus('image-upload-status', '', false);

    const saveBtn = document.getElementById('save-memoria-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Añadir Memoria';
    }

    // ***** CAMBIO: Llamar explícitamente para asegurar visibilidad correcta *****
    handleMemoryTypeChange();
}

function showMusicResults(tracks, isSelected = false) {
    console.log("[DEBUG UI] showMusicResults llamada con:", tracks, "isSelected:", isSelected); // Log
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) {
        console.error("[DEBUG UI] No se encontró el contenedor #itunes-results");
        return;
    }
    resultsEl.innerHTML = ''; // Limpiar siempre
    _selectedMusic = null; // Resetear selección

    if (isSelected && tracks && tracks.length > 0) {
        const track = tracks[0];
        _selectedMusic = track;
        const displayName = track.trackName || track.title || 'Canción seleccionada';
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        console.log("[DEBUG UI] Mostrando música seleccionada:", displayName);
        return;
    }

    if (!tracks || tracks.length === 0) {
        console.log("[DEBUG UI] No hay resultados de música para mostrar.");
        // Opcional: Mostrar mensaje "No se encontraron resultados"
        // resultsEl.innerHTML = `<p class="list-placeholder" style="padding: 10px;">No se encontraron canciones.</p>`;
        return;
    }

    console.log("[DEBUG UI] Mostrando", tracks.length, "resultados de música.");
    tracks.forEach(track => {
        // ... (resto del código para crear elemento igual) ...
        const trackName = track.trackName;
        const artistName = track.artistName;
        const artwork = track.artworkUrl60;
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `...`; // Mismo HTML
        itemEl.addEventListener('click', () => { /* ... */ });
        resultsEl.appendChild(itemEl);
    });
}

function showPlaceResults(places, isSelected = false) {
    console.log("[DEBUG UI] showPlaceResults llamada con:", places, "isSelected:", isSelected); // Log
    const resultsEl = document.getElementById('place-results');
     if (!resultsEl) {
        console.error("[DEBUG UI] No se encontró el contenedor #place-results");
        return;
    }
    resultsEl.innerHTML = '';
    _selectedPlace = null;

    if (isSelected && places && places.length > 0) {
        const placeData = places[0];
        _selectedPlace = { name: placeData.display_name, data: placeData };
        const displayName = placeData.display_name ? placeData.display_name.substring(0, 50) + '...' : "Lugar seleccionado";
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        console.log("[DEBUG UI] Mostrando lugar seleccionado:", displayName);
        return;
    }

    if (!places || places.length === 0) {
        console.log("[DEBUG UI] No hay resultados de lugares para mostrar.");
        // Opcional: Mostrar mensaje "No se encontraron resultados"
        // resultsEl.innerHTML = `<p class="list-placeholder" style="padding: 10px;">No se encontraron lugares.</p>`;
        return;
    }

    console.log("[DEBUG UI] Mostrando", places.length, "resultados de lugares.");
    places.forEach(place => {
        // ... (resto del código para crear elemento igual) ...
        const displayName = place.display_name;
        const shortName = displayName.split(',')[0];
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `...`; // Mismo HTML
        itemEl.addEventListener('click', () => { /* ... */ });
        resultsEl.appendChild(itemEl);
    });
}

function showModalStatus(elementId, message, isError) { /* Sin cambios */ }

// --- Crumbie ---
function showCrumbieAnimation(message) { /* Sin cambios */ }


// --- Exportaciones Públicas ---
export const ui = { /* Sin cambios */ };
