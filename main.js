/*
 * main.js (v4.17 - Fixed search and settings buttons)
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
    getNamedDays
} from './store.js';
import { searchiTunes, searchNominatim } from './api.js';
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
    console.log("Iniciando Ephemerides v4.17 (Fixed search and settings buttons)...");

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

        ui.init(getUICallbacks());
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

async function loadTodaySpotlight() {
    try {
        const memories = await getTodaySpotlight();
        const today = new Date();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const dateString = `${today.getDate()} ${monthNames[today.getMonth()]}`;
        const dayData = state.allDaysData.find(d => d.id === state.todayId);
        const dayName = dayData?.Nombre_Especial || null;
        ui.updateSpotlight(dateString, dayName, memories);
    } catch (err) {
        console.error("Error al cargar spotlight:", err);
    }
}

function drawCurrentMonth() {
    const monthIndex = state.currentMonthIndex;
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = monthNames[monthIndex];
    const monthId = (monthIndex + 1).toString().padStart(2, '0');
    const daysInMonth = state.allDaysData.filter(d => d.id.startsWith(monthId));
    ui.drawCalendar(monthName, daysInMonth, state.todayId);
}

// --- 2. Callbacks y Manejadores de Eventos ---

function getUICallbacks() {
    return {
        onLoginClick: handleLoginClick,
        onLogoutClick: handleLogoutClick,
        onMonthChange: handleMonthChange,
        onDayClick: handleDayClick,
        onEditFromPreview: handleEditFromPreview,
        onFooterAction: handleFooterAction,
        onSearchClick: handleSearchClick,
        onSaveDayName: handleSaveDayName,
        onSaveMemory: handleSaveMemorySubmit,
        onDeleteMemory: handleDeleteMemory,
        onMusicSearch: handleMusicSearch,
        onPlaceSearch: handlePlaceSearch,
        onStoreCategoryClick: handleStoreCategoryClick,
        onStoreLoadMore: handleStoreLoadMore,
        onStoreItemClick: handleStoreItemClick,
        onCrumbieClick: handleCrumbieClick
    };
}

function handleLoginClick() {
    console.log("Login click");
    handleLogin();
}

function handleLogoutClick() {
    console.log("Logout click");
    handleLogout();
}

function handleAuthStateChange(user) {
    state.currentUser = user;
    ui.updateLoginUI(user);
    if (user) {
        console.log("Usuario autenticado:", user.email);
    } else {
        console.log("Usuario no autenticado");
    }
}

function handleMonthChange(direction) {
    if (direction === 'prev') {
        state.currentMonthIndex = (state.currentMonthIndex - 1 + 12) % 12;
    } else if (direction === 'next') {
        state.currentMonthIndex = (state.currentMonthIndex + 1) % 12;
    }
    drawCurrentMonth();
}

async function handleDayClick(diaId) {
    console.log("Día clickeado:", diaId);
    const dia = state.allDaysData.find(d => d.id === diaId);
    if (!dia) {
        console.warn("Día no encontrado:", diaId);
        return;
    }

    ui.showPreviewLoading(true);
    ui.openPreviewModal(dia, []);

    try {
        const memories = await loadMemoriesForDay(diaId);
        ui.openPreviewModal(dia, memories);
    } catch (err) {
        console.error("Error cargando memorias:", err);
        ui.showPreviewLoading(false);
    }
}

async function handleEditFromPreview() {
    const dia = state.dayInPreview;
    if (!dia) {
        console.warn("No hay día en preview");
        return;
    }
    ui.closePreviewModal();
    
    ui.showEditLoading(true);
    ui.openEditModal(dia, [], state.allDaysData);

    try {
        const memories = await loadMemoriesForDay(dia.id);
        ui.openEditModal(dia, memories, state.allDaysData);
    } catch (err) {
        console.error("Error cargando memorias para editar:", err);
        ui.showEditLoading(false);
    }
}

async function handleFooterAction(action) {
    console.log("Footer action:", action);

    switch (action) {
        case 'add':
            const today = new Date();
            const todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
            const todayDia = state.allDaysData.find(d => d.id === todayId);
            if (!todayDia) {
                ui.showAlert('No se pudo encontrar el día de hoy.', 'error');
                return;
            }

            ui.showEditLoading(true);
            ui.openEditModal(todayDia, [], state.allDaysData);

            try {
                const memories = await loadMemoriesForDay(todayId);
                ui.openEditModal(todayDia, memories, state.allDaysData);
            } catch (err) {
                console.error("Error cargando memorias:", err);
                ui.showEditLoading(false);
            }
            break;

        case 'store':
            ui.openStoreModal();
            break;

        case 'shuffle':
            handleShuffleClick();
            break;

        case 'settings':
            ui.showAlert('Ajustes estará disponible próximamente.', 'info');
            break;
    }
}

function handleSearchClick() {
    ui.showAlert('La función de búsqueda estará disponible próximamente.', 'info');
}

async function handleShuffleClick() {
    const daysWithMemories = state.allDaysData.filter(d => d.tieneMemorias);
    if (daysWithMemories.length === 0) {
        ui.showAlert('No hay días con memorias aún.', 'info');
        return;
    }

    const randomIndex = Math.floor(Math.random() * daysWithMemories.length);
    const randomDay = daysWithMemories[randomIndex];

    handleDayClick(randomDay.id);
}

// --- 3. Lógica de Modales (Controlador) ---

async function handleSaveDayName(diaId, newName) {
    if (!state.currentUser) {
        ui.showAlert('Debes estar logueado para guardar nombres.', 'error');
        return;
    }

    try {
        await saveDayName(diaId, newName);
        ui.showAlert('Nombre guardado correctamente.', 'success');

        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1) {
            state.allDaysData[dayIndex].Nombre_Especial = newName;
            drawCurrentMonth();
        }

        const nameDayBtn = document.getElementById('name-day-btn-text');
        if (nameDayBtn) {
            nameDayBtn.textContent = newName ? 'Renombrar' : 'Nombrar';
        }

    } catch (err) {
        console.error("Error guardando nombre:", err);
        ui.showAlert(`Error: ${err.message}`, 'error');
    }
}

async function handleSaveMemorySubmit(diaId, memoryData, isEditing) {

    if (!state.currentUser) {
        ui.showModalStatus('memoria-status', `Debes estar logueado`, true);
        return;
    }

    const saveBtn = document.getElementById('save-memoria-btn');

    try {
        if (!memoryData.year || isNaN(parseInt(memoryData.year))) {
            throw new Error('El año es obligatorio y debe ser un número.');
        }
        const year = parseInt(memoryData.year);

        if (year < 1900 || year > 2100) {
             throw new Error('El año debe estar entre 1900 y 2100.');
        }

        const month = parseInt(diaId.substring(0, 2), 10);
        const day = parseInt(diaId.substring(3, 5), 10);

        if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
             throw new Error('El ID del día no es válido para extraer mes/día.');
        }

        const fullDate = new Date(Date.UTC(year, month - 1, day));
        if (fullDate.getUTCDate() !== day || fullDate.getUTCMonth() !== month - 1) {
             throw new Error(`Fecha inválida: El ${day}/${month}/${year} no existe.`);
        }
        memoryData.Fecha_Original = fullDate;
        delete memoryData.year;

        const memoryId = isEditing ? memoryData.id : null;
        await saveMemory(diaId, memoryData, memoryId);

        ui.showModalStatus('memoria-status', isEditing ? 'Memoria actualizada' : 'Memoria guardada', false);

        ui.resetMemoryForm();

        const updatedMemories = await loadMemoriesForDay(diaId);
        ui.updateMemoryList(updatedMemories);

        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1 && !state.allDaysData[dayIndex].tieneMemorias) {
            state.allDaysData[dayIndex].tieneMemorias = true;
            drawCurrentMonth();
        }

    } catch (err) {
        console.error("Error guardando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isEditing ? 'Actualizar Memoria' : 'Añadir Memoria';
        }
    }
}

async function handleDeleteMemory(diaId, mem) {
    if (!state.currentUser) {
        ui.showModalStatus('memoria-status', `Debes estar logueado`, true);
        return;
    }
    if (!mem || !mem.id) {
         ui.showModalStatus('memoria-status', `Error: Información de memoria inválida.`, true);
         console.error("handleDeleteMemory recibió:", mem);
         return;
    }

    const info = mem.Descripcion || mem.LugarNombre || mem.CancionInfo || 'esta memoria';
    const message = `¿Seguro que quieres borrar "${info.substring(0, 50)}..."?`;

    const confirmed = await ui.showConfirm(message);

    if (!confirmed) {
        return;
    }

    try {
        await deleteMemory(diaId, mem.id, null);
        ui.showModalStatus('memoria-status', 'Memoria borrada', false);

        const updatedMemories = await loadMemoriesForDay(diaId);
        ui.updateMemoryList(updatedMemories);

        if (updatedMemories.length === 0) {
            const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
            if (dayIndex !== -1) {
                state.allDaysData[dayIndex].tieneMemorias = false;
                drawCurrentMonth();
            }
        }

    } catch (err) {
        console.error("Error borrando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
    }
}

// --- 4. Lógica de API Externa (Controlador) ---

async function handleMusicSearch(query) {
    if (!query) {
        ui.showModalStatus('memoria-status', 'Escribe algo para buscar.', true);
        return;
    }

    ui.showModalStatus('memoria-status', 'Buscando en iTunes...', false);

    try {
        const tracks = await searchiTunes(query);
        ui.showMusicResults(tracks);
        ui.showModalStatus('memoria-status', '', false);
    } catch (err) {
        console.error("Error buscando música:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
    }
}

async function handlePlaceSearch(query) {
    if (!query) {
        ui.showModalStatus('memoria-status', 'Escribe algo para buscar.', true);
        return;
    }

    ui.showModalStatus('memoria-status', 'Buscando lugares...', false);

    try {
        const places = await searchNominatim(query);
        ui.showPlaceResults(places);
        ui.showModalStatus('memoria-status', '', false);
    } catch (err) {
        console.error("Error buscando lugares:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
    }
}

// --- 5. Lógica del "Almacén" (Controlador) ---

async function handleStoreCategoryClick(type) {
    console.log("Categoría seleccionada:", type);

    const titles = {
        'Nombres': 'Días Nombrados',
        'Musica': 'Música',
        'Lugar': 'Lugares',
        'Texto': 'Notas'
    };

    ui.closeStoreModal();
    ui.openStoreListModal(titles[type] || 'Lista');

    state.store.currentType = type;
    state.store.lastVisible = null;

    try {
        let items = [];

        if (type === 'Nombres') {
            items = await getNamedDays();
            items = items.map(d => ({ ...d, type: 'Nombres' }));
        } else {
            const result = await getMemoriesByType(type, null, 20);
            items = result.items;
            state.store.lastVisible = result.lastVisible;
        }

        ui.updateStoreList(items, false, !!state.store.lastVisible);

    } catch (err) {
        console.error("Error cargando lista:", err);
        ui.showAlert(`Error: ${err.message}`, 'error');
    }
}

async function handleStoreLoadMore() {
    if (state.store.isLoading || !state.store.lastVisible) return;

    state.store.isLoading = true;
    const loadMoreBtn = document.getElementById('btn-store-load-more');
    if (loadMoreBtn) loadMoreBtn.disabled = true;

    try {
        const result = await getMemoriesByType(state.store.currentType, state.store.lastVisible, 20);
        ui.updateStoreList(result.items, true, !!result.lastVisible);
        state.store.lastVisible = result.lastVisible;
    } catch (err) {
        console.error("Error cargando más:", err);
        ui.showAlert(`Error: ${err.message}`, 'error');
    } finally {
        state.store.isLoading = false;
        if (loadMoreBtn) loadMoreBtn.disabled = false;
    }
}

async function handleStoreItemClick(diaId, memId) {
    console.log("Item clickeado:", diaId, memId);
    
    ui.closeStoreListModal();

    const dia = state.allDaysData.find(d => d.id === diaId);
    if (!dia) {
        ui.showAlert('Día no encontrado.', 'error');
        return;
    }

    ui.showPreviewLoading(true);
    ui.openPreviewModal(dia, []);

    try {
        const memories = await loadMemoriesForDay(diaId);
        state.dayInPreview = dia;
        ui.openPreviewModal(dia, memories);
    } catch (err) {
        console.error("Error cargando memorias:", err);
        ui.showPreviewLoading(false);
    }
}

// --- 6. Lógica de Crumbie (IA) ---

function handleCrumbieClick() {
    console.log("Crumbie clicked!");
    
    const messages = [
        "¡Hola! Soy Crumbie 🍪",
        "Todavía estoy aprendiendo...",
        "Pronto podré ayudarte más",
        "¡Gracias por tu paciencia!",
        "Crumbie está trabajando duro 💪"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    ui.showCrumbieAnimation(randomMessage);
}

// --- 7. Ejecución Inicial ---
checkAndRunApp();
