/*
 * ui.js (v3.0 - Pulido Final)
 * Módulo "CORE" de UI. Orquestador.
 */

// --- Importaciones de Módulos ---
import { uiMaps } from './ui-maps.js';
import * as forms from './ui-forms.js'; 
import * as render from './ui-render.js'; 
import * as modals from './ui-modals.js'; 

// --- Variables privadas del módulo (Estado de la UI) ---
let callbacks = {}; 
let _currentDay = null; 
let _currentMemories = []; 
let _allDaysData = []; 
let _isEditingMemory = false; 

// --- Funciones de Inicialización ---

function init(mainCallbacks) {
    console.log("UI Module init (v3.0 - Pulido Final)");
    callbacks = mainCallbacks;

    // Objeto de estado y setters para inyectar en los módulos
    const uiState = {
        getCurrentDay: () => _currentDay,
        setCurrentDay: (val) => { _currentDay = val; },
        getCurrentMemories: () => _currentMemories,
        setCurrentMemories: (val) => { _currentMemories = val; },
        getAllDaysData: () => _allDaysData,
        getIsEditingMemory: () => _isEditingMemory,
        setIsEditingMemory: (val) => { _isEditingMemory = val; }
    };

    // Inyectar dependencias en el módulo de formularios
    forms.initFormModule(callbacks, uiState, {
        showPrompt: modals.showPrompt, 
        showMemoryForm: modals.showMemoryForm 
    });

    // Inyectar dependencias en el módulo de renderizado
    render.initRenderModule(uiState, callbacks, uiMaps);

    // Inyectar dependencias en el módulo de modales
    modals.initModalsModule(callbacks, uiState, uiMaps, forms, render);

    // Bindings del "App Shell"
    _bindHeaderEvents();
    _bindNavEvents();
    _bindFooterEvents();
    _bindLoginEvents();
    _bindGlobalListeners();
    // _bindCrumbieEvents(); // Eliminado
}

// --- Bindings ---
function _bindHeaderEvents() {
    document.getElementById('header-search-btn')?.addEventListener('click', () => {
        if (callbacks.onHeaderAction) callbacks.onHeaderAction('search');
    });
}
function _bindNavEvents() {
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) {
        prevBtn.onclick = () => { if (callbacks.onMonthChange) callbacks.onMonthChange('prev'); };
    }
    if (nextBtn) {
        nextBtn.onclick = () => { if (callbacks.onMonthChange) callbacks.onMonthChange('next'); };
    }
}
function _bindFooterEvents() {
    document.getElementById('btn-add-memory')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('add'); });
    document.getElementById('btn-store')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('store'); });
    document.getElementById('btn-shuffle')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('shuffle'); });
    document.getElementById('btn-settings')?.addEventListener('click', () => { if (callbacks.onFooterAction) callbacks.onFooterAction('settings'); });
}

// Eliminada la función _bindCrumbieEvents()

function _bindLoginEvents() {
    const header = document.querySelector('header');
    header?.addEventListener('click', (e) => {
        const loginBtn = e.target.closest('#login-btn');
        const userInfo = e.target.closest('#user-info');
        if (loginBtn && loginBtn.dataset.action === 'login' && callbacks.onLogin) callbacks.onLogin();
        else if (userInfo && callbacks.onLogout) callbacks.onLogout();
    });
}
function _bindGlobalListeners() {
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-preview')) modals.closePreviewModal();
        if (e.target.classList.contains('modal-edit')) modals.closeEditModal();
        if (e.target.classList.contains('modal-store')) modals.closeStoreModal();
        if (e.target.classList.contains('modal-store-list')) modals.closeStoreListModal();
        if (e.target.classList.contains('modal-search-results')) modals.closeSearchResultsModal();
        if (e.target.classList.contains('modal-alert-prompt')) modals.closeAlertPromptModal(false);
        if (e.target.classList.contains('modal-confirm')) modals.closeConfirmModal(false);
        if (e.target.classList.contains('modal-simple-alert')) modals.closeGenericAlertModal();
    });
}

// --- Funciones Core de UI ---
function setLoading(message, show) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;
    if (show) {
        appContent.innerHTML = `<p class="loading-message">${message}</p>`;
        showApp(false);
    } else {
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
    }
}

function showApp(show) {
    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    if (show) {
        const loading = appContent.querySelector('.loading-message');
        if (loading) loading.remove();
    } else {
        appContent.style.display = 'none';
    }
}


function updateAllDaysData(allDays) {
    if (allDays && allDays.length > 0) {
        _allDaysData = allDays;
    } else {
        console.warn("UI: updateAllDaysData recibió datos vacíos.");
        _allDaysData = [];
    }
}

function updateLoginUI(user) {
    const loginBtnContainer = document.getElementById('login-btn-container');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');

    if (!loginBtnContainer || !userInfo || !userName) return;

    if (user && user.isDrive) {
        // Google Drive conectado
        userInfo.style.display = 'flex';
        userName.textContent = 'Drive';
        
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.style.display = 'none';
        }
    } else {
        // Sin conexión
        userInfo.style.display = 'none';
        
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.style.display = 'block';
            loginBtn.dataset.action = 'login';
        }
    }
}

// --- Funciones de Ayuda (Orquestación) ---

function initSpotlightMaps() {
    const spotlightContainer = document.getElementById('today-memory-spotlight');
    if (spotlightContainer) {
        uiMaps.initMapsInContainer(spotlightContainer, 'spotlight');
    } else {
        console.warn("UI: No se encontró el contenedor del spotlight para inicializar los mapas.");
    }
}

function updateMemoryList(memories) {
    _currentMemories = memories || []; 

    const editList = document.getElementById('edit-memorias-list');
    if (editList) {
        render.renderMemoryList(editList, _currentMemories, true, 'edit');
    }

    const previewList = document.getElementById('preview-memorias-list');
    const previewModalEl = document.getElementById('preview-modal'); 
    if (previewList && previewModalEl && previewModalEl.classList.contains('visible') && _currentDay) {
         uiMaps.destroyMapsInContainer(previewModalEl);
         render.renderMemoryList(previewList, _currentMemories, false, 'preview');
         setTimeout(() => uiMaps.initMapsInContainer(previewList, 'preview'), 10);
    }
}

// Eliminada la función showCrumbieAnimation()

// --- Toast Notification ---
function showToast(message, isError = false) {
    let toast = document.createElement('div');
    toast.className = 'toast-notification';
    if (isError) {
        toast.classList.add('error');
    }
    toast.textContent = message;
    
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('visible');
    }, 10); 

    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => {
            if (toast) toast.remove();
        });
    }, 3000); 
}


// --- Exportaciones Públicas ---
export const ui = {
    // --- Core Functions ---
    init,
    setLoading,
    showApp,
    updateAllDaysData,
    updateLoginUI,
    updateMemoryList,
    initSpotlightMaps, 
    showToast,

    // --- Render Functions (from ui-render.js) ---
    drawCalendar: render.drawCalendar,
    updateSpotlight: render.updateSpotlight,
    renderTimelineView: render.renderTimelineView,
    appendTimelineMonth: render.appendTimelineMonth,
    setTimelineButtonLoading: render.setTimelineButtonLoading,
    updateTimelineButtonVisibility: render.updateTimelineButtonVisibility,
    
    // --- Modal Functions (from ui-modals.js) ---
    openPreviewModal: modals.openPreviewModal,
    closePreviewModal: modals.closePreviewModal,
    showPreviewLoading: modals.showPreviewLoading,
    openEditModal: modals.openEditModal,
    closeEditModal: modals.closeEditModal,
    showEditLoading: modals.showEditLoading,
    openStoreModal: modals.openStoreModal,
    closeStoreModal: modals.closeStoreModal,
    openStoreListModal: modals.openStoreListModal,
    closeStoreListModal: modals.closeStoreListModal,
    openSearchResultsModal: modals.openSearchResultsModal,
    closeSearchResultsModal: modals.closeSearchResultsModal,
    updateStoreList: modals.updateStoreList,
    
    // --- Dialog Functions (from ui-modals.js) ---
    showAlert: modals.showAlert, 
    showErrorAlert: modals.showErrorAlert,
    showPrompt: modals.showPrompt,
    showConfirm: modals.showConfirm,
    showProgressModal: modals.showProgressModal,
    closeProgressModal: modals.closeProgressModal,
    
    // --- Form Functions (from ui-forms.js) ---
    resetMemoryForm: forms.resetMemoryForm,
    fillFormForEdit: forms.fillFormForEdit,
    showMusicResults: forms.showMusicResults,
    showPlaceResults: forms.showPlaceResults,
    showModalStatus: forms.showModalStatus,
    handleMemoryTypeChange: forms.handleMemoryTypeChange,
};
