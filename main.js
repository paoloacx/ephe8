/*
 * main.js (v4.18 - Debugging botones)
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
import { searchMusic, searchNominatim } from './api.js'; // v2.1
import { ui } from './ui.js';

// --- Estado Global de la App ---
let state = {
    allDaysData: [],
    currentMonthIndex: new Date().getMonth(),
    currentUser: null,
    todayId: '',
    dayInPreview: null,
    store: {
        currentType: null,
        lastVisible: null,
        isLoading: false,
    }
};

// --- 1. Inicialización de la App ---

async function checkAndRunApp() {
    console.log("Iniciando Ephemerides v4.18 (Debugging botones)..."); // Cambiado

    try {
        ui.setLoading("Iniciando...", true);
        initFirebase();
        ui.setLoading("Autenticando...", true);
        const user = await checkAuthState();
        console.log("Estado de autenticación inicial resuelto.");
        ui.setLoading("Verificando base de datos...", true);
        await storeCheckAndRun((message) => ui.setLoading(message, true));
        ui.setLoading("Cargando calendario...", true);
        state.allDaysData = await loadAllDaysData();

        if (state.allDaysData.length === 0) {
            throw new Error("La base de datos está vacía después de la verificación.");
        }

        const today = new Date();
        state.todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        // Pasamos allDaysData a ui.init
        ui.init(getUICallbacks(), state.allDaysData); 

        initAuthListener(handleAuthStateChange);
        if (user) handleAuthStateChange(user);

        drawCurrentMonth();
        loadTodaySpotlight();

    } catch (err) {
        console.error("Error crítico durante el arranque:", err);
        if (err.code === 'permission-denied') {
             ui.setLoading(`Error: Permiso denegado por Firestore. Revisa tus reglas de seguridad.`, true);
        } else {
             ui.setLoading(`Error crítico: ${err.message}. Por favor, recarga.`, true);
        }
    }
}

async function loadTodaySpotlight() { /* ... (sin cambios) */ }
function drawCurrentMonth() { /* ... (sin cambios) */ }

// --- 2. Callbacks y Manejadores de Eventos ---

function getUICallbacks() {
    return {
        onMonthChange: handleMonthChange,
        onDayClick: handleDayClick,
        onFooterAction: handleFooterAction,
        onLogin: handleLoginClick,
        onLogout: handleLogoutClick,
        onEditFromPreview: handleEditFromPreview,
        onSaveDayName: handleSaveDayName,
        onSaveMemory: handleSaveMemorySubmit,
        onDeleteMemory: handleDeleteMemory,
        onSearchMusic: handleMusicSearch, 
        onSearchPlace: handlePlaceSearch,
        onStoreCategoryClick: handleStoreCategoryClick,
        onStoreLoadMore: handleStoreLoadMore,
        onStoreItemClick: handleStoreItemClick,
        onCrumbieClick: handleCrumbieClick,
    };
}

// --- Manejadores de Autenticación ---
async function handleLoginClick() { /* ... (sin cambios) */ }
async function handleLogoutClick() { /* ... (sin cambios) */ }
function handleAuthStateChange(user) { /* ... (sin cambios) */ }

// --- Manejadores de UI ---
function handleMonthChange(direction) { /* ... (sin cambios) */ }
async function handleDayClick(dia) { /* ... (sin cambios) */ }
async function handleEditFromPreview() { /* ... (sin cambios) */ }

async function handleFooterAction(action) {
    // ***** DEBUG: Añadido console.log *****
    console.log(`handleFooterAction received: ${action}`);
    // ************************************
    switch (action) {
        case 'add':
            if (!state.currentUser) {
                ui.showAlert("Debes iniciar sesión para añadir memorias.");
                return;
            }
            ui.openEditModal(null, []); 
            break;

        case 'store':
            ui.openStoreModal();
            break;

        case 'shuffle':
            handleShuffleClick();
            break;

        case 'search':
            const searchTerm = await ui.showPrompt("Buscar en todas las memorias:", '', 'search');
            if (!searchTerm || searchTerm.trim() === '') return;
            // ... (resto de lógica de búsqueda sin cambios)
            const term = searchTerm.trim().toLowerCase();
            ui.setLoading(`Buscando "${term}"...`, true);
            try {
                const results = await searchMemories(term);
                ui.setLoading(null, false);
                drawCurrentMonth(); // Restaurar calendario
                // ... (mostrar resultados en spotlight)
                 if (results.length === 0) {
                    ui.updateSpotlight(`No hay resultados para "${term}"`, null, []);
                } else {
                    results.forEach(mem => {
                        if (!mem.Nombre_Dia) {
                            mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
                        }
                    });
                    ui.updateSpotlight(`Resultados para "${term}" (${results.length})`, null, results);
                }
            } catch (err) {
                 ui.setLoading(null, false);
                 drawCurrentMonth(); // Restaurar calendario
                 ui.showAlert(`Error al buscar: ${err.message}`);
            }
            break;

        case 'settings':
            ui.showAlert("Settings\n\nApp Version: 4.18 (Debug)\nMore settings coming soon!", 'settings');
            break;


        default:
            console.warn("Acción de footer desconocida:", action);
    }
}

function handleShuffleClick() { /* ... (sin cambios) */ }


// --- 3. Lógica de Modales (Controlador) ---
async function handleSaveDayName(diaId, newName, statusElementId = 'save-status') { /* ... (sin cambios) */ }
async function handleSaveMemorySubmit(diaId, memoryData, isEditing) { /* ... (sin cambios) */ }

async function handleDeleteMemory(diaId, mem) {
    // ***** DEBUG: Añadido console.log *****
    console.log(`handleDeleteMemory called with diaId: ${diaId}, memId: ${mem?.id}`);
    // ************************************
    
    if (!state.currentUser) {
        ui.showModalStatus('memoria-status', `Debes estar logueado`, true);
        return;
    }
    if (!mem || !mem.id) {
         ui.showModalStatus('memoria-status', `Error: Información de memoria inválida.`, true);
         console.error("handleDeleteMemory recibió:", mem);
         return;
    }
    if (!diaId) {
         ui.showModalStatus('memoria-status', `Error: ID del día no proporcionado.`, true);
         console.error("handleDeleteMemory recibió diaId nulo o indefinido");
         return;
    }


    const info = mem.Descripcion || mem.LugarNombre || mem.CancionInfo || 'esta memoria';
    const message = `¿Seguro que quieres borrar "${info.substring(0, 50)}..."?`;

    const confirmed = await ui.showConfirm(message);

    if (!confirmed) {
        console.log("Borrado cancelado por el usuario."); // DEBUG
        return;
    }

    try {
        const imagenURL = (mem.Tipo === 'Imagen') ? mem.ImagenURL : null;
        await deleteMemory(diaId, mem.id, imagenURL);
        ui.showModalStatus('memoria-status', 'Memoria borrada', false);

        const updatedMemories = await loadMemoriesForDay(diaId);
        ui.updateMemoryList(updatedMemories); // Actualiza lista en el modal

        if (updatedMemories.length === 0) {
            const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
            if (dayIndex !== -1) {
                state.allDaysData[dayIndex].tieneMemorias = false;
                drawCurrentMonth(); // Redibuja calendario para quitar dog-ear
            }
        }

    } catch (err) {
        console.error("Error borrando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
    }
}

// --- 4. Lógica de API Externa (Controlador) ---
async function handleMusicSearch(term) { /* ... (sin cambios) */ }
async function handlePlaceSearch(term) { /* ... (sin cambios) */ }

// --- 5. Lógica del "Almacén" (Controlador) ---
async function handleStoreCategoryClick(type) { /* ... (sin cambios) */ }
async function handleStoreLoadMore() { /* ... (sin cambios) */ }
function handleStoreItemClick(diaId) { /* ... (sin cambios) */ }

// --- 6. Lógica de Crumbie (IA) ---
function handleCrumbieClick() { /* ... (sin cambios) */ }

// --- 7. Ejecución Inicial ---
checkAndRunApp();
