/*
 * main.js (v2.68 - Attempting Fix for Init Error)
 * Controlador principal de Ephemerides.
 */

// --- Importaciones de Módulos ---
import { initFirebase, db, auth } from './firebase.js';
import { initAuthListener, handleLogin, handleLogout, checkAuthState } from './auth.js';
import {
    checkAndRunApp as storeCheckAndRun,
    loadAllDaysData,
    loadMemoriesForDay,
    saveDayName,
    saveMemory,
    deleteMemory,
    searchMemories,
    getTodaySpotlight,
    getMemoriesByType,
    getNamedDays,
    uploadImage
} from './store.js';
import { searchMusic, searchNominatim } from './api.js';
import { ui } from './ui.js'; // Importa el objeto ui
import { showSettings } from './settings.js';

console.log('Imported ui:', ui); // Log para verificar la importación

// --- Estado Global de la App ---
let state = { /* ... */ };

// --- 1. Inicialización de la App ---

async function checkAndRunApp() {
    console.log("Iniciando Ephemerides v2.68 (Attempting Fix)..."); // Versión

    try {
        // Verificar si ui y ui.setLoading existen antes de usarlos
        if (ui && typeof ui.setLoading === 'function') {
            ui.setLoading("Iniciando...", true);
        } else {
            console.error("CRITICAL: ui.setLoading no está disponible al inicio de checkAndRunApp!");
            alert("Error crítico de inicialización. Revisa la consola.");
            return; // Detener ejecución si la UI no carga
        }

        initFirebase();

        // Verificar si ui.init existe
        if (ui && typeof ui.init === 'function') {
            ui.init(getUICallbacks());
        } else {
             console.error("CRITICAL: ui.init no está disponible!");
             alert("Error crítico de inicialización UI. Revisa la consola.");
             return;
        }

        initAuthListener(handleAuthStateChange);

        ui.setLoading("Autenticando...", true); // Ya sabemos que existe si llegamos aquí

        await checkAuthState();

        console.log("Arranque de autenticación completado.");

    } catch (err) {
        console.error("Error crítico durante el arranque:", err);
        if (ui && typeof ui.setLoading === 'function') {
            if (err.code === 'permission-denied') {
                ui.setLoading(`Error: Permiso denegado.`, true);
            } else {
                // Mostrar el error específico que ocurrió
                ui.setLoading(`Error crítico: ${err.message}. ${err.stack ? 'Stack: '+err.stack.substring(0,100)+'...' : ''}`, true);
            }
        } else {
            alert(`Error crítico (UI no disponible): ${err.message}.`);
        }
    }
}

// ... (Resto de main.js SIN CAMBIOS) ...
async function initializeUserSession() { /* ... */ }
async function loadTodaySpotlight() { /* ... */ }
function drawCurrentMonth() { /* ... */ }
function getUICallbacks() { /* ... */ }
async function handleLoginClick() { /* ... */ }
async function handleLogoutClick() { /* ... */ }
function handleAuthStateChange(user) { /* ... */ }
function handleMonthChange(direction) { /* ... */ }
async function handleDayClick(dia) { /* ... */ }
async function handleEditFromPreview() { /* ... */ }
async function handleFooterAction(action) { /* ... */ }
function handleShuffleClick() { /* ... */ }
async function handleSaveDayName(diaId, newName, statusElementId = 'save-status') { /* ... */ }
async function handleSaveMemorySubmit(diaId, memoryData, isEditing) { /* ... */ }
async function handleDeleteMemory(diaId, mem) { /* ... */ }
async function handleMusicSearch(term) { /* ... */ }
async function handlePlaceSearch(term) { /* ... */ }
async function handleStoreCategoryClick(type) { /* ... */ }
async function handleStoreLoadMore() { /* ... */ }
function handleStoreItemClick(diaId) { /* ... */ }
function handleCrumbieClick() { /* ... */ }

// --- 7. Ejecución Inicial ---
checkAndRunApp();
