/*
 * main.js (v4.19 - Debugging Calendar/Spotlight Load)
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
    console.log("Iniciando Ephemerides v4.19 (Debugging Load)..."); // Cambiado

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
            // This case should be handled, maybe show an error?
            console.error("CRITICAL: loadAllDaysData returned empty array after check/run.");
             ui.setLoading("Error crítico: No se pudieron cargar los datos del calendario.", true);
             return; // Stop execution if data is missing
        }
        console.log(`Data loaded: ${state.allDaysData.length} days found.`); // DEBUG

        const today = new Date();
        state.todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        // Pasamos allDaysData a ui.init
        ui.init(getUICallbacks(), state.allDaysData); 

        initAuthListener(handleAuthStateChange);
        // We might need to wait for the first auth state change if user is null initially?
        // Let's assume checkAuthState handles the initial user state correctly for now.
        if (user) {
             console.log("Initial user found, calling handleAuthStateChange."); // DEBUG
             handleAuthStateChange(user);
        } else {
             console.log("No initial user found."); // DEBUG
        }

        // ***** DEBUG logs added *****
        console.log(`Before drawCurrentMonth: allDaysData length = ${state.allDaysData.length}, currentMonthIndex = ${state.currentMonthIndex}`);
        ui.setLoading("Dibujando calendario...", true); // Give user feedback
        drawCurrentMonth();
        console.log("After drawCurrentMonth call.");

        console.log("Before loadTodaySpotlight call.");
        ui.setLoading("Cargando spotlight...", true); // Give user feedback
        await loadTodaySpotlight(); // Added await here as it's async
        console.log("After loadTodaySpotlight call.");
        // ***************************

        ui.setLoading(null, false); // Clear loading message

    } catch (err) {
        console.error("Error crítico durante el arranque:", err);
        if (err.code === 'permission-denied') {
             ui.setLoading(`Error: Permiso denegado por Firestore. Revisa tus reglas de seguridad.`, true);
        } else {
             ui.setLoading(`Error crítico: ${err.message}. Por favor, recarga.`, true);
        }
    }
}

async function loadTodaySpotlight() {
    const today = new Date();
    const dateString = `Hoy, ${today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;

    console.log("loadTodaySpotlight: Fetching data..."); // DEBUG
    const spotlightData = await getTodaySpotlight(state.todayId);
    console.log("loadTodaySpotlight: Data received:", spotlightData); // DEBUG

    if (spotlightData) {
        spotlightData.memories.forEach(mem => {
            if (!mem.Nombre_Dia && state.allDaysData.length > 0) { // Check allDaysData
                mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
            } else if (!state.allDaysData.length > 0) {
                 console.warn("loadTodaySpotlight: state.allDaysData is empty when trying to find Nombre_Dia"); // DEBUG
            }
        });

        const dayName = spotlightData.dayName !== 'Unnamed Day' ? spotlightData.dayName : null;
        console.log("loadTodaySpotlight: Calling ui.updateSpotlight..."); // DEBUG
        ui.updateSpotlight(dateString, dayName, spotlightData.memories);
    } else {
         console.warn("loadTodaySpotlight: getTodaySpotlight returned null or undefined."); // DEBUG
         // Still update UI to show nothing
         ui.updateSpotlight(dateString, null, []);
    }
}

function drawCurrentMonth() {
    const monthName = new Date(2024, state.currentMonthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
    const monthNumber = state.currentMonthIndex + 1;

    console.log(`drawCurrentMonth: Filtering days for month ${monthNumber}...`); // DEBUG
    const diasDelMes = state.allDaysData.filter(dia =>
        parseInt(dia.id.substring(0, 2), 10) === monthNumber
    );
    console.log(`drawCurrentMonth: Found ${diasDelMes.length} days. Today ID: ${state.todayId}`); // DEBUG

    console.log("drawCurrentMonth: Calling ui.drawCalendar..."); // DEBUG
    ui.drawCalendar(monthName, diasDelMes, state.todayId);
    console.log("drawCurrentMonth: ui.drawCalendar finished."); // DEBUG
}

// --- Resto de main.js (sin cambios) ---
// --- 2. Callbacks y Manejadores de Eventos ---
function getUICallbacks() { /* ... */ }
// --- Manejadores de Autenticación ---
async function handleLoginClick() { /* ... */ }
async function handleLogoutClick() { /* ... */ }
function handleAuthStateChange(user) { /* ... */ }
// --- Manejadores de UI ---
function handleMonthChange(direction) { /* ... */ }
async function handleDayClick(dia) { /* ... */ }
async function handleEditFromPreview() { /* ... */ }
async function handleFooterAction(action) { /* ... */ }
function handleShuffleClick() { /* ... */ }
// --- 3. Lógica de Modales (Controlador) ---
async function handleSaveDayName(diaId, newName, statusElementId = 'save-status') { /* ... */ }
async function handleSaveMemorySubmit(diaId, memoryData, isEditing) { /* ... */ }
async function handleDeleteMemory(diaId, mem) { /* ... */ }
// --- 4. Lógica de API Externa (Controlador) ---
async function handleMusicSearch(term) { /* ... */ }
async function handlePlaceSearch(term) { /* ... */ }
// --- 5. Lógica del "Almacén" (Controlador) ---
async function handleStoreCategoryClick(type) { /* ... */ }
async function handleStoreLoadMore() { /* ... */ }
function handleStoreItemClick(diaId) { /* ... */ }
// --- 6. Lógica de Crumbie (IA) ---
function handleCrumbieClick() { /* ... */ }
// --- 7. Ejecución Inicial ---
checkAndRunApp();
