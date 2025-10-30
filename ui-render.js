/*
 * ui-render.js (v1.2 - Spotlight con mapas y Timeline invertido)
 * Módulo para generar el HTML dinámico de la UI (listas, calendario, etc.)
 */

// --- Variables privadas (dependencias) ---
// Estas se inyectan desde ui.js (el core)
let _uiState = {};
let _callbacks = {};
let _uiMaps = null;

/**
 * Inicializa el módulo de renderizado.
 * @param {object} uiState - Getters para el estado de ui.js
 * @param {object} callbacks - Callbacks de main.js
 * @param {object} uiMaps - El módulo importado de ui-maps
 */
export function initRenderModule(uiState, callbacks, uiMaps) {
    _uiState = uiState;
    _callbacks = callbacks;
    _uiMaps = uiMaps; // Guardamos la referencia al módulo de mapas
    console.log("UI Render Module init (v1.2)");
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
 * Renderiza el contenido del Spotlight usando el estilo UITableView
 * CAMBIO (Punto 1): Modificado para usar createMemoryItemHTML y renderizar mapas/artwork
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
    // CAMBIO: Usar el ID del contenedor correcto (style-views.css)
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

    // Ordenar por año (descendente)
    memories.sort((a, b) => {
        const dateA = a.Fecha_Original?.seconds ? new Date(a.Fecha_Original.seconds * 1000) : (a.Fecha_Original instanceof Date ? a.Fecha_Original : new Date(0));
        const dateB = b.Fecha_Original?.seconds ? new Date(b.Fecha_Original.seconds * 1000) : (b.Fecha_Original instanceof Date ? b.Fecha_Original : new Date(0));
        return dateB.getFullYear() - dateA.getFullYear();
    });

    // CAMBIO: Usar el renderizador completo
    memories.forEach(mem => {
        const itemEl = document.createElement('div');
        itemEl.className = 'spotlight-memory-item';

        // Usar el renderizador potente que crea mapas y carátulas
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
            if (mem.LugarData && mem.LugarData.lat && mem.LugarData.lon && (mapIdPrefix === 'spotlight' || !showActions)) { // Mostrar mapa en spotlight o preview
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

// *** NUEVA FUNCIÓN (Paso 6) ***
/**
 * Renderiza la vista de Timeline en #app-content
 * @param {Array} groupedByMonth - Los datos agrupados de store.js
 */
export function renderTimelineView(groupedByMonth) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    appContent.innerHTML = ''; // Limpiar
    appContent.className = 'timeline-view'; // Asignar la clase base
    appContent.style.display = 'block'; // Asegurar que no sea 'grid'

    if (!groupedByMonth || groupedByMonth.length === 0) {
        appContent.innerHTML = '<p class="timeline-empty-placeholder">No se han encontrado memorias en ningún día.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    // CAMBIO (Punto 4): Invertir el orden de los meses (ej: Dic, Nov, Oct...)
    groupedByMonth.reverse();

    // 1. Recorrer cada MES
    groupedByMonth.forEach(month => {
        const monthHeader = document.createElement('h2');
        monthHeader.className = 'timeline-month-header';
        monthHeader.textContent = month.monthName;
        fragment.appendChild(monthHeader);

        // CAMBIO (Punto 4): Invertir el orden de los días (ej: 31, 30, 29...)
        month.days.reverse();

        // 2. Recorrer cada DÍA de ese mes
        month.days.forEach(day => {
            const dayGroup = document.createElement('div');
            dayGroup.className = 'timeline-day-group';

            // 3. Crear la cabecera del día (clickeable)
            const dayHeader = document.createElement('div');
            dayHeader.className = 'timeline-day-header';
            
            const specialName = (day.nombreEspecial && day.nombreEspecial !== 'Unnamed Day') 
                ? `<span class="timeline-day-special">- ${day.nombreEspecial} -</span>` 
                : '';
            
            dayHeader.innerHTML = `
                <span class="timeline-day-date">${day.nombreDia} ${specialName}</span>
                <div class="list-view-chevron"></div>
            `;
            
            // Añadir evento de click para abrir el preview
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

            // 4. Crear la lista de memorias para ese día
            const memoriesList = document.createElement('div');
            memoriesList.className = 'timeline-memories-list';
            
            day.memories.forEach(mem => {
                // Usamos el .list-view-item que ya tienes (¡reutilización!)
                const details = _getMemorySpotlightDetails(mem); // Reutilizamos el helper
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
            fragment.appendChild(dayGroup);
        });
    });

    appContent.appendChild(fragment);
}
