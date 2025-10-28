/* api.js */
/* Módulo para gestionar llamadas a APIs externas (iTunes, Nominatim) */
/* (v1.7 - Cambiado proxy iTunes a corsproxy.io) */

/**
 * Busca canciones en la API de iTunes.
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchiTunes(term) {
    // CAMBIO: Se usa 'corsproxy.io'.
    const proxy = 'https://corsproxy.io/?';
    
    // La URL de iTunes que queremos consultar
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`;
    
    // La URL final para corsproxy.io (URL de iTunes DEBE ir codificada)
    const fetchUrl = proxy + encodeURIComponent(url);
    
    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Proxy HTTP error! status: ${response.status}`);
        }
        
        // Este proxy devuelve el JSON directamente
        return await response.json(); 

    } catch (error) {
        console.error('iTunes API Error:', error);
        if (error instanceof SyntaxError) {
             // Esto pasaría si la respuesta no es JSON (p.ej. error del proxy)
             throw new Error("Error al parsear la respuesta del proxy. El proxy puede estar caído o la respuesta de iTunes fue inválida.");
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
        throw new Error(`Nominatim API Error: ${error.message}`); // Lanza el error para que el controlador lo coja
    }
}
