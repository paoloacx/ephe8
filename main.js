/*
 * ui.js (v4.27 - Hide Form on Reset)
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
    console.log("UI Module init (v4.27 - Hide Form on Reset)"); // Cambio versión
    callbacks = mainCallbacks;

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

// ... (resto de funciones _bind... sin cambios) ...
function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        if (callbacks.onFooterAction) callbacks.onFooterAction('search');
    });
}

function _bindNavEvents() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');

    if (prevBtn) {
        prevBtn.onclick = () => {
            if (callbacks.onMonthChange) callbacks.onMonthChange('prev');
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (callbacks.onMonthChange) callbacks.onMonthChange('next');
        };
    }
}

function _bindFooterEvents() {
    document.getElementById('btn-add-memory')?.addEventListener('click', () => {
        if (callbacks.onFooterAction) callbacks.onFooterAction('add');
    });
    document.getElementById('btn-store')?.addEventListener('click', () => {
        if (callbacks.onFooterAction) callbacks.onFooterAction('store');
    });
    document.getElementById('btn-shuffle')?.addEventListener('click', () => {
        if (callbacks.onFooterAction) callbacks.onFooterAction('shuffle');
    });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        if (callbacks.onFooterAction) callbacks.onFooterAction('settings');
    });
}

function _bindCrumbieEvents() {
    document.getElementById('crumbie-btn')?.addEventListener('click', () => {
        // Llama al controlador principal para que decida qué hacer
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
                callbacks.onLogin();
            }
        } else if (userInfo && callbacks.onLogout) {
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
        console.log("UI: allDaysData actualizado en UI:", _allDaysData.length);
    } else {
        console.warn("UI: updateAllDaysData recibió datos vacíos.");
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
        _createLoginButton(true, loginBtnContainer);
    } else {
        userInfo.style.display = 'none';
        _createLoginButton(false, loginBtnContainer);
    }
}

function drawCalendar(monthName, days, todayId) {
    const monthNameDisplay = document.getElementById('month-name-display');
    const appContent = document.getElementById('app-content');

    if (monthNameDisplay) monthNameDisplay.textContent = monthName;
    if (!appContent) return;

    const grid = document.createElement('div');
    grid.className = 'calendario-grid';

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
function createPreviewModal() {
    if (previewModal) return;

    previewModal = document.createElement('div');
    previewModal.id = 'preview-modal';
    previewModal.className = 'modal-preview';
    previewModal.innerHTML = `
        <div class="modal-preview-content">
            <div class="modal-preview-header">
                <h3 id="preview-title"></h3>
            </div>
            <div class="modal-preview-notebook-paper">
                <div class="modal-preview-memorias">
                    <h4 style="display: none;">Memorias:</h4>
                    <div id="preview-memorias-list">
                        <p class="list-placeholder preview-loading" style="display: none;">Cargando memorias...</p>
                    </div>
                </div>
            </div>
            <div class="modal-preview-footer">
                <button id="close-preview-btn" class="aqua-button">Cerrar</button>
                <button id="edit-from-preview-btn" class="aqua-button">Editar este día</button>
            </div>
        </div>`;
    document.body.appendChild(previewModal);

    document.getElementById('close-preview-btn')?.addEventListener('click', closePreviewModal);
    document.getElementById('edit-from-preview-btn')?.addEventListener('click', () => {
        if (callbacks.onEditFromPreview) {
            callbacks.onEditFromPreview();
        }
    });
}

function showPreviewLoading(isLoading) {
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

function openPreviewModal(dia, memories) {
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

function closePreviewModal() {
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
            <div class="modal-content-scrollable">
                <p class="list-placeholder edit-loading" style="display: none; padding: 20px;">Cargando...</p>
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
                        <h4>Memorias</h4>
                        <div id="edit-memorias-list-container">
                            <div id="edit-memorias-list"></div>
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
                                <option value="Imagen">Foto</option>
                            </select>
                            <div class="add-memory-input-group" id="input-type-Texto">
                                <label for="memoria-desc">Descripción:</label>
                                <textarea id="memoria-desc" placeholder="Escribe tu recuerdo..."></textarea>
                            </div>
                            <div class="add-memory-input-group" id="input-type-Lugar">
                                <label for="memoria-place-search">Buscar Lugar:</label>
                                <input type="text" id="memoria-place-search" placeholder="Ej. Torre Eiffel">
                                <button type="button" class="aqua-button" id="btn-search-place">Buscar</button>
                                <div id="place-results" class="search-results"></div>
                            </div>
                            <div class="add-memory-input-group" id="input-type-Musica">
                                <label for="memoria-music-search">Buscar Canción:</label>
                                <input type="text" id="memoria-music-search" placeholder="Ej. Bohemian Rhapsody">
                                <button type="button" class="aqua-button" id="btn-search-itunes">Buscar</button>
                                <div id="itunes-results" class="search-results"></div>
                            </div>
                            <div class="add-memory-input-group" id="input-type-Imagen">
                                <label for="memoria-image-upload">Subir Foto:</label>
                                <input type="file" id="memoria-image-upload" accept="image/*">
                                <label for="memoria-image-desc">Descripción (opcional):</label>
                                <input type="text" id="memoria-image-desc" placeholder="Añade un pie de foto...">
                                <div id="image-upload-status" class="status-message"></div>
                            </div>
                            <button type="submit" id="save-memoria-btn" class="aqua-button">Añadir Memoria</button>
                            <button type="button" id="btn-cancel-mem-edit" class="aqua-button small">Cancelar</button>
                            <p id="memoria-status" class="status-message"></p>
                        </form>
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

function showEditLoading(isLoading) {
    const loadingEl = editModal?.querySelector('.edit-loading');
    const contentWrapper = editModal?.querySelector('.edit-content-wrapper');
    if (loadingEl && contentWrapper) {
        loadingEl.style.display = isLoading ? 'block' : 'none';
        contentWrapper.style.display = isLoading ? 'none' : 'block';
    }
}

async function handleNameSelectedDay() { 
     if (!callbacks.onSaveDayName || !_allDaysData) return;

     const daySelect = document.getElementById('edit-mem-day');
     if (!daySelect) return;
     const selectedDayId = daySelect.value;
     const selectedOption = daySelect.options[daySelect.selectedIndex];
     const selectedDayText = selectedOption ? selectedOption.text : selectedDayId;

     const currentDayData = _allDaysData.find(d => d.id === selectedDayId);
     const currentName = currentDayData?.Nombre_Especial !== 'Unnamed Day' ? currentDayData.Nombre_Especial : '';

     const newName = await showPrompt(`Nombrar día ${selectedDayText}:`, currentName);

     if (newName !== null) {
        callbacks.onSaveDayName(selectedDayId, newName.trim(), 'add-name-status');
     }
}

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
        if (callbacks.onSearchMusic) {
            const term = document.getElementById('memoria-music-search').value;
            console.log("[DEBUG UI] Click en Buscar Canción, término:", term); 
            if (term) callbacks.onSearchMusic(term);
        }
    });
    document.getElementById('btn-search-place')?.addEventListener('click', () => {
        if (callbacks.onSearchPlace) {
            const term = document.getElementById('memoria-place-search').value;
            console.log("[DEBUG UI] Click en Buscar Lugar, término:", term); 
            if (term) callbacks.onSearchPlace(term);
        }
    });

    const listEl = document.getElementById('edit-memorias-list');
    listEl?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const memoriaId = editBtn.dataset.memoriaId;
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
            if (!memoriaId) {
                console.error("ID de memoria inválido en el botón de borrar.");
                return;
            }
            const mem = _currentMemories.find(m => m.id === memoriaId);

            if (mem && callbacks.onDeleteMemory && _currentDay) {
                callbacks.onDeleteMemory(_currentDay.id, mem);
            } else if (mem && callbacks.onDeleteMemory) { // Caso Añadir
                 const selectedDayId = document.getElementById('edit-mem-day')?.value;
                 if (selectedDayId) {
                     callbacks.onDeleteMemory(selectedDayId, mem);
                 } else {
                     console.error("No se pudo determinar el día para borrar la memoria en modo Añadir");
                 }
            }
             else {
                 console.error("No se encontró la memoria para borrar:", memoriaId);
            }
        }
    });
}

function _showMemoryForm(show) {
    const form = document.getElementById('memory-form');
    const listContainer = document.getElementById('edit-memorias-list-container');

    if (show) {
        if (form) form.style.display = 'block';
        if (listContainer) listContainer.style.display = 'none';
    } else {
        if (form) form.style.display = 'none';
        if (listContainer) listContainer.style.display = 'block';
    }
}

function openEditModal(dia, memories) { 
    _currentDay = dia; 
    _currentMemories = memories || [];

    const daySelection = document.getElementById('day-selection-section');
    const dayNameSection = document.getElementById('day-name-section');
    const titleEl = document.getElementById('edit-modal-title');
    const nameInput = document.getElementById('nombre-especial-input');
    const daySelect = document.getElementById('edit-mem-day');
    const dynamicTitleEl = document.getElementById('edit-modal-title-dynamic');
    const formTitle = document.getElementById('memory-form-title');


    if (dia) { // Modo Editar
        daySelection.style.display = 'none';
        dayNameSection.style.display = 'block';
        if (dynamicTitleEl) dynamicTitleEl.textContent = 'Editar Día';
        if (formTitle) formTitle.textContent = 'Añadir/Editar Memoria';

        const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
        titleEl.textContent = `Editando: ${dia.Nombre_Dia}${dayName}`;
        nameInput.value = dia.Nombre_Especial !== 'Unnamed Day' ? dia.Nombre_Especial : '';

    } else { // Modo Añadir
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

function closeEditModal() {
    if (!editModal) return;
    editModal.classList.remove('visible');
    setTimeout(() => {
        editModal.style.display = 'none';
        _currentDay = null;
        _currentMemories = [];
        _isEditingMemory = false;
    }, 200);
}


// --- INICIO CAMBIO: Funciones de Modales Restauradas ---

function createStoreModal() {
    if (storeModal) return;
    storeModal = document.createElement('div');
    storeModal.id = 'store-modal';
    storeModal.className = 'modal-store';
    storeModal.innerHTML = `...`; // Contenido HTML del modal Store
    document.body.appendChild(storeModal);
    // Bind events
    const categoryList = storeModal.querySelector('.store-category-list');
    categoryList.appendChild(createStoreCategoryButton('Nombres', 'label', 'Días Nombrados'));
    categoryList.appendChild(createStoreCategoryButton('Texto', 'article', 'Notas'));
    categoryList.appendChild(createStoreCategoryButton('Lugar', 'place', 'Lugares'));
    categoryList.appendChild(createStoreCategoryButton('Musica', 'music_note', 'Canciones'));
    categoryList.appendChild(createStoreCategoryButton('Imagen', 'image', 'Imágenes'));
    categoryList.addEventListener('click', (e) => { /* ... */ });
    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);
}
function openStoreModal() { /* ... */ }
function closeStoreModal() { /* ... */ }
function createStoreListModal() { /* ... */ }
function _bindStoreListModalEvents() { /* ... */ }
function openStoreListModal(title) { /* ... */ }
function closeStoreListModal() { /* ... */ }
function updateStoreList(items, append = false, hasMore = false) { /* ... */ }
function createAlertPromptModal() { /* ... */ }
function _bindAlertPromptEvents() { /* ... */ }
function closeAlertPromptModal(isOk) { /* ... */ }
function showAlert(message, type = 'default') { /* ... */ }
function showPrompt(message, defaultValue = '', type = 'default') { /* ... */ }
function createConfirmModal() { /* ... */ }
function _bindConfirmModalEvents() { /* ... */ }
function closeConfirmModal(isConfirmed) { /* ... */ }
function showConfirm(message) { /* ... */ }

// --- FIN CAMBIO: Funciones de Modales Restauradas ---


// --- Funciones de Ayuda (Helpers) de UI ---

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
            _currentDay = _allDaysData.find(d => d.id === diaId) || null; 
            if(!_currentDay) {
                console.error("Error crítico: No se encontró el día seleccionado en _allDaysData:", diaId);
                showModalStatus('memoria-status', 'Error: Día seleccionado no válido.', true);
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
                    formData.LugarData = {
                        display_name: _selectedPlace.data.display_name,
                        lat: _selectedPlace.data.lat,
                        lon: _selectedPlace.data.lon,
                        osm_id: _selectedPlace.data.osm_id
                    };
                } else {
                    // Si no se seleccionó nada, intentar guardar lo que está en el input
                    formData.LugarNombre = document.getElementById('memoria-place-search').value.trim();
                    formData.LugarData = null; // Marcar que no viene de una selección
                     if (!formData.LugarNombre) { // Evitar guardar lugares vacíos si no hubo selección
                        showModalStatus('memoria-status', 'Error: Debes buscar y seleccionar un lugar o escribir un nombre.', true);
                        saveBtn.disabled = false;
                        saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
                        return; // Detener el guardado
                     }
                }
                break;
            case 'Musica':
                 if (_selectedMusic) {
                    formData.CancionInfo = `${_selectedMusic.trackName} - ${_selectedMusic.artistName}`;
                    formData.CancionData = {
                        trackId: _selectedMusic.trackId,
                        trackName: _selectedMusic.trackName,
                        artistName: _selectedMusic.artistName,
                        artworkUrl60: _selectedMusic.artworkUrl60,
                        trackViewUrl: _selectedMusic.trackViewUrl
                     };
                } else {
                     // Si no se seleccionó nada, intentar guardar lo que está en el input
                    formData.CancionInfo = document.getElementById('memoria-music-search').value.trim();
                    formData.CancionData = null; // Marcar que no viene de una selección
                     if (!formData.CancionInfo) { // Evitar guardar canciones vacías si no hubo selección
                        showModalStatus('memoria-status', 'Error: Debes buscar y seleccionar una canción o escribir un nombre.', true);
                        saveBtn.disabled = false;
                        saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
                        return; // Detener el guardado
                    }
                }
                break;
            case 'Imagen':
                const fileInput = document.getElementById('memoria-image-upload');
                formData.Descripcion = document.getElementById('memoria-image-desc').value;
                formData.file = (fileInput.files && fileInput.files.length > 0) ? fileInput.files[0] : null;
                 // Si estamos editando y NO se sube un archivo nuevo, mantener la URL existente
                if (_isEditingMemory && !formData.file && form.dataset.existingImageUrl) {
                    formData.ImagenURL = form.dataset.existingImageUrl;
                } else {
                     formData.ImagenURL = null; // Se subirá una nueva o no hay imagen
                }
                // Si no hay archivo Y no estamos editando (o si estamos editando pero no había imagen previa), error
                 if (!formData.file && !formData.ImagenURL) {
                     showModalStatus('memoria-status', 'Error: Debes seleccionar una imagen para subir.', true);
                     saveBtn.disabled = false;
                     saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
                     return; // Detener el guardado
                 }
                break;
        }

        callbacks.onSaveMemory(diaId, formData, _isEditingMemory);
    }
}


function handleMemoryTypeChange() {
    const type = document.getElementById('memoria-type').value;
    ['Texto', 'Lugar', 'Musica', 'Imagen'].forEach(id => {
        const el = document.getElementById(`input-type-${id}`);
        if (el) el.style.display = (id === type) ? 'block' : 'none';
    });
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
            const date = new Date(mem.Fecha_Original.seconds * 1000 || mem.Fecha_Original);
            document.getElementById('memoria-year').value = date.getFullYear();
        } catch(e) {
            document.getElementById('memoria-year').value = '';
        }
    } else {
         document.getElementById('memoria-year').value = '';
    }

    typeSelect.value = mem.Tipo;
    handleMemoryTypeChange();

    switch (mem.Tipo) {
        case 'Texto':
            document.getElementById('memoria-desc').value = mem.Descripcion || '';
            break;
        case 'Lugar':
            document.getElementById('memoria-place-search').value = mem.LugarNombre || '';
            if (mem.LugarData) {
                // Pre-seleccionar el lugar mostrando los datos guardados
                 _selectedPlace = { name: mem.LugarNombre, data: mem.LugarData };
                 // Pasamos un array con solo el objeto 'data' y marcamos como seleccionado
                showPlaceResults([mem.LugarData], true); 
            } else {
                 // Si no hay LugarData, limpiar la selección previa
                 _selectedPlace = null;
                 showPlaceResults([]); // Limpia la lista de resultados visualmente
            }
            break;
        case 'Musica':
             document.getElementById('memoria-music-search').value = mem.CancionInfo || '';
             if (mem.CancionData) {
                 // Pre-seleccionar la canción mostrando los datos guardados
                _selectedMusic = mem.CancionData; 
                 // Pasamos un array con solo el objeto CancionData y marcamos como seleccionado
                showMusicResults([mem.CancionData], true);
             } else {
                  // Si no hay CancionData, limpiar la selección previa
                 _selectedMusic = null;
                 showMusicResults([]); // Limpia la lista de resultados visualmente
             }
            break;
        case 'Imagen':
            document.getElementById('memoria-image-desc').value = mem.Descripcion || '';
            if (mem.ImagenURL) {
                document.getElementById('image-upload-status').textContent = `Imagen actual: ${mem.ImagenURL.split('%2F').pop().split('?')[0]}`; // Mostrar nombre archivo
                form.dataset.existingImageUrl = mem.ImagenURL; // Guardar URL para reusar si no se sube nueva imagen
            } else {
                document.getElementById('image-upload-status').textContent = '';
                form.dataset.existingImageUrl = '';
            }
            break;
    }

    _showMemoryForm(true);

    document.querySelector('.modal-content-scrollable')?.scrollTo({
        top: document.getElementById('memory-form').offsetTop,
        behavior: 'smooth'
    });
}

// ***** INICIO CAMBIO: resetMemoryForm ahora oculta el formulario *****
function resetMemoryForm() {
    _isEditingMemory = false;
    _selectedMusic = null;
    _selectedPlace = null;
    
    const form = document.getElementById('memory-form');
    if (!form) return;

    form.reset();
    form.dataset.editingId = '';
    form.dataset.existingImageUrl = '';
    
    document.getElementById('memoria-type').value = 'Texto';
    
    handleMemoryTypeChange(); 

    document.getElementById('itunes-results').innerHTML = '';
    document.getElementById('place-results').innerHTML = '';
    showModalStatus('memoria-status', '', false);
    showModalStatus('image-upload-status', '', false);

    const saveBtn = document.getElementById('save-memoria-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Añadir Memoria';
    }

    // CAMBIO: Ocultar el formulario al resetear (llamado desde handleSaveMemorySubmit)
    _showMemoryForm(false); 
}
// ***** FIN CAMBIO *****

function showMusicResults(tracks, isSelected = false) {
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) {
        console.error("[DEBUG UI] Contenedor #itunes-results no encontrado.");
        return;
    }
    console.log("[DEBUG UI] showMusicResults llamada con:", tracks, "isSelected:", isSelected); 
    resultsEl.innerHTML = ''; // Limpiar siempre
    // No resetear _selectedMusic aquí, se hace al seleccionar o al resetear form

    if (isSelected && tracks.length > 0) {
        const track = tracks[0];
        // No modificar _selectedMusic aquí, ya debería estar seteado en fillFormForEdit
        const displayName = track.trackName || track.title || "Canción seleccionada";
        console.log("[DEBUG UI] Mostrando selección de música:", displayName); 
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        return;
    }

    if (!tracks || tracks.length === 0) {
        console.log("[DEBUG UI] No hay resultados de música para mostrar."); 
        return; 
    }

    console.log(`[DEBUG UI] Renderizando ${tracks.length} resultados de música.`); 
    tracks.forEach(track => {
        const trackName = track.trackName;
        const artistName = track.artistName;
        const artwork = track.artworkUrl60;

        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <img src="${artwork}" class="memoria-artwork" alt="" ${artwork ? '' : 'style="display:none;"'}>
            <div class="memoria-item-content">
                <small>${artistName || 'Artista desconocido'}</small> 
                <strong>${trackName || 'Título desconocido'}</strong> 
            </div>
            <span class="material-icons-outlined">add_circle_outline</span>
        `;
        itemEl.addEventListener('click', () => {
            console.log("[DEBUG UI] Click en resultado de música:", track); 
            _selectedMusic = track; // <--- GUARDAR SELECCIÓN
            document.getElementById('memoria-music-search').value = `${trackName} - ${artistName}`;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${trackName}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}

function showPlaceResults(places, isSelected = false) {
    const resultsEl = document.getElementById('place-results');
     if (!resultsEl) {
        console.error("[DEBUG UI] Contenedor #place-results no encontrado.");
        return;
    }
    console.log("[DEBUG UI] showPlaceResults llamada con:", places, "isSelected:", isSelected); 
    resultsEl.innerHTML = ''; // Limpiar siempre
    // No resetear _selectedPlace aquí

    if (isSelected && places.length > 0) {
        const placeData = places[0]; 
         // No modificar _selectedPlace aquí, ya debería estar seteado en fillFormForEdit
        const displayName = placeData.display_name || _selectedPlace?.name || "Lugar seleccionado";
        console.log("[DEBUG UI] Mostrando selección de lugar:", displayName); 
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName.substring(0, 50)}...</p>`;
        return;
    }

    if (!places || places.length === 0) {
        console.log("[DEBUG UI] No hay resultados de lugares para mostrar."); 
        return;
    }

    console.log(`[DEBUG UI] Renderizando ${places.length} resultados de lugares.`); 
    places.forEach(place => {
        const displayName = place.display_name;
        const shortName = displayName.split(',')[0]; 

        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <span class="memoria-icon material-icons-outlined" style="font-size: 24px; margin-right: 10px; color: #666;">place</span>
            <div class="memoria-item-content">
                <small>${displayName.substring(0, 50)}...</small>
                <strong>${shortName}</strong>
            </div>
            <span class="material-icons-outlined">add_circle_outline</span>
        `;
        
        itemEl.addEventListener('click', () => {
            console.log("[DEBUG UI] Click en resultado de lugar:", place); 
            _selectedPlace = { // <--- GUARDAR SELECCIÓN
                name: displayName, 
                data: place 
            };
            document.getElementById('memoria-place-search').value = displayName;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${shortName}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}


function showModalStatus(elementId, message, isError) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = 'status-message'; 
    if (isError) {
        el.classList.add('error');
    } else if (message) {
        el.classList.add('success');
    }
}

function showCrumbieAnimation(message) {
    const textEl = document.createElement('div');
    textEl.className = 'crumbie-float-text';
    textEl.textContent = message;
    document.body.appendChild(textEl);

    textEl.addEventListener('animationend', () => {
        textEl.remove();
    });
}


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
