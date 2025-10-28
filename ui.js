/*
 * ui.js (v4.30 - Exportar funciones de cierre de modales)
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
    console.log("UI Module init (v4.30 - Exportar cierres)");
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
        // ***** CAMBIO: Llamar a funciones exportadas *****
        if (e.target.classList.contains('modal-alert-prompt')) closeAlertPromptModal(false);
        if (e.target.classList.contains('modal-confirm')) closeConfirmModal(false);
        // ***********************************************
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
    if (!previewModal) createPreviewModal();
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
    if (!previewModal) createPreviewModal();
    const loadingEl = previewModal.querySelector('.preview-loading');
    const listEl = previewModal.querySelector('#preview-memorias-list');
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
    if (!editModal) createEditModal();
    _currentDay = dia;
    _currentMemories = memories || [];
    const daySelection = document.getElementById('day-selection-section');
    const dayNameSection = document.getElementById('day-name-section');
    const titleEl = document.getElementById('edit-modal-title');
    const nameInput = document.getElementById('nombre-especial-input');
    const daySelect = document.getElementById('edit-mem-day');
    const dynamicTitleEl = document.getElementById('edit-modal-title-dynamic');
    const formTitle = document.getElementById('memory-form-title');
    if (!daySelection || !dayNameSection || !titleEl || !nameInput || !daySelect || !dynamicTitleEl || !formTitle) {
        console.error("UI Error: Uno o más elementos del modal de edición no se encontraron en el DOM.");
        return;
    }
    if (dia) {
        daySelection.style.display = 'none';
        dayNameSection.style.display = 'block';
        dynamicTitleEl.textContent = 'Editar Día';
        formTitle.textContent = 'Añadir/Editar Memoria';
        const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
        titleEl.textContent = `Editando: ${dia.Nombre_Dia}${dayName}`;
        nameInput.value = dia.Nombre_Especial !== 'Unnamed Day' ? dia.Nombre_Especial : '';
    } else {
        daySelection.style.display = 'block';
        dayNameSection.style.display = 'none';
        dynamicTitleEl.textContent = 'Añadir Memoria';
        formTitle.textContent = 'Añadir Memoria';
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
    if (!editModal) createEditModal();
    const loadingEl = editModal.querySelector('.edit-loading');
    const contentWrapper = editModal.querySelector('.edit-content-wrapper');
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
    if (!contentEl) { console.error("UI Error: alert modal content not found"); return; }
    contentEl.classList.remove('settings-alert', 'search-alert');
    if (type === 'settings') contentEl.classList.add('settings-alert');
    const msgEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const cancelBtn = document.getElementById('alert-prompt-cancel');
    const okBtn = document.getElementById('alert-prompt-ok');
    if (msgEl) msgEl.textContent = message;
    if (inputEl) inputEl.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (okBtn) okBtn.textContent = 'OK';
    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
}
export function showPrompt(message, defaultValue = '', type = 'default') {
    if(!alertPromptModal) createAlertPromptModal();
     const contentEl = alertPromptModal.querySelector('.modal-alert-content');
    if (!contentEl) { console.error("UI Error: prompt modal content not found"); return Promise.resolve(null); }
    contentEl.classList.remove('settings-alert', 'search-alert');
    if (type === 'search') contentEl.classList.add('search-alert');
    const msgEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const cancelBtn = document.getElementById('alert-prompt-cancel');
    const okBtn = document.getElementById('alert-prompt-ok');
    if (msgEl) msgEl.textContent = message;
    if (inputEl) { inputEl.style.display = 'block'; inputEl.value = defaultValue; }
    if (cancelBtn) cancelBtn.style.display = 'block';
    if (okBtn) okBtn.textContent = 'OK';
    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
    return new Promise((resolve) => { _promptResolve = resolve; });
}
export function showConfirm(message) {
     if(!confirmModal) createConfirmModal();
     const msgEl = document.getElementById('confirm-message');
     if (msgEl) msgEl.textContent = message;
     else { console.error("UI Error: confirm message element not found"); return Promise.resolve(false); }
    confirmModal.style.display = 'flex';
    setTimeout(() => confirmModal.classList.add('visible'), 10);
    return new Promise((resolve) => { _confirmResolve = resolve; });
}

// --- Formularios y Listas (Funciones públicas) ---
export function updateStoreList(items, append = false, hasMore = false) {
    const contentEl = document.getElementById('store-list-content');
    if (!contentEl) return;
    const placeholder = contentEl.querySelector('.list-placeholder');
    if (placeholder) placeholder.remove();
    const loadMoreBtn = contentEl.querySelector('#load-more-btn');
    if (loadMoreBtn) loadMoreBtn.remove();
    if (!append && (!items || items.length === 0)) {
        contentEl.innerHTML = '<p class="list-placeholder">No se encontraron resultados.</p>';
        return;
    }
    if (!append) contentEl.innerHTML = '';
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const itemEl = createStoreListItem(item);
        fragment.appendChild(itemEl);
    });
    contentEl.appendChild(fragment);
    if (hasMore) {
        const btn = document.createElement('button');
        btn.id = 'load-more-btn';
        btn.className = 'aqua-button';
        btn.textContent = 'Cargar Más (+10)';
        contentEl.appendChild(btn);
    } else if (items.length > 0) {
        const end = document.createElement('p');
        end.className = 'list-placeholder';
        end.textContent = 'Fin de los resultados.';
        contentEl.appendChild(end);
    }
}
export function updateMemoryList(memories) {
    _currentMemories = memories || [];
    const editList = document.getElementById('edit-memorias-list');
    if (editList) _renderMemoryList(editList, _currentMemories, true, 'edit');
    const previewList = document.getElementById('preview-memorias-list');
    if (previewList && previewModal?.classList.contains('visible') && _currentDay) {
         _renderMemoryList(previewList, _currentMemories, false, 'preview');
         _destroyActiveMaps();
         setTimeout(() => _initMapsInContainer(previewList, 'preview'), 10);
    }
}
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
export function fillFormForEdit(mem) {
    if (!mem) return;
    resetMemoryForm();
    _isEditingMemory = true;
    const form = document.getElementById('memory-form');
    const saveBtn = document.getElementById('save-memoria-btn');
    const typeSelect = document.getElementById('memoria-type');
    if (!form || !saveBtn || !typeSelect) { console.error("UI Error: Form elements missing in fillFormForEdit"); return; }
    form.dataset.editingId = mem.id;
    saveBtn.textContent = 'Actualizar Memoria';
    if (mem.Fecha_Original) {
        try {
            const dateSource = mem.Fecha_Original.seconds ? mem.Fecha_Original.seconds * 1000 : mem.Fecha_Original;
            const date = new Date(dateSource);
            document.getElementById('memoria-year').value = date.getFullYear();
        } catch(e) { document.getElementById('memoria-year').value = ''; }
    } else { document.getElementById('memoria-year').value = ''; }
    typeSelect.value = mem.Tipo;
    handleMemoryTypeChange();
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
        case 'Imagen':
            document.getElementById('memoria-image-desc').value = mem.Descripcion || '';
            if (mem.ImagenURL) {
                document.getElementById('image-upload-status').textContent = `Imagen actual guardada.`;
                form.dataset.existingImageUrl = mem.ImagenURL;
            }
            break;
    }
    _showMemoryForm(true);
    document.querySelector('.modal-content-scrollable')?.scrollTo({ top: document.getElementById('memory-form').offsetTop, behavior: 'smooth' });
}
export function showMusicResults(tracks, isSelected = false) {
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    _selectedMusic = null;
    if (isSelected && tracks.length > 0) {
        const track = tracks[0];
        _selectedMusic = track;
        const displayName = track.trackName || track.title;
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        return;
    }
    if (!tracks || tracks.length === 0) return;
    tracks.forEach(track => {
        const trackName = track.trackName;
        const artistName = track.artistName;
        const artwork = track.artworkUrl60;
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <img src="${artwork || ''}" class="memoria-artwork" alt="" ${artwork ? '' : 'style="display:none;"'}>
            <div class="memoria-item-content">
                <small>${artistName || 'Artista desc.'}</small>
                <strong>${trackName || 'Título desc.'}</strong>
            </div>
            <span class="material-icons-outlined">add_circle_outline</span>`;
        itemEl.addEventListener('click', () => {
            _selectedMusic = track;
            document.getElementById('memoria-music-search').value = `${trackName || ''} - ${artistName || ''}`;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${trackName || 'Título desc.'}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}
export function showPlaceResults(places, isSelected = false) {
    const resultsEl = document.getElementById('place-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    _selectedPlace = null;
    if (isSelected && places.length > 0) {
        const place = places[0];
        _selectedPlace = { name: place.display_name, data: place };
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${place.display_name}</p>`;
        return;
    }
    if (!places || places.length === 0) return;
    places.forEach(place => {
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <span class="memoria-icon material-icons-outlined">place</span>
            <div class="memoria-item-content"> <strong>${place.display_name}</strong> </div>
            <span class="material-icons-outlined">add_circle_outline</span>`;
        itemEl.addEventListener('click', () => {
            _selectedPlace = { name: place.display_name, data: place };
            document.getElementById('memoria-place-search').value = place.display_name;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${place.display_name.substring(0, 40)}...</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}
export function showModalStatus(elementId, message, isError) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = isError ? 'status-message error' : 'status-message success';
    if (message && !isError) {
        setTimeout(() => { if (statusEl.textContent === message) { statusEl.textContent = ''; statusEl.className = 'status-message'; } }, 3000);
    }
}
export function handleMemoryTypeChange() {
    const typeSelect = document.getElementById('memoria-type');
    if (!typeSelect) return;
    const type = typeSelect.value;
    ['Texto', 'Lugar', 'Musica', 'Imagen'].forEach(id => {
        const el = document.getElementById(`input-type-${id}`);
        if (el) el.style.display = (id === type) ? 'block' : 'none';
    });
    if (type !== 'Musica') showMusicResults([]);
    if (type !== 'Lugar') showPlaceResults([]);
}

// --- Crumbie (Funciones públicas) ---
export function showCrumbieAnimation(message) {
    if (document.querySelector('.crumbie-float-text')) return;
    const textEl = document.createElement('div');
    textEl.className = 'crumbie-float-text';
    textEl.textContent = message;
    document.body.appendChild(textEl);
    textEl.addEventListener('animationend', () => { if (textEl.parentElement) textEl.remove(); });
}

// --- Funciones privadas (no exportadas) ---
// ... (createModals, handleNameSelectedDay, binds, _showMemoryForm, maps, _renderMemoryList, etc.) ...

// ***** CAMBIO: Añadido EXPORT a estas dos funciones *****
export function closeAlertPromptModal(isOk) { // <--- AÑADIDO EXPORT
    if (!alertPromptModal) return;
    alertPromptModal.classList.remove('visible');
    setTimeout(() => {
        alertPromptModal.style.display = 'none';
        alertPromptModal.querySelector('.modal-alert-content')?.classList.remove('settings-alert', 'search-alert');
    }, 200);
    if (_promptResolve) {
        if (isOk) {
            const input = document.getElementById('alert-prompt-input');
            _promptResolve(input?.value); // Añadir chequeo por si no existe
        } else {
            _promptResolve(null);
        }
        _promptResolve = null;
    }
}
export function closeConfirmModal(isConfirmed) { // <--- AÑADIDO EXPORT
    if (!confirmModal) return;
    confirmModal.classList.remove('visible');
    setTimeout(() => {
        confirmModal.style.display = 'none';
    }, 200);
    if (_confirmResolve) {
        _confirmResolve(isConfirmed);
        _confirmResolve = null;
    }
}
// *********************************************************

// Resto de funciones privadas (binds, creates, helpers...)
function _bindAlertPromptEvents() {
    document.getElementById('alert-prompt-ok')?.addEventListener('click', () => closeAlertPromptModal(true));
    document.getElementById('alert-prompt-cancel')?.addEventListener('click', () => closeAlertPromptModal(false));
}
function _bindConfirmModalEvents() {
     document.getElementById('confirm-ok')?.addEventListener('click', () => closeConfirmModal(true));
     document.getElementById('confirm-cancel')?.addEventListener('click', () => closeConfirmModal(false));
}
function _createLoginButton(isLoggedOut, container) {
    if (!container) return;
    const btn = document.createElement('button');
    btn.id = 'login-btn';
    btn.className = 'header-login-btn';
    if (isLoggedOut) { // Actually means logged IN, button shows logout
        btn.title = 'Cerrar sesión';
        btn.dataset.action = 'logout'; // Correct action when logged in
        btn.innerHTML = `<span class="material-icons-outlined">logout</span>`;
    } else { // Logged OUT, button shows login
        btn.title = 'Iniciar sesión con Google';
        btn.dataset.action = 'login'; // Correct action when logged out
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.20455c0-.63864-.05727-1.25182-.16909-1.84091H9v3.48182h4.84364c-.20864 1.125-.84273 2.07818-1.77727 2.71136v2.25818h2.90864c1.70182-1.56682 2.68409-3.87409 2.68409-6.61045z"/><path fill="#34A853" d="M9 18c2.43 0 4.47182-.80591 5.96273-2.18045l-2.90864-2.25818c-.80591.54364-1.83682.86591-2.94.86591-2.27318 0-4.20727-1.53318-4.9-3.58227H1.07182v2.33318C2.56636 16.3 5.56 18 9 18z"/><path fill="#FBBC05" d="M4.1 10.71c-.22-.64-.35-1.32-.35-2.03s.13-.139.35-2.03V4.31H1.07C.38 5.67 0 7.29 0 9.03s.38 3.36 1.07 4.72l3.03-2.33v.03z"/><path fill="#EA4335" d="M9 3.57955c1.32136 0 2.50773.45455 3.44091 1.34591l2.58136-2.58136C13.46318.891364 11.4259 0 9 0 5.56 0 2.56636 1.70182 1.07182 4.31l3.02818 2.33318C4.79273 5.11273 6.72682 3.57955 9 3.57955z"/></svg>`;
    }
    container.innerHTML = '';
    container.appendChild(btn);
}
function _renderMap(containerId, lat, lon, zoom = 13) {
    try {
        const container = document.getElementById(containerId);
        if (!container || typeof L === 'undefined' || container._leaflet_id) return;
        const map = L.map(containerId, { center: [lat, lon], zoom: zoom, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, attributionControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        L.marker([lat, lon]).addTo(map);
        _activeMaps.push(map);
    } catch (e) { console.error(`Error al renderizar mapa en #${containerId}:`, e); }
}
function _initMapsInContainer(containerEl, prefix) {
    if (!containerEl) return;
    const mapDivs = containerEl.querySelectorAll('.memoria-map-container, .spotlight-map-container');
    mapDivs.forEach(div => {
        if (div.dataset.lat && div.dataset.lon && div.id) {
            _renderMap(div.id, parseFloat(div.dataset.lat), parseFloat(div.dataset.lon), div.dataset.zoom ? parseInt(div.dataset.zoom) : 13);
        }
    });
}
function _destroyActiveMaps() {
    _activeMaps.forEach(map => { if (map && map.remove) map.remove(); });
    _activeMaps = [];
}
function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') {
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!memories || memories.length === 0) { listEl.innerHTML = '<p class="list-placeholder">No hay memorias para este día.</p>'; return; }
    memories.sort((a, b) => {
        const yearA = a.Fecha_Original ? (new Date(a.Fecha_Original.seconds * 1000 || a.Fecha_Original)).getFullYear() : 0;
        const yearB = b.Fecha_Original ? (new Date(b.Fecha_Original.seconds * 1000 || b.Fecha_Original)).getFullYear() : 0;
        return yearB - yearA;
    });
    const fragment = document.createDocumentFragment();
    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'memoria-item';
        itemEl.innerHTML = createMemoryItemHTML(mem, showActions, mapIdPrefix);
        fragment.appendChild(itemEl);
    });
    listEl.appendChild(fragment);
}
function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') {
    console.log(`createMemoryItemHTML: Processing mem (ID: ${mem?.id || 'N/A'}):`, JSON.stringify(mem));
    if (!mem || typeof mem !== 'object') {
        console.error("createMemoryItemHTML: Received invalid 'mem' object:", mem);
        return '<p class="error">Error: Datos de memoria inválidos.</p>';
    }
    const memId = mem.id || '';
    let yearStr = 'Año desc.';
    if (mem.Fecha_Original) { /* ... */ } // Lógica fecha omitida por brevedad
    let contentHTML = `<small>${yearStr}</small>`;
    let artworkHTML = '';
    let icon = 'article';
    let mapHTML = '';
    console.log(`createMemoryItemHTML [${memId}]: Type = ${mem.Tipo}, Year = ${yearStr}`);
    switch (mem.Tipo) {
        case 'Lugar': /* ... Lógica Lugar con mapa ... */ break;
        case 'Musica': /* ... Lógica Musica iTunes ... */ break;
        case 'Imagen': /* ... Lógica Imagen ... */ break;
        default: /* ... Lógica Texto ... */ break;
    }
    if (!artworkHTML) artworkHTML = `<span class="memoria-icon material-icons-outlined">${icon}</span>`;
    const actionsHTML = (showActions && memId) ? `...` : ''; // Lógica acciones omitida
    const mainContentHTML = `<div class="memoria-item-main-content ..."> ${artworkHTML} ... ${actionsHTML} </div>`; // Estructura omitida
    console.log(`createMemoryItemHTML [${memId}]: Returning HTML.`);
    return mainContentHTML + mapHTML;
}
function createStoreCategoryButton(type, icon, label) { /* ... */ }
function createStoreListItem(item) { /* ... */ }
function _showMemoryForm(show) { /* ... */ }
function _handleFormSubmit(e) { /* ... */ }

// (No hay export const ui al final)
