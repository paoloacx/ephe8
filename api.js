/* api.js */
/* Módulo para gestionar llamadas a APIs externas (iTunes, Nominatim) */
/* (v1.11 - Fetch como TEXTO para evitar SyntaxError) */

/**
 * Busca canciones en la API de iTunes.
 * @param {string} term - El término de búsqueda.
 * @returns {Promise<object>} La respuesta JSON de la API.
 */
export async function searchiTunes(term) {
    // Usamos allorigins
    const proxy = 'https://api.allorigins.win/get?url=';
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5`;
    const fetchUrl = proxy + encodeURIComponent(url);
    
    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            // Error de red o del proxy (5xx)
            throw new Error(`Error del proxy HTTP: ${response.status}`);
        }

        // 1. Obtener la respuesta como TEXTO
        const responseText = await response.text();

        if (!responseText) {
            throw new Error("El proxy devolvió una respuesta vacía.");
        }

        // 2. Intentar parsear el TEXTO como JSON (la envoltura de allorigins)
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // ¡Este es el error que veíamos!
            console.error("La respuesta del proxy no fue JSON (probablemente un HTML de error):", responseText);
            throw new Error("El proxy devolvió una respuesta inválida (HTML/Error).");
        }

        // 3. Si el JSON de allorigins es válido, procesar su contenido
        if (data.contents) {
            try {
                // data.contents es OTRA CADENA JSON (la de iTunes)
                const itunesData = JSON.parse(data.contents);
                return itunesData; // ¡Éxito!
            } catch (e) {
                console.error("El 'contents' de allorigins no era un JSON válido:", data.contents);
                throw new Error("El proxy no pudo obtener un JSON válido de iTunes.");
            }
        } else if (data.status && data.status.http_code >= 400) {
             throw new Error(`Error de iTunes (via proxy): ${data.status.http_code}`);
        } else {
            throw new Error("El proxy devolvió un JSON inesperado (sin 'contents').");
        }

    } catch (error) {
        console.error('iTunes API Error (allorigins v1.11):', error);
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
