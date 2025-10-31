/* 
 * firebase.js (v5.0 - Opcional)
 * Firebase se inicializa solo si se necesita para backups/sync
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBrd-8qaBfSplBjj74MNuKP8UWYmr8RaJA",
  authDomain: "ephemerides-2005.firebaseapp.com",
  projectId: "ephemerides-2005",
  storageBucket: "ephemerides-2005.appspot.com", 
  messagingSenderId: "360961314777",
  appId: "1:360961314777:web:809d9e66535acb292d13c8",
  measurementId: "G-BZC9FRYCJW"
};

// --- Inicialización Lazy ---
let app = null;
let db = null;
let auth = null;
let storage = null;
let initialized = false;

/**
 * Inicializa Firebase solo cuando se necesita
 */
export function initFirebase() {
    if (initialized) {
        console.log("Firebase ya inicializado");
        return true;
    }
    
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        storage = getStorage(app);
        initialized = true;
        
        console.log("Firebase inicializado correctamente (modo opcional)");
        return true;
    } catch (e) {
        console.error("Error inicializando Firebase:", e);
        return false;
    }
}

/**
 * Verifica si Firebase está disponible
 */
export function isFirebaseAvailable() {
    return initialized;
}

// Exportaciones
export { db, auth, storage };
