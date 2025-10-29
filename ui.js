/*
 * ui.js (v4.20.5 - Fixed search and settings buttons)
 * Módulo de interfaz de usuario.
 */

// --- Variables privadas del módulo (Estado de la UI) ---
let callbacks = {};
let _currentDay = null;
let _currentMemories = [];
let _allDaysData = [];
let _isEditingMemory = false;
let _selectedMusic = null;
let _selectedPlace = null;

// Modales
let alertPromptModal = null;
let _promptResolve = null;
let confirmModal = null;
let _confirmResolve = null;
let previewModal = null;
let editModal = null;
let storeModal = null;
let storeListModal = null;

// --- INICIO: FUNCIONES HELPER / UTILIDADES (Definidas Primero) ---

function showModalStatus(elementId, message, isError) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = isError ? 'status-message error' : 'status-message success';
    if (message && !isError) {
        setTimeout(() => { if (statusEl.textContent === message) { statusEl.textContent = ''; statusEl.className = 'status-message'; } }, 3000);
    }
}

function showMusicResults(tracks, isSelected = false) {
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    _selectedMusic = null;

    if (isSelected && tracks && tracks.length > 0) {
        const track = tracks[0];
        _selectedMusic = track;
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${track.trackName}</p>`;
        return;
    }

    if (!tracks || tracks.length === 0) return;

    tracks.forEach(track => {
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        const artwork = track.artworkUrl60 || '';
        itemEl.innerHTML = `
            <img src="${artwork}" class="memoria-artwork" alt="" ${artwork ? '' : 'style="display:none;"'}>
            <div class="memoria-item-content">
                <small>${track.artistName}</small>
                <strong>${track.trackName}</strong>
            </div>
            <span class="material-icons-outlined">add_circle_outline</span>
        `;
        itemEl.addEventListener('click', () => {
            _selectedMusic = track;
            document.getElementById('memoria-music-search').value = `${track.trackName} - ${track.artistName}`;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${track.trackName}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}

function showPlaceResults(places, isSelected = false) {
    const resultsEl = document.getElementById('place-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    _selectedPlace = null;

    if (isSelected && places && places.length > 0) {
        const place = places[0];
        const displayName = place.display_name || place.name || 'Lugar seleccionado';
        _selectedPlace = { name: displayName, data: place };
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        return;
    }

    if (!places || places.length === 0) return;

    places.forEach(place => {
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        const displayName = place.display_name || 'Lugar sin nombre';
        itemEl.innerHTML = `
            <span class="memoria-icon material-icons-outlined">place</span>
            <div class="memoria-item-content"><strong>${displayName}</strong></div>
            <span class="material-icons-outlined">add_circle_outline</span>
        `;
        itemEl.addEventListener('click', () => {
            _selectedPlace = { name: displayName, data: place };
            document.getElementById('memoria-place-search').value = displayName;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName.substring(0, 40)}...</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}

function _showMemoryForm(show) {
    const form = document.getElementById('memory-form');
    const listContainer = document.getElementById('edit-memorias-list-container');
    if (form) form.style.display = show ? 'block' : 'none';
    if (listContainer) listContainer.style.display = show ? 'none' : 'block';
}

function createMemoryItemHTML(mem, showActions) {
    if (!mem) return '';
    const memId = mem.id || '';

    let yearStr = 'Año desc.';
    if (mem.Fecha_Original) {
        try {
            const date = new Date(mem.Fecha_Original.seconds * 1000 || mem.Fecha_Original);
            if (!isNaN(date)) yearStr = date.getFullYear();
        } catch (e) { console.warn("Fecha inválida:", mem.Fecha_Original); }
    }

    let contentHTML = `<small>${yearStr}</small>`;
    let artworkHTML = '';
    let icon = 'article';

    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            contentHTML += `${mem.LugarNombre || 'Lugar sin nombre'}`;
            break;
        case 'Musica':
            icon = 'music_note';
            if (mem.CancionData?.trackName) {
                contentHTML += `<strong>${mem.CancionData.trackName}</strong> <span class="artist-name">by ${mem.CancionData.artistName}</span>`;
                if(mem.CancionData.artworkUrl60) artworkHTML = `<img src="${mem.CancionData.artworkUrl60}" class="memoria-artwork" alt="Artwork">`;
            } else { contentHTML += `${mem.CancionInfo || 'Canción sin nombre'}`; }
            break;
        case 'Texto': default:
            icon = 'article';
            contentHTML += (mem.Descripcion || 'Nota vacía');
            break;
    }

    if (!artworkHTML) artworkHTML = `<span class="memoria-icon material-icons-outlined">${icon}</span>`;

    const actionsHTML = (showActions && memId) ? `
        <div class="memoria-actions">
            <button class="edit-btn" title="Editar" data-memoria-id="${memId}"><span class="material-icons-outlined">edit</span></button>
            <button class="delete-btn" title="Borrar" data-memoria-id="${memId}"><span class="material-icons-outlined">delete</span></button>
        </div>` : '';

    return `${artworkHTML}<div class="memoria-item-content">${contentHTML}</div>${actionsHTML}`;
}

function createStoreCategoryButton(type, icon, label) {
    return `
        <button class="store-category-button" data-type="${type}">
            <span class="material-icons-outlined">${icon}</span>
            <span>${label}</span>
            <span class="material-icons-outlined">chevron_right</span>
        </button>`;
}

function createStoreListItem(item) {
    const itemEl = document.createElement('div');
    itemEl.className = 'store-list-item';
    let contentHTML = '';
    if (item.type === 'Nombres') {
        itemEl.dataset.diaId = item.id;
        contentHTML = `<span class="memoria-icon material-icons-outlined">label</span><div class="memoria-item-content"><small>${item.Nombre_Dia}</small><strong>${item.Nombre_Especial}</strong></div>`;
    } else {
        itemEl.dataset.diaId = item.diaId;
        itemEl.dataset.id = item.id;
        const memoryHTML = createMemoryItemHTML(item, false);
        contentHTML = `${memoryHTML}<div class="store-item-day-ref">${item.Nombre_Dia}</div>`;
    }
    itemEl.innerHTML = contentHTML;
    return itemEl;
}

function _createLoginButton(isLoggedIn, container) {
    if (!container) return;
    const btn = document.createElement('button');
    btn.id = 'login-btn';
    btn.className = 'header-login-btn';
    if (isLoggedIn) {
        btn.title = 'Cerrar sesión';
        btn.dataset.action = 'logout';
        btn.innerHTML = `<span class="material-icons-outlined">logout</span>`;
    } else {
        btn.title = 'Iniciar sesión con Google';
        btn.dataset.action = 'login';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.20455c0-.63864-.05727-1.25182-.16909-1.84091H9v3.48182h4.84364c-.20864 1.125-.84273 2.07818-1.77727 2.71136v2.25818h2.90864c1.70182-1.56682 2.68409-3.87409 2.68409-6.61045z"/><path fill="#34A853" d="M9 18c2.43 0 4.47182-.80591 5.96273-2.18045l-2.90864-2.25818c-.80591.54364-1.83682.86591-2.94.86591-2.27318 0-4.20727-1.53318-4.9-3.58227H1.07182v2.33318C2.56636 16.3 5.56 18 9 18z"/><path fill="#FBBC05" d="M4.1 10.71c-.22-.64-.35-1.32-.35-2.03s.13-.139.35-2.03V4.31H1.07C.38 5.67 0 7.29 0 9.03s.38 3.36 1.07 4.72l3.03-2.33v.03z"/><path fill="#EA4335" d="M9 3.57955c1.32136 0 2.50773.45455 3.44091 1.34591l2.58136-2.58136C13.46318.891364 11.4259 0 9 0 5.56 0 2.56636 1.70182 1.07182 4.31l3.02818 2.33318C4.79273 5.11273 6.72682 3.57955 9 3.57955z"/></svg>`;
    }
    container.innerHTML = '';
    container.appendChild(btn);
}

function showCrumbieAnimation(message) {
    if (document.querySelector('.crumbie-float-text')) return;
    const textEl = document.createElement('div');
    textEl.className = 'crumbie-float-text';
    textEl.textContent = message;
    document.body.appendChild(textEl);
    textEl.addEventListener('animationend', () => textEl.remove());
}

function _renderMemoryList(listEl, memories, showActions) {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!memories || memories.length === 0) {
        listEl.innerHTML = '<p class="list-placeholder">No hay memorias para este día.</p>';
        return;
    }
    memories.sort((a, b) => (b.Fecha_Original?.toMillis() || 0) - (a.Fecha_Original?.toMillis() || 0));
    const fragment = document.createDocumentFragment();
    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'memoria-item';
        itemEl.innerHTML = createMemoryItemHTML(mem, showActions);
        fragment.appendChild(itemEl);
    });
    listEl.appendChild(fragment);
}

function updateMemoryList(memories) {
    _currentMemories = memories || [];
    const editList = document.getElementById('edit-memorias-list');
    if (editList && editModal?.style.display !== 'none' && editModal?.classList.contains('visible')) {
        _renderMemoryList(editList, _currentMemories, true);
    }
    const previewList = document.getElementById('preview-memorias-list');
    if (previewList && previewModal?.classList.contains('visible') && _currentDay) {
         _renderMemoryList(previewList, _currentMemories, false);
    }
}

// --- FIN: FUNCIONES HELPER / UTILIDADES ---

// --- INICIO: FUNCIONES PRINCIPALES Y DE MODALES ---

function init(mainCallbacks) {
    console.log("UI Module init (v4.20.5 - Fixed search and settings buttons)");
    callbacks = mainCallbacks;

    createPreviewModal();
    createEditModal();
    createStoreModal();
    createStoreListModal();
    createAlertPromptModal();
    createConfirmModal();

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents();
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents();
}

function _bindHeaderEvents() {
    const searchBtn = document.getElementById('header-search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            if (callbacks.onSearchClick) {
                callbacks.onSearchClick();
            } else {
                showAlert('La función de búsqueda estará disponible próximamente.', 'info');
            }
        });
    }
}

function _bindNavEvents() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (callbacks.onMonthChange) callbacks.onMonthChange('prev'); });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (callbacks.onMonthChange) callbacks.onMonthChange('next'); });
}

function _bindFooterEvents() {
    const addBtn = document.getElementById('btn-add-memory');
    const storeBtn = document.getElementById('btn-store');
    const shuffleBtn = document.getElementById('btn-shuffle');
    const settingsBtn = document.getElementById('btn-settings');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (callbacks.onFooterAction) callbacks.onFooterAction('add');
        });
    }
    if (storeBtn) {
        storeBtn.addEventListener('click', () => {
            if (callbacks.onFooterAction) callbacks.onFooterAction('store');
        });
    }
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            if (callbacks.onFooterAction) callbacks.onFooterAction('shuffle');
        });
    }
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (callbacks.onFooterAction) {
                callbacks.onFooterAction('settings');
            } else {
                showAlert('Ajustes estará disponible próximamente.', 'info');
            }
        });
    }
}

function _bindCrumbieEvents() {
    const crumbieBtn = document.getElementById('crumbie-btn');
    if (crumbieBtn) {
        crumbieBtn.addEventListener('click', () => {
            if (callbacks.onCrumbieClick) callbacks.onCrumbieClick();
        });
    }
}

function _bindLoginEvents() {
    const loginBtnContainer = document.getElementById('login-btn-container');
    if (loginBtnContainer) {
        loginBtnContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('#login-btn');
            if (!btn) return;
            const action = btn.dataset.action;
            if (action === 'login' && callbacks.onLoginClick) callbacks.onLoginClick();
            if (action === 'logout' && callbacks.onLogoutClick) callbacks.onLogoutClick();
        });
    }
}

function _bindGlobalListeners() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.day-cell')) {
            const cell = e.target.closest('.day-cell');
            const diaId = cell.dataset.diaId;
            if (diaId && callbacks.onDayClick) callbacks.onDayClick(diaId);
        }
    });
}

function setLoading(message, show) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    if (show) {
        appContent.innerHTML = `<div class="loading-screen"><p>${message}</p></div>`;
    }
}

function updateLoginUI(user) {
    const userInfo = document.getElementById('user-info');
    const loginBtnContainer = document.getElementById('login-btn-container');
    if (!userInfo || !loginBtnContainer) return;

    if (user) {
        userInfo.style.display = 'flex';
        document.getElementById('user-img').src = user.photoURL || '';
        document.getElementById('user-name').textContent = user.displayName || user.email || 'Usuario';
        _createLoginButton(true, loginBtnContainer);
    } else {
        userInfo.style.display = 'none';
        _createLoginButton(false, loginBtnContainer);
    }
}

function drawCalendar(monthName, days, todayId) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    const monthDisplay = document.getElementById('month-name-display');
    if (monthDisplay) monthDisplay.textContent = monthName;

    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    days.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.dataset.diaId = day.id;

        if (day.id === todayId) cell.classList.add('today');
        if (day.tieneMemorias) cell.classList.add('has-memories');

        const dayNumber = parseInt(day.id.substring(3, 5), 10);
        cell.innerHTML = `
            <span class="day-number">${dayNumber}</span>
            ${day.Nombre_Especial ? `<span class="day-name">${day.Nombre_Especial}</span>` : ''}
        `;
        calendarGrid.appendChild(cell);
    });

    appContent.innerHTML = '';
    appContent.appendChild(calendarGrid);
}

function updateSpotlight(dateString, dayName, memories) {
    const header = document.getElementById('spotlight-date-header');
    const container = document.getElementById('today-memory-spotlight');

    if (header) header.textContent = `${dateString}${dayName ? ` • ${dayName}` : ''}`;
    if (!container) return;

    container.innerHTML = '';

    if (!memories || memories.length === 0) {
        container.innerHTML = '<p class="list-placeholder">No hay recuerdos para hoy.</p>';
        return;
    }

    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'memoria-item spotlight-item';
        itemEl.innerHTML = createMemoryItemHTML(mem, false);
        container.appendChild(itemEl);
    });
}

function createPreviewModal() {
    if (previewModal) return;
    previewModal = document.createElement('div');
    previewModal.className = 'modal preview-modal';
    previewModal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal-btn" id="close-preview-btn" title="Cerrar">
                <span class="material-icons-outlined">close</span>
            </button>
            <h2 id="preview-day-header">Día</h2>
            <div class="preview-loading" style="display: none;">Cargando...</div>
            <div id="preview-memorias-list"></div>
            <button class="aqua-button" id="edit-from-preview-btn">Editar este día</button>
        </div>
    `;
    document.body.appendChild(previewModal);

    document.getElementById('close-preview-btn')?.addEventListener('click', closePreviewModal);
    document.getElementById('edit-from-preview-btn')?.addEventListener('click', () => {
        if (callbacks.onEditFromPreview) callbacks.onEditFromPreview();
    });
}

function showPreviewLoading(isLoading) {
    const loadingEl = previewModal?.querySelector('.preview-loading');
    if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
}

function openPreviewModal(dia, memories) {
    if (!previewModal) createPreviewModal();

    _currentDay = dia;
    const header = document.getElementById('preview-day-header');
    if (header) {
        const dayNum = parseInt(dia.id.substring(3, 5), 10);
        const monthNum = parseInt(dia.id.substring(0, 2), 10);
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        header.textContent = `${dayNum} ${monthNames[monthNum - 1]}${dia.Nombre_Especial ? ` • ${dia.Nombre_Especial}` : ''}`;
    }

    const listEl = document.getElementById('preview-memorias-list');
    _renderMemoryList(listEl, memories, false);

    previewModal.style.display = 'flex';
    setTimeout(() => previewModal.classList.add('visible'), 10);
}

function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove('visible');
    setTimeout(() => {
        previewModal.style.display = 'none';
        _currentDay = null;
    }, 300);
}

function createEditModal() {
    if (editModal) return;
    editModal = document.createElement('div');
    editModal.className = 'modal edit-modal';
    editModal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal-btn" id="close-edit-add-btn" title="Cerrar">
                <span class="material-icons-outlined">close</span>
            </button>
            <h2 id="edit-day-header">Editar Día</h2>
            
            <div id="edit-memorias-list-container">
                <div class="edit-loading" style="display: none;">Cargando...</div>
                <div class="modal-actions">
                    <button class="aqua-button" id="btn-show-add-form">
                        <span class="material-icons-outlined">add</span> Añadir Memoria
                    </button>
                    <button class="aqua-button" id="btn-name-day">
                        <span class="material-icons-outlined">label</span> <span id="name-day-btn-text">Nombrar</span>
                    </button>
                </div>
                <div id="edit-memorias-list"></div>
            </div>
            
            <form id="memory-form" style="display: none;">
                <div id="memoria-status" class="status-message"></div>
                
                <label>Tipo de Memoria:</label>
                <select id="memoria-type" required>
                    <option value="Texto">Nota</option>
                    <option value="Musica">Música</option>
                    <option value="Lugar">Lugar</option>
                </select>
                
                <label>Año:</label>
                <input type="number" id="memoria-year" placeholder="2024" min="1900" max="2100" required>
                
                <div id="memoria-text-fields">
                    <label>Descripción:</label>
                    <textarea id="memoria-description" rows="4" required></textarea>
                </div>
                
                <div id="memoria-music-fields" style="display: none;">
                    <label>Buscar Canción:</label>
                    <input type="text" id="memoria-music-search" placeholder="Buscar en iTunes...">
                    <button type="button" class="aqua-button" id="btn-search-music">Buscar</button>
                    <div id="itunes-results"></div>
                </div>
                
                <div id="memoria-place-fields" style="display: none;">
                    <label>Buscar Lugar:</label>
                    <input type="text" id="memoria-place-search" placeholder="Buscar lugar...">
                    <button type="button" class="aqua-button" id="btn-search-place">Buscar</button>
                    <div id="place-results"></div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="aqua-button" id="save-memoria-btn">Añadir Memoria</button>
                    <button type="button" class="aqua-button secondary" id="cancel-memoria-btn">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(editModal);
    _bindEditModalEvents();
}

function showEditLoading(isLoading) {
    const loadingEl = editModal?.querySelector('.edit-loading');
    if (loadingEl) loadingEl.style.display = isLoading ? 'block' : 'none';
}

async function handleNameSelectedDay() {
    if (!_currentDay) return;
    const currentName = _currentDay.Nombre_Especial || '';
    const newName = await showPrompt(`Nombre para ${_currentDay.id}:`, currentName);
    if (newName === null) return;
    if (callbacks.onSaveDayName) callbacks.onSaveDayName(_currentDay.id, newName);
}

function _bindEditModalEvents() {
    document.getElementById('close-edit-add-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('btn-name-day')?.addEventListener('click', handleNameSelectedDay);
    document.getElementById('btn-show-add-form')?.addEventListener('click', () => {
        resetMemoryForm();
        _showMemoryForm(true);
    });
    document.getElementById('cancel-memoria-btn')?.addEventListener('click', () => {
        resetMemoryForm();
        _showMemoryForm(false);
    });

    document.getElementById('memory-form')?.addEventListener('submit', _handleFormSubmit);
    document.getElementById('memoria-type')?.addEventListener('change', handleMemoryTypeChange);
    document.getElementById('btn-search-music')?.addEventListener('click', () => {
        const query = document.getElementById('memoria-music-search')?.value.trim();
        if (query && callbacks.onMusicSearch) callbacks.onMusicSearch(query);
    });
    document.getElementById('btn-search-place')?.addEventListener('click', () => {
        const query = document.getElementById('memoria-place-search')?.value.trim();
        if (query && callbacks.onPlaceSearch) callbacks.onPlaceSearch(query);
    });

    const listEl = document.getElementById('edit-memorias-list');
    listEl?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const memId = editBtn.dataset.memoriaId;
            const memToEdit = _currentMemories.find(m => m.id === memId);
            if (memToEdit) {
                fillFormForEdit(memToEdit);
            }
        }

        if (deleteBtn) {
            const memId = deleteBtn.dataset.memoriaId;
            const memToDelete = _currentMemories.find(m => m.id === memId);
            if (memToDelete && _currentDay && callbacks.onDeleteMemory) {
                callbacks.onDeleteMemory(_currentDay.id, memToDelete);
            }
        }
    });
}

function openEditModal(dia, memories, allDays) {
    if (!editModal) createEditModal();

    _currentDay = dia;
    _currentMemories = memories || [];
    _allDaysData = allDays || [];

    const header = document.getElementById('edit-day-header');
    if (header) {
        const dayNum = parseInt(dia.id.substring(3, 5), 10);
        const monthNum = parseInt(dia.id.substring(0, 2), 10);
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        header.textContent = `${dayNum} ${monthNames[monthNum - 1]}`;
    }

    const nameDayBtn = document.getElementById('name-day-btn-text');
    if (nameDayBtn) {
        nameDayBtn.textContent = dia.Nombre_Especial ? 'Renombrar' : 'Nombrar';
    }

    _showMemoryForm(false);
    resetMemoryForm();

    const listEl = document.getElementById('edit-memorias-list');
    _renderMemoryList(listEl, memories, true);

    showModalStatus('memoria-status', '', false);

    editModal.style.display = 'flex';
    setTimeout(() => editModal.classList.add('visible'), 10);
}

function closeEditModal() {
    if (!editModal) return;
    editModal.classList.remove('visible');
    setTimeout(() => {
        editModal.style.display = 'none';
        _currentDay = null;
        _currentMemories = [];
        _allDaysData = [];
        _showMemoryForm(false);
        resetMemoryForm();
    }, 300);
}

function createStoreModal() {
    if (storeModal) return;
    storeModal = document.createElement('div');
    storeModal.className = 'modal store-modal';
    storeModal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal-btn" id="close-store-btn" title="Cerrar">
                <span class="material-icons-outlined">close</span>
            </button>
            <h2>Almacén</h2>
            <div class="store-categories">
                ${createStoreCategoryButton('Nombres', 'label', 'Días Nombrados')}
                ${createStoreCategoryButton('Musica', 'music_note', 'Música')}
                ${createStoreCategoryButton('Lugar', 'place', 'Lugares')}
                ${createStoreCategoryButton('Texto', 'article', 'Notas')}
            </div>
        </div>
    `;
    document.body.appendChild(storeModal);

    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);

    storeModal.querySelectorAll('.store-category-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.type;
            if (callbacks.onStoreCategoryClick) callbacks.onStoreCategoryClick(type);
        });
    });
}

function openStoreModal() {
    if (!storeModal) createStoreModal();
    storeModal.style.display = 'flex';
    setTimeout(() => storeModal.classList.add('visible'), 10);
}

function closeStoreModal() {
    if (!storeModal) return;
    storeModal.classList.remove('visible');
    setTimeout(() => {
        storeModal.style.display = 'none';
    }, 300);
}

function createStoreListModal() {
    if (storeListModal) return;
    storeListModal = document.createElement('div');
    storeListModal.className = 'modal store-list-modal';
    storeListModal.innerHTML = `
        <div class="modal-content">
            <button class="close-modal-btn" id="close-store-list-btn" title="Cerrar">
                <span class="material-icons-outlined">close</span>
            </button>
            <h2 id="store-list-title">Lista</h2>
            <div class="store-list-loading" style="display: none;">Cargando...</div>
            <div id="store-list-items"></div>
            <button class="aqua-button" id="btn-store-load-more" style="display: none;">Cargar más</button>
        </div>
    `;
    document.body.appendChild(storeListModal);
    _bindStoreListModalEvents();
}

function _bindStoreListModalEvents() {
    document.getElementById('close-store-list-btn')?.addEventListener('click', closeStoreListModal);
    document.getElementById('btn-store-load-more')?.addEventListener('click', () => {
        if (callbacks.onStoreLoadMore) callbacks.onStoreLoadMore();
    });

    const listEl = document.getElementById('store-list-items');
    listEl?.addEventListener('click', (e) => {
        const item = e.target.closest('.store-list-item');
        if (!item) return;
        const diaId = item.dataset.diaId;
        const memId = item.dataset.id;
        if (callbacks.onStoreItemClick) callbacks.onStoreItemClick(diaId, memId);
    });
}

function openStoreListModal(title) {
    if(!storeListModal) createStoreListModal();
    
    const titleEl = document.getElementById('store-list-title');
    if (titleEl) titleEl.textContent = title;

    const listEl = document.getElementById('store-list-items');
    if (listEl) listEl.innerHTML = '<p class="list-placeholder">Cargando...</p>';

    const loadMoreBtn = document.getElementById('btn-store-load-more');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    storeListModal.style.display = 'flex';
    setTimeout(() => storeListModal.classList.add('visible'), 10);
}

function closeStoreListModal() {
    if (!storeListModal) return;
    storeListModal.classList.remove('visible');
    setTimeout(() => {
        storeListModal.style.display = 'none';
        const listEl = document.getElementById('store-list-items');
        if (listEl) listEl.innerHTML = '';
    }, 300);
}

function updateStoreList(items, append = false, hasMore = false) {
    const listEl = document.getElementById('store-list-items');
    if (!listEl) return;

    if (!append) listEl.innerHTML = '';

    if (!items || items.length === 0) {
        if (!append) listEl.innerHTML = '<p class="list-placeholder">No hay elementos.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const itemEl = createStoreListItem(item);
        fragment.appendChild(itemEl);
    });
    listEl.appendChild(fragment);

    const loadMoreBtn = document.getElementById('btn-store-load-more');
    if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'block' : 'none';
}

function createAlertPromptModal() {
    if (alertPromptModal) return;
    alertPromptModal = document.createElement('div');
    alertPromptModal.className = 'modal alert-prompt-modal';
    alertPromptModal.innerHTML = `
        <div class="modal-content alert-content">
            <p id="alert-prompt-message">Mensaje</p>
            <input type="text" id="alert-prompt-input" style="display: none;">
            <div class="alert-buttons">
                <button class="aqua-button" id="alert-prompt-ok">OK</button>
                <button class="aqua-button secondary" id="alert-prompt-cancel" style="display: none;">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(alertPromptModal);
    _bindAlertPromptEvents();
}

function _bindAlertPromptEvents() {
    document.getElementById('alert-prompt-ok')?.addEventListener('click', () => closeAlertPromptModal(true));
    document.getElementById('alert-prompt-cancel')?.addEventListener('click', () => closeAlertPromptModal(false));
}

function closeAlertPromptModal(isOk) {
    if (!alertPromptModal) return;
    
    alertPromptModal.classList.remove('visible');
    setTimeout(() => {
        alertPromptModal.style.display = 'none';
    }, 300);

    if (_promptResolve) {
        const inputEl = document.getElementById('alert-prompt-input');
        const value = (isOk && inputEl) ? inputEl.value : null;
        _promptResolve(value);
        _promptResolve = null;
    }
}

function showAlert(message, type = 'default') {
    if(!alertPromptModal) createAlertPromptModal();
    
    const contentDiv = alertPromptModal.querySelector('.alert-content');
    const messageEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const cancelBtn = document.getElementById('alert-prompt-cancel');

    if (contentDiv) contentDiv.className = `modal-content alert-content alert-${type}`;
    if (messageEl) messageEl.textContent = message;
    if (inputEl) inputEl.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';

    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
}

function showPrompt(message, defaultValue = '', type = 'default') {
    if(!alertPromptModal) createAlertPromptModal();
    
    const contentDiv = alertPromptModal.querySelector('.alert-content');
    const messageEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const cancelBtn = document.getElementById('alert-prompt-cancel');

    if (contentDiv) contentDiv.className = `modal-content alert-content alert-${type}`;
    if (messageEl) messageEl.textContent = message;
    if (inputEl) {
        inputEl.value = defaultValue;
        inputEl.style.display = 'block';
        setTimeout(() => inputEl.focus(), 100);
    }
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);

    return new Promise((resolve) => {
        _promptResolve = resolve;
    });
}

function createConfirmModal() {
    if (confirmModal) return;
    confirmModal = document.createElement('div');
    confirmModal.className = 'modal confirm-modal';
    confirmModal.innerHTML = `
        <div class="modal-content alert-content">
            <p id="confirm-message">¿Estás seguro?</p>
            <div class="alert-buttons">
                <button class="aqua-button" id="confirm-ok">Sí</button>
                <button class="aqua-button secondary" id="confirm-cancel">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    _bindConfirmModalEvents();
}

function _bindConfirmModalEvents() {
    document.getElementById('confirm-ok')?.addEventListener('click', () => closeConfirmModal(true));
    document.getElementById('confirm-cancel')?.addEventListener('click', () => closeConfirmModal(false));
}

function closeConfirmModal(isConfirmed) {
    if (!confirmModal) return;
    
    confirmModal.classList.remove('visible');
    setTimeout(() => {
        confirmModal.style.display = 'none';
    }, 300);

    if (_confirmResolve) {
        _confirmResolve(isConfirmed);
        _confirmResolve = null;
    }
}

function showConfirm(message) {
    if(!confirmModal) createConfirmModal();
    
    const messageEl = document.getElementById('confirm-message');
    if (messageEl) messageEl.textContent = message;

    confirmModal.style.display = 'flex';
    setTimeout(() => confirmModal.classList.add('visible'), 10);

    return new Promise((resolve) => {
        _confirmResolve = resolve;
    });
}

function _handleFormSubmit(e) {
    e.preventDefault();

    if (!_currentDay) {
        showModalStatus('memoria-status', 'Error: No hay día seleccionado.', true);
        return;
    }

    const form = e.target;
    const formData = {
        Tipo: document.getElementById('memoria-type')?.value || 'Texto',
        year: document.getElementById('memoria-year')?.value
    };

    const docIdToEdit = form.dataset.editingId || null;

    switch (formData.Tipo) {
        case 'Texto':
            formData.Descripcion = document.getElementById('memoria-description')?.value.trim();
            if (!formData.Descripcion) {
                showModalStatus('memoria-status', 'La descripción no puede estar vacía.', true);
                return;
            }
            break;

        case 'Musica':
            if (!_selectedMusic) {
                showModalStatus('memoria-status', 'Debes buscar y seleccionar una canción.', true);
                return;
            }
            formData.CancionData = _selectedMusic;
            formData.CancionInfo = `${_selectedMusic.trackName} - ${_selectedMusic.artistName}`;
            break;

        case 'Lugar':
            if (!_selectedPlace) {
                showModalStatus('memoria-status', 'Debes buscar y seleccionar un lugar.', true);
                return;
            }
            formData.LugarData = _selectedPlace.data;
            formData.LugarNombre = _selectedPlace.name;
            break;
    }

    if (docIdToEdit) {
        formData.id = docIdToEdit;
    }

    const diaId = _currentDay.id;
    if (callbacks.onSaveMemory) {
        callbacks.onSaveMemory(diaId, formData, docIdToEdit);
    }
}

function handleMemoryTypeChange() {
    const tipo = document.getElementById('memoria-type')?.value;
    const textFields = document.getElementById('memoria-text-fields');
    const musicFields = document.getElementById('memoria-music-fields');
    const placeFields = document.getElementById('memoria-place-fields');

    if (textFields) textFields.style.display = (tipo === 'Texto') ? 'block' : 'none';
    if (musicFields) musicFields.style.display = (tipo === 'Musica') ? 'block' : 'none';
    if (placeFields) placeFields.style.display = (tipo === 'Lugar') ? 'block' : 'none';

    showMusicResults([]);
    showPlaceResults([]);
}

function fillFormForEdit(mem) {
    if (!mem) return;

    const form = document.getElementById('memory-form');
    if (!form) return;

    resetMemoryForm();

    form.dataset.editingId = mem.id;

    document.getElementById('memoria-type').value = mem.Tipo || 'Texto';

    if (mem.Fecha_Original) {
        try {
            const date = new Date(mem.Fecha_Original.seconds * 1000 || mem.Fecha_Original);
            if (!isNaN(date)) {
                document.getElementById('memoria-year').value = date.getFullYear();
            }
        } catch (e) {
            console.warn("Fecha inválida en fillFormForEdit:", mem.Fecha_Original);
        }
    }

    handleMemoryTypeChange();

    switch (mem.Tipo) {
        case 'Texto':
            document.getElementById('memoria-description').value = mem.Descripcion || '';
            break;

        case 'Lugar':
            if (mem.LugarData && mem.LugarNombre) {
                _selectedPlace = { name: mem.LugarNombre, data: mem.LugarData };
                document.getElementById('memoria-place-search').value = mem.LugarNombre;
                showPlaceResults([mem.LugarData], true);
            }
            break;

        case 'Musica':
            if (mem.CancionData) {
                _selectedMusic = mem.CancionData;
                document.getElementById('memoria-music-search').value = `${mem.CancionData.trackName} - ${mem.CancionData.artistName}`;
                showMusicResults([mem.CancionData], true);
            }
            break;
    }

    const saveBtn = document.getElementById('save-memoria-btn');
    if (saveBtn) saveBtn.textContent = 'Actualizar Memoria';

    _showMemoryForm(true);
}

function resetMemoryForm() {
    const form = document.getElementById('memory-form');
    if (!form) return;

    form.reset();
    delete form.dataset.editingId;

    _isEditingMemory = false;
    _selectedMusic = null;
    _selectedPlace = null;

    document.getElementById('memoria-type').value = 'Texto';
    document.getElementById('memoria-year').value = '';

    showMusicResults([]);
    showPlaceResults([]);

    showModalStatus('memoria-status', '', false);

    const saveBtn = document.getElementById('save-memoria-btn');
    if (saveBtn) {
        saveBtn.textContent = 'Añadir Memoria';
        saveBtn.disabled = false;
    }

    handleMemoryTypeChange();
    _showMemoryForm(false);
}

export const ui = {
    init,
    setLoading,
    updateLoginUI,
    drawCalendar,
    updateSpotlight,
    openPreviewModal, closePreviewModal, showPreviewLoading,
    openEditModal, closeEditModal, showEditLoading,
    openStoreModal, closeStoreModal,
    openStoreListModal, closeStoreListModal,
    showAlert, showPrompt, showConfirm,
    updateStoreList, updateMemoryList,
    resetMemoryForm, fillFormForEdit,
    showMusicResults, showPlaceResults,
    showModalStatus, handleMemoryTypeChange,
    showCrumbieAnimation
};
