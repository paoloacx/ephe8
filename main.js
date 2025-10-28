/*
 * main.js (v4.21 - Retrasar setLoading)
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
    console.log("Iniciando Ephemerides v4.21 (Retrasar setLoading)..."); // Cambiado

    try {
        setLoading("Iniciando...", true);
        initFirebase();
        setLoading("Autenticando...", true);
        const user = await checkAuthState();
        console.log("Estado de autenticación inicial resuelto.");
        setLoading("Verificando base de datos...", true);
        await storeCheckAndRun((message) => setLoading(message, true));
        setLoading("Cargando calendario...", true);
        state.allDaysData = await loadAllDaysData();

        if (state.allDaysData.length === 0) {
            console.error("CRITICAL: loadAllDaysData returned empty array.");
            setLoading("Error crítico: No se pudieron cargar los datos.", true);
            return;
        }
        console.log(`Data loaded: ${state.allDaysData.length} days found.`);

        const today = new Date();
        state.todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        uiInit(getUICallbacks(), state.allDaysData);
        initAuthListener(handleAuthStateChange);
        if (user) {
             console.log("Initial user found, calling handleAuthStateChange.");
             handleAuthStateChange(user);
        } else {
             console.log("No initial user found.");
        }


        console.log("Before drawCurrentMonth...");
        setLoading("Dibujando calendario...", true);
        drawCurrentMonth();
        console.log("After drawCurrentMonth call.");

        console.log("Before loadTodaySpotlight call.");
        setLoading("Cargando spotlight...", true);
        await loadTodaySpotlight();
        console.log("After loadTodaySpotlight call.");

        // ***** CAMBIO: Retrasar setLoading(null, false) *****
        setTimeout(() => {
            console.log("Calling setLoading(null, false) after delay."); // DEBUG
            setLoading(null, false); // Clear loading message after a short delay
        }, 100); // 100ms delay
        // **************************************************

    } catch (err) {
        console.error("Error crítico durante el arranque:", err);
        if (err.code === 'permission-denied') {
             setLoading(`Error: Permiso denegado.`, true);
        } else {
             setLoading(`Error crítico: ${err.message}.`, true);
        }
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
            if (!mem.Nombre_Dia && state.allDaysData.length > 0) { // Check allDaysData
                mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
            } else if (!state.allDaysData.length > 0) {
                 console.warn("loadTodaySpotlight: state.allDaysData is empty when trying to find Nombre_Dia"); // DEBUG
            }
        });

        const dayName = spotlightData.dayName !== 'Unnamed Day' ? spotlightData.dayName : null;
        console.log("loadTodaySpotlight: Calling updateSpotlight..."); // DEBUG
        updateSpotlight(dateString, dayName, spotlightData.memories); // Llamada directa
    } else {
         console.warn("loadTodaySpotlight: getTodaySpotlight returned null or undefined."); // DEBUG
         // Still update UI to show nothing
         updateSpotlight(dateString, null, []); // Llamada directa
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

    console.log("drawCurrentMonth: Calling drawCalendar..."); // DEBUG
    drawCalendar(monthName, diasDelMes, state.todayId); // Llamada directa
    console.log("drawCurrentMonth: drawCalendar finished."); // DEBUG
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
        showAlert(`Error al iniciar sesión: ${error.message}`);
    }
}
async function handleLogoutClick() {
     try {
        await handleLogout();
    } catch (error) {
        console.error("Error en handleLogoutClick:", error);
        showAlert(`Error al cerrar sesión: ${error.message}`);
    }
}
function handleAuthStateChange(user) {
    state.currentUser = user;
    updateLoginUI(user);
    console.log("Estado de autenticación cambiado:", user ? user.uid : "Logged out");

    if (!user) {
        closeEditModal();
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
        showPreviewLoading(true);
        memories = await loadMemoriesForDay(dia.id);
        showPreviewLoading(false);
    } catch (e) {
        showPreviewLoading(false);
        console.error("Error cargando memorias para preview:", e);
        showAlert(`Error al cargar memorias: ${e.message}`);
        state.dayInPreview = null;
        return;
    }
    openPreviewModal(dia, memories);
}
async function handleEditFromPreview() {
    const dia = state.dayInPreview;
    if (!dia) {
        console.error("No hay día guardado en preview para editar.");
        return;
    }

    if (state.currentUser) {
        closePreviewModal();
        setTimeout(async () => {
            let memories = [];
            try {
                 showEditLoading(true);
                 memories = await loadMemoriesForDay(dia.id);
                 showEditLoading(false);
            } catch (e) {
                 showEditLoading(false);
                 console.error("Error cargando memorias para edición:", e);
                 showAlert(`Error al cargar memorias: ${e.message}`);
                 return;
            }
            openEditModal(dia, memories);
        }, 250);

    } else {
        showAlert("Debes iniciar sesión para poder editar.");
    }
}
async function handleFooterAction(action) {
    console.log(`handleFooterAction received: ${action}`);
    switch (action) {
        case 'add':
            if (!state.currentUser) {
                showAlert("Debes iniciar sesión para añadir memorias.");
                return;
            }
            openEditModal(null, []);
            break;

        case 'store':
            openStoreModal();
            break;

        case 'shuffle':
            handleShuffleClick();
            break;

        case 'search':
            const searchTerm = await showPrompt("Buscar en todas las memorias:", '', 'search');
            if (!searchTerm || searchTerm.trim() === '') return;
            const term = searchTerm.trim().toLowerCase();
            setLoading(`Buscando "${term}"...`, true);
            try {
                const results = await searchMemories(term);
                setLoading(null, false);
                drawCurrentMonth();
                 if (results.length === 0) {
                    updateSpotlight(`No hay resultados para "${term}"`, null, []);
                } else {
                    results.forEach(mem => {
                        if (!mem.Nombre_Dia) {
                            mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
                        }
                    });
                    updateSpotlight(`Resultados para "${term}" (${results.length})`, null, results);
                }
            } catch (err) {
                 setLoading(null, false);
                 drawCurrentMonth();
                 showAlert(`Error al buscar: ${err.message}`);
            }
            break;

        case 'settings':
            showAlert("Settings\n\nApp Version: 4.21 (Delay)\nMore settings coming soon!", 'settings');
            break;

        default:
            console.warn("Acción de footer desconocida:", action);
    }
}
function handleShuffleClick() {
    if (state.allDaysData.length === 0) return;
    const randomIndex = Math.floor(Math.random() * state.allDaysData.length);
    const randomDia = state.allDaysData[randomIndex];
    const randomMonthIndex = parseInt(randomDia.id.substring(0, 2), 10) - 1;
    if (state.currentMonthIndex !== randomMonthIndex) {
        state.currentMonthIndex = randomMonthIndex;
        drawCurrentMonth();
    }
    setTimeout(() => handleDayClick(randomDia), 100);
    window.scrollTo(0, 0);
}

// --- 3. Lógica de Modales (Controlador) ---
async function handleSaveDayName(diaId, newName, statusElementId = 'save-status') {
    if (!state.currentUser) {
        showModalStatus(statusElementId, `Debes estar logueado`, true);
        return;
    }
    const finalName = newName && newName.trim() !== '' ? newName.trim() : "Unnamed Day";
    try {
        await saveDayName(diaId, finalName);
        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1) state.allDaysData[dayIndex].Nombre_Especial = finalName;
        showModalStatus(statusElementId, 'Nombre guardado', false);
        drawCurrentMonth();
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
        showModalStatus(statusElementId, `Error: ${err.message}`, true);
    }
}
async function handleSaveMemorySubmit(diaId, memoryData, isEditing) {
    if (!state.currentUser) {
        showModalStatus('memoria-status', `Debes estar logueado`, true);
        return;
    }
    const saveBtn = document.getElementById('save-memoria-btn');
    try {
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
            showModalStatus('image-upload-status', 'Subiendo imagen...', false);
            memoryData.ImagenURL = await uploadImage(memoryData.file, state.currentUser.uid, diaId);
            showModalStatus('image-upload-status', 'Imagen subida.', false);
        }
        const memoryId = isEditing ? memoryData.id : null;
        await saveMemory(diaId, memoryData, memoryId);
        showModalStatus('memoria-status', isEditing ? 'Memoria actualizada' : 'Memoria guardada', false);
        resetMemoryForm();
        const updatedMemories = await loadMemoriesForDay(diaId);
        updateMemoryList(updatedMemories);
        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1 && !state.allDaysData[dayIndex].tieneMemorias) {
            state.allDaysData[dayIndex].tieneMemorias = true;
            drawCurrentMonth();
        }
    } catch (err) {
        console.error("Error guardando memoria:", err);
        showModalStatus('memoria-status', `Error: ${err.message}`, true);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
        }
    }
}
async function handleDeleteMemory(diaId, mem) {
    console.log(`handleDeleteMemory called with diaId: ${diaId}, memId: ${mem?.id}`);
    if (!state.currentUser) {
        showModalStatus('memoria-status', `Debes estar logueado`, true);
        return;
    }
    if (!mem || !mem.id) {
         showModalStatus('memoria-status', `Error: Información de memoria inválida.`, true);
         console.error("handleDeleteMemory recibió:", mem);
         return;
    }
    if (!diaId) {
         showModalStatus('memoria-status', `Error: ID del día no proporcionado.`, true);
         console.error("handleDeleteMemory recibió diaId nulo o indefinido");
         return;
    }
    const info = mem.Descripcion || mem.LugarNombre || mem.CancionInfo || 'esta memoria';
    const message = `¿Seguro que quieres borrar "${info.substring(0, 50)}..."?`;
    const confirmed = await showConfirm(message);
    if (!confirmed) {
        console.log("Borrado cancelado por el usuario.");
        return;
    }
    try {
        const imagenURL = (mem.Tipo === 'Imagen') ? mem.ImagenURL : null;
        await deleteMemory(diaId, mem.id, imagenURL);
        showModalStatus('memoria-status', 'Memoria borrada', false);
        const updatedMemories = await loadMemoriesForDay(diaId);
        updateMemoryList(updatedMemories);
        if (updatedMemories.length === 0) {
            const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
            if (dayIndex !== -1) {
                state.allDaysData[dayIndex].tieneMemorias = false;
                drawCurrentMonth();
            }
        }
    } catch (err) {
        console.error("Error borrando memoria:", err);
        showModalStatus('memoria-status', `Error: ${err.message}`, true);
    }
}

// --- 4. Lógica de API Externa (Controlador) ---
async function handleMusicSearch(term) {
    if (!term || term.trim() === '') return;
    try {
        const results = await searchMusic(term.trim());
        showMusicResults(results);
    } catch (err) {
        console.error("Error en búsqueda de música:", err);
        showModalStatus('memoria-status', `Error API Música: ${err.message}`, true);
    }
}
async function handlePlaceSearch(term) {
    if (!term || term.trim() === '') return;
    try {
        const places = await searchNominatim(term.trim());
        showPlaceResults(places);
    } catch (err) {
        console.error("Error en búsqueda de Nominatim:", err);
        showModalStatus('memoria-status', `Error API Lugares: ${err.message}`, true);
    }
}

// --- 5. Lógica del "Almacén" (Controlador) ---
async function handleStoreCategoryClick(type) {
    console.log("Cargando Almacén para:", type);
    state.store.currentType = type;
    state.store.lastVisible = null;
    state.store.isLoading = true;
    const title = `Almacén: ${type}`;
    openStoreListModal(title);
    try {
        let result;
        if (type === 'Nombres') result = await getNamedDays(10);
        else result = await getMemoriesByType(type, 10);
        result.items.forEach(item => {
            if (!item.Nombre_Dia) item.Nombre_Dia = state.allDaysData.find(d => d.id === item.diaId)?.Nombre_Dia || "Día";
        });
        state.store.lastVisible = result.lastVisible;
        state.store.isLoading = false;
        updateStoreList(result.items, false, result.hasMore);
    } catch (err) {
        console.error(`Error cargando categoría ${type}:`, err);
        updateStoreList([], false, false);
        if (err.code === 'failed-precondition') {
            console.error("¡ÍNDICE DE FIREBASE REQUERIDO!", err.message);
            showAlert("Error Firebase: Índice requerido. Revisa consola.");
        } else {
            showAlert(`Error al cargar: ${err.message}`);
        }
        closeStoreListModal();
    }
}
async function handleStoreLoadMore() {
    const { currentType, lastVisible, isLoading } = state.store;
    if (isLoading || !currentType || !lastVisible) return;
    console.log("Cargando más...", currentType);
    state.store.isLoading = true;
    try {
        let result;
        if (currentType === 'Nombres') result = await getNamedDays(10, lastVisible);
        else result = await getMemoriesByType(currentType, 10, lastVisible);
        result.items.forEach(item => {
            if (!item.Nombre_Dia) item.Nombre_Dia = state.allDaysData.find(d => d.id === item.diaId)?.Nombre_Dia || "Día";
        });
        state.store.lastVisible = result.lastVisible;
        state.store.isLoading = false;
        updateStoreList(result.items, true, result.hasMore);
    } catch (err) {
        console.error(`Error cargando más ${currentType}:`, err);
        state.store.isLoading = false;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if(loadMoreBtn) loadMoreBtn.textContent = "Error al cargar";
    }
}
function handleStoreItemClick(diaId) {
    const dia = state.allDaysData.find(d => d.id === diaId);
    if (!dia) {
        console.error("No se encontró el día:", diaId);
        return;
    }
    closeStoreListModal();
    closeStoreModal();
    const monthIndex = parseInt(dia.id.substring(0, 2), 10) - 1;
    if (state.currentMonthIndex !== monthIndex) {
        state.currentMonthIndex = monthIndex;
        drawCurrentMonth();
    }
    setTimeout(() => handleDayClick(dia), 100);
    window.scrollTo(0, 0);
}

// --- 6. Lógica de Crumbie (IA) ---
function handleCrumbieClick() {
    const messages = [
        "¡Hola! ¿Qué buscamos?",
        "Pregúntame sobre tus recuerdos...",
        "¿Cuál es tu canción favorita?",
        "Buscando un día especial..."
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    showCrumbieAnimation(msg);
    console.log("Crumbie clickeado. Listo para IA.");
}

// --- 7. Ejecución Inicial ---
checkAndRunApp();
