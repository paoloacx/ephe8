/*
 * ui-forms.js (v1.1 - Con validación de inputs)
 * Módulo para gestionar la lógica del formulario de añadir/editar memorias.
 */

// --- Variables privadas del módulo ---

// Dependencias inyectadas desde ui.js
let _callbacks = {};
let _uiState = {};
let _uiFunctions = {};

// Estado interno del formulario
let _selectedMusic = null;
let _selectedPlace = null;

/**
 * Inicializa el módulo de formularios.
 * ui.js llama a esta función 1 vez para inyectar dependencias.
 * @param {object} callbacks - El objeto de callbacks de main.js
 * @param {object} uiState - Getters/Setters para el estado de ui.js
 * @param {object} uiFunctions - Funciones de ui.js que este módulo necesita
 */
export function initFormModule(callbacks, uiState, uiFunctions) {
    _callbacks = callbacks;
    _uiState = uiState;
    _uiFunctions = uiFunctions;
    setupInputValidation();
    console.log("UI Forms Module init (v1.1)");
}

/**
 * Configura la validación en tiempo real para los inputs
 */
function setupInputValidation() {
    // Esperar a que el DOM esté listo
    setTimeout(() => {
        const yearInput = document.getElementById('memoria-year');
        const descInput = document.getElementById('memoria-desc');
        const placeSearch = document.getElementById('memoria-place-search');
        const musicSearch = document.getElementById('memoria-music-search');
        const nameInput = document.getElementById('nombre-especial-input');

        if (yearInput) {
            yearInput.addEventListener('blur', () => validateYear(yearInput));
            yearInput.addEventListener('input', () => clearInputError(yearInput));
        }

        if (descInput) {
            descInput.addEventListener('blur', () => validateDescription(descInput));
            descInput.addEventListener('input', () => clearInputError(descInput));
        }

        if (placeSearch) {
            placeSearch.addEventListener('input', () => {
                _selectedPlace = null;
                clearInputError(placeSearch);
            });
        }

        if (musicSearch) {
            musicSearch.addEventListener('input', () => {
                _selectedMusic = null;
                clearInputError(musicSearch);
            });
        }

        if (nameInput) {
            nameInput.addEventListener('blur', () => validateDayName(nameInput));
            nameInput.addEventListener('input', () => clearInputError(nameInput));
        }
    }, 500);
}

/**
 * Valida el campo de año
 * @param {HTMLElement} input - El input a validar
 * @returns {boolean} - True si es válido
 */
function validateYear(input) {
    const year = parseInt(input.value);
    const currentYear = new Date().getFullYear();
    
    if (!input.value) {
        setInputError(input, 'El año es obligatorio');
        return false;
    }
    
    if (isNaN(year)) {
        setInputError(input, 'Debe ser un número válido');
        return false;
    }
    
    if (year < 1900 || year > currentYear + 10) {
        setInputError(input, `El año debe estar entre 1900 y ${currentYear + 10}`);
        return false;
    }
    
    clearInputError(input);
    return true;
}

/**
 * Valida el campo de descripción
 * @param {HTMLElement} input - El textarea a validar
 * @returns {boolean} - True si es válido
 */
function validateDescription(input) {
    const value = input.value.trim();
    
    if (!value) {
        setInputError(input, 'La descripción no puede estar vacía');
        return false;
    }
    
    if (value.length < 3) {
        setInputError(input, 'La descripción debe tener al menos 3 caracteres');
        return false;
    }
    
    if (value.length > 500) {
        setInputError(input, 'La descripción no puede exceder 500 caracteres');
        return false;
    }
    
    clearInputError(input);
    return true;
}

/**
 * Valida el nombre del día
 * @param {HTMLElement} input - El input a validar
 * @returns {boolean} - True si es válido
 */
function validateDayName(input) {
    const value = input.value.trim();
    
    if (value && value.length > 25) {
        setInputError(input, 'El nombre no puede exceder 25 caracteres');
        return false;
    }
    
    clearInputError(input);
    return true;
}

/**
 * Valida que se haya seleccionado un lugar
 * @param {HTMLElement} searchInput - El input de búsqueda
 * @returns {boolean} - True si es válido
 */
function validatePlaceSelection(searchInput) {
    if (!_selectedPlace) {
        setInputError(searchInput, 'Debes seleccionar un lugar de los resultados');
        return false;
    }
    
    clearInputError(searchInput);
    return true;
}

/**
 * Valida que se haya seleccionado una canción
 * @param {HTMLElement} searchInput - El input de búsqueda
 * @returns {boolean} - True si es válido
 */
function validateMusicSelection(searchInput) {
    if (!_selectedMusic) {
        setInputError(searchInput, 'Debes seleccionar una canción de los resultados');
        return false;
    }
    
    clearInputError(searchInput);
    return true;
}

/**
 * Marca un input como inválido y muestra mensaje de error
 * @param {HTMLElement} input - El input a marcar
 * @param {string} message - Mensaje de error
 */
function setInputError(input, message) {
    input.classList.add('input-error');
    
    let errorEl = input.nextElementSibling;
    if (!errorEl || !errorEl.classList.contains('input-error-message')) {
        errorEl = document.createElement('div');
        errorEl.className = 'input-error-message';
        input.parentNode.insertBefore(errorEl, input.nextSibling);
    }
    errorEl.textContent = message;
}

/**
 * Limpia el estado de error de un input
 * @param {HTMLElement} input - El input a limpiar
 */
function clearInputError(input) {
    input.classList.remove('input-error');
    
    const errorEl = input.nextElementSibling;
    if (errorEl && errorEl.classList.contains('input-error-message')) {
        errorEl.remove();
    }
}

/**
 * Limpia todos los errores del formulario
 */
function clearAllFormErrors() {
    const inputs = document.querySelectorAll('.input-error');
    inputs.forEach(input => clearInputError(input));
}

/**
 * Maneja el envío del formulario de memoria.
 * Se adjunta como event listener en ui.js.
 */
export async function handleFormSubmit(e) {
    e.preventDefault();
    if (!_callbacks.onSaveMemory) return;

    clearAllFormErrors();

    const saveBtn = document.getElementById('save-memoria-btn');
    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const diaId = _uiState.getCurrentDay() ? _uiState.getCurrentDay().id : document.getElementById('edit-mem-day').value;
    if (!diaId) {
        showModalStatus('memoria-status', 'Error: No se ha seleccionado un día.', true);
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
        return;
    }

    const type = document.getElementById('memoria-type').value;
    const yearInput = document.getElementById('memoria-year');
    
    // Validar año
    if (!validateYear(yearInput)) {
        showModalStatus('memoria-status', 'Por favor, corrige los errores antes de continuar.', true);
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
        yearInput.focus();
        return;
    }

    const year = yearInput.value;
    
    let memoryData = {
        Tipo: type,
        year: year,
        id: _uiState.getIsEditingMemory() ? document.getElementById('memory-form').dataset.memoriaId : null
    };

    try {
        switch (type) {
            case 'Texto':
                const descInput = document.getElementById('memoria-desc');
                if (!validateDescription(descInput)) {
                    showModalStatus('memoria-status', 'Por favor, corrige los errores antes de continuar.', true);
                    descInput.focus();
                    throw new Error('Validación fallida');
                }
                memoryData.Descripcion = descInput.value.trim();
                break;
                
            case 'Lugar':
                const placeSearch = document.getElementById('memoria-place-search');
                if (!validatePlaceSelection(placeSearch)) {
                    showModalStatus('memoria-status', 'Por favor, corrige los errores antes de continuar.', true);
                    placeSearch.focus();
                    throw new Error('Validación fallida');
                }
                memoryData.LugarNombre = _selectedPlace.display_name || _selectedPlace.LugarNombre;
                memoryData.LugarData = {
                    lat: _selectedPlace.lat,
                    lon: _selectedPlace.lon,
                    display_name: _selectedPlace.display_name || _selectedPlace.LugarNombre
                };
                break;
                
            case 'Musica':
                const musicSearch = document.getElementById('memoria-music-search');
                if (!validateMusicSelection(musicSearch)) {
                    showModalStatus('memoria-status', 'Por favor, corrige los errores antes de continuar.', true);
                    musicSearch.focus();
                    throw new Error('Validación fallida');
                }
                const trackName = _selectedMusic.trackName || _selectedMusic.title;
                const artistName = _selectedMusic.artistName || _selectedMusic.artist?.name;
                const artwork = _selectedMusic.artworkUrl60 || _selectedMusic.album?.cover_small;
                
                memoryData.CancionInfo = `${trackName} - ${artistName}`;
                memoryData.CancionData = {
                    trackName: trackName,
                    artistName: artistName,
                    artworkUrl60: artwork,
                    ..._selectedMusic 
                };
                break;
                
            default:
                throw new Error('Tipo de memoria no válido.');
        }

        await _callbacks.onSaveMemory(diaId, memoryData, _uiState.getIsEditingMemory());

        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;

    } catch (error) {
        if (error.message !== 'Validación fallida') {
            showModalStatus('memoria-status', `Error: ${error.message}`, true);
        }
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
    }
}

/**
 * Maneja el cambio del <select> de tipo de memoria.
 */
export function handleMemoryTypeChange() {
    const type = document.getElementById('memoria-type')?.value;
    if (!type) return;
    
    clearAllFormErrors();
    
    const groups = document.querySelectorAll('.add-memory-input-group');
    groups.forEach(group => {
        group.style.display = 'none';
    });
    const selectedGroup = document.getElementById(`input-type-${type}`);
    if (selectedGroup) {
        selectedGroup.style.display = 'block';
    }
}

/**
 * Rellena el formulario de memoria para editar.
 * @param {object} mem - El objeto de memoria a editar.
 */
export function fillFormForEdit(mem) {
    if (!mem) return;
    resetMemoryForm();
    _uiState.setIsEditingMemory(true);

    document.getElementById('memory-form-title').textContent = 'Editar Memoria';
    document.getElementById('save-memoria-btn').textContent = 'Actualizar Memoria';
    document.getElementById('memory-form').dataset.memoriaId = mem.id;

    if (mem.Fecha_Original) {
        const date = mem.Fecha_Original.seconds ? new Date(mem.Fecha_Original.seconds * 1000) : new Date(mem.Fecha_Original);
        if (!isNaN(date)) {
            document.getElementById('memoria-year').value = date.getFullYear();
        }
    }
    
    document.getElementById('memoria-type').value = mem.Tipo;

    switch (mem.Tipo) {
        case 'Texto':
            document.getElementById('memoria-desc').value = mem.Descripcion || '';
            break;
        case 'Lugar':
            document.getElementById('memoria-place-search').value = mem.LugarNombre || '';
            if (mem.LugarData) {
                _selectedPlace = mem.LugarData;
                showPlaceResults([mem.LugarData], true);
            }
            break;
        case 'Musica':
             document.getElementById('memoria-music-search').value = mem.CancionInfo || '';
             if (mem.CancionData) {
                 _selectedMusic = mem.CancionData;
                 const track = mem.CancionData;
                 showMusicResults([track], true);
             }
            break;
    }
    handleMemoryTypeChange();
    _uiFunctions.showMemoryForm(true);
}

/**
 * Resetea el formulario de memoria a su estado inicial.
 */
export function resetMemoryForm() {
    _uiState.setIsEditingMemory(false);
    _selectedMusic = null;
    _selectedPlace = null;
    
    const form = document.getElementById('memory-form');
    if (!form) return;
    
    clearAllFormErrors();
    
    form.reset();
    form.dataset.memoriaId = '';
    
    document.getElementById('memory-form-title').textContent = 'Añadir Nueva Memoria';
    document.getElementById('save-memoria-btn').textContent = 'Añadir Memoria';
    
    const musicResults = document.getElementById('itunes-results');
    const placeResults = document.getElementById('place-results');
    if (musicResults) musicResults.innerHTML = '';
    if (placeResults) placeResults.innerHTML = '';
    
    showModalStatus('memoria-status', '', false);
    
    const typeSelect = document.getElementById('memoria-type');
    if (typeSelect) {
        typeSelect.value = 'Texto';
    }
    handleMemoryTypeChange();
}

/**
 * Muestra los resultados de búsqueda de música en el formulario.
 * @param {Array} tracks - Array de resultados de iTunes.
 * @param {boolean} isSelected - True si solo se está mostrando el item seleccionado.
 */
export function showMusicResults(tracks, isSelected = false) {
    const resultsEl = document.getElementById('itunes-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    
    if (isSelected && tracks && tracks.length > 0) {
        const track = tracks[0];
        const trackName = track.trackName || track.title;
        const artistName = track.artistName || track.artist?.name;
        resultsEl.innerHTML = `<div class="search-result-selected">Seleccionado: ${trackName} - ${artistName}</div>`;
        const searchInput = document.getElementById('memoria-music-search');
        if (searchInput) clearInputError(searchInput);
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
            _selectedMusic.CancionInfo = `${track.trackName} - ${track.artistName}`; 
            showMusicResults([track], true);
        });
        resultsEl.appendChild(itemEl);
    });
}

/**
 * Muestra los resultados de búsqueda de lugares en el formulario.
 * @param {Array} places - Array de resultados de Nominatim.
 * @param {boolean} isSelected - True si solo se está mostrando el item seleccionado.
 */
export function showPlaceResults(places, isSelected = false) {
    const resultsEl = document.getElementById('place-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    
    if (isSelected && places && places.length > 0) {
        const place = places[0];
        resultsEl.innerHTML = `<div class="search-result-selected">Seleccionado: ${place.display_name || place.LugarNombre}</div>`;
        const searchInput = document.getElementById('memoria-place-search');
        if (searchInput) clearInputError(searchInput);
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
                LugarNombre: place.display_name
            };
            showPlaceResults([_selectedPlace], true);
        });
        resultsEl.appendChild(itemEl);
    });
}

/**
 * Muestra un mensaje de estado dentro de un modal.
 * @param {string} elementId - ID del elemento de estado (ej. 'memoria-status')
 * @param {string} message - Mensaje a mostrar
 * @param {boolean} isError - True si es un mensaje de error
 */
export function showModalStatus(elementId, message, isError) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'status-message';
    
    if (isError) {
        statusEl.classList.add('error');
    } else {
        statusEl.classList.add('success');
    }
    
    if (message && !isError) {
        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }
        }, 3000);
    }
}

/**
 * Maneja el click en "Nombrar Día" desde el formulario de añadir.
 */
export async function handleNameSelectedDay() {
     if (!_callbacks.onSaveDayName || !_uiState.getAllDaysData()) return;
     
     const daySelect = document.getElementById('edit-mem-day');
     if (!daySelect) return;
     
     const selectedDayId = daySelect.value;
     const selectedOption = daySelect.options[daySelect.selectedIndex];
     const selectedDayText = selectedOption ? selectedOption.text : selectedDayId;
     const allDaysData = _uiState.getAllDaysData();
     const currentDayData = allDaysData.find(d => d.id === selectedDayId);
     const currentName = currentDayData?.Nombre_Especial !== 'Unnamed Day' ? currentDayData.Nombre_Especial : '';
     
     const newName = await _uiFunctions.showPrompt(`Nombrar día ${selectedDayText}:`, currentName);
     
     if (newName !== null) {
        const trimmedName = newName.trim();
        if (trimmedName.length > 25) {
            showModalStatus('add-name-status', 'El nombre no puede exceder 25 caracteres.', true);
            return;
        }
        _callbacks.onSaveDayName(selectedDayId, trimmedName, 'add-name-status');
     }
}
