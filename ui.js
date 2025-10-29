/*
 * ui.js (v4.25 - Implementación completa de Modales y resetForm)
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

function init(mainCallbacks) {
    console.log("UI Module init (v4.25 - Full Modal/Form Restore)");
    callbacks = mainCallbacks;
    // _allDaysData se llenará con updateAllDaysData

    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents(); // Asegura que settings se conecta
    _bindLoginEvents();
    _bindGlobalListeners();
    _bindCrumbieEvents(); // <-- Conectar Crumbie

    // Pre-crear modales principales
    createPreviewModal();
    createEditModal();
    // ***** CAMBIO: Crear todos los modales que faltaban *****
    createStoreModal();
    createStoreListModal();
    createAlertPromptModal();
    createConfirmModal();
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
        // Ocultar otras partes de la UI si estamos cargando
        showApp(false);
    } else {
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
        // No llamamos a showApp(true) aquí, main.js lo hará
    }
}

/**
 * Muestra u oculta los componentes principales de la aplicación.
 * @param {boolean} show - True para mostrar, false para ocultar.
 */
function showApp(show) {
    const display = show ? 'block' : 'none';
    const nav = document.querySelector('.month-nav');
    const spotlight = document.getElementById('spotlight-section');
    const appContent = document.getElementById('app-content'); // El grid del calendario

    if (nav) nav.style.display = show ? 'flex' : 'none';
    if (spotlight) spotlight.style.display = display;
    if (appContent) appContent.style.display = display;
    
    // Si mostramos la app, quitamos el mensaje de carga (si existe)
    if (show) {
         const loading = appContent?.querySelector('.loading-message');
         if (loading) loading.remove();
    }
}

/**
 * Recibe y almacena los datos de todos los días.
 * @param {Array} allDays - El array de objetos de días.
 */
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

/**
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

function openEditModal(dia, memories) { 
    _currentDay = dia; // Puede ser null si es Añadir
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


// --- INICIO CAMBIO: Funciones de Modales Restauradas ---

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
            <div class="modal-content-scrollable store-category-list">
                </div>
            <div class="modal-main-buttons">
                <button id="close-store-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(storeModal);

    const categoryList = storeModal.querySelector('.store-category-list');
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
            <div class="modal-content-scrollable" id="store-list-content">
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

    // Quitar botón "Cargar Más" si existe
    const oldLoadMoreBtn = contentEl.querySelector('#load-more-btn');
    if (oldLoadMoreBtn) oldLoadMoreBtn.remove();

    if (!append && items.length === 0) {
        listContainer.innerHTML = '<p class="list-placeholder" style="padding: 20px;">No se encontraron items.</p>';
        return;
    }

    if (!append) {
        listContainer.innerHTML = ''; // Limpiar lista para nuevos items
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
        contentEl.appendChild(loadMoreBtn); // Añadir al final del scroll
    }
}

// --- Modales: Alerta, Prompt, Confirmación ---

function createAlertPromptModal() {
    if (alertPromptModal) return;
    alertPromptModal = document.createElement('div');
    alertPromptModal.id = 'alert-prompt-modal';
    alertPromptModal.className = 'modal-alert-prompt';
    alertPromptModal.innerHTML = `
        <div class="modal-alert-content">
            <p id="alert-prompt-message"></p>
            <input type="text" id="alert-prompt-input" style="display:none;">
            <div class="modal-main-buttons">
                <button id="alert-prompt-cancel" style="display:none;"></button>
                <button id="alert-prompt-ok"></button>
            </div>
        </div>
    `;
    document.body.appendChild(alertPromptModal);
    _bindAlertPromptEvents();
}

function _bindAlertPromptEvents() {
    document.getElementById('alert-prompt-ok')?.addEventListener('click', () => {
        closeAlertPromptModal(true);
    });
    document.getElementById('alert-prompt-cancel')?.addEventListener('click', () => {
        closeAlertPromptModal(false);
    });
}

function closeAlertPromptModal(isOk) {
    if (!alertPromptModal) return;
    alertPromptModal.classList.remove('visible');
    setTimeout(() => {
        alertPromptModal.style.display = 'none';
        if (_promptResolve) {
            const input = document.getElementById('alert-prompt-input');
            _promptResolve(isOk ? input.value : null);
            _promptResolve = null;
        }
    }, 200);
}

function showAlert(message, type = 'default') {
    if (!alertPromptModal) createAlertPromptModal();
    
    const contentEl = alertPromptModal.querySelector('.modal-alert-content');
    const msgEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const okBtn = document.getElementById('alert-prompt-ok');
    const cancelBtn = document.getElementById('alert-prompt-cancel');

    msgEl.innerHTML = message.replace(/\n/g, '<br>'); // Permitir saltos de línea
    inputEl.style.display = 'none';
    okBtn.textContent = 'OK';
    cancelBtn.style.display = 'none';

    // Aplicar estilos Deep Blue
    contentEl.className = 'modal-alert-content'; // Reset
    if (type === 'settings') {
        contentEl.classList.add('settings-alert');
    } else if (type === 'search') {
        contentEl.classList.add('search-alert');
    }

    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
}

function showPrompt(message, defaultValue = '', type = 'default') {
    if (!alertPromptModal) createAlertPromptModal();
    
    const contentEl = alertPromptModal.querySelector('.modal-alert-content');
    const msgEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const okBtn = document.getElementById('alert-prompt-ok');
    const cancelBtn = document.getElementById('alert-prompt-cancel');
    
    msgEl.innerHTML = message.replace(/\n/g, '<br>');
    inputEl.style.display = 'block';
    inputEl.value = defaultValue;
    okBtn.textContent = 'OK';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.display = 'block';

    // Aplicar estilos Deep Blue
    contentEl.className = 'modal-alert-content'; // Reset
    if (type === 'settings') {
        contentEl.classList.add('settings-alert');
    } else if (type === 'search') {
        contentEl.classList.add('search-alert');
    }

    return new Promise((resolve) => {
        _promptResolve = resolve;
        alertPromptModal.style.display = 'flex';
        setTimeout(() => {
            alertPromptModal.classList.add('visible');
            inputEl.focus();
            inputEl.select();
        }, 10);
    });
}

function createConfirmModal() {
    if (confirmModal) return;
    confirmModal = document.createElement('div');
    confirmModal.id = 'confirm-modal';
    confirmModal.className = 'modal-confirm';
    confirmModal.innerHTML = `
        <div class="modal-alert-content">
            <p id="confirm-message"></p>
            <div class="modal-main-buttons">
                <button id="confirm-cancel">Cancelar</button>
                <button id="confirm-ok" class="delete-confirm">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    _bindConfirmModalEvents();
}

function _bindConfirmModalEvents() {
    document.getElementById('confirm-ok')?.addEventListener('click', () => {
        closeConfirmModal(true);
    });
    document.getElementById('confirm-cancel')?.addEventListener('click', () => {
        closeConfirmModal(false);
    });
}

function closeConfirmModal(isConfirmed) {
    if (!confirmModal) return;
    confirmModal.classList.remove('visible');
    setTimeout(() => {
        confirmModal.style.display = 'none';
        if (_confirmResolve) {
            _confirmResolve(isConfirmed);
            _confirmResolve = null;
        }
    }, 200);
}

function showConfirm(message) {
    if (!confirmModal) createConfirmModal();
    
    const msgEl = document.getElementById('confirm-message');
    msgEl.innerHTML = message.replace(/\n/g, '<br>');

    return new Promise((resolve) => {
        _confirmResolve = resolve;
        confirmModal.style.display = 'flex';
        setTimeout(() => confirmModal.classList.add('visible'), 10);
    });
}

// --- FIN CAMBIO: Funciones de Modales Restauradas ---


// --- Funciones de Ayuda (Helpers) de UI ---

function _renderMap(containerId, lat, lon, zoom = 13) {
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Contenedor de mapa no encontrado: #${containerId}`);
            return;
        }
        if (container._leaflet_id) {
            return;
        }
        if (typeof L === 'undefined') {
            console.error("Leaflet (L) no está definido.");
            container.innerHTML = '<p style="color: red; padding: 10px;">Error al cargar mapa.</p>';
            return;
        }
        const map = L.map(containerId, {
            center: [lat, lon],
            zoom: zoom,
            zoomControl: false, 
            dragging: false, 
            scrollWheelZoom: false, 
            doubleClickZoom: false, 
            touchZoom: false, 
            attributionControl: false 
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);
        L.marker([lat, lon]).addTo(map);
        _activeMaps.push(map); 
    } catch (e) {
        console.error(`Error al renderizar mapa en #${containerId}:`, e);
    }
}

function _initMapsInContainer(containerEl, prefix) {
    if (!containerEl) return;
    const mapDivs = containerEl.querySelectorAll('.memoria-map-container, .spotlight-map-container');
    mapDivs.forEach(div => {
        if (div.dataset.lat && div.dataset.lon) {
            const lat = parseFloat(div.dataset.lat);
            const lon = parseFloat(div.dataset.lon);
            const zoom = div.dataset.zoom ? parseInt(div.dataset.zoom) : 13;
            if (div.id) { 
                _renderMap(div.id, lat, lon, zoom);
            }
        }
    });
}

function _destroyActiveMaps() {
    _activeMaps.forEach(map => {
        if (map && map.remove) {
            map.remove();
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
    if (previewList && previewModal.classList.contains('visible') && _currentDay) {
         _renderMemoryList(previewList, _currentMemories, false, 'preview'); 
         _destroyActiveMaps();
         setTimeout(() => _initMapsInContainer(previewList, 'preview'), 10);
    }
}


function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') { 
    if (!mem) return '';
    const memId = (mem && mem.id) ? mem.id : ''; 

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
    let mapHTML = '';

    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            contentHTML += `${mem.LugarNombre || 'Lugar sin nombre'}`;
            if (mem.LugarData && mem.LugarData.lat && mem.LugarData.lon) {
                const lat = mem.LugarData.lat;
                const lon = mem.LugarData.lon;
                const mapContainerId = `${mapIdPrefix}-map-${memId || Date.now()}`; 
                const mapClass = (mapIdPrefix === 'spotlight') ? 'spotlight-map-container' : 'memoria-map-container';
                mapHTML = `<div id="${mapContainerId}" 
                                class="${mapClass}" 
                                data-lat="${lat}" 
                                data-lon="${lon}" 
                                data-zoom="13"></div>`;
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

// ***** INICIO CAMBIO: Funciones Helper Restauradas *****
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
        const year = item.Fecha_Original ? (new Date(item.Fecha_Original.seconds * 1000 || item.Fecha_Original)).getFullYear() : '';
        
        switch(item.Tipo) {
            case 'Lugar': 
                icon = 'place';
                contentHTML = `<strong>${item.LugarNombre}</strong><small>${year} - ${item.Nombre_Dia}</small>`;
                break;
            case 'Musica': 
                icon = 'music_note'; 
                contentHTML = `<strong>${item.CancionInfo}</strong><small>${year} - ${item.Nombre_Dia}</small>`;
                break;
            case 'Imagen': 
                icon = 'image'; 
                contentHTML = `<strong>${item.Descripcion || 'Imagen'}</strong><small>${year} - ${item.Nombre_Dia}</small>`;
                break;
            case 'Texto':
            default:
                icon = 'article';
                contentHTML = `<strong>${item.Descripcion.substring(0, 50)}...</strong><small>${year} - ${item.Nombre_Dia}</small>`;
                break;
        }
    }
    
    itemEl.innerHTML = `
        <span class="memoria-icon material-icons-outlined">${icon}</span>
        <div class="memoria-item-content">${contentHTML}</div>
        <span class="material-icons-outlined">chevron_right</span>
    `;
    return itemEl;
}

function _createLoginButton(isLoggedOut, container) {
    // Esta función no estaba en v4.20, pero la v4.24 la necesita.
    // La dejamos como estaba en v4.24.
    const btnId = 'login-btn';
    let btn = document.getElementById(btnId);
    if (btn) btn.remove();

    if (!isLoggedOut) {
        // No mostrar botón de "login" si está logueado
        return;
    }

    btn = document.createElement('button');
    btn.id = btnId;
    btn.className = 'header-login-btn';
    btn.title = 'Login with Google';
    btn.dataset.action = 'login';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.20455c0-.63864-.05727-1.25182-.16909-1.84091H9v3.48182h4.84364c-.20864 1.125-.84273 2.07818-1.77727 2.71136v2.25818h2.90864c1.70182-1.56682 2.68409-3.87409 2.68409-6.61045z"/><path fill="#34A853" d="M9 18c2.43 0 4.47182-.80591 5.96273-2.18045l-2.90864-2.25818c-.80591.54364-1.83682.86591-2.94.86591-2.27318 0-4.20727-1.53318-4.9-3.58227H1.07182v2.33318C2.56636 16.3 5.56 18 9 18z"/><path fill="#FBBC05" d="M4.1 10.71c-.22-.64-.35-1.32-.35-2.03s.13-.139.35-2.03V4.31H1.07C.38 5.67 0 7.29 0 9.03s.38 3.36 1.07 4.72l3.03-2.33v.03z"/><path fill="#EA4335" d="M9 3.57955c1.32136 0 2.50773.45455 3.44091 1.34591l2.58136-2.58136C13.46318.891364 11.4259 0 9 0 5.56 0 2.56636 1.70182 1.07182 4.31l3.02818 2.33318C4.79273 5.11273 6.72682 3.57955 9 3.57955z"/></svg>`;
    container.appendChild(btn);
}
// ***** FIN CAMBIO: Funciones Helper Restauradas *****


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
                    formData.LugarNombre = document.getElementById('memoria-place-search').value;
                    formData.LugarData = null;
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

    document.querySelector('.modal-content-scrollable')?.scrollTo({
        top: document.getElementById('memory-form').offsetTop,
        behavior: 'smooth'
    });
}

// ***** INICIO CAMBIO: Función resetMemoryForm Restaurada *****
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
    
    // Llamar al handler para mostrar/ocultar campos
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

    // Esta función NO oculta el formulario, _showMemoryForm(false) lo hace.
}
// ***** FIN CAMBIO *****

function showMusicResults(tracks, isSelected = false) {
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
            <img src="${artwork}" class="memoria-artwork" alt="" ${artwork ? '' : 'style="display:none;"'}>
            <div class="memoria-item-content">
                <small>${artistName}</small>
                <strong>${trackName}</strong>
            </div>
            <span class="material-icons-outlined">add_circle_outline</span>
        `;
        itemEl.addEventListener('click', () => {
            _selectedMusic = track; 
            document.getElementById('memoria-music-search').value = `${trackName} - ${artistName}`;
            resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${trackName}</p>`;
        });
        resultsEl.appendChild(itemEl);
    });
}

function showPlaceResults(places, isSelected = false) {
    const resultsEl = document.getElementById('place-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    _selectedPlace = null;

    if (isSelected && places.length > 0) {
        const placeData = places[0]; 
        _selectedPlace = {
            name: placeData.display_name, 
            data: placeData 
        };
        const displayName = placeData.display_name || "Lugar seleccionado";
        resultsEl.innerHTML = `<p class="search-result-selected">Seleccionado: ${displayName.substring(0, 50)}...</p>`;
        return;
    }

    if (!places || places.length === 0) return;

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
            _selectedPlace = {
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
    el.className = 'status-message'; // Reset
    if (isError) {
        el.classList.add('error');
    } else if (message) {
        el.classList.add('success');
    }
}

// ***** INICIO CAMBIO: Función Crumbie Restaurada *****
function showCrumbieAnimation(message) {
    // 1. Crear el elemento de texto
    const textEl = document.createElement('div');
    textEl.className = 'crumbie-float-text';
    textEl.textContent = message;
    document.body.appendChild(textEl);

    // 2. Escuchar la animación para aut-destruirse
    textEl.addEventListener('animationend', () => {
        textEl.remove();
    });
}
// ***** FIN CAMBIO *****


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
