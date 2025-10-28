/* api.js */
/* Módulo para gestionar llamadas a APIs externas (iTunes, Nominatim) */
/* (v2.1 - Eliminado &media=music que causaba el redirect a musics://) */

/**
 * Busca canciones en la API de iTunes.
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchMusic(term) { // Renombrado de searchiTunes a searchMusic
    
    // CAMBIO: Llamada directa SIN el parámetro '&media=music'.
    // Esto es lo que hace tu app claude2 y evita la redirección a 'musics://'.
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`;
    
    try {
        // Hacemos el fetch directamente a la API de iTunes
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`iTunes API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // La respuesta de iTunes está en 'data.results'
        return data.results || [];

    } catch (error) {
        console.error('iTunes API Error (Llamada Directa v2.1):', error);
        if (error instanceof SyntaxError) {
             throw new Error("Error al parsear la respuesta de iTunes.");
        }
        // Si el fetch falla (p.ej. sin conexión o el redirect 'musics://')
        throw new Error(`Fallo en la llamada a iTunes: ${error.message}`);
    }
}

/**
 * Busca lugares en la API de Nominatim (OpenStreetMap).
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchNominatim(term) {
    // Nominatim funciona bien con llamada directa
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
