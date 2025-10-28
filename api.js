/* api.js */
/* Módulo para gestionar llamadas a APIs externas (iTunes, Nominatim) */
/* (v1.10 - Volvemos a allorigins, pero más robusto) */

/**
 * Busca canciones en la API de iTunes.
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchiTunes(term) {
    // Volvemos a 'allorigins' (v1.5)
    const proxy = 'https://api.allorigins.win/get?url=';
    
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`;
    
    // La URL de iTunes DEBE estar codificada
    const fetchUrl = proxy + encodeURIComponent(url);
    
    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Proxy HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json(); // Esto es el JSON de allorigins

        // CAMBIO: Comprobación robusta de la respuesta
        if (data.contents) {
            try {
                // El contenido (data.contents) es una CADENA JSON, hay que parsearla
                const itunesData = JSON.parse(data.contents);
                return itunesData; // ¡Éxito!
            } catch (e) {
                // Esto pasa si 'data.contents' no es JSON (p.ej. un HTML de error)
                console.error("allorigins 'contents' no era un JSON válido:", data.contents);
                throw new Error("El proxy no pudo obtener una respuesta JSON válida de iTunes.");
            }
        } else if (data.status && data.status.http_code >= 400) {
             // Si allorigins reporta un error de la URL de destino
             throw new Error(`Error de iTunes (via proxy): ${data.status.http_code}`);
        } else {
            // Si data.contents es null o no existe
            throw new Error("El proxy devolvió una respuesta vacía o inesperada.");
        }

    } catch (error) {
        console.error('iTunes API Error (allorigins):', error);
        // Esto captura los errores de fetch (si allorigins está caído) o los errores que lanzamos arriba
        throw new Error(`Fallo en la API/Proxy: ${error.message}`);
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
