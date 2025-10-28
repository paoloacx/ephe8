/*
 * ui.js (v4.23 - Restauradas funciones de Modales y Helpers)
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

// INICIO v17.6: Array para gestionar mapas Leaflet
let _activeMaps = [];
// FIN v17.6

// --- Funciones de Inicialización ---

function init(mainCallbacks, allDays) { // ***** CAMBIO: Recibe allDays *****
    console.log("UI Module init (v4.23 - Restauradas funciones)");
    callbacks = mainCallbacks;
    _allDaysData = allDays || []; // ***** CAMBIO: Almacena allDays *****

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents(); // Asegura que settings se conecta
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents(); // <-- Conectar Crumbie

    // Pre-crear modales principales
    createPreviewModal();
    createEditModal();
    createAlertPromptModal();
    createConfirmModal();
    // INICIO V4.23: Crear modales de Almacén
    createStoreModal();
    createStoreListModal();
    // FIN V4.23
}

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
            // CAMBIO v4.23: Simplificado, el botón siempre es login
            if (callbacks.onLogin) {
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
    } else {
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
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
        // CAMBIO v4.23: El CSS en index.html se encarga de ocultar el botón de login
        //_createLoginButton(true, loginBtnContainer); // <- Eliminado
    } else {
        userInfo.style.display = 'none';
        // CAMBIO v4.23: El CSS en index.html se encarga de mostrar el botón de login
        //_createLoginButton(false, loginBtnContainer); // <- Eliminado
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
    const listEl = document.getElementById('today-memory-spotlight'); // This is the main box

    if (titleEl) titleEl.textContent = dateString; // Solo la fecha
    if (!listEl) return;

    listEl.innerHTML = ''; // Limpiar la caja principal

    // 1. Añadir el nombre del día (si existe)
    if (dayName) {
        const dayNameEl = document.createElement('h3');
        dayNameEl.className = 'spotlight-day-name';
        dayNameEl.textContent = `- ${dayName} -`;
        listEl.appendChild(dayNameEl);
    }

    // 2. Crear el contenedor para las memorias
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

    // 3. Añadir memorias al contenedor
    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'spotlight-memory-item';

        // Añadir clase para truncado CSS
        if (mem.Tipo === 'Texto') {
            itemEl.classList.add('spotlight-item-text');
        }

        // INICIO v17.6: Usar 'spotlight' como prefijo de ID de mapa
        itemEl.innerHTML = createMemoryItemHTML(mem, false, 'spotlight');
        // FIN v17.6

        itemEl.addEventListener('click', () => {
             // ***** CAMBIO: Usar _allDaysData del módulo *****
             const diaObj = _allDaysData.find(d => d.id === mem.diaId); 
             if (diaObj && callbacks.onDayClick) {
                 callbacks.onDayClick(diaObj);
            } else {
                console.warn("No se encontró el objeto 'dia' para el spotlight:", mem.diaId);
            }
        });

        containerEl.appendChild(itemEl);
    });
    
    // INICIO v17.6: Inicializar mapas DESPUÉS de añadirlos al DOM
    _initMapsInContainer(containerEl, 'spotlight');
    // FIN v17.6
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

    _renderMemoryList(listEl, memories, false, 'preview'); // v17.6: Añadido prefijo 'preview'

    previewModal.style.display = 'flex';
    setTimeout(() => {
        previewModal.classList.add('visible');
        // INICIO v17.6: Inicializar mapas DESPUÉS de que el modal sea visible
        _initMapsInContainer(listEl, 'preview');
        // FIN v17.6
    }, 10);
}

function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove('visible');
    
    // ***** CAMBIO: Destruir mapas Y Reinicializar Spotlight *****
    _destroyActiveMaps();
    // Re-renderizar mapas en el spotlight (si existe)
    const spotlightContainer = document.getElementById('spotlight-memories-container');
    if (spotlightContainer) {
        // Usamos setTimeout para asegurar que se ejecuta después de la transición
        setTimeout(() => _initMapsInContainer(spotlightContainer, 'spotlight'), 250);
    }
    // ************************************************************
    
    setTimeout(() => {
        previewModal.style.display = 'none';
        _currentDay = null;
    }, 200);
}


// --- Modal: Edición (Edit/Add) ---

/**
 * CAMBIO v17.0: Rediseño del modal
 */
function createEditModal() {
    if (editModal) return;

    editModal = document.createElement('div');
    editModal.id = 'edit-add-modal';
    editModal.className = 'modal-edit'; // CSS usa .modal-edit para alinear arriba
    editModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header">
                 <h3 id="edit-modal-title-dynamic">Añadir/Editar</h3>
            </div>
            <div class="modal-content-scrollable">
                <p class="list-placeholder edit-loading" style="display: none; padding: 20px;">Cargando...</p>
                <div class="edit-content-wrapper">
                    <div class="modal-section" id="day-selection-section" style="display: none;">
                        <h3>Añadir Memoria a...</h3>
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

async function handleNameSelectedDay() { // Async para usar showPrompt
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

/**
 * CAMBIO v17.0: Añadidos listeners para el nuevo flujo de mostrar/ocultar formulario
 */
function _bindEditModalEvents() {
    document.getElementById('close-edit-add-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
        if (callbacks.onSaveDayName && _currentDay) {
            const input = document.getElementById('nombre-especial-input');
            callbacks.onSaveDayName(_currentDay.id, input.value.trim(), 'save-status');
        }
    });

    document.getElementById('btn-name-selected-day')?.addEventListener('click', handleNameSelectedDay);

    // --- Nuevos Listeners para el flujo del formulario ---
    document.getElementById('btn-show-add-form')?.addEventListener('click', () => {
        resetMemoryForm(); // Limpia el formulario
        _showMemoryForm(true); // Muestra el formulario
    });

    document.getElementById('btn-cancel-mem-edit')?.addEventListener('click', () => {
        _showMemoryForm(false); // Oculta el formulario
    });
    // --- Fin nuevos listeners ---

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
            if (!memoriaId) {
                console.error("ID de memoria inválido en el botón de editar.");
                return;
            }
            if (_currentMemories && _currentMemories.length > 0) {
                const memToEdit = _currentMemories.find(m => m.id === memoriaId);
                if (memToEdit) {
                    fillFormForEdit(memToEdit); // Esta función ahora también mostrará el formulario
                } else {
                    console.error("No se encontró la memoria en _currentMemories:", memoriaId);
                    showModalStatus('memoria-status', 'Error: Memoria no encontrada.', true);
                }
            }
        }

        if (deleteBtn) {
            // (El código de borrado no necesita cambios)
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

/**
 * CAMBIO v17.0: Nueva función helper para mostrar/ocultar el formulario
 * @param {boolean} show - True para mostrar el form, false para ocultarlo
 */
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


/**
 * CAMBIO v17.0: Actualizado para el nuevo flujo
 */
function openEditModal(dia, memories) { // ***** CAMBIO: Ya no necesita allDays *****
    _currentDay = dia; // Puede ser null si es Añadir
    _currentMemories = memories || [];
    // _allDaysData ya está disponible en el módulo

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

        // ***** CAMBIO: Usa _allDaysData del módulo *****
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

    // CAMBIO v17.0: Asegurarse de que el formulario esté oculto al abrir
    _showMemoryForm(false);
    resetMemoryForm(); // Limpia el formulario (pero lo deja oculto)

    _renderMemoryList(document.getElementById('edit-memorias-list'), _currentMemories, true); // Renderizar lista de memorias

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


// --- Modales Almacén, Alerta, Confirmación ---

// --- INICIO V4.23: Funciones de Almacén (Store) ---
function createStoreModal() {
    if (storeModal) return;

    storeModal = document.createElement('div');
    storeModal.id = 'store-modal';
    storeModal.className = 'modal-store';
    storeModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header">
                 <h3>Almacén</h3>
            </div>
            <div class="modal-content-scrollable">
                <div class="store-category-list">
                    </div>
            </div>
            <div class="modal-main-buttons">
                <button id="close-store-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(storeModal);

    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);

    const listEl = storeModal.querySelector('.store-category-list');
    
    // Crear botones de categoría
    const categories = [
        { type: 'Nombres', icon: 'label', label: 'Días Nombrados' },
        { type: 'Texto', icon: 'article', label: 'Notas de Texto' },
        { type: 'Lugar', icon: 'place', label: 'Lugares' },
        { type: 'Musica', icon: 'music_note', label: 'Canciones' },
        { type: 'Imagen', icon: 'image', label: 'Fotos' }
    ];

    categories.forEach(cat => {
        const btn = createStoreCategoryButton(cat.type, cat.icon, cat.label);
        btn.addEventListener('click', () => {
            if (callbacks.onStoreCategoryClick) {
                callbacks.onStoreCategoryClick(cat.type);
            }
        });
        listEl.appendChild(btn);
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
    setTimeout(() => storeModal.style.display = 'none', 200);
}

function createStoreListModal() {
    if (storeListModal) return;

    storeListModal = document.createElement('div');
    storeListModal.id = 'store-list-modal';
    storeListModal.className = 'modal-store-list';
    storeListModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header">
                 <h3 id="store-list-title">Resultados</h3>
            </div>
            <div class="modal-content-scrollable" id="store-list-scrollable">
                <div id="store-list-content" class="modal-section">
                    </div>
                <button id="load-more-btn" class="aqua-button" style="display:none; width: calc(100% - 40px); margin: 0 20px 20px 20px; box-sizing: border-box;">Cargar más</button>
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
    document.getElementById('load-more-btn')?.addEventListener('click', () => {
        if (callbacks.onStoreLoadMore) {
            callbacks.onStoreLoadMore();
            const btn = document.getElementById('load-more-btn');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Cargando...';
            }
        }
    });

    // Clic en un item
    document.getElementById('store-list-content')?.addEventListener('click', (e) => {
        const itemEl = e.target.closest('.memoria-item');
        if (itemEl && itemEl.dataset.diaId) {
            if (callbacks.onStoreItemClick) {
                callbacks.onStoreItemClick(itemEl.dataset.diaId);
            }
        }
    });
}

function openStoreListModal(title) {
    if (!storeListModal) createStoreListModal();

    document.getElementById('store-list-title').textContent = title;
    document.getElementById('store-list-content').innerHTML = '<p class="list-placeholder">Cargando...</p>';
    document.getElementById('load-more-btn').style.display = 'none';
    
    storeListModal.style.display = 'flex';
    setTimeout(() => storeListModal.classList.add('visible'), 10);
}

function closeStoreListModal() {
    if (!storeListModal) return;
    storeListModal.classList.remove('visible');
    setTimeout(() => storeListModal.style.display = 'none', 200);
}

function updateStoreList(items, append = false, hasMore = false) {
    const listEl = document.getElementById('store-list-content');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (!listEl || !loadMoreBtn) return;

    if (!append) {
        listEl.innerHTML = ''; // Limpiar si no es "cargar más"
    }

    // Quitar placeholder si existe (p.ej. "Cargando...")
    const placeholder = listEl.querySelector('.list-placeholder');
    if (placeholder) placeholder.remove();

    if (items.length === 0 && !append) {
        listEl.innerHTML = '<p class="list-placeholder">No se encontraron items.</p>';
    }

    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const itemEl = createStoreListItem(item); // Usar el nuevo helper
        fragment.appendChild(itemEl);
    });
    listEl.appendChild(fragment);

    // Configurar botón "Cargar más"
    loadMoreBtn.style.display = hasMore ? 'block' : 'none';
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Cargar más';
}
// --- FIN V4.23: Funciones de Almacén ---


// --- INICIO V4.23: Funciones de Alerta/Prompt/Confirmación ---
function createAlertPromptModal() {
    if (alertPromptModal) return;

    alertPromptModal = document.createElement('div');
    alertPromptModal.id = 'alert-prompt-modal';
    alertPromptModal.className = 'modal-alert-prompt';
    alertPromptModal.innerHTML = `
        <div class="modal-alert-content">
            <p id="alert-prompt-message">Message</p>
            <input type="text" id="alert-prompt-input" style="display: none;">
            <div class="modal-main-buttons">
                <button id="alert-prompt-cancel-btn" style="display: none;">Cancelar</button>
                <button id="alert-prompt-ok-btn">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(alertPromptModal);
    _bindAlertPromptEvents();
}

function _bindAlertPromptEvents() {
    document.getElementById('alert-prompt-ok-btn')?.addEventListener('click', () => closeAlertPromptModal(true));
    document.getElementById('alert-prompt-cancel-btn')?.addEventListener('click', () => closeAlertPromptModal(false));
}

function closeAlertPromptModal(isOk) {
    if (!alertPromptModal) return;
    const input = document.getElementById('alert-prompt-input');
    const content = alertPromptModal.querySelector('.modal-alert-content');
    
    alertPromptModal.classList.remove('visible');
    
    setTimeout(() => {
        alertPromptModal.style.display = 'none';
        // Limpiar clases de tipo
        content.classList.remove('settings-alert', 'search-alert');
        
        if (_promptResolve) {
            if (isOk) {
                _promptResolve(input.value);
            } else {
                _promptResolve(null); // Resuelve null si cancela
            }
        }
        _promptResolve = null;
    }, 200);
}

function showAlert(message, type = 'default') {
    if (!alertPromptModal) createAlertPromptModal();
    
    document.getElementById('alert-prompt-message').textContent = message;
    document.getElementById('alert-prompt-input').style.display = 'none';
    document.getElementById('alert-prompt-cancel-btn').style.display = 'none';
    document.getElementById('alert-prompt-ok-btn').style.display = 'block';

    const content = alertPromptModal.querySelector('.modal-alert-content');
    if (type === 'settings') content.classList.add('settings-alert');
    if (type === 'search') content.classList.add('search-alert');

    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
    
    // Para showAlert, devolvemos una promesa que se resuelve al pulsar OK
    return new Promise((resolve) => {
        _promptResolve = resolve; // Reutilizamos _promptResolve
    });
}

function showPrompt(message, defaultValue = '', type = 'default') {
    if (!alertPromptModal) createAlertPromptModal();
    
    document.getElementById('alert-prompt-message').textContent = message;
    const input = document.getElementById('alert-prompt-input');
    input.style.display = 'block';
    input.value = defaultValue;
    document.getElementById('alert-prompt-cancel-btn').style.display = 'block';
    document.getElementById('alert-prompt-ok-btn').style.display = 'block';

    const content = alertPromptModal.querySelector('.modal-alert-content');
    if (type === 'settings') content.classList.add('settings-alert');
    if (type === 'search') content.classList.add('search-alert');

    alertPromptModal.style.display = 'flex';
    setTimeout(() => {
        alertPromptModal.classList.add('visible');
        if (type !== 'settings') { // No hacer focus en settings (multilínea)
             input.focus();
             input.select();
        }
    }, 10);
    
    return new Promise((resolve) => {
        _promptResolve = resolve;
    });
}

function createConfirmModal() {
    if (confirmModal) return;

    confirmModal = document.createElement('div');
    confirmModal.id = 'confirm-modal';
    confirmModal.className = 'modal-confirm';
    confirmModal.innerHTML = `
        <div class="modal-alert-content">
            <p id="confirm-message">¿Estás seguro?</p>
            <div class="modal-main-buttons">
                <button id="confirm-cancel-btn">Cancelar</button>
                <button id="confirm-ok-btn" class="delete-confirm">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    _bindConfirmModalEvents();
}

function _bindConfirmModalEvents() {
    document.getElementById('confirm-ok-btn')?.addEventListener('click', () => closeConfirmModal(true));
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => closeConfirmModal(false));
}

function closeConfirmModal(isConfirmed) {
    if (!confirmModal) return;
    confirmModal.classList.remove('visible');
    
    setTimeout(() => {
        confirmModal.style.display = 'none';
        if (_confirmResolve) {
            _confirmResolve(isConfirmed);
        }
        _confirmResolve = null;
    }, 200);
}

function showConfirm(message) {
    if (!confirmModal) createConfirmModal();
    
    document.getElementById('confirm-message').textContent = message;
    
    confirmModal.style.display = 'flex';
    setTimeout(() => confirmModal.classList.add('visible'), 10);
    
    return new Promise((resolve) => {
        _confirmResolve = resolve;
    });
}
// --- FIN V4.23: Funciones de Alerta/Prompt/Confirmación ---


// --- Funciones de Ayuda (Helpers) de UI ---

// INICIO v17.6: Nueva función para renderizar mapas
/**
 * Renderiza un mapa Leaflet en un contenedor.
 * @param {string} containerId - El ID del elemento div.
 *... (El resto de esta sección está presente y correcta) ...*/
function _renderMap(containerId, lat, lon, zoom = 13) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Contenedor de mapa no encontrado: #${containerId}`);
            return;
        }

        // Evitar reinicialización si ya existe un mapa
        if (container._leaflet_id) {
            return;
        }
        
        // Verificar que L (Leaflet) esté cargado
        if (typeof L === 'undefined') {
            console.error("Leaflet (L) no está definido. Asegúrate de que el script está cargado.");
            container.innerHTML = '<p style="color: red; padding: 10px;">Error al cargar mapa.</p>';
            return;
        }

        const map = L.map(containerId, {
            center: [lat, lon],
            zoom: zoom,
            zoomControl: false, // Sin controles de zoom
            dragging: false, // No se puede arrastrar
            scrollWheelZoom: false, // Sin zoom con rueda
            doubleClickZoom: false, // Sin doble click
            touchZoom: false, // Sin zoom táctil
            attributionControl: false // Sin atribución
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        L.marker([lat, lon]).addTo(map);

        _activeMaps.push(map); // Añadir al array para gestión

    } catch (e) {
        console.error(`Error al renderizar mapa en #${containerId}:`, e);
    }
}

/**
 * Busca y renderiza todos los mapas pendientes en un contenedor.
 * @param {HTMLElement} containerEl - El elemento padre (p.ej. preview-list)
 * @param {string} prefix - El prefijo usado para los IDs ('spotlight' o 'preview')
 */
function _initMapsInContainer(containerEl, prefix) {
    if (!containerEl) return;
    
    const mapDivs = containerEl.querySelectorAll('.memoria-map-container, .spotlight-map-container');
    
    mapDivs.forEach(div => {
        if (div.dataset.lat && div.dataset.lon) {
            const lat = parseFloat(div.dataset.lat);
            const lon = parseFloat(div.dataset.lon);
            const zoom = div.dataset.zoom ? parseInt(div.dataset.zoom) : 13;
            // El ID ya debe estar puesto (p.ej. "preview-map-XYZ")
            if (div.id) { 
                _renderMap(div.id, lat, lon, zoom);
            }
        }
    });
}

/**
 * Destruye todas las instancias de mapas activas (para cerrar modales).
 */
function _destroyActiveMaps() {
    _activeMaps.forEach(map => {
        if (map && map.remove) {
            map.remove();
        }
    });
    _activeMaps = []; // Limpiar el array
}
// FIN v17.6


function _renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') { // v17.6: Añadido mapIdPrefix
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
        // INICIO v17.6: Pasar el prefijo del mapa
        itemEl.innerHTML = createMemoryItemHTML(mem, showActions, mapIdPrefix);
        // FIN v17.6
        fragment.appendChild(itemEl);
    });
    listEl.appendChild(fragment);
}

function updateMemoryList(memories) {
    _currentMemories = memories || [];
    // Actualizar lista tanto en Edit como en Preview si está abierto
    const editList = document.getElementById('edit-memorias-list');
    if (editList) _renderMemoryList(editList, _currentMemories, true, 'edit'); // v17.6: prefijo 'edit'
    
    const previewList = document.getElementById('preview-memorias-list');
    if (previewList && previewModal.classList.contains('visible') && _currentDay) {
         _renderMemoryList(previewList, _currentMemories, false, 'preview'); // v17.6: prefijo 'preview'
         
         // INICIO v17.6: Reinicializar mapas en preview si se actualiza la lista
         _destroyActiveMaps();
         setTimeout(() => _initMapsInContainer(previewList, 'preview'), 10);
         // FIN v17.6
    }
}


function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { // v17.6: Añadido mapIdPrefix
    if (!mem) return '';
    const memId = (mem && mem.id) ? mem.id : ''; // Asegurarse de que memId se define aquí

    let yearStr = 'Año desc.';
    if (mem.Fecha_Original) {
        try {
            const date = new Date(mem.Fecha_Original.seconds * 1000 || mem.Fecha_Original);
            yearStr = date.getFullYear();
        } catch (e) { console.warn("Fecha inválida:", mem.Fecha_Original); }
    }

    let contentHTML = `<small>${yearStr}</small>`;
    let artworkHTML = '';
    let icon = 'article';
    
    // INICIO v17.6: Variable para el mapa
    let mapHTML = '';
    // FIN v17.6

    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            contentHTML += `${mem.LugarNombre || 'Lugar sin nombre'}`;
            // INICIO v17.6: Añadir div de mapa si hay datos
            if (mem.LugarData && mem.LugarData.lat && mem.LugarData.lon) {
                const lat = mem.LugarData.lat;
                const lon = mem.LugarData.lon;
                const mapContainerId = `${mapIdPrefix}-map-${memId || Date.now()}`; // ID único para el contenedor
                
                // Determinar la clase CSS basada en el prefijo
                const mapClass = (mapIdPrefix === 'spotlight') ? 'spotlight-map-container' : 'memoria-map-container';
                
                mapHTML = `<div id="${mapContainerId}" 
                                class="${mapClass}" 
                                data-lat="${lat}" 
                                data-lon="${lon}" 
                                data-zoom="13"></div>`;
            }
            // FIN v17.6
            break;
        case 'Musica':
            icon = 'music_note';
            // INICIO v2.1: Revertido a iTunes (y mantiene compatibilidad con Deezer si la hay)
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
            // FIN v2.1
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
            contentHTML += desc; // CAMBIO: Quitar truncado JS, se hará con CSS
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

    // INICIO v17.6: Modificado para agrupar contenido principal
    const mainContentHTML = `
        <div class="memoria-item-main-content ${mapIdPrefix === 'spotlight' ? 'spotlight-item-main-content' : ''}">
            ${artworkHTML}
            <div class="memoria-item-content">${contentHTML}</div>
            ${actionsHTML}
        </div>
    `;
    
    // Retornar contenido principal + mapa (si existe)
    return mainContentHTML + mapHTML;
    // FIN v17.6
}

// --- INICIO V4.23: Funciones Helper Restauradas ---
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
    // Usamos el estilo .memoria-item (definido en style.css)
    const itemEl = document.createElement('div');
    itemEl.className = 'memoria-item';
    itemEl.dataset.diaId = item.diaId;
    
    // Añadimos 'cursor: pointer' para que parezca clicable
    itemEl.style.cursor = 'pointer';

    if (item.type === 'Nombres') {
        // Renderizado especial para Días Nombrados
        itemEl.innerHTML = `
            <span class="memoria-icon material-icons-outlined">label</span>
            <div class="memoria-item-content">
                <small>${item.Nombre_Dia}</small>
                <strong>${item.Nombre_Especial}</strong>
            </div>`;
    } else {
        // Reutilizar el renderizado de memorias (sin acciones)
        // Usamos 'store' como prefijo de mapa
        itemEl.innerHTML = createMemoryItemHTML(item, false, 'store');
    }
    return itemEl;
}
// --- FIN V4.23 ---


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
         if (_currentDay) { // Modo Editar (día viene de _currentDay)
             diaId = _currentDay.id;
        } else { // Modo Añadir (día viene del select)
            diaId = document.getElementById('edit-mem-day').value;
            // ***** CAMBIO: Usa _allDaysData del módulo *****
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
                    // INICIO v17.6: Asegurar que guardamos lat/lon
                    formData.LugarData = {
                        display_name: _selectedPlace.data.display_name,
                        lat: _selectedPlace.data.lat,
                        lon: _selectedPlace.data.lon,
                        osm_id: _selectedPlace.data.osm_id
                    };
                    // FIN v17.6
                } else {
                    formData.LugarNombre = document.getElementById('memoria-place-search').value;
                    formData.LugarData = null;
                }
                break;
            case 'Musica':
                 if (_selectedMusic) {
                    // INICIO v2.1: Revertido a iTunes
                    formData.CancionInfo = `${_selectedMusic.trackName} - ${_selectedMusic.artistName}`;
                    // Guardamos el objeto de iTunes
                    formData.CancionData = {
                        trackId: _selectedMusic.trackId,
                        trackName: _selectedMusic.trackName,
                        artistName: _selectedMusic.artistName,
                        artworkUrl60: _selectedMusic.artworkUrl60,
                        trackViewUrl: _selectedMusic.trackViewUrl
                     };
                     // FIN v2.1
                } else {
                    formData.CancionInfo = document.getElementById('memoria-music-search').value;
                    formData.CancionData = null;
                }
                break;
            case 'Imagen':
                const fileInput = document.getElementById('memoria-image-upload');
                formData.Descripcion = document.getElementById('memoria-image-desc').value;
                formData.file = (fileInput.files && fileInput.files.length > 0) ? fileInput.files[0] : null;
                formData.ImagenURL = _isEditingMemory ? form.dataset.existingImageUrl : null;
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

/**
 * CAMBIO v17.0: Ahora también muestra el formulario
 */
function fillFormForEdit(mem) {
    if (!mem) return;

    resetMemoryForm(); // Limpia el formulario
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
                // v17.6: _selectedPlace espera {name, data}
                _selectedPlace = { name: mem.LugarNombre, data: mem.LugarData };
                showPlaceResults([_selectedPlace.data], true); // Pasar solo la data
            }
            break;
        case 'Musica':
             document.getElementById('memoria-music-search').value = mem.CancionInfo || '';
             if (mem.CancionData) {
                _selectedMusic = mem.CancionData; // Objeto iTunes (o Deezer antiguo)
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

    // Mostrar el formulario
    _showMemoryForm(true);

    document.querySelector('.modal-content-scrollable')?.scrollTo({
        top: document.getElementById('memory-form').offsetTop,
        behavior: 'smooth'
    });
}


// --- INICIO V4.23: Funciones Helper de Formulario Restauradas ---

function resetMemoryForm() {
    _isEditingMemory = false;
    _selectedMusic = null;
    _selectedPlace = null;

    const form = document.getElementById('memory-form');
    if (!form) return;

    form.reset(); // Limpia todos los inputs, textareas, selects
    form.dataset.editingId = '';
    form.dataset.existingImageUrl = '';

    // Limpiar resultados de búsqueda
    showMusicResults([]);
    showPlaceResults([]);

    // Limpiar mensajes de estado
    showModalStatus('memoria-status', '', false);
    showModalStatus('image-upload-status', '', false);
    
    // Resetear botón de guardar
    const saveBtn = document.getElementById('save-memoria-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Añadir Memoria';
    }

    // Asegurarse de que el tipo de memoria 'Texto' esté visible
    handleMemoryTypeChange();
}

function showPlaceResults(places, isSelected = false) {
    const resultsEl = document.getElementById('place-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    _selectedPlace = null;

    if (isSelected && places.length > 0) {
        const place = places[0];
        // v17.6: _selectedPlace espera {name, data}
        _selectedPlace = { 
            name: place.display_name.split(',')[0], // Coger solo el nombre
            data: place // Guardar toda la data
        };
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${_selectedPlace.name}</p>`;
        return;
    }

    if (!places || places.length === 0) return;

    places.forEach(place => {
        const displayName = place.display_name;
        const name = displayName.split(',')[0];
        const details = displayName.substring(name.length + 1).trim();

        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <span class="memoria-icon material-icons-outlined" style="margin-right: 10px; font-size: 24px; color: #666;">place</span>
            <div class="memoria-item-content">
                <small>${details}</small>
                <strong>${name}</strong>
            </div>
            <span class="material-icons-outlined">add_circle_outline</span>
        `;
        itemEl.addEventListener('click', () => {
             // v17.6: _selectedPlace espera {name, data}
            _selectedPlace = { name: name, data: place };
            document.getElementById('memoria-place-search').value = name;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${name}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}

function showModalStatus(elementId, message, isError) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;

    statusEl.textContent = message;
    if (isError) {
        statusEl.classList.add('error');
    } else {
        statusEl.classList.remove('error');
    }

    // Borrar mensaje después de 3 segundos si no es un error
    if (!isError && message !== '') {
        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = '';
            }
        }, 3000);
    }
}

function showCrumbieAnimation(message) {
    const floatText = document.createElement('div');
    floatText.className = 'crumbie-float-text';
    floatText.textContent = message;
    document.body.appendChild(floatText);

    // Eliminar el elemento después de la animación
    floatText.addEventListener('animationend', () => {
        if (floatText.parentNode) {
            floatText.parentNode.removeChild(floatText);
        }
    });
}
// --- FIN V4.23 ---


function showMusicResults(tracks, isSelected = false) {
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    _selectedMusic = null;

    if (isSelected && tracks.length > 0) {
        const track = tracks[0];
        _selectedMusic = track; // Guardar el objeto completo (iTunes o Deezer)
        // INICIO v2.1: Manejar ambos formatos (iTunes y Deezer antiguo)
        const displayName = track.trackName || track.title;
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName}</p>`;
        // FIN v2.1
        return;
    }

    if (!tracks || tracks.length === 0) return; // v17.6: Chequeo de nulidad

    tracks.forEach(track => {
        // INICIO v2.1: Revertido a iTunes
        const trackName = track.trackName;
        const artistName = track.artistName;
        const artwork = track.artworkUrl60;
        // FIN v2.1

        const itemEl = document.createElement('div');
        itemEl.className = 'search-result-item';
        itemEl.innerHTML = `
            <img src="${artwork}" class="memoria-artwork" alt="" ${artwork ? '' : 'style="display:none;"'}>
            <div class="memoria-item-content">
                <small>${artistName}</small>
                <strong>${trackName}</strong>
            </div>
            <span class="material-icons-outlined">add_circle_outline</span>
        `;
        itemEl.addEventListener('click', () => {
            _selectedMusic = track; // Guardar el objeto completo de iTunes
            document.getElementById('memoria-music-search').value = `${trackName} - ${artistName}`;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${trackName}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}


// --- Exportaciones Públicas ---
export const ui = {
    init,
    setLoading,
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
