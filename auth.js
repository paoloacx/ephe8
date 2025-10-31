/*
 * auth.js (v5.0 - Google Drive)
 * Autenticación con Google Drive para backups
 */

import { authorize, signOut, isAuthorized, getBackupInfo } from './gdrive.js';

let authChangeCallback = null;
let currentDriveUser = null;

/**
 * Inicializa el listener de cambio de estado
 */
export function initAuthListener(onAuthChangeCallback) {
    authChangeCallback = onAuthChangeCallback;
    
    // Verificar si hay sesión de Drive activa
    checkAuthState();
}

/**
 * Verifica el estado inicial de autenticación con Google Drive
 */
export async function checkAuthState() {
    try {
        if (isAuthorized()) {
            // Hay token de Google Drive
            const info = await getBackupInfo();
            currentDriveUser = {
                displayName: 'Google Drive',
                email: 'Usuario de Drive',
                photoURL: null,
                isDrive: true,
                hasBackup: info !== null
            };
            
            if (authChangeCallback) {
                authChangeCallback(currentDriveUser);
            }
            
            return currentDriveUser;
        }
    } catch (error) {
        console.log('No hay sesión de Google Drive activa');
    }
    
    // Sin sesión
    if (authChangeCallback) {
        authChangeCallback(null);
    }
    
    return null;
}

/**
 * Inicia sesión con Google Drive
 */
export async function handleLogin() {
    try {
        await authorize();
        
        // Obtener info después de autorizar
        const info = await getBackupInfo();
        currentDriveUser = {
            displayName: 'Google Drive',
            email: 'Conectado',
            photoURL: null,
            isDrive: true,
            hasBackup: info !== null
        };
        
        if (authChangeCallback) {
            authChangeCallback(currentDriveUser);
        }
        
        return currentDriveUser;
    } catch (error) {
        console.error('Error en login de Google Drive:', error);
        throw error;
    }
}

/**
 * Cierra sesión de Google Drive
 */
export async function handleLogout() {
    try {
        signOut();
        currentDriveUser = null;
        
        if (authChangeCallback) {
            authChangeCallback(null);
        }
    } catch (error) {
        console.error('Error en logout:', error);
        throw error;
    }
}

/**
 * Verifica si hay usuario conectado
 */
export function isAuthAvailable() {
    return isAuthorized();
}

/**
 * Obtiene el usuario actual
 */
export function getCurrentUser() {
    return currentDriveUser;
}
