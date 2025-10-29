/*
 * ui-forms.js (v1.0)
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
    console.log("UI Forms Module init");
}

/**
 * Maneja el envío del formulario de memoria.
 * Se adjunta como event listener en ui.js.
 */
export async function handleFormSubmit(e) {
    e.preventDefault();
    if (!_callbacks.onSaveMemory) return;

    const saveBtn = document.getElementById('save-memoria-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const diaId = _uiState.getCurrentDay() ? _uiState.getCurrentDay().id : document.getElementById('edit-mem-day').value;
    if (!diaId) {
        showModalStatus('memoria-status', 'Error: No se ha seleccionado un día.', true);
        saveBtn.disabled = false;
        saveBtn.textContent = _uiState.getIsEditingMemory() ? 'Actualizar Memoria' : 'Añadir Memoria';
        return;
    }

    const type = document.getElementById('memoria-type').value;
    const year = document.getElementById('memoria-year').value;
    
    let memoryData = {
        Tipo: type,
        year: year,
        id: _uiState.getIsEditingMemory() ? document.getElementById('memory-form').dataset.memoriaId : null
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

        // Llama al callback de main.js
        await _callbacks.onSaveMemory(diaId, memoryData, _uiState.getIsEditingMemory());

        saveBtn.disabled = false;
        saveBtn.textContent = _uiState.getIsEditingMemory() ? 'Actualizar Memoria' : 'Añadir Memoria';

    } catch (error) {
        showModalStatus('memoria-status', `Error: ${error.message}`, true);
        saveBtn.disabled = false;
        saveBtn.textContent = _uiState.getIsEditingMemory() ? 'Actualizar Memoria' : 'Añadir Memoria';
    }
}

/**
 * Maneja el cambio del <select> de tipo de memoria.
 */
export function handleMemoryTypeChange() {
    const type = document.getElementById('memoria-type')?.value;
    if (!type) return;
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
    _uiFunctions.showMemoryForm(true); // Llama a la función de ui.js
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
     
     // Llama a la función showPrompt de ui.js
     const newName = await _uiFunctions.showPrompt(`Nombrar día ${selectedDayText}:`, currentName);
     
     if (newName !== null) {
        _callbacks.onSaveDayName(selectedDayId, newName.trim(), 'add-name-status');
     }
}
