/*
 * ui-maps.js (v1.0)
 * Módulo de gestión de mapas Leaflet.
 */

// --- Variables privadas del módulo ---
let _activeMaps = []; // Array de instancias de mapas Leaflet activos

/**
 * Renderiza un mapa Leaflet en un contenedor específico.
 * @param {string} containerId - ID del elemento contenedor del mapa
 * @param {number} lat - Latitud
 * @param {number} lon - Longitud
 * @param {number} zoom - Nivel de zoom (por defecto 13)
 */
function renderMap(containerId, lat, lon, zoom = 13) {
    try {
        const container = document.getElementById(containerId);
        if (!container || container._leaflet_id) {
            return;
        }
        const map = L.map(containerId).setView([lat, lon], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        L.marker([lat, lon]).addTo(map);
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
 * @param {HTMLElement} containerEl - Elemento contenedor donde buscar mapas
 * @param {string} prefix - Prefijo del ID de los mapas (ej: 'spotlight', 'preview', 'edit')
 */
function initMapsInContainer(containerEl, prefix) {
    if (!containerEl) return;
    const mapPlaceholders = containerEl.querySelectorAll(`div[id^="${prefix}-map-"][data-lat]`);
    mapPlaceholders.forEach(el => {
        if (el._leaflet_id) return; // No reinicializar
        const lat = el.dataset.lat;
        const lon = el.dataset.lon;
        const zoom = el.dataset.zoom || 13;
        if (lat && lon) {
            setTimeout(() => {
                renderMap(el.id, parseFloat(lat), parseFloat(lon), parseInt(zoom));
            }, 50); 
        }
    });
}

/**
 * Destruye todas las instancias de mapas activas DENTRO de un contenedor específico.
 * @param {HTMLElement} containerEl - Contenedor cuyos mapas deben ser destruidos
 */
function destroyMapsInContainer(containerEl) {
    if (!containerEl) {
        console.warn("destroyMapsInContainer llamada sin contenedor. Abortando.");
        return; 
    }

    const mapsToDestroy = [];
    const stillActiveMaps = [];

    _activeMaps.forEach(map => {
        // Comprobar si el contenedor del mapa está dentro del modal que se cierra
        if (containerEl.contains(map.getContainer())) {
            mapsToDestroy.push(map);
        } else {
            stillActiveMaps.push(map);
        }
    });

    mapsToDestroy.forEach(map => {
        try { 
            map.remove(); 
        } catch(e) { 
            console.warn("Error removing map:", e); 
        }
    });
    
    _activeMaps = stillActiveMaps; // Mantener solo los mapas que no se borraron
}

/**
 * Destruye TODOS los mapas activos (útil para limpieza completa)
 */
function destroyAllMaps() {
    _activeMaps.forEach(map => {
        try { 
            map.remove(); 
        } catch(e) { 
            console.warn("Error removing map:", e); 
        }
    });
    _activeMaps = [];
}

/**
 * Obtiene el número de mapas activos (útil para debugging)
 * @returns {number} Cantidad de mapas activos
 */
function getActiveMapsCount() {
    return _activeMaps.length;
}

// --- Exportaciones ---
export const uiMaps = {
    renderMap,
    initMapsInContainer,
    destroyMapsInContainer,
    destroyAllMaps,
    getActiveMapsCount
};
