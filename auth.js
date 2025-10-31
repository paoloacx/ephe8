/*
 * auth.js (v5.0 - Firebase Opcional)
 * Autenticación opcional para backups en Firebase
 */

// Firebase se importa dinámicamente solo si se necesita
let auth = null;
let GoogleAuthProvider = null;
let signInWithPopup = null;
let signOut = null;
let onAuthStateChanged = null;

let authChangeCallback = null;
let isFirebaseAvailable = false;

/**
 * Inicializa Firebase Auth solo si está disponible
 */
async function initializeFirebaseAuth() {
    try {
        const { auth: fbAuth } = await import('./firebase.js');
        const authModule = await import('https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js');
        
        auth = fbAuth;
        GoogleAuthProvider = authModule.GoogleAuthProvider;
        signInWithPopup = authModule.signInWithPopup;
        signOut = authModule.signOut;
        onAuthStateChanged = authModule.onAuthStateChanged;
        
        isFirebaseAvailable = true;
        console.log('Firebase Auth inicializado (opcional)');
        
        return true;
    } catch (error) {
        console.log('Firebase Auth no disponible (modo local):', error);
        isFirebaseAvailable = false;
        return false;
    }
}

/**
 * Inicializa el listener de cambio de estado de autenticación.
 * Ahora es opcional - si Firebase no está disponible, no hace nada.
 */
export function initAuthListener(onAuthChangeCallback) {
    authChangeCallback = onAuthChangeCallback;
    
    if (!isFirebaseAvailable) {
        // En modo local, no hay usuario
        if (authChangeCallback) {
            authChangeCallback(null);
        }
        return;
    }
    
    if (onAuthStateChanged && auth) {
        onAuthStateChanged(auth, authChangeCallback);
    }
}

/**
 * Verifica el estado inicial de autenticación
 * En modo local, siempre devuelve null inmediatamente
 */
export function checkAuthState() {
    return new Promise(async (resolve) => {
        // Intentar inicializar Firebase si no se ha hecho
        if (!isFirebaseAvailable && auth === null) {
            await initializeFirebaseAuth();
        }
        
        if (!isFirebaseAvailable) {
            // Modo local - sin usuario
            if (authChangeCallback) {
                authChangeCallback(null);
            }
            resolve(null);
            return;
        }
        
        // Firebase disponible - verificar estado
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (authChangeCallback) {
                authChangeCallback(user);
            }
            resolve(user);
        }, (error) => {
            console.error('Error en checkAuthState:', error);
            resolve(null);
        });
    });
}

/**
 * Inicia el proceso de login con Google (solo si Firebase está disponible)
 */
export async function handleLogin() {
    if (!isFirebaseAvailable) {
        // Intentar inicializar Firebase primero
        const initialized = await initializeFirebaseAuth();
        if (!initialized) {
            throw new Error('Firebase no está disponible. No se puede iniciar sesión.');
        }
    }
    
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Google Sign-In Error:', error);
        throw error;
    }
}

/**
 * Cierra la sesión del usuario (solo si Firebase está disponible)
 */
export async function handleLogout() {
    if (!isFirebaseAvailable || !auth) {
        throw new Error('No hay sesión activa para cerrar.');
    }
    
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Sign-out Error:', error);
        throw error;
    }
}

/**
 * Verifica si Firebase Auth está disponible
 */
export function isAuthAvailable() {
    return isFirebaseAvailable;
}
