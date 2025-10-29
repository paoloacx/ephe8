/*
 * ui.js (v2.65 - Preview/Store/Edit UI tweaks)
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
    console.log("UI Module init (v2.65 - Preview/Store/Edit UI tweaks)");
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
    if (appContent) appContent.style.display = show ? 'grid' : 'none'; // Cambiado a grid si se usa .calendario-grid

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
        _allDaysData = []; // Asegurar que esté vacío si no hay datos
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
        _createLoginButton(false, loginBtnContainer); // No mostrar botón de login si está logueado
    } else {
        userInfo.style.display = 'none';
        _createLoginButton(true, loginBtnContainer); // Mostrar botón de login si no está logueado
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
    appContent.style.display = 'grid'; // Asegurar display grid
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
            listEl.innerHTML = ''; // Limpiar lista
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

    _destroyActiveMaps(); // Destruir mapas del modal al cerrar
    const spotlightContainer = document.getElementById('spotlight-memories-container');
    if (spotlightContainer) {
        // Re-inicializar mapas del spotlight tras cerrar modal (por si acaso)
        setTimeout(() => _initMapsInContainer(spotlightContainer, 'spotlight'), 250);
    }

    setTimeout(() => {
        previewModal.style.display = 'none';
        _currentDay = null; // Limpiar día actual
    }, 200); // Esperar a que termine la transición
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
                         <div id="edit-memorias-list-container" style="margin-top: 15px;"> <h4 style="margin-top: 0;">Memorias Existentes</h4> <div id="edit-memorias-list"></div>
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
        _showMemoryForm(true); // Mostrar el formulario
    });

    document.getElementById('btn-cancel-mem-edit')?.addEventListener('click', () => {
        _showMemoryForm(false); // Ocultar el formulario
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
                // Determinar el diaId correcto (puede ser _currentDay o del select)
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

    // Ocultar botón "Añadir" y lista cuando el formulario está visible
    if (addMemoryButtonContainer) addMemoryButtonContainer.style.display = show ? 'none' : 'block';
    if (memoryListContainer) memoryListContainer.style.display = show ? 'none' : 'block';

    // Si estamos en modo Añadir (sin _currentDay), la lista siempre está oculta
    if (!_currentDay && memoryListContainer) {
        memoryListContainer.style.display = 'none';
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
        dayNameSection.style.display = 'block'; // Mostrar sección Nombre
        addMemoryButtonContainer.style.display = 'block'; // Mostrar botón Añadir Memoria
        memoryListContainer.style.display = 'block'; // Mostrar lista de memorias

        if (dynamicTitleEl) dynamicTitleEl.textContent = 'Editar Día';
        const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
        titleEl.textContent = `Editando: ${dia.Nombre_Dia}${dayName}`;
        nameInput.value = dia.Nombre_Especial !== 'Unnamed Day' ? dia.Nombre_Especial : '';

    } else { // Modo Añadir Memoria
        daySelection.style.display = 'block'; // Mostrar selector de día
        addMemoryButtonContainer.style.display = 'block'; // Mostrar botón Añadir Memoria
        dayNameSection.style.display = 'none'; // Ocultar sección Nombre
        memoryListContainer.style.display = 'none'; // Ocultar lista de memorias

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

    _showMemoryForm(false); // Asegurarse que el form esté oculto al abrir
    resetMemoryForm();

    _renderMemoryList(document.getElementById('edit-memorias-list'), _currentMemories, true, 'edit'); // Renderizar lista (puede estar vacía u oculta)

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
        // Podríamos querer resetear el scroll aquí si es necesario
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
    document.body.appendChild(storeModal);

    const categoryList = storeModal.querySelector('.store-category-list');
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
    }

    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);
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
        contentEl.innerHTML = ''; // Limpiar "Cargando..."
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
function _renderMap(containerId, lat, lon, zoom = 13) { /* ... sin cambios ... */ }
function _initMapsInContainer(containerEl, prefix) { /* ... sin cambios ... */ }
function _destroyActiveMaps() { /* ... sin cambios ... */ }

function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!memories || memories.length === 0) {
        listEl.innerHTML = '<p class="list-placeholder">No hay memorias para este día.</p>';
        return;
    }

    memories.sort((a, b) => {
        const yearA = a.Fecha_Original ? (new Date(a.Fecha_Original.seconds * 1000 || a.Fecha_Original)).getFullYear() : 0;
        const yearB = b.Fecha_Original ? (new Date(b.Fecha_Original.seconds * 1000 || b.Fecha_Original)).getFullYear() : 0;
        return yearB - yearA; // Descendente
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
         _renderMemoryList(previewList, _currentMemories, false, 'preview');
         _destroyActiveMaps(); // Destruir mapas antiguos
         setTimeout(() => _initMapsInContainer(previewList, 'preview'), 10); // Inicializar nuevos mapas
    }
}

function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { /* ... sin cambios ... */ }
function createStoreCategoryButton(type, icon, label) { /* ... sin cambios ... */ }

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
        const year = item.Fecha_Original ? (new Date(item.Fecha_Original.seconds * 1000 || item.Fecha_Original)).getFullYear() : '';
        const dayName = item.Nombre_Dia || "Día";

        switch(item.Tipo) {
            case 'Lugar':
                icon = 'place';
                contentHTML = `<strong>${item.LugarNombre || 'Lugar sin nombre'}</strong><small>${year} - ${dayName}</small>`;
                break;
            case 'Musica':
                icon = 'music_note';
                contentHTML = `<strong>${item.CancionInfo || 'Canción sin nombre'}</strong><small>${year} - ${dayName}</small>`;
                break;
            case 'Imagen':
                icon = 'image';
                contentHTML = `<strong>${item.Descripcion || 'Imagen'}</strong><small>${year} - ${dayName}</small>`;
                break;
            case 'Texto':
            default:
                icon = 'article';
                const desc = item.Descripcion ? item.Descripcion.substring(0, 50) + (item.Descripcion.length > 50 ? '...' : '') : 'Nota vacía';
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

function _createLoginButton(isLoggedOut, container) { /* ... sin cambios ... */ }

// --- Lógica del Formulario de Memorias ---
let _selectedMusic = null;
let _selectedPlace = null;
function _handleFormSubmit(e) { /* ... sin cambios ... */ }
function handleMemoryTypeChange() { /* ... sin cambios ... */ }
function fillFormForEdit(mem) { /* ... sin cambios ... */ }
function resetMemoryForm() { /* ... sin cambios ... */ }
function showMusicResults(tracks, isSelected = false) { /* ... sin cambios ... */ }
function showPlaceResults(places, isSelected = false) { /* ... sin cambios ... */ }
function showModalStatus(elementId, message, isError) { /* ... sin cambios ... */ }

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
