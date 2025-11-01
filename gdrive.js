/*
 * gdrive.js (v5.1 - Con persistencia de token)
 * Módulo para backup y restore en Google Drive
 */

// --- Configuración ---
const CLIENT_ID = '360961314777-27a79o8blr5usg3qpqblrv5jckq5278v.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];

const BACKUP_FILENAME = 'ephemerides_backup.json';
const BACKUP_FOLDER_NAME = 'Ephemerides';

// --- Estado ---
let isGapiLoaded = false;
let isGisLoaded = false;
let tokenClient = null;
let accessToken = null;

// --- Inicialización ---

/**
 * Carga los scripts de Google API
 */
export async function initGoogleDrive() {
    if (isGapiLoaded && isGisLoaded) {
        console.log('Google Drive API ya inicializada');
        
        // Intentar restaurar token guardado
        const savedToken = localStorage.getItem('gdrive_access_token');
        if (savedToken && gapi?.client) {
            try {
                gapi.client.setToken({ access_token: savedToken });
                accessToken = savedToken;
                console.log('Token de Google Drive restaurado');
            } catch (e) {
                console.warn('No se pudo restaurar el token:', e);
                localStorage.removeItem('gdrive_access_token');
            }
        }
        
        return true;
    }

    try {
        // Cargar GAPI
        await loadScript('https://apis.google.com/js/api.js');
        await new Promise((resolve) => {
            gapi.load('client', resolve);
        });
        
        await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
        });
        
        isGapiLoaded = true;
        console.log('GAPI cargado');

        // Cargar GIS (Google Identity Services)
        await loadScript('https://accounts.google.com/gsi/client');
        
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // Se define en cada uso
        });
        
        isGisLoaded = true;
        console.log('GIS cargado');
        
        // Intentar restaurar token guardado
        const savedToken = localStorage.getItem('gdrive_access_token');
        if (savedToken) {
            try {
                gapi.client.setToken({ access_token: savedToken });
                accessToken = savedToken;
                console.log('Token de Google Drive restaurado');
            } catch (e) {
                console.warn('No se pudo restaurar el token:', e);
                localStorage.removeItem('gdrive_access_token');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error inicializando Google Drive API:', error);
        throw new Error('No se pudo inicializar Google Drive API: ' + error.message);
    }
}

/**
 * Helper para cargar scripts dinámicamente
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// --- Autenticación ---

/**
 * Solicita autorización y obtiene token de acceso
 */
export async function authorize() {
    if (!isGapiLoaded || !isGisLoaded) {
        const initialized = await initGoogleDrive();
        if (!initialized) {
            throw new Error('No se pudo inicializar Google Drive API');
        }
    }

    return new Promise((resolve, reject) => {
        tokenClient.callback = async (response) => {
            if (response.error !== undefined) {
                console.error('Error en autorización:', response);
                reject(new Error(response.error || 'Error de autorización'));
                return;
            }
            
            accessToken = response.access_token;
            gapi.client.setToken({ access_token: accessToken });
            
            // Guardar token en localStorage
            localStorage.setItem('gdrive_access_token', accessToken);
            
            console.log('Google Drive autorizado');
            resolve(accessToken);
        };

        // Verificar si ya hay token
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
}

/**
 * Cierra sesión de Google Drive
 */
export function signOut() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken(null);
        accessToken = null;
        localStorage.removeItem('gdrive_access_token');
        console.log('Google Drive sesión cerrada');
    }
}

/**
 * Verifica si hay token de acceso válido
 */
export function isAuthorized() {
    return gapi?.client && gapi.client.getToken() !== null;
}

// --- Backup ---

/**
 * Crea o encuentra la carpeta de Ephemerides
 */
async function getOrCreateFolder() {
    try {
        if (!gapi?.client?.drive) {
            throw new Error('Google Drive API no está inicializada correctamente');
        }

        // Buscar carpeta existente
        const response = await gapi.client.drive.files.list({
            q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (response.result.files && response.result.files.length > 0) {
            console.log('Carpeta Ephemerides encontrada:', response.result.files[0].id);
            return response.result.files[0].id;
        }

        // Crear carpeta
        const createResponse = await gapi.client.drive.files.create({
            resource: {
                name: BACKUP_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id'
        });

        console.log('Carpeta Ephemerides creada en Drive:', createResponse.result.id);
        return createResponse.result.id;
    } catch (error) {
        console.error('Error obteniendo/creando carpeta:', error);
        throw new Error('Error al crear carpeta en Drive: ' + (error.message || 'Error desconocido'));
    }
}

/**
 * Hace backup de todos los datos a Google Drive
 */
export async function backupToDrive(onProgress) {
    if (!isAuthorized()) {
        console.log('No autorizado, solicitando autorización...');
        await authorize();
    }

    try {
        onProgress?.('Preparando backup...');

        // Recopilar todos los datos de localStorage
        const backupData = {
            version: '5.0',
            timestamp: new Date().toISOString(),
            data: {
                days: localStorage.getItem('ephem_days'),
                memories: localStorage.getItem('ephem_memories'),
                viewMode: localStorage.getItem('ephem_viewMode'),
                first_run: localStorage.getItem('ephem_first_run'),
                welcome_shown: localStorage.getItem('ephem_welcome_shown')
            }
        };

        onProgress?.('Conectando con Google Drive...');

        // Obtener ID de carpeta
        const folderId = await getOrCreateFolder();

        onProgress?.('Subiendo backup...');

        // Buscar backup existente
        const searchResponse = await gapi.client.drive.files.list({
            q: `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        const file = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const metadata = {
            name: BACKUP_FILENAME,
            mimeType: 'application/json',
            parents: [folderId]
        };

        let response;
        const token = gapi.client.getToken();
        if (!token || !token.access_token) {
            throw new Error('No hay token de acceso válido');
        }

        if (searchResponse.result.files && searchResponse.result.files.length > 0) {
            // Actualizar archivo existente
            const fileId = searchResponse.result.files[0].id;
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                method: 'PATCH',
                headers: new Headers({ 'Authorization': 'Bearer ' + token.access_token }),
                body: form
            });
        } else {
            // Crear nuevo archivo
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', file);

            response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + token.access_token }),
                body: form
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error subiendo backup:', errorText);
            throw new Error('Error subiendo backup a Drive: ' + response.statusText);
        }

        onProgress?.('Backup completado');
        
        // Guardar timestamp del último backup
        localStorage.setItem('ephem_last_backup', new Date().toISOString());
        
        console.log('Backup completado exitosamente');
        return true;
    } catch (error) {
        console.error('Error en backup:', error);
        throw new Error('Error al hacer backup: ' + (error.message || 'Error desconocido'));
    }
}

/**
 * Restaura datos desde Google Drive
 */
export async function restoreFromDrive(onProgress) {
    if (!isAuthorized()) {
        console.log('No autorizado, solicitando autorización...');
        await authorize();
    }

    try {
        onProgress?.('Buscando backup...');

        // Obtener ID de carpeta
        const folderId = await getOrCreateFolder();

        // Buscar archivo de backup
        const searchResponse = await gapi.client.drive.files.list({
            q: `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive'
        });

        if (!searchResponse.result.files || searchResponse.result.files.length === 0) {
            throw new Error('No se encontró ningún backup en Google Drive');
        }

        const fileId = searchResponse.result.files[0].id;
        const modifiedTime = searchResponse.result.files[0].modifiedTime;

        onProgress?.('Descargando backup...');

        // Descargar archivo
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        const backupData = response.result;

        onProgress?.('Restaurando datos...');

        // Validar versión
        if (!backupData.version || !backupData.data) {
            throw new Error('Formato de backup inválido');
        }

        // Restaurar datos
        if (backupData.data.days) {
            localStorage.setItem('ephem_days', backupData.data.days);
        }
        if (backupData.data.memories) {
            localStorage.setItem('ephem_memories', backupData.data.memories);
        }
        if (backupData.data.viewMode) {
            localStorage.setItem('ephem_viewMode', backupData.data.viewMode);
        }
        if (backupData.data.first_run) {
            localStorage.setItem('ephem_first_run', backupData.data.first_run);
        }
        if (backupData.data.welcome_shown) {
            localStorage.setItem('ephem_welcome_shown', backupData.data.welcome_shown);
        }

        onProgress?.('Restore completado');
        
        console.log(`Restore completado. Backup del ${new Date(modifiedTime).toLocaleString()}`);
        return {
            success: true,
            timestamp: modifiedTime
        };
    } catch (error) {
        console.error('Error en restore:', error);
        throw new Error('Error al restaurar: ' + (error.message || 'Error desconocido'));
    }
}

/**
 * Obtiene información del último backup
 */
export async function getBackupInfo() {
    if (!isAuthorized()) {
        return null;
    }

    try {
        const folderId = await getOrCreateFolder();

        const searchResponse = await gapi.client.drive.files.list({
            q: `name='${BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, modifiedTime, size)',
            spaces: 'drive'
        });

        if (!searchResponse.result.files || searchResponse.result.files.length === 0) {
            return null;
        }

        const file = searchResponse.result.files[0];
        return {
            exists: true,
            modifiedTime: file.modifiedTime,
            size: file.size
        };
    } catch (error) {
        console.error('Error obteniendo info de backup:', error);
        return null;
    }
}

/**
 * Obtiene el timestamp del último backup local
 */
export function getLastBackupTimestamp() {
    const timestamp = localStorage.getItem('ephem_last_backup');
    return timestamp ? new Date(timestamp) : null;
}
