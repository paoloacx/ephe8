/*
 * main.js (v2.66 - Cache Implementation)
 * Controlador principal de Ephemerides con sistema de caché híbrido.
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
import { ui } from './ui.js';
import { showSettings } from './settings.js';

// --- Sistema de Caché ---
const CACHE_VERSION = '1.0';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos en milisegundos

class CacheManager {
    constructor() {
        this.memoryCache = new Map(); // Caché en memoria
        this.initLocalStorage();
    }

    initLocalStorage() {
        try {
            const version = localStorage.getItem('cache_version');
            if (version !== CACHE_VERSION) {
                console.log('Nueva versión de caché, limpiando...');
                this.clearAll();
                localStorage.setItem('cache_version', CACHE_VERSION);
            }
        } catch (e) {
            console.warn('localStorage no disponible:', e);
        }
    }

    _getCacheKey(userId, type, id = '') {
        return `cache_${userId}_${type}_${id}`;
    }

    _isExpired(timestamp) {
        return Date.now() - timestamp > CACHE_TTL;
    }

    // Guardar en caché
    set(userId, type, data, id = '') {
        const key = this._getCacheKey(userId, type, id);
        const cacheEntry = {
            data: data,
            timestamp: Date.now(),
            version: CACHE_VERSION
        };

        // Guardar en memoria
        this.memoryCache.set(key, cacheEntry);

        // Intentar guardar en localStorage
        try {
            localStorage.setItem(key, JSON.stringify(cacheEntry));
        } catch (e) {
            console.warn('Error guardando en localStorage:', e);
        }
    }

    // Obtener de caché
    get(userId, type, id = '') {
        const key = this._getCacheKey(userId, type, id);

        // Primero intentar memoria
        let cacheEntry = this.memoryCache.get(key);

        // Si no está en memoria, intentar localStorage
        if (!cacheEntry) {
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    cacheEntry = JSON.parse(stored);
                    // Restaurar en memoria
                    this.memoryCache.set(key, cacheEntry);
                }
            } catch (e) {
                console.warn('Error leyendo de localStorage:', e);
                return null;
            }
        }

        // Verificar si está expirado
        if (cacheEntry && this._isExpired(cacheEntry.timestamp)) {
            this.invalidate(userId, type, id);
            return null;
        }

        return cacheEntry ? cacheEntry.data : null;
    }

    // Invalidar una entrada específica
    invalidate(userId, type, id = '') {
        const key = this._getCacheKey(userId, type, id);
        
        this.memoryCache.delete(key);
        
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('Error eliminando de localStorage:', e);
        }
    }

    // Invalidar por patrón
    invalidatePattern(userId, type) {
        const pattern = `cache_${userId}_${type}_`;
        
        // Limpiar memoria
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(pattern)) {
                this.memoryCache.delete(key);
            }
        }

        // Limpiar localStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(pattern)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Error limpiando patrón de localStorage:', e);
        }
    }

    // Invalidar todo el caché del usuario
    invalidateUser(userId) {
        const pattern = `cache_${userId}_`;
        
        // Limpiar memoria
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(pattern)) {
                this.memoryCache.delete(key);
            }
        }

        // Limpiar localStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(pattern)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Error limpiando usuario de localStorage:', e);
        }
    }

    // Limpiar todo el caché
    clearAll() {
        this.memoryCache.clear();
        
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Error limpiando localStorage:', e);
        }
    }

    // Obtener estadísticas del caché
    getStats() {
        let localStorageCount = 0;
        let localStorageSize = 0;

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    localStorageCount++;
                    const value = localStorage.getItem(key);
                    if (value) {
                        localStorageSize += value.length;
                    }
                }
            }
        } catch (e) {
            console.warn('Error obteniendo stats de localStorage:', e);
        }

        return {
            memoryEntries: this.memoryCache.size,
            localStorageEntries: localStorageCount,
            localStorageSize: `${(localStorageSize / 1024).toFixed(2)} KB`
        };
    }
}

// Instancia global del caché
const cache = new CacheManager();

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
    console.log("Iniciando Ephemerides v2.66 (Cache Implementation)...");

    try {
        ui.setLoading("Iniciando...", true);
        initFirebase();
        
        ui.init(getUICallbacks());
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
        
        // Intentar cargar desde caché
        let cachedDays = cache.get(userId, 'allDays');
        
        if (cachedDays && Array.isArray(cachedDays) && cachedDays.length > 0) {
            console.log('Cargando días desde caché');
            state.allDaysData = cachedDays;
        } else {
            console.log('Cargando días desde Firestore');
            state.allDaysData = await loadAllDaysData(userId);
            
            // Guardar en caché
            if (state.allDaysData.length > 0) {
                cache.set(userId, 'allDays', state.allDaysData);
            }
        }

        if (state.allDaysData.length === 0 && state.currentUser) {
            console.error(`Error: No se cargaron días para ${userId} incluso después de checkAndRunApp.`);
            ui.showAlert("No se pudieron cargar los datos del calendario. Intenta recargar.");
        }

        const today = new Date();
        state.todayId = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

        ui.updateAllDaysData(state.allDaysData);

        drawCurrentMonth(); 
        loadTodaySpotlight(); 
        
        ui.showApp(true);

    } catch (err) {
        console.error("Error crítico durante la inicialización de sesión:", err);
        ui.setLoading(`Error al cargar datos: ${err.message}. Por favor, recarga.`, true);
        ui.showApp(false);
    }
}

async function loadTodaySpotlight() {
    if (!state.currentUser || !state.currentUser.uid) return;
    const userId = state.currentUser.uid;

    const today = new Date();
    const dateString = `Hoy, ${today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;

    // Intentar cargar desde caché
    let spotlightData = cache.get(userId, 'spotlight', state.todayId);

    if (!spotlightData) {
        console.log('Cargando spotlight desde Firestore');
        spotlightData = await getTodaySpotlight(userId, state.todayId);
        
        if (spotlightData) {
            cache.set(userId, 'spotlight', spotlightData, state.todayId);
        }
    } else {
        console.log('Cargando spotlight desde caché');
    }

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

function drawCurrentMonth() {
    const monthName = new Date(2024, state.currentMonthIndex, 1).toLocaleDateString('es-ES', { month: 'long' });
    const monthNumber = state.currentMonthIndex + 1;

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
        // Limpiar caché del usuario al cerrar sesión
        if (previousUser && previousUser.uid) {
            cache.invalidateUser(previousUser.uid);
        }
        
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
    if (direction === 'prev') {
        state.currentMonthIndex = (state.currentMonthIndex - 1 + 12) % 12;
    } else {
        state.currentMonthIndex = (state.currentMonthIndex + 1) % 12;
    }
    drawCurrentMonth();
}

async function handleDayClick(dia) {
    if (!state.currentUser || !state.currentUser.uid) return;
    const userId = state.currentUser.uid;
    
    state.dayInPreview = dia;
    let memories = [];
    
    try {
        ui.showPreviewLoading(true);
        
        // Intentar cargar desde caché
        const cachedMemories = cache.get(userId, 'memories', dia.id);
        
        if (cachedMemories && Array.isArray(cachedMemories)) {
            console.log(`Cargando memorias para ${dia.id} desde caché`);
            memories = cachedMemories;
        } else {
            console.log(`Cargando memorias para ${dia.id} desde Firestore`);
            memories = await loadMemoriesForDay(userId, dia.id);
            
            // Guardar en caché
            cache.set(userId, 'memories', memories, dia.id);
        }
        
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
             
             // Intentar cargar desde caché
             const cachedMemories = cache.get(userId, 'memories', dia.id);
             
             if (cachedMemories && Array.isArray(cachedMemories)) {
                 console.log(`Cargando memorias para edición de ${dia.id} desde caché`);
                 memories = cachedMemories;
             } else {
                 console.log(`Cargando memorias para edición de ${dia.id} desde Firestore`);
                 memories = await loadMemoriesForDay(userId, dia.id);
                 cache.set(userId, 'memories', memories, dia.id);
             }
             
             ui.showEditLoading(false);
        } catch (e) {
             ui.showEditLoading(false);
             console.error("Error cargando memorias para edición:", e);
             ui.showAlert(`Error al cargar memorias: ${e.message}`);
             return;
        }
        ui.openEditModal(dia, memories);
    }, 250);
}


async function handleFooterAction(action) {
    const protectedActions = ['add', 'store', 'shuffle', 'search'];
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

        case 'search':
            const searchTerm = await ui.showPrompt("Buscar en todas las memorias:", '', 'search');
            if (!searchTerm || searchTerm.trim() === '') return;

            const term = searchTerm.trim().toLowerCase();
            ui.setLoading(`Buscando "${term}"...`, true);

            try {
                // La búsqueda no se cachea porque los resultados pueden variar
                const results = await searchMemories(userId, term);
                ui.setLoading(null, false);
                drawCurrentMonth(); 

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
    if (state.allDaysData.length === 0) return;

    const randomIndex = Math.floor(Math.random() * state.allDaysData.length);
    const randomDia = state.allDaysData[randomIndex];
    const randomMonthIndex = parseInt(randomDia.id.substring(0, 2), 10) - 1;

    if (state.currentMonthIndex !== randomMonthIndex) {
        state.currentMonthIndex = randomMonthIndex;
        drawCurrentMonth();
    }

    setTimeout(() => {
        handleDayClick(randomDia); 
    }, 100);

    window.scrollTo(0, 0);
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

        // Invalidar caché relacionado
        cache.invalidate(userId, 'allDays');
        cache.invalidate(userId, 'spotlight', state.todayId);
        
        // Actualizar caché con nuevos datos
        cache.set(userId, 'allDays', state.allDaysData);

        ui.showModalStatus(statusElementId, 'Nombre guardado', false);
        drawCurrentMonth(); 

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

        const memoryId = isEditing ? memoryData.id : null;
        await saveMemory(userId, diaId, memoryData, memoryId);

        // Invalidar caché relacionado
        cache.invalidate(userId, 'memories', diaId);
        cache.invalidate(userId, 'spotlight', state.todayId);
        cache.invalidate(userId, 'allDays');

        ui.showModalStatus('memoria-status', isEditing ? 'Memoria actualizada' : 'Memoria guardada', false);
        
        ui.resetMemoryForm();

        const updatedMemories = await loadMemoriesForDay(userId, diaId);
        
        // Actualizar caché con nuevos datos
        cache.set(userId, 'memories', updatedMemories, diaId);
        
        ui.updateMemoryList(updatedMemories);

        const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
        if (dayIndex !== -1 && !state.allDaysData[dayIndex].tieneMemorias) {
            state.allDaysData[dayIndex].tieneMemorias = true;
            cache.set(userId, 'allDays', state.allDaysData);
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
        
        // Invalidar caché relacionado
        cache.invalidate(userId, 'memories', diaId);
        cache.invalidate(userId, 'spotlight', state.todayId);
        cache.invalidate(userId, 'allDays');
        
        ui.showModalStatus('memoria-status', 'Memoria borrada', false);

        const updatedMemories = await loadMemoriesForDay(userId, diaId);
        
        // Actualizar caché con nuevos datos
        cache.set(userId, 'memories', updatedMemories, diaId);
        
        ui.updateMemoryList(updatedMemories);

        if (updatedMemories.length === 0) {
            const dayIndex = state.allDaysData.findIndex(d => d.id === diaId);
            if (dayIndex !== -1 && state.allDaysData[dayIndex].tieneMemorias) { 
                state.allDaysData[dayIndex].tieneMemorias = false;
                cache.set(userId, 'allDays', state.allDaysData);
                drawCurrentMonth(); 
            }
        }

    } catch (err) {
        console.error("Error borrando memoria:", err);
        ui.showModalStatus('memoria-status', `Error: ${err.message}`, true);
    }
}

// --- 4. Lógica de API Externa (Controlador) ---
async function handleMusicSearch(term) {
    if (!term || term.trim() === '') return;
    try {
        const results = await searchMusic(term);
        ui.showMusicResults(results);
    } catch (error) {
        console.error("Error en handleMusicSearch:", error);
        ui.showModalStatus('memoria-status', `Error al buscar música: ${error.message}`, true);
        ui.showMusicResults([]);
    }
}

async function handlePlaceSearch(term) {
    if (!term || term.trim() === '') return;
    try {
        const results = await searchNominatim(term);
        ui.showPlaceResults(results);
    } catch (error) {
        console.error("Error en handlePlaceSearch:", error);
        ui.showModalStatus('memoria-status', `Error al buscar lugares: ${error.message}`, true);
        ui.showPlaceResults([]);
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
            ui.showAlert("Error de Firebase: Se requiere un índice. Revisa la consola (F12) para ver el enlace de creación.");
        } else {
            ui.showAlert(`Error al cargar ${type}: ${err.message}`);
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
        console.error(`Error cargando más ${currentType} para ${userId}:`, err);
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
         ui.showAlert(`Error al cargar más: ${err.message}`);
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
    if (state.currentMonthIndex !== monthIndex) {
        state.currentMonthIndex = monthIndex;
        drawCurrentMonth();
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


// --- 7. Funciones de utilidad del caché (expuestas para debugging) ---

window.cacheStats = () => {
    const stats = cache.getStats();
    console.log('=== Estadísticas del Caché ===');
    console.log(`Entradas en memoria: ${stats.memoryEntries}`);
    console.log(`Entradas en localStorage: ${stats.localStorageEntries}`);
    console.log(`Tamaño en localStorage: ${stats.localStorageSize}`);
    return stats;
};

window.clearCache = () => {
    cache.clearAll();
    console.log('Caché limpiado completamente');
};


// --- 8. Ejecución Inicial ---
checkAndRunApp();
