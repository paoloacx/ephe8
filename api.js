/* api.js */
/* Módulo para gestionar llamadas a APIs externas (iTunes, Nominatim) */
/* (v1.5 - Cambiado proxy iTunes a allorigins) */

/**
 * Busca canciones en la API de iTunes.
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchiTunes(term) {
    // CAMBIO: Se usa un proxy CORS diferente ('allorigins')
    const proxy = 'https://api.allorigins.win/get?url='; // Usar /get que envuelve en JSON
    
    // La URL de iTunes que queremos consultar
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`;
    
    // La URL final para allorigins (DEBE estar codificada)
    const fetchUrl = proxy + encodeURIComponent(url);
    
    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Proxy HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        // allorigins envuelve la respuesta en 'contents'
        if (data.contents) {
            // El contenido es una CADENA JSON, hay que parsearla
            return JSON.parse(data.contents);
        } else if (data.status && data.status.http_code >= 400) {
             // Si allorigins reporta un error de la URL de destino
             throw new Error(`iTunes API error (via proxy): ${data.status.http_code}`);
        }
        else {
            throw new Error("Formato de respuesta del proxy inesperado.");
        }

    } catch (error) {
        console.error('iTunes API Error:', error);
        if (error instanceof SyntaxError) {
             // Esto pasaría si la respuesta no es JSON (p.ej. error de allorigins)
             throw new Error("Error al parsear la respuesta del proxy. El proxy puede estar caído.");
        }
        // Si el fetch falla (como el ERR_NAME_NOT_RESOLVED) o el proxy falla
        throw new Error(`Fallo en la API/Proxy: ${error.message}`);
    }
}

/**
 * Busca lugares en la API de Nominatim (OpenStreetMap).
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchNominatim(term) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=5`;
    
    try {
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Nominatim API Error:', error);
        throw error; // Lanza el error para que el controlador lo coja
    }
}
