/* api.js */
/* Módulo para gestionar llamadas a APIs externas (iTunes, Nominatim) */
/* (v2.2 - Improved Error Handling & Logging) */

/**
 * Busca canciones en la API de iTunes.
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<Array|null>} Un array de resultados o null si hay error.
 */
export async function searchMusic(term) {
    // Llamada directa SIN el parámetro '&media=music'.
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=5`;
    console.log("[DEBUG API] Buscando música:", url); // Log añadido

    try {
        const response = await fetch(url);
        console.log("[DEBUG API] Respuesta iTunes status:", response.status); // Log añadido

        if (!response.ok) {
            // Loguear el texto de la respuesta si es posible, puede dar pistas
            let errorText = response.statusText;
            try {
                errorText = await response.text();
            } catch (e) { /* Ignorar si no se puede leer el texto */ }
            console.error(`[DEBUG API] iTunes API error! Status: ${response.status}, Mensaje: ${errorText}`);
            throw new Error(`iTunes API error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("[DEBUG API] Datos iTunes recibidos:", data); // Log añadido
        
        // Devolver el array de resultados o un array vacío si no hay
        return data.results || [];

    } catch (error) {
        console.error('[DEBUG API] Error en searchMusic:', error);
        // Devolver null para indicar que hubo un error
        return null; 
    }
}

/**
 * Busca lugares en la API de Nominatim (OpenStreetMap).
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<Array|null>} Un array de resultados o null si hay error.
 */
export async function searchNominatim(term) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term)}&limit=5`;
    console.log("[DEBUG API] Buscando lugar:", url); // Log añadido
    
    try {
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        console.log("[DEBUG API] Respuesta Nominatim status:", response.status); // Log añadido

        if (!response.ok) {
             let errorText = response.statusText;
            try {
                errorText = await response.text();
            } catch (e) { /* Ignorar */ }
            console.error(`[DEBUG API] Nominatim API error! Status: ${response.status}, Mensaje: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("[DEBUG API] Datos Nominatim recibidos:", data); // Log añadido
        // Nominatim devuelve un array directamente
        return data; 
    } catch (error) {
        console.error('[DEBUG API] Error en searchNominatim:', error);
         // Devolver null para indicar que hubo un error
        return null;
    }
}
