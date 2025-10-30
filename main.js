/*
 * main.js (v2.8 - Timeline Completa)
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
    uploadImage,
    getAllMemoriesForTimeline // *** LÍNEA AÑADIDA ***
} from './store.js';
import { searchMusic, searchNominatim } from './api.js';
import { ui } from './ui.js';
// *** CAMBIO: Importar initSettings ***
import { initSettings, showSettings } from './settings.js'; 
// *** NUEVO: Importar loadSetting ***
import { loadSetting } from './utils.js';

// --- Estado Global de la App ---
let state = {
    allDaysData: [],
    currentMonthIndex: new Date().getMonth(),
    currentUser: null,
    todayId: '',
    dayInPreview: null,
    // *** NUEVO: Añadir estado para el modo de vista ***
    currentViewMode: 'calendar', // 'calendar' o 'timeline'
    store: {
        currentType: null,
        lastVisible: null,
        isLoading: false,
    }
};

// --- 1. Inicialización de la App ---

async function checkAndRunApp() {
    console.log("Iniciando Ephemerides v2.8 (Timeline Completa)..."); // Versión actualizada

    try {
        ui.setLoading("Iniciando...", true); 
        initFirebase(); 
        
        ui.init(getUICallbacks()); 
        // *** NUEVO: Inicializar el módulo de settings ***
        initSettings(getUICallbacks()); 
        
        initAuthListener(handleAuthStateChange); 

        ui.setLoading("Autenticando...", true); 
        
        await checkAuthState(); 
        
        console.log("Arranque de autenticación completado.");

    } catch (err) {
        console.error("Error crítico durante el arranque:", err);
        if (err.code === 'permission-denied') {
            ui.showErrorAlert(
                `Error: Permiso denegado por Firestore. Revisa tus reglas de seguridad.`,
                'Error Crítico'
            );
        } else {
            ui.showErrorAlert(
                `Error crítico: ${err.message}. Por favor, recarga la aplicación.`,
                'Error Crítico'
            );
        }
    }
}

async function initializeUserSession() {
    if (!state.currentUser || !state.currentUser.uid) {
        console.error("initializeUserSession llamado sin usuario válido.");
        ui.showApp(false); 
        return;
    }
    const userId = state.currentUser.uid;
    
    if (state.allDaysData.length > 0) return; 

    try {
        ui.setLoading("Verificando base de datos...", true); 
        await storeCheckAndRun(userId, (message) => ui.setLoading(message, true)); 
        
        ui.setLoading("Cargando calendario...", true); 
        state.allDaysData = await loadAllDaysData(userId); 

        if (state.allDaysData.length === 0 && state.currentUser) {
            console.error(`Error: No se cargaron días para ${userId} incluso después de checkAndRunApp.`);
            ui.showErrorAlert("No se pudieron cargar los datos del calendario. Intenta recargar la página.");
        }

        const today = new Date();
        state.todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        // *** NUEVO: Cargar la preferencia de vista del usuario ***
        state.currentViewMode = loadSetting('viewMode', 'calendar');
        console.log("Modo de vista cargado:", state.currentViewMode);

        ui.updateAllDaysData(state.allDaysData); 

        // *** CAMBIO: Usar el nuevo enrutador de vistas ***
        drawMainView();
        
        ui.showApp(true); 

    } catch (err) {
        console.error("Error crítico durante la inicialización de sesión:", err);
        ui.showErrorAlert(
            `Error al cargar datos: ${err.message}. Por favor, recarga la página.`,
            'Error de Carga'
        );
        ui.showApp(false); 
    }
}

async function loadTodaySpotlight() {
    if (!state.currentUser || !state.currentUser.uid) return;
    const userId = state.currentUser.uid;

    const today = new Date();
    const dateString = `Hoy, ${today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;

    const spotlightData = await getTodaySpotlight(userId, state.todayId); 

    if (spotlightData) {
        spotlightData.memories.forEach(mem => {
            if (!mem.Nombre_Dia) {
                mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
            }
        });

        const dayName = spotlightData.dayName !== 'Unnamed Day' ? spotlightData.dayName : null;
        ui.updateSpotlight(dateString, dayName, spotlightData.memories); 
    }
}

// *** CAMBIO: Renombrada de drawCurrentMonth a drawCalendarView ***
function drawCalendarView() {
    const monthName = new Date(2024, state.currentMonthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
    const monthNumber = state.currentMonthIndex + 1;

    const diasDelMes = state.allDaysData.filter(dia =>
        parseInt(dia.id.substring(0, 2), 10) === monthNumber
    );

    ui.drawCalendar(monthName, diasDelMes, state.todayId); 
}

// *** CAMBIO: Lógica de renderizado real para Timeline ***
async function drawTimelineView() {
    console.log("Dibujando la vista de Timeline...");
    if (!state.currentUser || !state.currentUser.uid) return;
    const userId = state.currentUser.uid;

    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    
    // Mostrar carga específica para el timeline
    appContent.innerHTML = `<p class="loading-message" style="color: white; text-shadow: 0 1px 1px #000;">Cargando Timeline...</p>`;
    appContent.style.display = 'block';

    try {
        // 1. Obtener los datos de store.js
        const timelineData = await getAllMemoriesForTimeline(userId);

        // 2. Renderizar los datos con ui.js (que llama a ui-render.js)
        ui.renderTimelineView(timelineData);

    } catch (err) {
        console.error("Error al dibujar el Timeline:", err);
        ui.showErrorAlert(`No se pudo cargar el Timeline: ${err.message}`, "Error de Vista");
        // Dejar el placeholder de error
        appContent.innerHTML = `<p class="timeline-empty-placeholder">Error al cargar el Timeline.</p>`;
    }
}

// *** NUEVO: Enrutador de vistas ***
/**
 * Dibuja la vista principal (Calendario o Timeline) según el estado.
 * También gestiona la visibilidad del spotlight y la nav. del mes.
 */
function drawMainView() {
    const monthNav = document.querySelector('.month-nav');
    const spotlight = document.getElementById('spotlight-section');

    if (state.currentViewMode === 'timeline') {
        if (monthNav) monthNav.style.display = 'none';
        if (spotlight) spotlight.style.display = 'none';
        drawTimelineView();
    } else {
        // Modo Calendario (default)
        if (monthNav) monthNav.style.display = 'flex';
        if (spotlight) spotlight.style.display = 'block';
        drawCalendarView(); 
        loadTodaySpotlight(); // El Spotlight solo se carga en la vista de calendario
    }
}

// --- 2. Callbacks y Manejadores de Eventos ---

function getUICallbacks() {
    return {
        onMonthChange: handleMonthChange,
        onDayClick: handleDayClick,
        onHeaderAction: handleHeaderAction,
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
        // *** NUEVO: Callback para el conmutador de vista ***
        onViewModeChange: handleViewModeChange, 
    };
}

// --- Manejadores de Autenticación ---

async function handleLoginClick() {
    try {
        await handleLogin(); 
    } catch (error) {
        console.error("Error en handleLoginClick:", error);
        ui.showErrorAlert(`Error al iniciar sesión: ${error.message}`, 'Error de Inicio de Sesión');
    }
}

async function handleLogoutClick() {
     try {
        await handleLogout(); 
    } catch (error) {
        console.error("Error en handleLogoutClick:", error);
        ui.showErrorAlert(`Error al cerrar sesión: ${error.message}`, 'Error al Cerrar Sesión');
    }
}

function handleAuthStateChange(user) {
    const previousUser = state.currentUser; 
    state.currentUser = user;
    ui.updateLoginUI(user); 
    console.log("Estado de autenticación cambiado:", user ? user.uid : "Logged out");

    if (user) {
        if (!previousUser || state.allDaysData.length === 0) {
            initializeUserSession(); 
        } else {
             console.log("Sesión ya inicializada, mostrando app.");
             ui.showApp(true); 
        }
    } else {
        ui.showApp(false); 
        state.allDaysData = []; 
        ui.updateAllDaysData([]); 
        ui.closeEditModal(); 
        ui.closePreviewModal(); 
    }
}

// --- Manejadores de UI ---

function handleMonthChange(direction) {
    if (!state.currentUser) return; 
    
    // *** CAMBIO: La nav. de mes solo funciona en vista calendario ***
    if (state.currentViewMode !== 'calendar') return; 

    if (direction === 'prev') {
        state.currentMonthIndex = (state.currentMonthIndex - 1 + 12) % 12;
    } else {
        state.currentMonthIndex = (state.currentMonthIndex + 1) % 12;
    }
    // *** CAMBIO: Llamar al enrutador de vistas ***
    drawMainView();
}

async function handleDayClick(dia) {
    if (!state.currentUser || !state.currentUser.uid) return;
    const userId = state.currentUser.uid;
    
    state.dayInPreview = dia;
    let memories = [];
    try {
        ui.showPreviewLoading(true); 
        memories = await loadMemoriesForDay(userId, dia.id); 
        ui.showPreviewLoading(false); 
    } catch (e) {
        ui.showPreviewLoading(false); 
        console.error("Error cargando memorias para preview:", e);
        ui.showErrorAlert(`Error al cargar memorias: ${e.message}`, 'Error de Carga');
        state.dayInPreview = null;
        return;
    }
    ui.openPreviewModal(dia, memories); 
}

async function handleEditFromPreview() {
    const dia = state.dayInPreview;
    if (!dia) {
        console.error("No hay día guardado en preview para editar.");
        return;
    }

    if (!state.currentUser || !state.currentUser.uid) {
        ui.showAlert("Debes iniciar sesión para poder editar."); 
        return;
    }
    const userId = state.currentUser.uid;

    ui.closePreviewModal(); 
    setTimeout(async () => {
        let memories = [];
        try {
             ui.showEditLoading(true); 
             memories = await loadMemoriesForDay(userId, dia.id); 
             ui.showEditLoading(false); 
        } catch (e) {
             ui.showEditLoading(false); 
             console.error("Error cargando memorias para edición:", e);
             ui.showErrorAlert(`Error al cargar memorias: ${e.message}`, 'Error de Carga');
             return;
        }
        ui.openEditModal(dia, memories); 
    }, 250);
}

async function handleHeaderAction(action) {
    if (!state.currentUser) {
        ui.showAlert("Debes iniciar sesión para usar esta función."); 
        return;
    }

    const userId = state.currentUser.uid;

    if (action === 'search') {
        const searchTerm = await ui.showPrompt("Buscar en todas las memorias:", '', 'search'); 
        if (!searchTerm || searchTerm.trim() === '') return;

        const term = searchTerm.trim().toLowerCase();
        ui.setLoading(`Buscando "${term}"...`, true); 

        try {
            const results = await searchMemories(userId, term); 
            ui.setLoading(null, false); 
            
            // *** CAMBIO: Llamar al enrutador de vistas ***
            drawMainView(); 

            results.forEach(mem => {
                if (!mem.Nombre_Dia) {
                    mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
                }
            });

            ui.openSearchResultsModal(term, results); 

        } catch (err) {
             ui.setLoading(null, false); 
             // *** CAMBIO: Llamar al enrutador de vistas ***
             drawMainView();
             ui.showErrorAlert(`Error al buscar: ${err.message}`, 'Error de Búsqueda');
        }
    }
}

async function handleFooterAction(action) {
    const protectedActions = ['add', 'store', 'shuffle'];
    if (protectedActions.includes(action) && !state.currentUser) {
         ui.showAlert("Debes iniciar sesión para usar esta función."); 
         return;
    }

    if (action === 'settings') {
         showSettings(); 
         return;
    }
    
    const userId = state.currentUser?.uid; 

    switch (action) {
        case 'add':
            ui.openEditModal(null, []); 
            break;

        case 'store':
            ui.openStoreModal(); 
            break;

        case 'shuffle':
            handleShuffleClick(); 
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

    if (state.currentViewMode === 'calendar' && state.currentMonthIndex !== randomMonthIndex) {
        state.currentMonthIndex = randomMonthIndex;
        // *** CAMBIO: Llamar al enrutador de vistas ***
        drawMainView();
    } else if (state.currentViewMode === 'timeline') {
        // En modo timeline, no cambiamos de mes, solo abrimos el día
    }

    setTimeout(() => {
        handleDayClick(randomDia); 
    }, 100);

    window.scrollTo(0, 0);
}

// *** NUEVO: Handler para el conmutador de vista ***
/**
 * Se llama desde settings.js cuando el usuario cambia el conmutador de vista.
 * @param {string} newViewMode - 'calendar' o 'timeline'
 */
function handleViewModeChange(newViewMode) {
    if (state.currentViewMode === newViewMode) return; // Sin cambios

    console.log("Cambiando modo de vista a:", newViewMode);
    state.currentViewMode = newViewMode;

    // Volver al mes actual si cambiamos a calendario
    if (newViewMode === 'calendar') {
        state.currentMonthIndex = new Date().getMonth();
    }

    drawMainView();
}


// --- 3. Lógica de Modales (Controlador) ---

async function handleSaveDayName(diaId, newName, statusElementId = 'save-status') {
    if (!state.currentUser || !state.currentUser.uid) {
        ui.showModalStatus(statusElementId, `Debes estar logueado`, true); 
        return;
    }
    const userId = state.currentUser.uid;
    
    const finalName = newName && newName.trim() !== '' ? newName.trim() : "Unnamed Day";

    try {
        await saveDayName(userId, diaId, finalName); 

        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1) {
            state.allDaysData[dayIndex].Nombre_Especial = finalName;
        }

        ui.showModalStatus(statusElementId, 'Nombre guardado', false); 
        
        // *** CAMBIO: Llamar al enrutador de vistas ***
        drawMainView(); 

        if (statusElementId === 'save-status' && state.dayInPreview && state.dayInPreview.id === diaId) { 
             const dia = state.dayInPreview; 
             const dayNameUI = finalName !== 'Unnamed Day' ? ` (${finalName})` : '';
             const editModalTitle = document.getElementById('edit-modal-title');
             if (editModalTitle) editModalTitle.textContent = `Editando: ${dia.Nombre_Dia}${dayNameUI}`;
             state.dayInPreview.Nombre_Especial = finalName;
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
        ui.showModalStatus(statusElementId, `Error: ${err.message}`, true); 
    }
}


async function handleSaveMemorySubmit(diaId, memoryData, isEditing) {
    if (!state.currentUser || !state.currentUser.uid) {
        ui.showModalStatus('memoria-status', `Debes estar logueado`, true); 
        return;
    }
    const userId = state.currentUser.uid;

    const saveBtn = document.getElementById('save-memoria-btn'); 

    try {
        // ... (Validación de fecha, etc. - sin cambios)
        if (!memoryData.year || isNaN(parseInt(memoryData.year))) throw new Error('El año es obligatorio.');
        const year = parseInt(memoryData.year);
        if (year < 1900 || year > 2100) throw new Error('Año debe estar entre 1900-2100.');
        const month = parseInt(diaId.substring(0, 2), 10);
        const day = parseInt(diaId.substring(3, 5), 10);
        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) throw new Error('ID día inválido.');
        const fullDate = new Date(Date.UTC(year, month - 1, day));
        if (fullDate.getUTCDate() !== day || fullDate.getUTCMonth() !== month - 1) throw new Error(`Fecha inválida: ${day}/${month}/${year}.`);
        memoryData.Fecha_Original = fullDate;
        delete memoryData.year;

        if (memoryData.Tipo === 'Imagen' && memoryData.file) { 
            ui.showModalStatus('image-upload-status', 'Subiendo imagen...', false); 
            memoryData.ImagenURL = await uploadImage(memoryData.file, userId, diaId); 
            ui.showModalStatus('image-upload-status', 'Imagen subida.', false); 
        }
        // ... (Fin validación)

        const memoryId = isEditing ? memoryData.id : null;
        await saveMemory(userId, diaId, memoryData, memoryId); 

        ui.showModalStatus('memoria-status', isEditing ? 'Memoria actualizada' : 'Memoria guardada', false); 
        
        ui.resetMemoryForm(); 

        const updatedMemories = await loadMemoriesForDay(userId, diaId); 
        ui.updateMemoryList(updatedMemories); 

        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1 && !state.allDaysData[dayIndex].tieneMemorias) {
            state.allDaysData[dayIndex].tieneMemorias = true;
            // *** CAMBIO: Llamar al enrutador de vistas ***
            drawMainView(); 
        }

    } catch (err) {
        console.error("Error guardando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true); 
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
        }
    } finally {
         if (saveBtn && saveBtn.disabled) {
             saveBtn.disabled = false;
             saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
         }
    }
}

async function handleDeleteMemory(diaId, mem) {
    if (!state.currentUser || !state.currentUser.uid) {
        ui.showModalStatus('memoria-status', `Debes estar logueado`, true); 
        return;
    }
    const userId = state.currentUser.uid;
    
    if (!mem || !mem.id) {
         ui.showModalStatus('memoria-status', `Error: Información de memoria inválida.`, true); 
         return;
    }

    const info = mem.Descripcion || mem.LugarNombre || mem.CancionInfo || 'esta memoria';
    const message = `¿Seguro que quieres borrar "${info.substring(0, 50)}..."?`;

    const confirmed = await ui.showConfirm(message); 
    if (!confirmed) return;

    try {
        const imagenURL = (mem.Tipo === 'Imagen') ? mem.ImagenURL : null;
        await deleteMemory(userId, diaId, mem.id, imagenURL); 
        ui.showModalStatus('memoria-status', 'Memoria borrada', false); 

        const updatedMemories = await loadMemoriesForDay(userId, diaId); 
        ui.updateMemoryList(updatedMemories); 

        if (updatedMemories.length === 0) {
            const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
            if (dayIndex !== -1 && state.allDaysData[dayIndex].tieneMemorias) { 
                state.allDaysData[dayIndex].tieneMemorias = false;
                // *** CAMBIO: Llamar al enrutador de vistas ***
                drawMainView(); 
            }
        }

    } catch (err) {
        console.error("Error borrando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true); 
    }
}

// --- 4. Lógica de API Externa (Controlador) ---

async function handleMusicSearch(term, resultsCallback) {
    if (!term || term.trim() === '') return;
    
    if (typeof resultsCallback !== 'function') {
        console.error("handleMusicSearch: resultsCallback no es una función.");
        return;
    }

    try {
        const results = await searchMusic(term); 
        
        if (results === null) {
            throw new Error('No se pudo conectar al servicio de música. Revisa tu conexión.');
        }
        
        resultsCallback(results); 
    } catch (error) {
        console.error("Error en handleMusicSearch:", error);
        ui.showModalStatus('memoria-status', `Error al buscar música: ${error.message}`, true); 
        resultsCallback([]); 
    }
}

async function handlePlaceSearch(term, resultsCallback) {
    if (!term || term.trim() === '') return;

    if (typeof resultsCallback !== 'function') {
        console.error("handlePlaceSearch: resultsCallback no es una función.");
        return;
    }

    try {
        const results = await searchNominatim(term); 

        if (results === null) {
            throw new Error('No se pudo conectar al servicio de mapas. Revisa tu conexión.');
        }

        resultsCallback(results); 
    } catch (error) {
        console.error("Error en handlePlaceSearch:", error);
        ui.showModalStatus('memoria-status', `Error al buscar lugares: ${error.message}`, true); 
        resultsCallback([]); 
    }
}

// --- 5. Lógica del "Almacén" (Controlador) ---
async function handleStoreCategoryClick(type) {
    const userId = state.currentUser.uid;
    console.log(`Cargando Almacén para ${type} - Usuario: ${userId}`);

    state.store.currentType = type;
    state.store.lastVisible = null;
    state.store.isLoading = true;

    const title = `Almacén: ${type}`;
    ui.openStoreListModal(title); 

    try {
        let result;
        if (type === 'Nombres') {
            result = await getNamedDays(userId, 10); 
        } else {
            result = await getMemoriesByType(userId, type, 10); 
        }

        result.items.forEach(item => {
            if (!item.Nombre_Dia && item.diaId) { 
                item.Nombre_Dia = state.allDaysData.find(d => d.id === item.diaId)?.Nombre_Dia || "Día";
            }
        });

        state.store.lastVisible = result.lastVisible; 
        state.store.isLoading = false;

        ui.updateStoreList(result.items, false, result.hasMore); 

    } catch (err) {
        console.error(`Error cargando categoría ${type} para ${userId}:`, err);
        ui.updateStoreList([], false, false); 
        if (err.code === 'failed-precondition' || err.message.includes("index")) { 
            console.error("¡ÍNDICE DE FIREBASE REQUERIDO!", err.message);
            ui.showErrorAlert(
                "Error de Firebase: Se requiere un índice. Revisa la consola (F12) para ver el enlace de creación.",
                "Error de Base de Datos"
            );
        } else {
            ui.showErrorAlert(`Error al cargar ${type}: ${err.message}`, 'Error de Almacén');
        }
        ui.closeStoreListModal(); 
    }
}

async function handleStoreLoadMore() {
    const { currentType, lastVisible, isLoading } = state.store;
    if (isLoading || !currentType || !state.currentUser) return; 

    const userId = state.currentUser.uid;
    console.log(`Cargando más ${currentType} para ${userId}...`);
    state.store.isLoading = true;

     const loadMoreBtn = document.getElementById('load-more-btn'); 
     if (loadMoreBtn) {
         loadMoreBtn.disabled = true;
         loadMoreBtn.textContent = 'Cargando...';
     }

    try {
        let result;
        if (currentType === 'Nombres') {
            result = await getNamedDays(userId, 10, lastVisible); 
        } else {
            result = await getMemoriesByType(userId, currentType, 10, lastVisible); 
        }

        result.items.forEach(item => {
             if (!item.Nombre_Dia && item.diaId) {
                 item.Nombre_Dia = state.allDaysData.find(d => d.id === item.diaId)?.Nombre_Dia || "Día";
            }
        });

        state.store.lastVisible = result.lastVisible; 
        state.store.isLoading = false;

        ui.updateStoreList(result.items, true, result.hasMore); 

    } catch (err) {
        console.error(`Error cargando más ${type} para ${userId}:`, err);
        state.store.isLoading = false;
        if(loadMoreBtn) {
             loadMoreBtn.textContent = "Error al cargar";
             setTimeout(() => {
                 if (loadMoreBtn.textContent === "Error al cargar") {
                     loadMoreBtn.disabled = false;
                     loadMoreBtn.textContent = "Cargar más";
                 }
             }, 3000);
        }
         ui.showErrorAlert(`Error al cargar más: ${err.message}`, 'Error de Almacén');
    }
}

function handleStoreItemClick(diaId) {
    if (!state.currentUser) return;

    const dia = state.allDaysData.find(d => d.id === diaId);
    if (!dia) {
        console.error("No se encontró el día:", diaId);
        return;
    }

    ui.closeStoreListModal(); 
    ui.closeStoreModal(); 

    const monthIndex = parseInt(dia.id.substring(0, 2), 10) - 1;
    if (state.currentViewMode === 'calendar' && state.currentMonthIndex !== monthIndex) {
        state.currentMonthIndex = monthIndex;
        // *** CAMBIO: Llamar al enrutador de vistas ***
        drawMainView();
    } else if (state.currentViewMode === 'timeline') {
        // En modo timeline, no cambiamos de mes, solo cerramos modales
    }


    setTimeout(() => {
        handleDayClick(dia); 
    }, 100);

    window.scrollTo(0, 0);
}

// --- 6. Lógica de Crumbie (IA) ---

function handleCrumbieClick() {
     if (!state.currentUser) {
         ui.showAlert("Debes iniciar sesión para usar Crumbie."); 
         return;
    }
    const messages = [
        "¡Hola! ¿Qué buscamos?",
        "Pregúntame sobre tus recuerdos...",
        "¿Cuál es tu canción favorita?",
        "Buscando un día especial..."
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    
    ui.showCrumbieAnimation(msg); 
    
    console.log("Crumbie clickeado. Listo para IA.");
}


// --- 7. Ejecución Inicial ---
checkAndRunApp();
