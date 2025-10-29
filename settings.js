/*
 * settings.js (v1.0 - Módulo inicial)
 * Gestiona la lógica de la pantalla/modal de Ajustes.
 */

import { ui } from './ui.js';
// Importaremos store.js aquí cuando añadamos import/export

/**
 * Función principal para mostrar los ajustes.
 * Por ahora, solo muestra una alerta con la versión.
 */
export function showSettings() {
    console.log("Mostrando Ajustes..."); // Para depuración

    // Obtenemos la versión (podríamos tenerla definida en otro sitio más adelante)
    const appVersion = "2.62 (Estable)"; // Asegúrate que coincida

    // Mostramos la alerta usando la función de ui.js
    ui.showAlert(
        `Settings\n\nApp Version: ${appVersion}\nImport/Export coming soon!`,
        'settings' // Usamos el estilo 'settings' (Deep Blue)
    );

    // --- Futuro: Aquí se abriría un modal de ajustes ---
    // ui.openSettingsModal();
}

/**
 * --- Futuro: Lógica para Exportar Datos ---
 * Se llamaría desde un botón en el modal de ajustes.
 */
/*
export async function handleExportData() {
    console.log("Exportando datos...");
    // 1. Obtener todos los datos del usuario desde store.js
    // 2. Formatear los datos (ej. a CSV o JSON)
    // 3. Usar alguna técnica para descargar el archivo (ej. crear un enlace <a> temporal)
    // 4. Mostrar mensaje de éxito/error en UI
}
*/

/**
 * --- Futuro: Lógica para Importar Datos ---
 * Se llamaría desde un input type="file" en el modal de ajustes.
 */
/*
export async function handleImportData(file) {
    console.log("Importando datos desde archivo:", file.name);
    // 1. Leer el archivo (xlsx, csv) usando una librería (ej. SheetJS/xlsx)
    // 2. Validar la estructura y los datos
    // 3. Mapear los datos al formato de Firestore (días, memorias)
    // 4. (Opcional: Confirmación del usuario "¿Borrar datos existentes?")
    // 5. Enviar los datos a store.js para guardarlos (posiblemente borrando los anteriores)
    // 6. Mostrar mensaje de éxito/error y refrescar la app
}
*/
