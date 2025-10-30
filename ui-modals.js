/*
 * ui-modals.js (v1.3 - Reordenado Edit Modal)
 * Módulo para gestionar todos los modales, diálogos, prompts y alertas.
 */

// --- Importaciones (Inyectadas) ---
let _callbacks = {};
let _uiState = {};
let _uiMaps = null;
let _forms = null;
let _render = null;

// --- Estado Interno del Módulo ---

let previewModal = null;
let editModal = null;
let storeModal = null;
let storeListModal = null;
let searchResultsModal = null;

let alertPromptModal = null;
let _promptResolve = null;
let confirmModal = null;
let _confirmResolve = null;
let genericAlertModal = null;
let _genericAlertResolve = null;

/**
 * Inicializa el módulo de modales.
 */
export function initModalsModule(callbacks, uiState, uiMaps, forms, render) {
    _callbacks = callbacks;
    _uiState = uiState;
    _uiMaps = uiMaps;
    _forms = forms;
    _render = render;

    createPreviewModal();
    createEditModal();
    createStoreModal();
    createStoreListModal();
    createSearchResultsModal();
    createAlertPromptModal();
    createConfirmModal();
    createGenericAlertModal();

    console.log("UI Modals Module init (v1.3)");
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
        if (_callbacks.onEditFromPreview) _callbacks.onEditFromPreview();
    });
}

export function showPreviewLoading(isLoading) {
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

export function openPreviewModal(dia, memories) {
    _uiState.setCurrentDay(dia); 

    const titleEl = document.getElementById('preview-title');
    const listEl = document.getElementById('preview-memorias-list');

    const dayNameSpecial = dia.Nombre_Especial !== 'Unnamed Day' ? `: -${dia.Nombre_Especial}-` : '';
    if (titleEl) titleEl.textContent = `${dia.Nombre_Dia}${dayNameSpecial}`;

    _uiMaps.destroyMapsInContainer(previewModal);
    _render.renderMemoryList(listEl, memories, false, 'preview');

    previewModal.style.display = 'flex';
    setTimeout(() => {
        previewModal.classList.add('visible');
        _uiMaps.initMapsInContainer(listEl, 'preview');
    }, 10);
}

export function closePreviewModal() {
    if (!previewModal) return;
    previewModal.classList.remove('visible');

    _uiMaps.destroyMapsInContainer(previewModal); 

    setTimeout(() => {
        previewModal.style.display = 'none';
        _uiState.setCurrentDay(null); 
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
            const allDaysData = _uiState.getAllDaysData();
            const diaObj = allDaysData.find(d => d.id === item.dataset.diaId);
            if (diaObj && _callbacks.onDayClick) {
                closeSearchResultsModal();
                setTimeout(() => {
                    _callbacks.onDayClick(diaObj);
                }, 300);
            }
        }
    });
}

export function openSearchResultsModal(searchTerm, results) {
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
            _uiMaps.destroyMapsInContainer(searchResultsModal);
            
            results.forEach(mem => {
                const itemEl = document.createElement('div');
                itemEl.className = 'search-result-memory-item';
                itemEl.dataset.diaId = mem.diaId;
                
                const dayName = mem.Nombre_Dia || 'Día';
                const daySpecial = mem.Nombre_Especial && mem.Nombre_Especial !== 'Unnamed Day' 
                    ? ` (${mem.Nombre_Especial})` 
                    : '';
                
                itemEl.innerHTML = `
                    <div class="search-result-day-label">
                        <span class="material-icons-outlined">event</span>
                        ${dayName}${daySpecial}
                    </div>
                    ${_render.createMemoryItemHTML(mem, false, 'search')}
                `;
                
                contentEl.appendChild(itemEl);
            });
            
            _uiMaps.initMapsInContainer(contentEl, 'search');
        }
    }

    searchResultsModal.style.display = 'flex';
    setTimeout(() => searchResultsModal.classList.add('visible'), 10);
}

export function closeSearchResultsModal() {
    if (!searchResultsModal) return;
    searchResultsModal.classList.remove('visible');
    _uiMaps.destroyMapsInContainer(searchResultsModal);
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
                    </div>

                    <div class="modal-section memorias-section">
                        
                        <div id="edit-memorias-list-container" style="margin-top: 15px;">
                            <h4 style="margin-top: 0;">Memorias Existentes</h4>
                            <div id="edit-memorias-list"></div>
                        </div>

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
                    </div>
                    </div>
            </div>
            <div class="modal-main-buttons">
                <button id="close-edit-add-btn" class="aqua-button">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(editModal);
    bindEditModalEvents();
}

export function showEditLoading(isLoading) {
    const loadingEl = editModal?.querySelector('.edit-loading');
    const contentWrapper = editModal?.querySelector('.edit-content-wrapper');
    if (loadingEl && contentWrapper) {
        loadingEl.style.display = isLoading ? 'block' : 'none';
        contentWrapper.style.display = isLoading ? 'none' : 'block';
    }
}

function bindEditModalEvents() {
    document.getElementById('close-edit-add-btn')?.addEventListener('click', closeEditModal);
    document.getElementById('save-name-btn')?.addEventListener('click', () => {
        const currentDay = _uiState.getCurrentDay();
        if (_callbacks.onSaveDayName && currentDay) {
            const input = document.getElementById('nombre-especial-input');
            _callbacks.onSaveDayName(currentDay.id, input.value.trim(), 'save-status');
        }
    });

    document.getElementById('btn-name-selected-day')?.addEventListener('click', _forms.handleNameSelectedDay);

    document.getElementById('btn-show-add-form')?.addEventListener('click', () => {
        _forms.resetMemoryForm(); 
        showMemoryForm(true); 
    });

    document.getElementById('btn-cancel-mem-edit')?.addEventListener('click', () => {
        showMemoryForm(false); 
    });

    document.getElementById('memory-form')?.addEventListener('submit', _forms.handleFormSubmit);
    document.getElementById('memoria-type')?.addEventListener('change', _forms.handleMemoryTypeChange);

    document.getElementById('btn-search-itunes')?.addEventListener('click', () => {
        if (_callbacks.onSearchMusic) {
            const term = document.getElementById('memoria-music-search').value;
            if (term) _callbacks.onSearchMusic(term, _forms.showMusicResults);
        }
    });
    document.getElementById('btn-search-place')?.addEventListener('click', () => {
        if (_callbacks.onSearchPlace) {
            const term = document.getElementById('memoria-place-search').value;
            if (term) _callbacks.onSearchPlace(term, _forms.showPlaceResults);
        }
    });

    const listEl = document.getElementById('edit-memorias-list');
    listEl?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const memoriaId = editBtn.dataset.memoriaId;
            const currentMemories = _uiState.getCurrentMemories();
            if (memoriaId && currentMemories) {
                const memToEdit = currentMemories.find(m => m.id === memoriaId);
                if (memToEdit) {
                    _forms.fillFormForEdit(memToEdit);
                } else {
                    console.error("Memoria no encontrada para editar:", memoriaId);
                    _forms.showModalStatus('memoria-status', 'Error: Memoria no encontrada.', true);
                }
            }
        }

        if (deleteBtn) {
            const memoriaId = deleteBtn.dataset.memoriaId;
            const currentMemories = _uiState.getCurrentMemories();
            const currentDay = _uiState.getCurrentDay();
            if (memoriaId && currentMemories && _callbacks.onDeleteMemory) {
                const memToDelete = currentMemories.find(m => m.id === memoriaId);
                if (memToDelete && currentDay) {
                    _callbacks.onDeleteMemory(currentDay.id, memToDelete);
                } else {
                    console.error("No se pudo determinar memoria o día para borrar:", memoriaId, currentDay);
                }
            }
        }
    });
}

export function showMemoryForm(show) {
    const form = document.getElementById('memory-form');
    const addMemoryButtonContainer = document.getElementById('add-memory-button-container');
    const memoryListContainer = document.getElementById('edit-memorias-list-container');

    if (form) form.style.display = show ? 'block' : 'none';
    if (addMemoryButtonContainer) addMemoryButtonContainer.style.display = show ? 'none' : 'block';

    if (memoryListContainer) {
        const currentDay = _uiState.getCurrentDay();
        memoryListContainer.style.display = (!show && currentDay) ? 'block' : 'none';
    }
}

export function openEditModal(dia, memories) {
    _uiState.setCurrentDay(dia);
    _uiState.setCurrentMemories(memories || []);

    const daySelection = document.getElementById('day-selection-section');
    const dayNameSection = document.getElementById('day-name-section');
    const titleEl = document.getElementById('edit-modal-title');
    const nameInput = document.getElementById('nombre-especial-input');
    const daySelect = document.getElementById('edit-mem-day');
    const dynamicTitleEl = document.getElementById('edit-modal-title-dynamic');
    const addMemoryButtonContainer = document.getElementById('add-memory-button-container');
    const memoryListContainer = document.getElementById('edit-memorias-list-container');
    const allDaysData = _uiState.getAllDaysData();

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

        if (allDaysData.length > 0) {
            daySelect.innerHTML = '';
             allDaysData.sort((a, b) => a.id.localeCompare(b.id)).forEach(d => {
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

    showMemoryForm(false);
    _forms.resetMemoryForm(); 

    _render.renderMemoryList(document.getElementById('edit-memorias-list'), _uiState.getCurrentMemories(), true, 'edit');

    _forms.showModalStatus('memoria-status', '', false);
    _forms.showModalStatus('add-name-status', '', false);
    showEditLoading(false);

    editModal.style.display = 'flex';
    setTimeout(() => editModal.classList.add('visible'), 10);
}

export function closeEditModal() {
    if (!editModal) return;
    editModal.classList.remove('visible');
    _uiMaps.destroyMapsInContainer(editModal);
    setTimeout(() => {
        editModal.style.display = 'none';
        _uiState.setCurrentDay(null);
        _uiState.setCurrentMemories([]);
        _uiState.setIsEditingMemory(false);
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
        categoryList.appendChild(_render.createStoreCategoryButton('Nombres', 'label', 'Días Nombrados'));
        categoryList.appendChild(_render.createStoreCategoryButton('Texto', 'article', 'Notas'));
        categoryList.appendChild(_render.createStoreCategoryButton('Lugar', 'place', 'Lugares'));
        categoryList.appendChild(_render.createStoreCategoryButton('Musica', 'music_note', 'Canciones'));

        categoryList.addEventListener('click', (e) => {
            const btn = e.target.closest('.store-category-button');
            if (btn && _callbacks.onStoreCategoryClick) {
                _callbacks.onStoreCategoryClick(btn.dataset.type);
            }
        });
    } else {
        console.error("Error al crear modal de almacén: no se encontró '.store-category-list'");
    }

    document.getElementById('close-store-btn')?.addEventListener('click', closeStoreModal);
}
export function openStoreModal() {
    if (!storeModal) createStoreModal();
    storeModal.style.display = 'flex';
    setTimeout(() => storeModal.classList.add('visible'), 10);
}
export function closeStoreModal() {
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
    bindStoreListModalEvents();
}
function bindStoreListModalEvents() {
    document.getElementById('close-store-list-btn')?.addEventListener('click', closeStoreListModal);
    const listContent = document.getElementById('store-list-content');
    listContent?.addEventListener('click', (e) => {
        const item = e.target.closest('.store-list-item');
        if (item && _callbacks.onStoreItemClick) {
            _callbacks.onStoreItemClick(item.dataset.diaId);
        }
        const loadMoreBtn = e.target.closest('#load-more-btn');
        if (loadMoreBtn && _callbacks.onStoreLoadMore) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Cargando...';
            _callbacks.onStoreLoadMore();
        }
    });
}
export function openStoreListModal(title) {
    if (!storeListModal) createStoreListModal();
    const titleEl = document.getElementById('store-list-modal-title');
    const contentEl = document.getElementById('store-list-content');
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = '<p class="list-placeholder" style="padding: 20px;">Cargando items...</p>';
    storeListModal.style.display = 'flex';
    setTimeout(() => storeListModal.classList.add('visible'), 10);
}
export function closeStoreListModal() {
    if (!storeListModal) return;
    storeListModal.classList.remove('visible');
    setTimeout(() => {
        storeListModal.style.display = 'none';
    }, 200);
}
export function updateStoreList(items, append = false, hasMore = false) {
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
        listContainer.appendChild(_render.createStoreListItem(item));
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
    bindAlertPromptEvents();
}

function bindAlertPromptEvents() {
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

export function showAlert(message, type = 'default') {
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

export function showPrompt(message, defaultValue = '', type = 'default') {
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
    bindConfirmModalEvents();
}

function bindConfirmModalEvents() {
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

export function showConfirm(message) {
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
    bindGenericAlertModalEvents();
}

function bindGenericAlertModalEvents() {
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

export function showErrorAlert(message, title = 'Error') {
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
