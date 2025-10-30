/*
 * ui-render.js (v1.3 - Timeline Paginado con Botón)
 * Módulo para generar el HTML dinámico de la UI (listas, calendario, etc.)
 */

// --- Variables privadas (dependencias) ---
let _uiState = {};
let _callbacks = {};
let _uiMaps = null;

/**
 * Inicializa el módulo de renderizado.
 */
export function initRenderModule(uiState, callbacks, uiMaps) {
    _uiState = uiState;
    _callbacks = callbacks;
    _uiMaps = uiMaps; 
    console.log("UI Render Module init (v1.3)");
}

/**
 * Dibuja el grid del calendario en #app-content
 */
export function drawCalendar(monthName, days, todayId) {
    const monthNameDisplay = document.getElementById('month-name-display');
    const appContent = document.getElementById('app-content');

    if (monthNameDisplay) monthNameDisplay.textContent = monthName;
    if (!appContent) return;

    const grid = document.createElement('div');
    grid.className = 'calendario-grid';

    if (!days || days.length === 0) {
        appContent.innerHTML = '<p class="list-placeholder" style="padding: 20px; color: #ccc;">No hay datos del calendario.</p>';
        appContent.style.display = 'block';
        return;
    }

    days.forEach(dia => {
        const btn = document.createElement('button');
        btn.className = 'dia-btn';
        btn.innerHTML = `<span class="dia-numero">${parseInt(dia.id.substring(3))}</span>`;

        if (dia.id === todayId) btn.classList.add('dia-btn-today');
        if (dia.tieneMemorias) btn.classList.add('tiene-memorias');

        btn.addEventListener('click', () => {
            if (_callbacks.onDayClick) _callbacks.onDayClick(dia);
        });

        grid.appendChild(btn);
    });

    appContent.innerHTML = '';
    appContent.appendChild(grid);
    appContent.style.display = 'grid';
}

/**
 * Extrae un título y subtítulo para una memoria.
 */
function _getMemorySpotlightDetails(mem) {
    let title = 'Memoria';
    let subtitle = 'Año desc.';

    if (mem.Fecha_Original) {
        try {
            const date = mem.Fecha_Original.seconds ? new Date(mem.Fecha_Original.seconds * 1000) : new Date(mem.Fecha_Original);
            if (!isNaN(date)) subtitle = date.getFullYear().toString();
        } catch (e) { /* Ignorar */ }
    }

    switch (mem.Tipo) {
        case 'Lugar':
            title = mem.LugarNombre || 'Lugar sin nombre';
            break;
        case 'Musica':
            const trackName = mem.CancionData?.trackName || mem.CancionData?.title;
            const artistName = mem.CancionData?.artistName || mem.CancionData?.artist?.name;
            if (trackName) {
                title = `${trackName} - ${artistName || 'Artista desc.'}`;
            } else {
                title = mem.CancionInfo || 'Canción sin nombre';
            }
            break;
        case 'Imagen':
            title = mem.Descripcion || 'Imagen';
            break;
        case 'Texto':
        default:
            title = mem.Descripcion || 'Nota vacía';
            if (title.length > 50) {
                title = title.substring(0, 50) + '...';
            }
            break;
    }
    return { title, subtitle };
}

/**
 * Renderiza el contenido del Spotlight
 */
export function updateSpotlight(dateString, dayName, memories) {
    const titleEl = document.getElementById('spotlight-date-header');
    const listEl = document.getElementById('today-memory-spotlight');

    if (titleEl) titleEl.textContent = dateString;
    if (!listEl) return;

    listEl.innerHTML = '';
    if (_uiMaps) _uiMaps.destroyMapsInContainer(listEl); 

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
        containerEl.innerHTML = `
            <p class="list-placeholder" style="color: #555; font-style: italic; padding: 15px; text-align: center;">
                No hay memorias destacadas.
            </p>
        `;
        return;
    }

    memories.sort((a, b) => {
        const dateA = a.Fecha_Original?.seconds ? new Date(a.Fecha_Original.seconds * 1000) : (a.Fecha_Original instanceof Date ? a.Fecha_Original : new Date(0));
        const dateB = b.Fecha_Original?.seconds ? new Date(b.Fecha_Original.seconds * 1000) : (b.Fecha_Original instanceof Date ? b.Fecha_Original : new Date(0));
        return dateB.getFullYear() - dateA.getFullYear();
    });

    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'spotlight-memory-item';
        itemEl.innerHTML = createMemoryItemHTML(mem, false, 'spotlight');

        itemEl.addEventListener('click', () => {
            const allDaysData = _uiState.getAllDaysData();
            const diaObj = allDaysData.find(d => d.id === mem.diaId);
            if (diaObj && _callbacks.onDayClick) {
                _callbacks.onDayClick(diaObj);
            } else {
                console.warn("No se encontró el objeto 'dia' para el spotlight:", mem.diaId);
            }
        });
        containerEl.appendChild(itemEl);
    });
}


/**
 * Renderiza la lista de memorias (usada en Preview y Edit)
 */
export function renderMemoryList(listEl, memories, showActions, mapIdPrefix = 'map') {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!memories || memories.length === 0) {
        listEl.innerHTML = '<p class="list-placeholder">No hay memorias para este día.</p>';
        return;
    }

    memories.sort((a, b) => {
        const dateA = a.Fecha_Original?.seconds ? new Date(a.Fecha_Original.seconds * 1000) : (a.Fecha_Original instanceof Date ? a.Fecha_Original : new Date(0));
        const dateB = b.Fecha_Original?.seconds ? new Date(b.Fecha_Original.seconds * 1000) : (b.Fecha_Original instanceof Date ? b.Fecha_Original : new Date(0));
        return dateB.getFullYear() - dateA.getFullYear();
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

/**
 * Genera el HTML para un solo item de memoria
 */
export function createMemoryItemHTML(mem, showActions, mapIdPrefix = 'map') {
    if (!mem) return '';
    const memId = (mem && mem.id) ? mem.id : '';

    let yearStr = 'Año desc.';
    if (mem.Fecha_Original) {
        try {
            const date = mem.Fecha_Original.seconds ? new Date(mem.Fecha_Original.seconds * 1000) : new Date(mem.Fecha_Original);
            if (!isNaN(date)) {
                yearStr = date.getFullYear();
            }
        } catch (e) { console.warn("Fecha inválida:", mem.Fecha_Original, e); }
    }


    let contentHTML = `<small>${yearStr}</small>`;
    let artworkHTML = '';
    let icon = 'article';
    let mapHTML = '';

    switch (mem.Tipo) {
        case 'Lugar':
            icon = 'place';
            contentHTML += `${mem.LugarNombre || 'Lugar sin nombre'}`;
            if (mem.LugarData && mem.LugarData.lat && mem.LugarData.lon && (mapIdPrefix === 'spotlight' || !showActions)) {
                const lat = mem.LugarData.lat;
                const lon = mem.LugarData.lon;
                const mapContainerId = `${mapIdPrefix}-map-${memId || Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const mapClass = (mapIdPrefix === 'spotlight' || mapIdPrefix === 'search') ? 'spotlight-map-container' : 'memoria-map-container';
                mapHTML = `<div id="${mapContainerId}"
                                       class="${mapClass}"
                                       data-lat="${lat}"
                                       data-lon="${lon}"
                                       data-zoom="13">Cargando mapa...</div>`;
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
        <div class="memoria-item-main-content ${mapIdPrefix === 'spotlight' || mapIdPrefix === 'search' ? 'spotlight-item-main-content' : ''}">
            ${artworkHTML}
            <div class="memoria-item-content">${contentHTML}</div>
            ${actionsHTML}
        </div>
    `;

    return mainContentHTML + mapHTML;
}

/**
 * Crea el HTML para un botón de categoría del Almacén
 */
export function createStoreCategoryButton(type, icon, label) {
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

/**
 * Crea el HTML para un item de la lista del Almacén
 */
export function createStoreListItem(item) {
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
        `;
    return itemEl;
}

/**
 * Renderiza la vista de Timeline en #app-content
 * @param {Array} groupedByMonth - Los datos agrupados (solo el primer mes).
 */
export function renderTimelineView(groupedByMonth) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    appContent.innerHTML = ''; // Limpiar
    appContent.className = 'timeline-view'; 
    appContent.style.display = 'block'; 

    if (!groupedByMonth || groupedByMonth.length === 0) {
        appContent.innerHTML = '<p class="timeline-empty-placeholder">No se han encontrado memorias en el mes actual.</p>';
        // Aún así, mostramos el botón para cargar meses anteriores
    }

    const fragment = document.createDocumentFragment();

    if (groupedByMonth) {
        // Renderiza el primer mes
        groupedByMonth.forEach(month => {
            appendMonthFragment(fragment, month); // Usar la nueva función helper
        });
    }

    appContent.appendChild(fragment);

    // *** NUEVO: Añadir el botón "Cargar más" ***
    const loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'timeline-load-more-btn';
    loadMoreButton.className = 'aqua-button';
    loadMoreButton.textContent = 'Cargar mes anterior';
    loadMoreButton.style.margin = '20px auto 65px auto'; // Margen extra abajo
    loadMoreButton.style.display = 'block';
    
    // Asignar el callback directamente
    loadMoreButton.addEventListener('click', () => {
        if (_callbacks.onTimelineLoadMore) {
            _callbacks.onTimelineLoadMore();
        }
    });
    
    appContent.appendChild(loadMoreButton);
}

/**
 * *** NUEVA FUNCIÓN ***
 * Añade un nuevo mes (cargado) a la vista de Timeline, antes del botón.
 * @param {object} monthData - El objeto de mes (devuelto por loadMonthForTimeline)
 */
export function appendTimelineMonth(monthData) {
    const appContent = document.getElementById('app-content');
    const loadMoreButton = document.getElementById('timeline-load-more-btn');
    if (!appContent || !loadMoreButton || !monthData) return;

    const fragment = document.createDocumentFragment();
    appendMonthFragment(fragment, monthData); // Usar la nueva función helper

    // Insertar el nuevo contenido *antes* del botón
    appContent.insertBefore(fragment, loadMoreButton);
}

/**
 * *** NUEVA FUNCIÓN HELPER ***
 * Construye el fragmento de HTML para un mes y lo añade a un fragmento padre.
 * @param {DocumentFragment} parentFragment - El fragmento donde se añadirá el HTML.
 * @param {object} month - El objeto de mes (con monthName y days).
 */
function appendMonthFragment(parentFragment, month) {
    const monthHeader = document.createElement('h2');
    monthHeader.className = 'timeline-month-header';
    monthHeader.textContent = month.monthName;
    parentFragment.appendChild(monthHeader);

    // Invertir el orden de los días (ej: 31, 30, 29...)
    month.days.reverse();

    // 2. Recorrer cada DÍA de ese mes
    month.days.forEach(day => {
        const dayGroup = document.createElement('div');
        dayGroup.className = 'timeline-day-group';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'timeline-day-header';
        
        const specialName = (day.nombreEspecial && day.nombreEspecial !== 'Unnamed Day') 
            ? `<span class="timeline-day-special">- ${day.nombreEspecial} -</span>` 
            : '';
        
        dayHeader.innerHTML = `
            <span class="timeline-day-date">${day.nombreDia} ${specialName}</span>
            <div class="list-view-chevron"></div>
        `;
        
        dayHeader.addEventListener('click', () => {
            const allDaysData = _uiState.getAllDaysData();
            const diaObj = allDaysData.find(d => d.id === day.diaId);
            if (diaObj && _callbacks.onDayClick) {
                _callbacks.onDayClick(diaObj);
            } else {
                console.warn("No se encontró el objeto 'dia' para el timeline:", day.diaId);
            }
        });
        dayGroup.appendChild(dayHeader);

        const memoriesList = document.createElement('div');
        memoriesList.className = 'timeline-memories-list';
        
        day.memories.forEach(mem => {
            const details = _getMemorySpotlightDetails(mem);
            const memItem = document.createElement('div');
            memItem.className = 'list-view-item';
            memItem.innerHTML = `
                <div class="list-view-item-content">
                    <div class="list-view-item-title">${details.title}</div>
                    <div class="list-view-item-subtitle">${details.subtitle}</div>
                </div>
            `;
            memoriesList.appendChild(memItem);
        });
        
        dayGroup.appendChild(memoriesList);
        parentFragment.appendChild(dayGroup);
    });
}

/**
 * *** NUEVA FUNCIÓN ***
 * Actualiza el estado visual del botón "Cargar más".
 * @param {boolean} isLoading - True si está cargando.
 */
export function setTimelineButtonLoading(isLoading) {
    const loadMoreButton = document.getElementById('timeline-load-more-btn');
    if (!loadMoreButton) return;

    if (isLoading) {
        loadMoreButton.disabled = true;
        loadMoreButton.textContent = 'Cargando...';
    } else {
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = 'Cargar mes anterior';
    }
}

/**
 * *** NUEVA FUNCIÓN ***
 * Oculta el botón "Cargar más" (cuando no hay más datos).
 * @param {boolean} isVisible - False para ocultar.
 */
export function updateTimelineButtonVisibility(isVisible) {
    const loadMoreButton = document.getElementById('timeline-load-more-btn');
    if (!loadMoreButton) return;

    loadMoreButton.style.display = isVisible ? 'block' : 'none';
}
