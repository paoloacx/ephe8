/*
 * ui.js (v2.73 - Modulo de Renderizado Extraído)
 * Módulo "CORE" de UI. Orquestador.
 */

// --- Importaciones de Módulos ---
import { uiMaps } from './ui-maps.js';
import * as forms from './ui-forms.js'; 
import * as render from './ui-render.js'; // *** NUEVO: Importar el módulo de renderizado ***

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
let genericAlertModal = null;
let _genericAlertResolve = null;

// Referencias a los modales principales
let previewModal = null;
let editModal = null;
let storeModal = null;
let storeListModal = null;
let searchResultsModal = null;


// --- Funciones de Inicialización ---

function init(mainCallbacks) {
    console.log("UI Module init (v2.73 - Render Module Extracted)");
    callbacks = mainCallbacks;

    // Inyectar dependencias en el módulo de formularios
    forms.initFormModule(callbacks, {
        getCurrentDay: () => _currentDay,
        getIsEditingMemory: () => _isEditingMemory,
        getAllDaysData: () => _allDaysData,
        setIsEditingMemory: (val) => { _isEditingMemory = val; }
    }, {
        showPrompt: showPrompt,
        showMemoryForm: _showMemoryForm
    });

    // *** NUEVO: Inyectar dependencias en el módulo de renderizado ***
    render.initRenderModule({
        getAllDaysData: () => _allDaysData
    }, callbacks, uiMaps);

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
    createSearchResultsModal();
    createAlertPromptModal();
    createConfirmModal();
    createGenericAlertModal();
}

// --- Bindings ---
function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        if (callbacks.onHeaderAction) callbacks.onHeaderAction('search');
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
        if (e.target.classList.contains('modal-search-results')) closeSearchResultsModal();
        if (e.target.classList.contains('modal-alert-prompt')) closeAlertPromptModal(false);
        if (e.target.classList.contains('modal-confirm')) closeConfirmModal(false);
        if (e.target.classList.contains('modal-simple-alert')) closeGenericAlertModal();
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

// --- ELIMINADO ---
// drawCalendar, _getMemorySpotlightDetails, updateSpotlight
// (Movidas a ui-render.js)


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

    uiMaps.destroyMapsInContainer(previewModal);
    // *** CAMBIO: Llamar al módulo de renderizado ***
    render.renderMemoryList(listEl, memories, false, 'preview');

    previewModal.style.display = 'flex';
    setTimeout(() => {
        previewModal.classList.add('visible');
        uiMaps.initMapsInContainer(listEl, 'preview');
    }, 10);
}

function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove('visible');

    uiMaps.destroyMapsInContainer(previewModal); 

    setTimeout(() => {
        previewModal.style.display = 'none';
        _currentDay = null;
    }, 200);
}


// --- Modal: Resultados de Búsqueda ---
function createSearchResultsModal() {
    if (searchResultsModal) return;

    searchResultsModal = document.createElement('div');
    searchResultsModal.id = 'search-results-modal';
    searchResultsModal.className = 'modal-search-results';
    searchResultsModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-preview-header">
                <h3 id="search-results-title">Resultados de búsqueda</h3>
            </div>
            <div class="modal-content-scrollable striped-background" id="search-results-content">
                <p class="list-placeholder">Buscando...</p>
            </div>
            <div class="modal-main-buttons">
                <button id="close-search-results-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(searchResultsModal);

    document.getElementById('close-search-results-btn')?.addEventListener('click', closeSearchResultsModal);
    
    const contentEl = document.getElementById('search-results-content');
    contentEl?.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-memory-item');
        if (item && item.dataset.diaId) {
            const diaObj = _allDaysData.find(d => d.id === item.dataset.diaId);
            if (diaObj && callbacks.onDayClick) {
                closeSearchResultsModal();
                setTimeout(() => {
                    callbacks.onDayClick(diaObj);
                }, 300);
            }
        }
    });
}

function openSearchResultsModal(searchTerm, results) {
    if (!searchResultsModal) createSearchResultsModal();

    const titleEl = document.getElementById('search-results-title');
    const contentEl = document.getElementById('search-results-content');

    if (titleEl) {
        titleEl.textContent = results.length > 0 
            ? `Resultados para "${searchTerm}" (${results.length})`
            : `Sin resultados para "${searchTerm}"`;
    }

    if (contentEl) {
        contentEl.innerHTML = '';
        
        if (results.length === 0) {
            contentEl.innerHTML = '<p class="list-placeholder" style="padding: 20px;">No se encontraron memorias.</p>';
        } else {
            uiMaps.destroyMapsInContainer(searchResultsModal);
            
            results.forEach(mem => {
                const itemEl = document.createElement('div');
                itemEl.className = 'search-result-memory-item';
                itemEl.dataset.diaId = mem.diaId;
                
                const dayName = mem.Nombre_Dia || 'Día';
                const daySpecial = mem.Nombre_Especial && mem.Nombre_Especial !== 'Unnamed Day' 
                    ? ` (${mem.Nombre_Especial})` 
                    : '';
                
                // *** CAMBIO: Llamar al módulo de renderizado ***
                itemEl.innerHTML = `
                    <div class="search-result-day-label">
                        <span class="material-icons-outlined">event</span>
                        ${dayName}${daySpecial}
                    </div>
                    ${render.createMemoryItemHTML(mem, false, 'search')}
                `;
                
                contentEl.appendChild(itemEl);
            });
            
            uiMaps.initMapsInContainer(contentEl, 'search');
        }
    }

    searchResultsModal.style.display = 'flex';
    setTimeout(() => searchResultsModal.classList.add('visible'), 10);
}

function closeSearchResultsModal() {
    if (!searchResultsModal) return;
    searchResultsModal.classList.remove('visible');
    uiMaps.destroyMapsInContainer(searchResultsModal);
    setTimeout(() => {
        searchResultsModal.style.display = 'none';
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

function _bindEditModalEvents() {
    document.getElementById('close-edit-add-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
        if (callbacks.onSaveDayName && _currentDay) {
            const input = document.getElementById('nombre-especial-input');
            callbacks.onSaveDayName(_currentDay.id, input.value.trim(), 'save-status');
        }
    });

    document.getElementById('btn-name-selected-day')?.addEventListener('click', forms.handleNameSelectedDay);

    document.getElementById('btn-show-add-form')?.addEventListener('click', () => {
        forms.resetMemoryForm(); 
        _showMemoryForm(true);
    });

    document.getElementById('btn-cancel-mem-edit')?.addEventListener('click', () => {
        _showMemoryForm(false);
    });

    document.getElementById('memory-form')?.addEventListener('submit', forms.handleFormSubmit);
    document.getElementById('memoria-type')?.addEventListener('change', forms.handleMemoryTypeChange);

    document.getElementById('btn-search-itunes')?.addEventListener('click', () => {
        if (callbacks.onSearchMusic) {
            const term = document.getElementById('memoria-music-search').value;
            if (term) callbacks.onSearchMusic(term, forms.showMusicResults);
        }
    });
    document.getElementById('btn-search-place')?.addEventListener('click', () => {
        if (callbacks.onSearchPlace) {
            const term = document.getElementById('memoria-place-search').value;
            if (term) callbacks.onSearchPlace(term, forms.showPlaceResults);
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
                    forms.fillFormForEdit(memToEdit);
                } else {
                    console.error("Memoria no encontrada para editar:", memoriaId);
                    forms.showModalStatus('memoria-status', 'Error: Memoria no encontrada.', true);
                }
            }
        }

        if (deleteBtn) {
            const memoriaId = deleteBtn.dataset.memoriaId;
            if (memoriaId && _currentMemories && callbacks.onDeleteMemory) {
                const memToDelete = _currentMemories.find(m => m.id === memoriaId);
                if (memToDelete && _currentDay) {
                    callbacks.onDeleteMemory(_currentDay.id, memToDelete);
                } else {
                    console.error("No se pudo determinar memoria o día para borrar:", memoriaId, _currentDay);
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

    if (dia) {
        daySelection.style.display = 'none';
        dayNameSection.style.display = 'block';
        addMemoryButtonContainer.style.display = 'block';
        memoryListContainer.style.display = 'block';

        if (dynamicTitleEl) dynamicTitleEl.textContent = 'Editar Día';
        const dayName = dia.Nombre_Especial !== 'Unnamed Day' ? ` (${dia.Nombre_Especial})` : '';
        titleEl.textContent = `${dia.Nombre_Dia}${dayName}`;
        nameInput.value = dia.Nombre_Especial !== 'Unnamed Day' ? dia.Nombre_Especial : '';

    } else {
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
    forms.resetMemoryForm(); 

    // *** CAMBIO: Llamar al módulo de renderizado ***
    render.renderMemoryList(document.getElementById('edit-memorias-list'), _currentMemories, true, 'edit');

    forms.showModalStatus('save-status', '', false);
    forms.showModalStatus('memoria-status', '', false);
    forms.showModalStatus('add-name-status', '', false);
    showEditLoading(false);

    editModal.style.display = 'flex';
    setTimeout(() => editModal.classList.add('visible'), 10);
}

function closeEditModal() {
    if (!editModal) return;
    editModal.classList.remove('visible');
    uiMaps.destroyMapsInContainer(editModal);
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
    document.body.appendChild(storeModal);

    const categoryList = storeModal.querySelector('.store-category-list');
    if (categoryList) {
        // *** CAMBIO: Llamar al módulo de renderizado ***
        categoryList.appendChild(render.createStoreCategoryButton('Nombres', 'label', 'Días Nombrados'));
        categoryList.appendChild(render.createStoreCategoryButton('Texto', 'article', 'Notas'));
        categoryList.appendChild(render.createStoreCategoryButton('Lugar', 'place', 'Lugares'));
        categoryList.appendChild(render.createStoreCategoryButton('Musica', 'music_note', 'Canciones'));
        categoryList.appendChild(render.createStoreCategoryButton('Imagen', 'image', 'Imágenes'));

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
        // *** CAMBIO: Llamar al módulo de renderizado ***
        listContainer.appendChild(render.createStoreListItem(item));
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

function createAlertPromptModal() {
    if (alertPromptModal) return;
    alertPromptModal = document.createElement('div');
    alertPromptModal.id = 'alert-prompt-modal';
    alertPromptModal.className = 'modal-alert-prompt';
    alertPromptModal.innerHTML = `
        <div class="modal-alert-content">
            <p id="alert-prompt-message"></p>
            <input type="text" id="alert-prompt-input" style="display: none;">
            <div class="modal-main-buttons">
                <button id="alert-prompt-cancel">Cancelar</button>
                <button id="alert-prompt-ok">OK</button>
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
        if (_promptResolve) {
            const input = document.getElementById('alert-prompt-input');
            if (isOk) {
                _promptResolve(input.value);
            } else {
                _promptResolve(null);
            }
            _promptResolve = null;
        }
    }, 200);
}

function showAlert(message, type = 'default') {
    if (!alertPromptModal) createAlertPromptModal();
    
    const content = alertPromptModal.querySelector('.modal-alert-content');
    const msgEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const cancelBtn = document.getElementById('alert-prompt-cancel');

    content.className = `modal-alert-content ${type}-alert`;
    msgEl.textContent = message;
    inputEl.style.display = 'none';
    cancelBtn.style.display = 'none';

    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);
    
    return new Promise((resolve) => {
        _promptResolve = resolve;
    });
}

function showPrompt(message, defaultValue = '', type = 'default') {
    if (!alertPromptModal) createAlertPromptModal();

    const content = alertPromptModal.querySelector('.modal-alert-content');
    const msgEl = document.getElementById('alert-prompt-message');
    const inputEl = document.getElementById('alert-prompt-input');
    const cancelBtn = document.getElementById('alert-prompt-cancel');

    content.className = `modal-alert-content ${type}-alert`;
    msgEl.textContent = message;
    inputEl.style.display = 'block';
    inputEl.value = defaultValue;
    cancelBtn.style.display = 'block';

    alertPromptModal.style.display = 'flex';
    setTimeout(() => alertPromptModal.classList.add('visible'), 10);

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
            <p id="confirm-message"></p>
            <div class="modal-main-buttons">
                <button id="confirm-cancel">Cancelar</button>
                <button id="confirm-ok" class="delete-confirm">Confirmar</button>
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
        if (_confirmResolve) {
            _confirmResolve(isConfirmed);
            _confirmResolve = null;
        }
    }, 200);
}

function showConfirm(message) {
    if (!confirmModal) createConfirmModal();
    
    const msgEl = document.getElementById('confirm-message');
    msgEl.textContent = message;

    confirmModal.style.display = 'flex';
    setTimeout(() => confirmModal.classList.add('visible'), 10);

    return new Promise((resolve) => {
        _confirmResolve = resolve;
    });
}

function createGenericAlertModal() {
    if (genericAlertModal) return;
    genericAlertModal = document.createElement('div');
    genericAlertModal.id = 'generic-alert-modal';
    genericAlertModal.className = 'modal-simple-alert'; 
    genericAlertModal.innerHTML = `
        <div class="simple-alert-content">
            <h3 id="generic-alert-title" class="simple-alert-title"></h3>
            <p id="generic-alert-message" class="simple-alert-message"></p>
            <div class="simple-alert-buttons">
                <button id="generic-alert-ok" class="simple-alert-button default-action">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(genericAlertModal);
    _bindGenericAlertModalEvents();
}

function _bindGenericAlertModalEvents() {
    document.getElementById('generic-alert-ok')?.addEventListener('click', closeGenericAlertModal);
}

function closeGenericAlertModal() {
    if (!genericAlertModal) return;
    genericAlertModal.classList.remove('visible');
    setTimeout(() => {
        genericAlertModal.style.display = 'none';
        if (_genericAlertResolve) {
            _genericAlertResolve(); 
            _genericAlertResolve = null;
        }
    }, 200);
}

function showErrorAlert(message, title = 'Error') {
    if (!genericAlertModal) createGenericAlertModal();
    
    const titleEl = document.getElementById('generic-alert-title');
    const msgEl = document.getElementById('generic-alert-message');

    if(titleEl) titleEl.textContent = title;
    if(msgEl) msgEl.textContent = message;

    genericAlertModal.style.display = 'flex';
    setTimeout(() => genericAlertModal.classList.add('visible'), 10);

    return new Promise((resolve) => {
        _genericAlertResolve = resolve;
    });
}


// --- Funciones de Ayuda (Helpers) de UI ---

// *** CAMBIO: Esta función se queda aquí, pero ahora llama a render.renderMemoryList ***
function updateMemoryList(memories) {
    _currentMemories = memories || [];
    const editList = document.getElementById('edit-memorias-list');
    if (editList) {
        render.renderMemoryList(editList, _currentMemories, true, 'edit');
    }

    const previewList = document.getElementById('preview-memorias-list');
    if (previewList && previewModal && previewModal.classList.contains('visible') && _currentDay) {
         uiMaps.destroyMapsInContainer(previewModal);
         render.renderMemoryList(previewList, _currentMemories, false, 'preview');
         setTimeout(() => uiMaps.initMapsInContainer(previewList, 'preview'), 10);
    }
}

// --- ELIMINADO ---
// _renderMemoryList, createMemoryItemHTML, createStoreCategoryButton, createStoreListItem
// (Movidas a ui-render.js)


function _createLoginButton(isLoggedOut, container) {
    const btnId = 'login-btn';
    let btn = document.getElementById(btnId);
    if (btn) btn.remove();

    if (!isLoggedOut) {
        return;
    }

    btn = document.createElement('button');
    btn.id = btnId;
    btn.className = 'header-login-btn';
    btn.title = 'Login with Google';
    btn.dataset.action = 'login';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M17.64 9.20455c0-.63864-.05727-1.25182-.16909-1.84091H9v3.48182h4.84364c-.20864 1.125-.84273 2.07818-1.77727 2.71136v2.25818h2.90864c1.70182-1.56682 2.68409-3.87409 2.68409-6.61045z"/><path fill="#34A853" d="M9 18c2.43 0 4.47182-.80591 5.96273-2.18045l-2.90864-2.25818c-.80591.54364-1.83682.86591-2.94.86591-2.27318 0-4.20727-1.53318-4.9-3.58227H1.07182v2.33318C2.56636 16.3 5.56 18 9 18z"/><path fill="#FBBC05" d="M4.1 10.71c-.22-.64-.35-1.32-.35-2.03s.13-.139.35-2.03V4.31H1.07C.38 5.67 0 7.29 0 9.03s.38 3.36 1.07 4.72l3.03-2.33v.03z"/><path fill="#EA4335" d="M9 3.57955c1.32136 0 2.50773.45455 3.44091 1.34591l2.58136-2.58136C13.46318.891364 11.4259 0 9 0 5.56 0 2.56636 1.70182 1.07182 4.31l3.02818 2.33318C4.79273 5.11273 6.72682 3.57955 9 3.57955z"/></svg>`;
    container.appendChild(btn);
}

// --- Crumbie ---
function showCrumbieAnimation(message) {
    let animEl = document.querySelector('.crumbie-float-text');
    if (animEl) {
        animEl.remove();
    }
    animEl = document.createElement('div');
    animEl.className = 'crumbie-float-text';
    animEl.textContent = message;
    document.body.appendChild(animEl);
    
    animEl.addEventListener('animationend', () => {
        animEl.remove();
    });
}


// --- Exportaciones Públicas ---
export const ui = {
    init,
    setLoading,
    showApp,
    updateAllDaysData,
    updateLoginUI,
    // *** CAMBIO: Ahora exportamos las funciones del módulo de renderizado ***
    drawCalendar: render.drawCalendar,
    updateSpotlight: render.updateSpotlight,
    
    // Funciones de Modales (aún viven aquí, por ahora)
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
    openSearchResultsModal,
    closeSearchResultsModal,
    
    // Alertas y Diálogos
    showAlert, 
    showErrorAlert,
    showPrompt,
    showConfirm,
    
    // Funciones de listas (aún viven aquí)
    updateStoreList,
    updateMemoryList,
    
    // Funciones de formularios (exportadas desde el módulo)
    resetMemoryForm: forms.resetMemoryForm,
    fillFormForEdit: forms.fillFormForEdit,
    showMusicResults: forms.showMusicResults,
    showPlaceResults: forms.showPlaceResults,
    showModalStatus: forms.showModalStatus,
    handleMemoryTypeChange: forms.handleMemoryTypeChange,
    
    // Crumbie
    showCrumbieAnimation
};
