/* api.js */
/* Módulo para gestionar llamadas a APIs externas (iTunes, Nominatim) */
/* (v1.9 - Eliminado proxy. iTunes permite CORS directo) */

/**
 * Busca canciones en la API de iTunes.
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchiTunes(term) {
    // CAMBIO: Llamada directa. No se necesita proxy.
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`;
    
    try {
        // Hacemos el fetch directamente a la API de iTunes
        const response = await fetch(url);
        
        if (!response.ok) {
            // Esto capturaría errores 4xx o 5xx de la propia API de iTunes
            throw new Error(`iTunes API error! status: ${response.status}`);
        }
        
        // Devolver el JSON directamente
        return await response.json(); 

    } catch (error) {
        console.error('iTunes API Error (Llamada Directa):', error);
        if (error instanceof SyntaxError) {
             throw new Error("Error al parsear la respuesta de iTunes.");
        }
        // Si el fetch falla (p.ej. sin conexión)
        throw new Error(`Fallo en la llamada a iTunes: ${error.message}`);
    }
}

/**
 * Busca lugares en la API de Nominatim (OpenStreetMap).
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchNominatim(term) {
    // Nominatim también permite CORS directo, así que no se toca
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
