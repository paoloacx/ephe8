/*
 * ui.js (v2.66 - Fix appendChild in createStoreModal init)
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

let _activeMaps = []; // Para gestionar mapas Leaflet

// --- Funciones de Inicialización ---

function init(mainCallbacks) {
    console.log("UI Module init (v2.66 - Fix appendChild init)"); // Versión actualizada
    callbacks = mainCallbacks;
    // _allDaysData se llenará con updateAllDaysData

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents();
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents();

    // Pre-crear modales principales
    createPreviewModal();
    createEditModal();
    createStoreModal(); // Llama a la función corregida
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
         appContent.style.display = 'block'; // Asegurar display block para el placeholder
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
    appContent.style.display = 'grid'; // Asegurar display grid para el calendario
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
        // Asegurar que no haya mapas activos si no hay memorias
         _destroyActiveMaps(); // Podría ser redundante, pero seguro
        return;
    }

    // Limpiar mapas antiguos antes de renderizar nuevos items
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

    // Inicializar mapas *después* de que todos los items estén en el DOM
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
                    <div id="preview-memorias-list">
                        <p class="list-placeholder preview-loading" style="display: none;">Cargando memorias...</p>
                    </div>
                </div>
            </div>
            <div class="modal-preview-footer">
                <button id="close-preview-btn" class="aqua-button small">Cerrar</button>
                <button id="edit-from-preview-btn" class="aqua-button small">Editar</button>
            </div>
        </div>`;
    document.body.appendChild(previewModal);

    document.getElementById('close-preview-btn')?.addEventListener('click', closePreviewModal);
    document.getElementById('edit-from-preview-btn')?.addEventListener('click', () => {
        if (callbacks.onEditFromPreview) callbacks.onEditFromPreview();
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

    const dayNameSpecial = dia.Nombre_Especial !== 'Unnamed Day' ? `: -${dia.Nombre_Especial}-` : '';
    if (titleEl) titleEl.textContent = `${dia.Nombre_Dia}${dayNameSpecial}`;

    // Limpiar mapas antiguos antes de renderizar
    _destroyActiveMaps();
    _renderMemoryList(listEl, memories, false, 'preview');

    previewModal.style.display = 'flex';
    setTimeout(() => {
        previewModal.classList.add('visible');
        // Inicializar mapas después de que el modal sea visible y el contenido esté renderizado
        _initMapsInContainer(listEl, 'preview');
    }, 10);
}

function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove('visible');

    _destroyActiveMaps(); // Destruir mapas del modal al cerrar
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
            <div class="modal-content-scrollable striped-background">
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
            if (term) callbacks.onSearchMusic(term);
        }
    });
    document.getElementById('btn-search-place')?.addEventListener('click', () => {
        if (callbacks.onSearchPlace) {
            const term = document.getElementById('memoria-place-search').value;
            if (term) callbacks.onSearchPlace(term);
        }
    });

    const listEl = document.getElementById('edit-memorias-list');
    listEl?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const memoriaId = editBtn.dataset.memoriaId;
            if (memoriaId && _currentMemories) {
                const memToEdit = _currentMemories.find(m => m.id === memoriaId);
                if (memToEdit) {
                    fillFormForEdit(memToEdit);
                } else {
                    console.error("Memoria no encontrada para editar:", memoriaId);
                    showModalStatus('memoria-status', 'Error: Memoria no encontrada.', true);
                }
            }
        }

        if (deleteBtn) {
            const memoriaId = deleteBtn.dataset.memoriaId;
            if (memoriaId && _currentMemories && callbacks.onDeleteMemory) {
                const memToDelete = _currentMemories.find(m => m.id === memoriaId);
                const diaId = _currentDay ? _currentDay.id : document.getElementById('edit-mem-day')?.value;
                if (memToDelete && diaId) {
                    callbacks.onDeleteMemory(diaId, memToDelete);
                } else {
                    console.error("No se pudo determinar memoria o día para borrar:", memoriaId, diaId);
                }
            }
        }
    });
}

function _showMemoryForm(show) {
    const form = document.getElementById('memory-form');
    const addMemoryButtonContainer = document.getElementById('add-memory-button-container');
    const memoryListContainer = document.getElementById('edit-memorias-list-container');

    if (form) form.style.display = show ? 'block' : 'none';
    if (addMemoryButtonContainer) addMemoryButtonContainer.style.display = show ? 'none' : 'block';

    // La lista solo se muestra si NO estamos mostrando el formulario Y estamos en modo Editar Día
    if (memoryListContainer) {
        memoryListContainer.style.display = (!show && _currentDay) ? 'block' : 'none';
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
    const addMemoryButtonContainer = document.getElementById('add-memory-button-container');
    const memoryListContainer = document.getElementById('edit-memorias-list-container');

    if (dia) { // Modo Editar Día
        daySelection.style.display = 'none';
        dayNameSection.style.display = 'block';
        addMemoryButtonContainer.style.display = 'block';
        memoryListContainer.style.display = 'block';

        if (dynamicTitleEl) dynamicTitleEl.textContent = 'Editar Día';
        const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
        titleEl.textContent = `Editando: ${dia.Nombre_Dia}${dayName}`;
        nameInput.value = dia.Nombre_Especial !== 'Unnamed Day' ? dia.Nombre_Especial : '';

    } else { // Modo Añadir Memoria
        daySelection.style.display = 'block';
        addMemoryButtonContainer.style.display = 'block';
        dayNameSection.style.display = 'none';
        memoryListContainer.style.display = 'none';

        if (dynamicTitleEl) dynamicTitleEl.textContent = 'Añadir Memoria';

        if (_allDaysData.length > 0) {
            daySelect.innerHTML = '';
             _allDaysData.sort((a, b) => a.id.localeCompare(b.id)).forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                const displayName = d.Nombre_Especial !== 'Unnamed Day' ? `${d.Nombre_Dia} (${d.Nombre_Especial})` : d.Nombre_Dia;
                opt.textContent = displayName;
                daySelect.appendChild(opt);
            });
             const today = new Date();
             const todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
             daySelect.value = todayId;
        } else {
             daySelect.innerHTML = '<option value="">Error: No hay días cargados</option>';
        }
    }

    _showMemoryForm(false);
    resetMemoryForm();

    _renderMemoryList(document.getElementById('edit-memorias-list'), _currentMemories, true, 'edit');

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
    // Limpiar mapas al cerrar
    _destroyActiveMaps();
    setTimeout(() => {
        editModal.style.display = 'none';
        _currentDay = null;
        _currentMemories = [];
        _isEditingMemory = false;
    }, 200);
}


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
            <div class="modal-content-scrollable store-category-list striped-background">
                </div>
            <div class="modal-main-buttons">
                <button id="close-store-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    // ***** CAMBIO: Añadir el modal al body ANTES de buscar elementos internos *****
    document.body.appendChild(storeModal);

    const categoryList = storeModal.querySelector('.store-category-list');
    // Añadir comprobación por si categoryList no se encuentra
    if (categoryList) {
        categoryList.appendChild(createStoreCategoryButton('Nombres', 'label', 'Días Nombrados'));
        categoryList.appendChild(createStoreCategoryButton('Texto', 'article', 'Notas'));
        categoryList.appendChild(createStoreCategoryButton('Lugar', 'place', 'Lugares'));
        categoryList.appendChild(createStoreCategoryButton('Musica', 'music_note', 'Canciones'));
        categoryList.appendChild(createStoreCategoryButton('Imagen', 'image', 'Imágenes'));

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
function openStoreModal() {
    if (!storeModal) createStoreModal(); // Asegura que el modal existe
    storeModal.style.display = 'flex';
    setTimeout(() => storeModal.classList.add('visible'), 10);
}
function closeStoreModal() {
    if (!storeModal) return;
    storeModal.classList.remove('visible');
    setTimeout(() => {
        storeModal.style.display = 'none';
    }, 200);
}

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
            <div class="modal-content-scrollable striped-background" id="store-list-content">
                </div>
            <div class="modal-main-buttons">
                <button id="close-store-list-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(storeListModal);
    _bindStoreListModalEvents();
}
function _bindStoreListModalEvents() {
    document.getElementById('close-store-list-btn')?.addEventListener('click', closeStoreListModal);
    const listContent = document.getElementById('store-list-content');
    listContent?.addEventListener('click', (e) => {
        const item = e.target.closest('.store-list-item');
        if (item && callbacks.onStoreItemClick) {
            callbacks.onStoreItemClick(item.dataset.diaId);
        }
        const loadMoreBtn = e.target.closest('#load-more-btn');
        if (loadMoreBtn && callbacks.onStoreLoadMore) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Cargando...';
            callbacks.onStoreLoadMore();
        }
    });
}
function openStoreListModal(title) {
    if (!storeListModal) createStoreListModal();
    const titleEl = document.getElementById('store-list-modal-title');
    const contentEl = document.getElementById('store-list-content');
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = '<p class="list-placeholder" style="padding: 20px;">Cargando items...</p>';
    storeListModal.style.display = 'flex';
    setTimeout(() => storeListModal.classList.add('visible'), 10);
}
function closeStoreListModal() {
    if (!storeListModal) return;
    storeListModal.classList.remove('visible');
    setTimeout(() => {
        storeListModal.style.display = 'none';
    }, 200);
}
function updateStoreList(items, append = false, hasMore = false) {
    const contentEl = document.getElementById('store-list-content');
    if (!contentEl) return;
    let listContainer = contentEl.querySelector('.store-list-container');
    if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.className = 'store-list-container';
        contentEl.innerHTML = '';
        contentEl.appendChild(listContainer);
    }
    const oldLoadMoreBtn = contentEl.querySelector('#load-more-btn');
    if (oldLoadMoreBtn) oldLoadMoreBtn.remove();
    if (!append && (!items || items.length === 0)) {
        listContainer.innerHTML = '<p class="list-placeholder" style="padding: 20px;">No se encontraron items.</p>';
        return;
    }
    if (!append) {
        listContainer.innerHTML = '';
    }
    items.forEach(item => {
        listContainer.appendChild(createStoreListItem(item));
    });
    if (hasMore) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'load-more-btn';
        loadMoreBtn.className = 'aqua-button';
        loadMoreBtn.textContent = 'Cargar Más';
        loadMoreBtn.style.width = 'calc(100% - 40px)';
        loadMoreBtn.style.margin = '15px 20px';
        contentEl.appendChild(loadMoreBtn);
    }
}

// --- Modales: Alerta, Prompt, Confirmación ---
function createAlertPromptModal() { /* ... sin cambios ... */ }
function _bindAlertPromptEvents() { /* ... sin cambios ... */ }
function closeAlertPromptModal(isOk) { /* ... sin cambios ... */ }
function showAlert(message, type = 'default') { /* ... sin cambios ... */ }
function showPrompt(message, defaultValue = '', type = 'default') { /* ... sin cambios ... */ }
function createConfirmModal() { /* ... sin cambios ... */ }
function _bindConfirmModalEvents() { /* ... sin cambios ... */ }
function closeConfirmModal(isConfirmed) { /* ... sin cambios ... */ }
function showConfirm(message) { /* ... sin cambios ... */ }


// --- Funciones de Ayuda (Helpers) de UI ---

/**
 * Renderiza un mapa Leaflet en un contenedor.
 */
function _renderMap(containerId, lat, lon, zoom = 13) {
    try {
        // Comprobar si el contenedor ya tiene un mapa
        const container = document.getElementById(containerId);
        if (!container || container._leaflet_id) {
            return;
        }

        // Crear el mapa
        const map = L.map(containerId).setView([lat, lon], zoom);

        // Añadir la capa de tiles (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Añadir un marcador
        L.marker([lat, lon]).addTo(map);

        // Guardar la instancia del mapa para destruirla después
        _activeMaps.push(map);

    } catch (e) {
        console.error("Error renderizando mapa Leaflet:", e);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = "Error al cargar el mapa.";
        }
    }
}

/**
 * Busca e inicializa todos los placeholders de mapas dentro de un contenedor.
 */
function _initMapsInContainer(containerEl, prefix) {
    if (!containerEl) return;

    // Buscar todos los placeholders de mapa que aún no se han inicializado
    const mapPlaceholders = containerEl.querySelectorAll(`div[id^="${prefix}-map-"][data-lat]`);
    
    mapPlaceholders.forEach(el => {
        // Comprobar si ya tiene un mapa (evitar reinicialización)
        if (el._leaflet_id) return;

        const lat = el.dataset.lat;
        const lon = el.dataset.lon;
        const zoom = el.dataset.zoom || 13;
        
        if (lat && lon) {
            // Dar un pequeño respiro al DOM para que mida el div
            setTimeout(() => {
                 _renderMap(el.id, parseFloat(lat), parseFloat(lon), parseInt(zoom));
            }, 50); // 50ms de espera
        }
    });
}

/**
 * Destruye todas las instancias de mapas activas.
 */
function _destroyActiveMaps() {
    _activeMaps.forEach(map => {
        if (map && map.remove) {
            try { 
                map.remove(); 
            } catch (e) { 
                console.warn("Error removing map:", e); 
            }
        }
    });
    _activeMaps = [];
}

function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!memories || memories.length === 0) {
        listEl.innerHTML = '<p class="list-placeholder">No hay memorias para este día.</p>';
        return;
    }

    memories.sort((a, b) => {
        const dateA = a.Fecha_Original?.seconds ? new Date(a.Fecha_Original.seconds * 1000) : (a.Fecha_Original instanceof Date ? a.Fecha_Original : new Date(0));
        const dateB = b.Fecha_Original?.seconds ? new Date(b.Fecha_Original.seconds * 1000) : (b.Fecha_Original instanceof Date ? b.Fecha_Original : new Date(0));
        return dateB.getFullYear() - dateA.getFullYear(); // Ordenar por año descendente
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

function updateMemoryList(memories) {
    _currentMemories = memories || [];
    const editList = document.getElementById('edit-memorias-list');
    if (editList) _renderMemoryList(editList, _currentMemories, true, 'edit');

    const previewList = document.getElementById('preview-memorias-list');
    if (previewList && previewModal && previewModal.classList.contains('visible') && _currentDay) {
         _destroyActiveMaps(); // Destruir mapas antiguos del preview
         _renderMemoryList(previewList, _currentMemories, false, 'preview');
         setTimeout(() => _initMapsInContainer(previewList, 'preview'), 10);
    }
}

function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') {
    if (!mem) return '';
    const memId = (mem && mem.id) ? mem.id : '';

    let yearStr = 'Año desc.';
    if (mem.Fecha_Original) {
        try {
            const date = mem.Fecha_Original.seconds ? new Date(mem.Fecha_Original.seconds * 1000) : new Date(mem.Fecha_Original);
            if (!isNaN(date)) { // Verificar si la fecha es válida
                yearStr = date.getFullYear();
            }
        } catch (e) { console.warn("Fecha inválida:", mem.Fecha_Original, e); }
    }


    let contentHTML = `<small>${yearStr}</small>`; // Small ya está bold por CSS
    let artworkHTML = '';
    let icon = 'article';
    let mapHTML = '';

    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            contentHTML += `${mem.LugarNombre || 'Lugar sin nombre'}`;
            // *** CAMBIO: Solo mostrar mapa si showActions es false (o sea, en Preview y Spotlight, NO en Edit) ***
            if (mem.LugarData && mem.LugarData.lat && mem.LugarData.lon && !showActions) {
                const lat = mem.LugarData.lat;
                const lon = mem.LugarData.lon;
                const mapContainerId = `${mapIdPrefix}-map-${memId || Date.now()}-${Math.random().toString(36).substring(2, 7)}`; // ID más único
                const mapClass = (mapIdPrefix === 'spotlight') ? 'spotlight-map-container' : 'memoria-map-container';
                mapHTML = `<div id="${mapContainerId}"
                                class="${mapClass}"
                                data-lat="${lat}"
                                data-lon="${lon}"
                                data-zoom="13">Cargando mapa...</div>`; // Placeholder
            }
            break;
        case 'Musica':
            icon = 'music_note';
            const trackName = mem.CancionData?.trackName || mem.CancionData?.title;
            const artistName = mem.CancionData?.artistName || mem.CancionData?.artist?.name;
            const artwork = mem.CancionData?.artworkUrl60 || mem.CancionData?.album?.cover_small;

            if (trackName) {
                contentHTML += `<strong>${trackName}</strong> <span class="artist-name">by ${artistName || 'Artista desc.'}</span>`;
                if(artwork) {
                    artworkHTML = `<img src="${artwork}" class="memoria-artwork" alt="Artwork">`;
                }
            } else {
                contentHTML += `${mem.CancionInfo || 'Canción sin nombre'}`;
            }
            break;
        case 'Imagen':
            icon = 'image';
            contentHTML += `${mem.Descripcion || 'Imagen'}`;
            if (mem.ImagenURL) {
                artworkHTML = `<img src="${mem.ImagenURL}" class="memoria-artwork" alt="Memoria">`;
            }
            break;
        case 'Texto':
        default:
            icon = 'article';
            const desc = mem.Descripcion || 'Nota vacía';
            contentHTML += desc;
            break;
    }

    if (!artworkHTML) {
        artworkHTML = `<span class="memoria-icon material-icons-outlined">${icon}</span>`;
    }

    const actionsHTML = (showActions && memId) ? `
        <div class="memoria-actions">
            <button class="edit-btn" title="Editar" data-memoria-id="${memId}">
                <span class="material-icons-outlined">edit</span>
            </button>
            <button class="delete-btn" title="Borrar" data-memoria-id="${memId}">
                <span class="material-icons-outlined">delete</span>
            </button>
        </div>` : '';

    const mainContentHTML = `
        <div class="memoria-item-main-content ${mapIdPrefix === 'spotlight' ? 'spotlight-item-main-content' : ''}">
            ${artworkHTML}
            <div class="memoria-item-content">${contentHTML}</div>
            ${actionsHTML}
        </div>
    `;

    return mainContentHTML + mapHTML;
}

function createStoreCategoryButton(type, icon, label) {
    const btn = document.createElement('button');
    btn.className = 'store-category-button';
    btn.dataset.type = type;
    btn.innerHTML = `
        <span class="material-icons-outlined">${icon}</span>
        <span>${label}</span>
        <span class="material-icons-outlined">chevron_right</span>
    `;
    return btn;
}

function createStoreListItem(item) {
    const itemEl = document.createElement('div');
    itemEl.className = 'store-list-item';
    itemEl.dataset.diaId = item.diaId;

    let contentHTML = '';
    let icon = 'article';

    if (item.type === 'Nombres') {
        icon = 'label';
        contentHTML = `<strong>${item.Nombre_Especial}</strong>
                       <small>${item.Nombre_Dia}</small>`;
    } else {
        const year = item.Fecha_Original?.seconds ? (new Date(item.Fecha_Original.seconds * 1000)).getFullYear() : (item.Fecha_Original instanceof Date ? item.Fecha_Original.getFullYear() : '');
        const dayName = item.Nombre_Dia || "Día";

        switch(item.Tipo) {
            case 'Lugar':
                icon = 'place';
                contentHTML = `<strong>${item.LugarNombre || 'Lugar'}</strong><small>${year} - ${dayName}</small>`;
                break;
            case 'Musica':
                icon = 'music_note';
                contentHTML = `<strong>${item.CancionInfo || 'Canción'}</strong><small>${year} - ${dayName}</small>`;
                break;
            case 'Imagen':
                icon = 'image';
                contentHTML = `<strong>${item.Descripcion || 'Imagen'}</strong><small>${year} - ${dayName}</small>`;
                break;
            case 'Texto':
            default:
                icon = 'article';
                const desc = item.Descripcion ? item.Descripcion.substring(0, 50) + (item.Descripcion.length > 50 ? '...' : '') : 'Nota';
                contentHTML = `<strong>${desc}</strong><small>${year} - ${dayName}</small>`;
                break;
        }
    }

    itemEl.innerHTML = `
        <span class="memoria-icon material-icons-outlined">${icon}</span>
        <div class="memoria-item-content">${contentHTML}</div>
        `; // Chevron eliminado
    return itemEl;
}

function _createLoginButton(isLoggedOut, container) {
    const btnId = 'login-btn';
    let btn = document.getElementById(btnId);
    if (btn) btn.remove();

    if (!isLoggedOut) {
        return; // No mostrar botón si está logueado
    }

    btn = document.createElement('button');
    btn.id = btnId;
    btn.className = 'header-login-btn';
    btn.title = 'Login with Google';
    btn.dataset.action = 'login';
    // SVG de Google
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.20455c0-.63864-.05727-1.25182-.16909-1.84091H9v3.48182h4.84364c-.20864 1.125-.84273 2.07818-1.77727 2.71136v2.25818h2.90864c1.70182-1.56682 2.68409-3.87409 2.68409-6.61045z"/><path fill="#34A853" d="M9 18c2.43 0 4.47182-.80591 5.96273-2.18045l-2.90864-2.25818c-.80591.54364-1.83682.86591-2.94.86591-2.27318 0-4.20727-1.53318-4.9-3.58227H1.07182v2.33318C2.56636 16.3 5.56 18 9 18z"/><path fill="#FBBC05" d="M4.1 10.71c-.22-.64-.35-1.32-.35-2.03s.13-.139.35-2.03V4.31H1.07C.38 5.67 0 7.29 0 9.03s.38 3.36 1.07 4.72l3.03-2.33v.03z"/><path fill="#EA4335" d="M9 3.57955c1.32136 0 2.50773.45455 3.44091 1.34591l2.58136-2.58136C13.46318.891364 11.4259 0 9 0 5.56 0 2.56636 1.70182 1.07182 4.31l3.02818 2.33318C4.79273 5.11273 6.72682 3.57955 9 3.57955z"/></svg>`;
    container.appendChild(btn);
}

// --- Lógica del Formulario de Memorias ---
let _selectedMusic = null;
let _selectedPlace = null;

async function _handleFormSubmit(e) {
    e.preventDefault();
    if (!callbacks.onSaveMemory) return;

    const saveBtn = document.getElementById('save-memoria-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    // Determinar el día (desde el modal de edición o el selector de añadir)
    const diaId = _currentDay ? _currentDay.id : document.getElementById('edit-mem-day').value;
    if (!diaId) {
        showModalStatus('memoria-status', 'Error: No se ha seleccionado un día.', true);
        saveBtn.disabled = false;
        saveBtn.textContent = _isEditingMemory ? 'Actualizar Memoria' : 'Añadir Memoria';
        return;
    }

    const type = document.getElementById('memoria-type').value;
    const year = document.getElementById('memoria-year').value;
    
    let memoryData = {
        Tipo: type,
        year: year, // Se convertirá a Fecha_Original en main.js
        id: _isEditingMemory ? document.getElementById('memory-form').dataset.memoriaId : null
    };

    try {
        switch (type) {
            case 'Texto':
                memoryData.Descripcion = document.getElementById('memoria-desc').value;
                if (!memoryData.Descripcion) throw new Error('La descripción no puede estar vacía.');
                break;
            case 'Lugar':
                if (!_selectedPlace) throw new Error('Debes seleccionar un lugar de la búsqueda.');
                memoryData.LugarNombre = _selectedPlace.display_name || _selectedPlace.LugarNombre;
                memoryData.LugarData = {
                    lat: _selectedPlace.lat,
                    lon: _selectedPlace.lon,
                    display_name: _selectedPlace.display_name || _selectedPlace.LugarNombre
                };
                break;
            case 'Musica':
                if (!_selectedMusic) throw new Error('Debes seleccionar una canción de la búsqueda.');
                // Normalizar los datos guardados
                const trackName = _selectedMusic.trackName || _selectedMusic.title;
                const artistName = _selectedMusic.artistName || _selectedMusic.artist?.name;
                const artwork = _selectedMusic.artworkUrl60 || _selectedMusic.album?.cover_small;
                
                memoryData.CancionInfo = `${trackName} - ${artistName}`;
                // Guardar solo los datos normalizados y necesarios
                memoryData.CancionData = {
                    trackName: trackName,
                    artistName: artistName,
                    artworkUrl60: artwork,
                    // Guardar el objeto original por si acaso, pero normalizado
                    ..._selectedMusic 
                };
                break;
            // No hay 'Imagen'
            default:
                throw new Error('Tipo de memoria no válido.');
        }

        // Llamar al callback de main.js
        await callbacks.onSaveMemory(diaId, memoryData, _isEditingMemory);

        // main.js se encargará de resetear el form y actualizar la UI
        // Pero lo habilitamos aquí por si main.js falla
        saveBtn.disabled = false;
        saveBtn.textContent = _isEditingMemory ? 'Actualizar Memoria' : 'Añadir Memoria';

    } catch (error) {
        showModalStatus('memoria-status', `Error: ${error.message}`, true);
        saveBtn.disabled = false;
        saveBtn.textContent = _isEditingMemory ? 'Actualizar Memoria' : 'Añadir Memoria';
    }
}

function handleMemoryTypeChange() {
    const type = document.getElementById('memoria-type')?.value;
    if (!type) return;

    // Ocultar todos los grupos
    const groups = document.querySelectorAll('.add-memory-input-group');
    groups.forEach(group => {
        group.style.display = 'none';
    });

    // Mostrar el grupo seleccionado
    const selectedGroup = document.getElementById(`input-type-${type}`);
    if (selectedGroup) {
        selectedGroup.style.display = 'block';
    }
}

function fillFormForEdit(mem) {
    if (!mem) return;
    resetMemoryForm();
    _isEditingMemory = true;

    document.getElementById('memory-form-title').textContent = 'Editar Memoria';
    document.getElementById('save-memoria-btn').textContent = 'Actualizar Memoria';
    document.getElementById('memory-form').dataset.memoriaId = mem.id;

    // Rellenar año
    if (mem.Fecha_Original) {
        const date = mem.Fecha_Original.seconds ? new Date(mem.Fecha_Original.seconds * 1000) : new Date(mem.Fecha_Original);
        if (!isNaN(date)) {
            document.getElementById('memoria-year').value = date.getFullYear();
        }
    }
    
    // Rellenar tipo y campos específicos
    document.getElementById('memoria-type').value = mem.Tipo;

    switch (mem.Tipo) {
        case 'Texto':
            document.getElementById('memoria-desc').value = mem.Descripcion || '';
            break;
        case 'Lugar':
            document.getElementById('memoria-place-search').value = mem.LugarNombre || '';
            if (mem.LugarData) {
                _selectedPlace = mem.LugarData;
                showPlaceResults([mem.LugarData], true); // Mostrar el lugar seleccionado
            }
            break;
        case 'Musica':
             document.getElementById('memoria-music-search').value = mem.CancionInfo || '';
             if (mem.CancionData) {
                 _selectedMusic = mem.CancionData;
                 // Formatear para showMusicResults (espera un array de tracks)
                 const track = mem.CancionData;
                 showMusicResults([track], true); // Mostrar la canción seleccionada
             }
            break;
        // No hay caso 'Imagen'
    }

    handleMemoryTypeChange(); // Mostrar los campos correctos
    _showMemoryForm(true); // Mostrar el formulario
}

function resetMemoryForm() {
    _isEditingMemory = false;
    _selectedMusic = null;
    _selectedPlace = null;

    const form = document.getElementById('memory-form');
    if (!form) return;
    
    form.reset(); // Limpia inputs, textareas, y selects
    form.dataset.memoriaId = '';

    document.getElementById('memory-form-title').textContent = 'Añadir Nueva Memoria';
    document.getElementById('save-memoria-btn').textContent = 'Añadir Memoria';

    // Limpiar resultados de búsqueda
    const musicResults = document.getElementById('itunes-results');
    const placeResults = document.getElementById('place-results');
    if (musicResults) musicResults.innerHTML = '';
    if (placeResults) placeResults.innerHTML = '';

    // Limpiar estados
    showModalStatus('memoria-status', '', false);
    //showModalStatus('image-upload-status', '', false); // Ya no existe
    
    // Poner año actual por defecto
    const yearInput = document.getElementById('memoria-year');
    if (yearInput) {
        // No poner año por defecto, puede confundir
        // yearInput.value = new Date().getFullYear();
    }
    
    // Asegurar que el tipo 'Texto' esté seleccionado por defecto
    const typeSelect = document.getElementById('memoria-type');
    if (typeSelect) {
        typeSelect.value = 'Texto';
    }

    // Ocultar/mostrar los campos correctos
    handleMemoryTypeChange();
}

function showMusicResults(tracks, isSelected = false) {
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';

    if (isSelected && tracks && tracks.length > 0) {
        const track = tracks[0];
        const trackName = track.trackName || track.title;
        const artistName = track.artistName || track.artist?.name;
        resultsEl.innerHTML = `<div class="search-result-selected">Seleccionado: ${trackName} - ${artistName}</div>`;
        return;
    }

    if (!tracks || tracks.length === 0) {
        resultsEl.innerHTML = '<p class="list-placeholder" style="padding: 10px;">No se encontraron canciones.</p>';
        return;
    }

    tracks.forEach(track => {
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <img src="${track.artworkUrl60 || track.album?.cover_small}" class="memoria-artwork" alt="Artwork">
            <div class="memoria-item-content">
                <strong>${track.trackName || track.title}</strong>
                <small>${track.artistName || track.artist?.name}</small>
            </div>
        `;
        itemEl.addEventListener('click', () => {
            _selectedMusic = track;
            // Guardar texto simple para re-edición
            _selectedMusic.CancionInfo = `${track.trackName} - ${track.artistName}`; 
            showMusicResults([track], true);
        });
        resultsEl.appendChild(itemEl);
    });
}

function showPlaceResults(places, isSelected = false) {
    const resultsEl = document.getElementById('place-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';

    if (isSelected && places && places.length > 0) {
        const place = places[0];
        resultsEl.innerHTML = `<div class="search-result-selected">Seleccionado: ${place.display_name || place.LugarNombre}</div>`;
        return;
    }

    if (!places || places.length === 0) {
        resultsEl.innerHTML = '<p class="list-placeholder" style="padding: 10px;">No se encontraron lugares.</p>';
        return;
    }

    places.forEach(place => {
        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <span class="memoria-icon material-icons-outlined" style="color: #666; font-size: 24px; width: 40px; text-align: center;">place</span>
            <div class="memoria-item-content">
                <strong>${place.display_name.split(',')[0]}</strong>
                <small>${place.display_name.substring(place.display_name.indexOf(',') + 2)}</small>
            </div>
        `;
        itemEl.addEventListener('click', () => {
            _selectedPlace = {
                lat: place.lat,
                lon: place.lon,
                display_name: place.display_name,
                LugarNombre: place.display_name // Guardar texto
            };
            showPlaceResults([_selectedPlace], true);
        });
        resultsEl.appendChild(itemEl);
    });
}

function showModalStatus(elementId, message, isError) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'status-message';
    if (isError) {
        statusEl.classList.add('error');
    } else {
        statusEl.classList.add('success');
    }
    
    if (message) {
        // Borrar mensaje después de 3 segundos si no es un error
        if (!isError) {
            setTimeout(() => {
                if (statusEl.textContent === message) {
                    statusEl.textContent = '';
                    statusEl.className = 'status-message';
                }
            }, 3000);
        }
    }
}


// --- Crumbie ---
function showCrumbieAnimation(message) { /* ... sin cambios ... */ }


// --- Exportaciones Públicas ---
export const ui = {
    init,
    setLoading,
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
