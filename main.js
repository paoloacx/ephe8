/*
 * main.js (v4.20 - Pasa userId a Store)
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
    console.log("Iniciando Ephemerides v4.20 (Pasa userId a Store)..."); // Cambiado

    try {
        ui.setLoading("Iniciando...", true);
        initFirebase();
        
        ui.init(getUICallbacks(), []); 
        initAuthListener(handleAuthStateChange); 

        ui.setLoading("Autenticando...", true);
        
        await checkAuthState(); 
        
        console.log("Arranque de autenticación completado.");

    } catch (err) {
        console.error("Error crítico durante el arranque:", err);
        if (err.code === 'permission-denied') {
             ui.setLoading(`Error: Permiso denegado por Firestore. Revisa tus reglas de seguridad.`, true);
        } else {
             ui.setLoading(`Error crítico: ${err.message}. Por favor, recarga.`, true);
        }
    }
}

async function initializeUserSession() {
    // CAMBIO: Asegurarse de tener currentUser antes de proceder
    if (!state.currentUser || !state.currentUser.uid) {
        console.error("initializeUserSession llamado sin usuario válido.");
        ui.showApp(false);
        return;
    }
    const userId = state.currentUser.uid;
    
    // Evitar doble carga
    if (state.allDaysData.length > 0) return; 

    try {
        ui.setLoading("Verificando base de datos...", true);
        // CAMBIO: Pasar userId
        await storeCheckAndRun(userId, (message) => ui.setLoading(message, true));
        
        ui.setLoading("Cargando calendario...", true);
        // CAMBIO: Pasar userId
        state.allDaysData = await loadAllDaysData(userId);

        if (state.allDaysData.length === 0 && state.currentUser) {
             // Si sigue vacío después de checkAndRun, puede ser un error raro o
             // que checkAndRun no pudo generar. Mostramos mensaje, pero dejamos la app visible (vacía).
            console.error(`Error: No se cargaron días para ${userId} incluso después de checkAndRunApp.`);
            ui.showAlert("No se pudieron cargar los datos del calendario. Intenta recargar.");
             // No lanzamos error para permitir al usuario interactuar (ej. logout)
        }

        const today = new Date();
        state.todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        ui.updateAllDaysData(state.allDaysData); 

        drawCurrentMonth(); // Dibuja con los datos (posiblemente vacíos si hubo error)
        loadTodaySpotlight(); // Carga spotlight (posiblemente vacío)
        
        ui.showApp(true); 

    } catch (err) {
        console.error("Error crítico durante la inicialización de sesión:", err);
        ui.setLoading(`Error al cargar datos: ${err.message}. Por favor, recarga.`, true);
        ui.showApp(false); 
    }
}

async function loadTodaySpotlight() {
    // CAMBIO: Asegurarse de tener userId
    if (!state.currentUser || !state.currentUser.uid) return;
    const userId = state.currentUser.uid;

    const today = new Date();
    const dateString = `Hoy, ${today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;

    // CAMBIO: Pasar userId
    const spotlightData = await getTodaySpotlight(userId, state.todayId);

    if (spotlightData) {
        spotlightData.memories.forEach(mem => {
            if (!mem.Nombre_Dia) {
                // state.allDaysData puede estar vacío si la carga falló, añadir check
                mem.Nombre_Dia = state.allDaysData.find(d => d.id === mem.diaId)?.Nombre_Dia || "Día";
            }
        });

        const dayName = spotlightData.dayName !== 'Unnamed Day' ? spotlightData.dayName : null;
        ui.updateSpotlight(dateString, dayName, spotlightData.memories);
    }
}

function drawCurrentMonth() {
    // Esta función no necesita userId directamente, usa state.allDaysData
    const monthName = new Date(2024, state.currentMonthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
    const monthNumber = state.currentMonthIndex + 1;

    // Si allDaysData está vacío, diasDelMes estará vacío, drawCalendar mostrará nada (correcto)
    const diasDelMes = state.allDaysData.filter(dia =>
        parseInt(dia.id.substring(0, 2), 10) === monthNumber
    );

    ui.drawCalendar(monthName, diasDelMes, state.todayId);
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
        ui.showAlert(`Error al iniciar sesión: ${error.message}`);
    }
}

async function handleLogoutClick() {
     try {
        await handleLogout();
    } catch (error) {
        console.error("Error en handleLogoutClick:", error);
        ui.showAlert(`Error al cerrar sesión: ${error.message}`);
    }
}

function handleAuthStateChange(user) {
    const previousUser = state.currentUser; // Guardar estado anterior
    state.currentUser = user;
    ui.updateLoginUI(user);
    console.log("Estado de autenticación cambiado:", user ? user.uid : "Logged out");

    if (user) {
        // Solo inicializar si es un usuario NUEVO o si no había datos cargados
        if (!previousUser || state.allDaysData.length === 0) {
            initializeUserSession(); 
        } else {
             // Si el usuario ya estaba logueado (ej. recarga de página),
             // checkAuthState ya habrá disparado esto, no hacer nada extra.
             console.log("Sesión ya inicializada, mostrando app.");
             ui.showApp(true); // Asegurarse de que la app es visible
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
    if (!state.currentUser) return; // No hacer nada si no hay usuario
    if (direction === 'prev') {
        state.currentMonthIndex = (state.currentMonthIndex - 1 + 12) % 12;
    } else {
        state.currentMonthIndex = (state.currentMonthIndex + 1) % 12;
    }
    drawCurrentMonth();
}

async function handleDayClick(dia) {
    // CAMBIO: Verificar usuario
    if (!state.currentUser || !state.currentUser.uid) return;
    const userId = state.currentUser.uid;
    
    state.dayInPreview = dia;
    let memories = [];
    try {
        ui.showPreviewLoading(true);
        // CAMBIO: Pasar userId
        memories = await loadMemoriesForDay(userId, dia.id);
        ui.showPreviewLoading(false);
    } catch (e) {
        ui.showPreviewLoading(false);
        console.error("Error cargando memorias para preview:", e);
        ui.showAlert(`Error al cargar memorias: ${e.message}`);
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

    // CAMBIO: Verificar usuario aquí también
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
             // CAMBIO: Pasar userId
             memories = await loadMemoriesForDay(userId, dia.id);
             ui.showEditLoading(false);
        } catch (e) {
             ui.showEditLoading(false);
             console.error("Error cargando memorias para edición:", e);
             ui.showAlert(`Error al cargar memorias: ${e.message}`);
             return;
        }
        // openEditModal necesita los datos generales (_allDaysData) que ya tiene la UI
        ui.openEditModal(dia, memories); 
    }, 250);
}


async function handleFooterAction(action) {
    // CAMBIO: Mover la comprobación de currentUser al principio para acciones protegidas
    const protectedActions = ['add', 'store', 'shuffle', 'search'];
    if (protectedActions.includes(action) && !state.currentUser) {
         ui.showAlert("Debes iniciar sesión para usar esta función.");
         return;
    }
    // La acción 'settings' no requiere login
    if (action === 'settings') {
         ui.showAlert("Settings\n\nApp Version: 4.20 (User Data)\nMore settings coming soon!", 'settings');
         return;
    }
    
    // Si llegamos aquí y es una acción protegida, tenemos currentUser
    const userId = state.currentUser?.uid; // Puede ser null si es 'settings', pero no entraremos

    switch (action) {
        case 'add':
            ui.openEditModal(null, []); 
            break;

        case 'store':
            ui.openStoreModal();
            break;

        case 'shuffle':
            handleShuffleClick(); // Ya tiene check interno de datos cargados
            break;

        case 'search':
            const searchTerm = await ui.showPrompt("Buscar en todas las memorias:", '', 'search');
            if (!searchTerm || searchTerm.trim() === '') return;

            const term = searchTerm.trim().toLowerCase();
            ui.setLoading(`Buscando "${term}"...`, true);

            try {
                // CAMBIO: Pasar userId
                const results = await searchMemories(userId, term);
                ui.setLoading(null, false);
                drawCurrentMonth(); // Redibujar por si acaso searchMemories fue lento

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
                 drawCurrentMonth();
                 ui.showAlert(`Error al buscar: ${err.message}`);
            }
            break;

        default:
            console.warn("Acción de footer desconocida:", action);
    }
}

function handleShuffleClick() {
    // Ya comprueba state.allDaysData, que solo se llena si hay usuario
    if (state.allDaysData.length === 0) return;

    const randomIndex = Math.floor(Math.random() * state.allDaysData.length);
    const randomDia = state.allDaysData[randomIndex];
    const randomMonthIndex = parseInt(randomDia.id.substring(0, 2), 10) - 1;

    if (state.currentMonthIndex !== randomMonthIndex) {
        state.currentMonthIndex = randomMonthIndex;
        drawCurrentMonth();
    }

    setTimeout(() => {
        handleDayClick(randomDia); // handleDayClick ya verifica usuario
    }, 100);

    window.scrollTo(0, 0);
}


// --- 3. Lógica de Modales (Controlador) ---

async function handleSaveDayName(diaId, newName, statusElementId = 'save-status') {
    // CAMBIO: Verificar usuario
    if (!state.currentUser || !state.currentUser.uid) {
        ui.showModalStatus(statusElementId, `Debes estar logueado`, true);
        return;
    }
    const userId = state.currentUser.uid;
    
    const finalName = newName && newName.trim() !== '' ? newName.trim() : "Unnamed Day";

    try {
        // CAMBIO: Pasar userId
        await saveDayName(userId, diaId, finalName);

        // Actualizar estado local
        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1) {
            state.allDaysData[dayIndex].Nombre_Especial = finalName;
            // No es necesario llamar a ui.updateAllDaysData, modificamos el array directamente
        }

        ui.showModalStatus(statusElementId, 'Nombre guardado', false);
        drawCurrentMonth(); // Redibujar calendario con el posible nuevo dog-ear si aplica

        // Actualizar UI del modal (select o título)
        if (statusElementId === 'save-status' && state.dayInPreview && state.dayInPreview.id === diaId) { 
             const dia = state.dayInPreview; // Usar el día que está en preview/edición
             const dayNameUI = finalName !== 'Unnamed Day' ? ` (${finalName})` : '';
             const editModalTitle = document.getElementById('edit-modal-title');
             if (editModalTitle) editModalTitle.textContent = `Editando: ${dia.Nombre_Dia}${dayNameUI}`;
             // También actualizamos el Nombre_Especial en state.dayInPreview por si acaso
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
    // CAMBIO: Verificar usuario
    if (!state.currentUser || !state.currentUser.uid) {
        ui.showModalStatus('memoria-status', `Debes estar logueado`, true);
        return;
    }
    const userId = state.currentUser.uid;

    const saveBtn = document.getElementById('save-memoria-btn');

    try {
        // ... validaciones de fecha ...
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

        // Lógica de subida de imagen (ya usa userId implícitamente en la ruta)
        if (memoryData.Tipo === 'Imagen' && memoryData.file) {
            ui.showModalStatus('image-upload-status', 'Subiendo imagen...', false);
            memoryData.ImagenURL = await uploadImage(memoryData.file, userId, diaId); // uploadImage necesita userId
            ui.showModalStatus('image-upload-status', 'Imagen subida.', false);
        }

        const memoryId = isEditing ? memoryData.id : null;
        // CAMBIO: Pasar userId
        await saveMemory(userId, diaId, memoryData, memoryId);

        ui.showModalStatus('memoria-status', isEditing ? 'Memoria actualizada' : 'Memoria guardada', false);
        
        ui.resetMemoryForm(); // Esto oculta el form ahora

        // CAMBIO: Pasar userId
        const updatedMemories = await loadMemoriesForDay(userId, diaId);
        ui.updateMemoryList(updatedMemories); 

        // Actualizar estado local del día y redibujar si es necesario
        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1 && !state.allDaysData[dayIndex].tieneMemorias) {
            state.allDaysData[dayIndex].tieneMemorias = true;
            // No llamar a ui.updateAllDaysData, modificar el array directamente
            drawCurrentMonth(); 
        }

    } catch (err) {
        console.error("Error guardando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
        }
    } finally {
        // Asegurarse de reactivar el botón incluso si hay error no capturado
         if (saveBtn && saveBtn.disabled) {
            saveBtn.disabled = false;
            saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
        }
    }
}

async function handleDeleteMemory(diaId, mem) {
    // CAMBIO: Verificar usuario
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
        // CAMBIO: Pasar userId
        await deleteMemory(userId, diaId, mem.id, imagenURL);
        ui.showModalStatus('memoria-status', 'Memoria borrada', false);

        // CAMBIO: Pasar userId
        const updatedMemories = await loadMemoriesForDay(userId, diaId);
        ui.updateMemoryList(updatedMemories); 

        // Actualizar estado local y redibujar si ya no quedan memorias
        if (updatedMemories.length === 0) {
            const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
            if (dayIndex !== -1 && state.allDaysData[dayIndex].tieneMemorias) { // Verificar si tenía antes
                state.allDaysData[dayIndex].tieneMemorias = false;
                // No llamar a ui.updateAllDaysData
                drawCurrentMonth(); 
            }
        }

    } catch (err) {
        console.error("Error borrando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
    }
}

// --- 4. Lógica de API Externa (Controlador) ---
// (No necesitan userId)
async function handleMusicSearch(term) { /* ... sin cambios ... */ }
async function handlePlaceSearch(term) { /* ... sin cambios ... */ }


// --- 5. Lógica del "Almacén" (Controlador) ---
async function handleStoreCategoryClick(type) {
    // Ya tiene check de currentUser al principio de handleFooterAction
    const userId = state.currentUser.uid;
    console.log(`Cargando Almacén para ${type} - Usuario: ${userId}`);

    state.store.currentType = type;
    state.store.lastVisible = null;
    state.store.isLoading = true;

    const title = `Almacén: ${type}`;
    ui.openStoreListModal(title);

    try {
        let result;
        // CAMBIO: Pasar userId
        if (type === 'Nombres') {
            result = await getNamedDays(userId, 10);
        } else {
            result = await getMemoriesByType(userId, type, 10);
        }

        // Asegurarse de que cada item tenga Nombre_Dia (si aplica)
        result.items.forEach(item => {
            if (!item.Nombre_Dia && item.diaId) { // Días nombrados ya tienen Nombre_Dia
                item.Nombre_Dia = state.allDaysData.find(d => d.id === item.diaId)?.Nombre_Dia || "Día";
            }
        });

        state.store.lastVisible = result.lastVisible; // Puede ser null si no hay resultados
        state.store.isLoading = false;

        ui.updateStoreList(result.items, false, result.hasMore);

    } catch (err) {
        console.error(`Error cargando categoría ${type} para ${userId}:`, err);
        ui.updateStoreList([], false, false); // Mostrar lista vacía
        if (err.code === 'failed-precondition' || err.message.includes("index")) { // Firebase a veces cambia el mensaje
            console.error("¡ÍNDICE DE FIREBASE REQUERIDO!", err.message);
            ui.showAlert("Error de Firebase: Se requiere un índice. Revisa la consola (F12) para ver el enlace de creación.");
        } else {
            ui.showAlert(`Error al cargar ${type}: ${err.message}`);
        }
        ui.closeStoreListModal(); // Cerrar si hubo error grave
    }
}

async function handleStoreLoadMore() {
    const { currentType, lastVisible, isLoading } = state.store;
    // CAMBIO: Añadir check de currentUser
    if (isLoading || !currentType || !state.currentUser) return; 
    // lastVisible puede ser null si la primera carga no tuvo resultados, permitir reintentar si no está isLoading

    const userId = state.currentUser.uid;
    console.log(`Cargando más ${currentType} para ${userId}...`);
    state.store.isLoading = true;

    // Actualizar botón en UI
     const loadMoreBtn = document.getElementById('load-more-btn');
     if (loadMoreBtn) {
            loadMoreBtn.disabled = true;
            loadMoreBtn.textContent = 'Cargando...';
     }

    try {
        let result;
        // CAMBIO: Pasar userId y el lastVisible correcto
        if (currentType === 'Nombres') {
            // getNamedDays espera el DocumentSnapshot directamente
            result = await getNamedDays(userId, 10, lastVisible); 
        } else {
            // getMemoriesByType también espera el DocumentSnapshot
            result = await getMemoriesByType(userId, currentType, 10, lastVisible);
        }

        result.items.forEach(item => {
             if (!item.Nombre_Dia && item.diaId) {
                item.Nombre_Dia = state.allDaysData.find(d => d.id === item.diaId)?.Nombre_Dia || "Día";
            }
        });

        state.store.lastVisible = result.lastVisible; // Actualizar con el nuevo último
        state.store.isLoading = false;

        ui.updateStoreList(result.items, true, result.hasMore); // `true` para append

    } catch (err) {
        console.error(`Error cargando más ${currentType} para ${userId}:`, err);
        state.store.isLoading = false;
        if(loadMoreBtn) {
             loadMoreBtn.textContent = "Error al cargar";
             // Podríamos querer reactivarlo después de un tiempo
             setTimeout(() => {
                 if (loadMoreBtn.textContent === "Error al cargar") {
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.textContent = "Cargar más";
                 }
             }, 3000);
        }
         ui.showAlert(`Error al cargar más: ${err.message}`);
    }
}

function handleStoreItemClick(diaId) {
    // Ya tiene check de currentUser al principio de la función que lo llama
    if (!state.currentUser) return;

    const dia = state.allDaysData.find(d => d.id === diaId);
    if (!dia) {
        console.error("No se encontró el día:", diaId);
        return;
    }

    ui.closeStoreListModal();
    ui.closeStoreModal();

    const monthIndex = parseInt(dia.id.substring(0, 2), 10) - 1;
    if (state.currentMonthIndex !== monthIndex) {
        state.currentMonthIndex = monthIndex;
        drawCurrentMonth();
    }

    setTimeout(() => {
        handleDayClick(dia); // handleDayClick ya verifica usuario
    }, 100);

    window.scrollTo(0, 0);
}

// --- 6. Lógica de Crumbie (IA) ---

function handleCrumbieClick() {
     // Ya tiene check de currentUser al principio de handleFooterAction
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
