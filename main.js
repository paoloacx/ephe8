/*
 * main.js (v4.20 - Importaciones individuales de UI)
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

// ***** CAMBIO: Importar funciones específicas de ui.js *****
import {
    init as uiInit, // Renombrar init para evitar conflicto de nombres
    setLoading,
    updateLoginUI,
    drawCalendar,
    updateSpotlight,
    openPreviewModal,
    closePreviewModal,
    showPreviewLoading,
    openEditModal,
    closeEditModal,
    showEditLoading,
    openStoreModal,
    closeStoreModal,
    openStoreListModal,
    closeStoreListModal,
    showAlert,
    showPrompt,
    showConfirm,
    updateStoreList,
    updateMemoryList,
    resetMemoryForm,
    // fillFormForEdit, // No se llama directamente desde main.js
    showMusicResults,
    showPlaceResults,
    showModalStatus,
    // handleMemoryTypeChange, // No se llama directamente desde main.js
    showCrumbieAnimation
} from './ui.js';
// *********************************************************

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
    console.log("Iniciando Ephemerides v4.20 (Importaciones individuales)..."); // Cambiado

    try {
        // ***** CAMBIO: Usar funciones directamente *****
        setLoading("Iniciando...", true);
        initFirebase();
        setLoading("Autenticando...", true);
        const user = await checkAuthState();
        console.log("Estado de autenticación inicial resuelto.");
        setLoading("Verificando base de datos...", true);
        await storeCheckAndRun((message) => setLoading(message, true)); // Pasar setLoading directamente
        setLoading("Cargando calendario...", true);
        state.allDaysData = await loadAllDaysData();

        if (state.allDaysData.length === 0) {
            console.error("CRITICAL: loadAllDaysData returned empty array after check/run.");
             setLoading("Error crítico: No se pudieron cargar los datos del calendario.", true);
             return;
        }
        console.log(`Data loaded: ${state.allDaysData.length} days found.`);

        const today = new Date();
        state.todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        // Pasamos allDaysData a uiInit (nombre renombrado)
        uiInit(getUICallbacks(), state.allDaysData);

        initAuthListener(handleAuthStateChange);
        if (user) {
             console.log("Initial user found, calling handleAuthStateChange.");
             handleAuthStateChange(user);
        } else {
             console.log("No initial user found.");
        }

        console.log(`Before drawCurrentMonth: allDaysData length = ${state.allDaysData.length}, currentMonthIndex = ${state.currentMonthIndex}`);
        setLoading("Dibujando calendario...", true);
        drawCurrentMonth(); // Llamada directa
        console.log("After drawCurrentMonth call.");

        console.log("Before loadTodaySpotlight call.");
        setLoading("Cargando spotlight...", true);
        await loadTodaySpotlight();
        console.log("After loadTodaySpotlight call.");

        setLoading(null, false); // Clear loading message
        // ********************************************

    } catch (err) {
        console.error("Error crítico durante el arranque:", err);
        // ***** CAMBIO: Usar setLoading directamente *****
        if (err.code === 'permission-denied') {
             setLoading(`Error: Permiso denegado por Firestore. Revisa tus reglas de seguridad.`, true);
        } else {
             setLoading(`Error crítico: ${err.message}. Por favor, recarga.`, true);
        }
        // ********************************************
    }
}

async function loadTodaySpotlight() {
    const today = new Date();
    const dateString = `Hoy, ${today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;

    console.log("loadTodaySpotlight: Fetching data...");
    const spotlightData = await getTodaySpotlight(state.todayId);
    console.log("loadTodaySpotlight: Data received:", spotlightData);

    if (spotlightData) {
        spotlightData.memories.forEach(mem => {
            if (!mem.Nombre_Dia && state.allDaysData.length > 0) {
                mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
            } else if (!state.allDaysData.length > 0) {
                 console.warn("loadTodaySpotlight: state.allDaysData is empty when trying to find Nombre_Dia");
            }
        });

        const dayName = spotlightData.dayName !== 'Unnamed Day' ? spotlightData.dayName : null;
        console.log("loadTodaySpotlight: Calling updateSpotlight..."); // Cambiado de ui.updateSpotlight
        updateSpotlight(dateString, dayName, spotlightData.memories); // Llamada directa
    } else {
         console.warn("loadTodaySpotlight: getTodaySpotlight returned null or undefined.");
         updateSpotlight(dateString, null, []); // Llamada directa
    }
}

function drawCurrentMonth() {
    const monthName = new Date(2024, state.currentMonthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
    const monthNumber = state.currentMonthIndex + 1;

    console.log(`drawCurrentMonth: Filtering days for month ${monthNumber}...`);
    const diasDelMes = state.allDaysData.filter(dia =>
        parseInt(dia.id.substring(0, 2), 10) === monthNumber
    );
    console.log(`drawCurrentMonth: Found ${diasDelMes.length} days. Today ID: ${state.todayId}`);

    console.log("drawCurrentMonth: Calling drawCalendar..."); // Cambiado de ui.drawCalendar
    drawCalendar(monthName, diasDelMes, state.todayId); // Llamada directa
    console.log("drawCurrentMonth: drawCalendar finished.");
}


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

async function handleLoginClick() {
    try {
        await handleLogin();
    } catch (error) {
        console.error("Error en handleLoginClick:", error);
        showAlert(`Error al iniciar sesión: ${error.message}`); // Llamada directa
    }
}

async function handleLogoutClick() {
     try {
        await handleLogout();
    } catch (error) {
        console.error("Error en handleLogoutClick:", error);
        showAlert(`Error al cerrar sesión: ${error.message}`); // Llamada directa
    }
}

function handleAuthStateChange(user) {
    state.currentUser = user;
    updateLoginUI(user); // Llamada directa
    console.log("Estado de autenticación cambiado:", user ? user.uid : "Logged out");

    if (!user) {
        closeEditModal(); // Llamada directa
    }
}

// --- Manejadores de UI ---

function handleMonthChange(direction) {
    if (direction === 'prev') {
        state.currentMonthIndex = (state.currentMonthIndex - 1 + 12) % 12;
    } else {
        state.currentMonthIndex = (state.currentMonthIndex + 1) % 12;
    }
    drawCurrentMonth();
}

async function handleDayClick(dia) {
    state.dayInPreview = dia;
    let memories = [];
    try {
        showPreviewLoading(true); // Llamada directa
        memories = await loadMemoriesForDay(dia.id);
        showPreviewLoading(false); // Llamada directa
    } catch (e) {
        showPreviewLoading(false); // Llamada directa
        console.error("Error cargando memorias para preview:", e);
        showAlert(`Error al cargar memorias: ${e.message}`); // Llamada directa
        state.dayInPreview = null;
        return;
    }
    openPreviewModal(dia, memories); // Llamada directa
}

async function handleEditFromPreview() {
    const dia = state.dayInPreview;
    if (!dia) {
        console.error("No hay día guardado en preview para editar.");
        return;
    }

    if (state.currentUser) {
        closePreviewModal(); // Llamada directa
        setTimeout(async () => {
            let memories = [];
            try {
                 showEditLoading(true); // Llamada directa
                 memories = await loadMemoriesForDay(dia.id);
                 showEditLoading(false); // Llamada directa
            } catch (e) {
                 showEditLoading(false); // Llamada directa
                 console.error("Error cargando memorias para edición:", e);
                 showAlert(`Error al cargar memorias: ${e.message}`); // Llamada directa
                 return;
            }
            openEditModal(dia, memories); // Llamada directa
        }, 250);

    } else {
        showAlert("Debes iniciar sesión para poder editar."); // Llamada directa
    }
}


async function handleFooterAction(action) {
    console.log(`handleFooterAction received: ${action}`);
    switch (action) {
        case 'add':
            if (!state.currentUser) {
                showAlert("Debes iniciar sesión para añadir memorias."); // Llamada directa
                return;
            }
            openEditModal(null, []); // Llamada directa
            break;

        case 'store':
            openStoreModal(); // Llamada directa
            break;

        case 'shuffle':
            handleShuffleClick();
            break;

        case 'search':
            const searchTerm = await showPrompt("Buscar en todas las memorias:", '', 'search'); // Llamada directa
            if (!searchTerm || searchTerm.trim() === '') return;
            const term = searchTerm.trim().toLowerCase();
            setLoading(`Buscando "${term}"...`, true); // Llamada directa
            try {
                const results = await searchMemories(term);
                setLoading(null, false); // Llamada directa
                drawCurrentMonth();
                 if (results.length === 0) {
                    updateSpotlight(`No hay resultados para "${term}"`, null, []); // Llamada directa
                } else {
                    results.forEach(mem => {
                        if (!mem.Nombre_Dia) {
                            mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
                        }
                    });
                    updateSpotlight(`Resultados para "${term}" (${results.length})`, null, results); // Llamada directa
                }
            } catch (err) {
                 setLoading(null, false); // Llamada directa
                 drawCurrentMonth();
                 showAlert(`Error al buscar: ${err.message}`); // Llamada directa
            }
            break;

        case 'settings':
            showAlert("Settings\n\nApp Version: 4.20 (Imports)\nMore settings coming soon!", 'settings'); // Llamada directa
            break;

        default:
            console.warn("Acción de footer desconocida:", action);
    }
}

function handleShuffleClick() { /* ... (sin cambios internos) */ }

// --- 3. Lógica de Modales (Controlador) ---
async function handleSaveDayName(diaId, newName, statusElementId = 'save-status') {
    if (!state.currentUser) {
        showModalStatus(statusElementId, `Debes estar logueado`, true); // Llamada directa
        return;
    }
    const finalName = newName && newName.trim() !== '' ? newName.trim() : "Unnamed Day";

    try {
        await saveDayName(diaId, finalName);
        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1) state.allDaysData[dayIndex].Nombre_Especial = finalName;
        showModalStatus(statusElementId, 'Nombre guardado', false); // Llamada directa
        drawCurrentMonth();
        // ... (resto sin cambios, excepto llamadas a ui)
         const editModalTitle = document.getElementById('edit-modal-title');
         if (statusElementId === 'save-status' && state.dayInPreview) {
              const dia = state.dayInPreview;
              const dayName = finalName !== 'Unnamed Day' ? ` (${finalName})` : '';
              if (editModalTitle) editModalTitle.textContent = `Editando: ${dia.Nombre_Dia}${dayName}`;
         }
          const daySelect = document.getElementById('edit-mem-day');
          if (daySelect) {
              const option = daySelect.querySelector(`option[value="${diaId}"]`);
              if (option) {
                  const originalText = state.allDaysData.find(d => d.id === diaId)?.Nombre_Dia || diaId;
                  option.textContent = finalName !== 'Unnamed Day' ? `${originalText} (${finalName})` : originalText;
              }
          }
    } catch (err) {
        console.error("Error guardando nombre:", err);
        showModalStatus(statusElementId, `Error: ${err.message}`, true); // Llamada directa
    }
}

async function handleSaveMemorySubmit(diaId, memoryData, isEditing) {
    if (!state.currentUser) {
        showModalStatus('memoria-status', `Debes estar logueado`, true); // Llamada directa
        return;
    }
    const saveBtn = document.getElementById('save-memoria-btn');
    try {
        // ... (validaciones sin cambios)
        if (!memoryData.year || isNaN(parseInt(memoryData.year))) throw new Error('El año es obligatorio y debe ser un número.');
        const year = parseInt(memoryData.year);
        if (year < 1900 || year > 2100) throw new Error('El año debe estar entre 1900 y 2100.');
        const month = parseInt(diaId.substring(0, 2), 10);
        const day = parseInt(diaId.substring(3, 5), 10);
        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) throw new Error('El ID del día no es válido.');
        const fullDate = new Date(Date.UTC(year, month - 1, day));
        if (fullDate.getUTCDate() !== day || fullDate.getUTCMonth() !== month - 1) throw new Error(`Fecha inválida: ${day}/${month}/${year}.`);
        memoryData.Fecha_Original = fullDate;
        delete memoryData.year;

        if (memoryData.Tipo === 'Imagen' && memoryData.file) {
            if (!state.currentUser.uid) throw new Error("Debes estar logueado para subir imágenes.");
            showModalStatus('image-upload-status', 'Subiendo imagen...', false); // Llamada directa
            memoryData.ImagenURL = await uploadImage(memoryData.file, state.currentUser.uid, diaId);
            showModalStatus('image-upload-status', 'Imagen subida.', false); // Llamada directa
        }

        const memoryId = isEditing ? memoryData.id : null;
        await saveMemory(diaId, memoryData, memoryId);
        showModalStatus('memoria-status', isEditing ? 'Memoria actualizada' : 'Memoria guardada', false); // Llamada directa
        resetMemoryForm(); // Llamada directa

        const updatedMemories = await loadMemoriesForDay(diaId);
        updateMemoryList(updatedMemories); // Llamada directa

        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1 && !state.allDaysData[dayIndex].tieneMemorias) {
            state.allDaysData[dayIndex].tieneMemorias = true;
            drawCurrentMonth();
        }
    } catch (err) {
        console.error("Error guardando memoria:", err);
        showModalStatus('memoria-status', `Error: ${err.message}`, true); // Llamada directa
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
        }
    }
}

async function handleDeleteMemory(diaId, mem) {
    console.log(`handleDeleteMemory called with diaId: ${diaId}, memId: ${mem?.id}`);
    if (!state.currentUser) {
        showModalStatus('memoria-status', `Debes estar logueado`, true); // Llamada directa
        return;
    }
    if (!mem || !mem.id) {
         showModalStatus('memoria-status', `Error: Información de memoria inválida.`, true); // Llamada directa
         console.error("handleDeleteMemory recibió:", mem);
         return;
    }
    if (!diaId) {
         showModalStatus('memoria-status', `Error: ID del día no proporcionado.`, true); // Llamada directa
         console.error("handleDeleteMemory recibió diaId nulo o indefinido");
         return;
    }
    const info = mem.Descripcion || mem.LugarNombre || mem.CancionInfo || 'esta memoria';
    const message = `¿Seguro que quieres borrar "${info.substring(0, 50)}..."?`;
    const confirmed = await showConfirm(message); // Llamada directa
    if (!confirmed) {
        console.log("Borrado cancelado por el usuario.");
        return;
    }
    try {
        const imagenURL = (mem.Tipo === 'Imagen') ? mem.ImagenURL : null;
        await deleteMemory(diaId, mem.id, imagenURL);
        showModalStatus('memoria-status', 'Memoria borrada', false); // Llamada directa
        const updatedMemories = await loadMemoriesForDay(diaId);
        updateMemoryList(updatedMemories); // Llamada directa
        if (updatedMemories.length === 0) {
            const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
            if (dayIndex !== -1) {
                state.allDaysData[dayIndex].tieneMemorias = false;
                drawCurrentMonth();
            }
        }
    } catch (err) {
        console.error("Error borrando memoria:", err);
        showModalStatus('memoria-status', `Error: ${err.message}`, true); // Llamada directa
    }
}

// --- 4. Lógica de API Externa (Controlador) ---
async function handleMusicSearch(term) {
    if (!term || term.trim() === '') return;
    try {
        const results = await searchMusic(term.trim());
        showMusicResults(results); // Llamada directa
    } catch (err) {
        console.error("Error en búsqueda de música:", err);
        showModalStatus('memoria-status', `Error API Música: ${err.message}`, true); // Llamada directa
    }
}

async function handlePlaceSearch(term) {
    if (!term || term.trim() === '') return;
    try {
        const places = await searchNominatim(term.trim());
        showPlaceResults(places); // Llamada directa
    } catch (err) {
        console.error("Error en búsqueda de Nominatim:", err);
        showModalStatus('memoria-status', `Error API Lugares: ${err.message}`, true); // Llamada directa
    }
}


// --- 5. Lógica del "Almacén" (Controlador) ---
async function handleStoreCategoryClick(type) {
    console.log("Cargando Almacén para:", type);
    state.store.currentType = type;
    state.store.lastVisible = null;
    state.store.isLoading = true;
    const title = `Almacén: ${type}`;
    openStoreListModal(title); // Llamada directa
    try {
        let result;
        if (type === 'Nombres') result = await getNamedDays(10);
        else result = await getMemoriesByType(type, 10);

        result.items.forEach(item => {
            if (!item.Nombre_Dia) {
                item.Nombre_Dia = state.allDaysData.find(d => d.id === item.diaId)?.Nombre_Dia || "Día";
            }
        });
        state.store.lastVisible = result.lastVisible;
        state.store.isLoading = false;
        updateStoreList(result.items, false, result.hasMore); // Llamada directa
    } catch (err) {
        console.error(`Error cargando categoría ${type}:`, err);
        updateStoreList([], false, false); // Llamada directa
        if (err.code === 'failed-precondition') {
            console.error("¡ÍNDICE DE FIREBASE REQUERIDO!", err.message);
            showAlert("Error de Firebase: Se requiere un índice. Revisa la consola (F12) para ver el enlace de creación."); // Llamada directa
        } else {
            showAlert(`Error al cargar: ${err.message}`); // Llamada directa
        }
        closeStoreListModal(); // Llamada directa
    }
}

async function handleStoreLoadMore() { /* ... (llamadas directas a ui) */ }
function handleStoreItemClick(diaId) { /* ... (llamadas directas a ui) */ }

// --- 6. Lógica de Crumbie (IA) ---
function handleCrumbieClick() {
    // ... (lógica sin cambios)
    showCrumbieAnimation(msg); // Llamada directa
    console.log("Crumbie clickeado. Listo para IA.");
}


// --- 7. Ejecución Inicial ---
checkAndRunApp();
