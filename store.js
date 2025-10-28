/*
 * store.js (v4.11 - Datos por Usuario)
 * Módulo de Lógica de Firestore y Storage.
 */

import { db, storage } from './firebase.js';
import {
    collection, getDocs, doc, updateDoc,
    writeBatch, setDoc, deleteDoc, Timestamp, query,
    orderBy, addDoc, getDoc, limit, collectionGroup,
    where, startAfter, documentId
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// --- Constantes ---
const USERS_COLLECTION = "Users"; // NUEVO
const DIAS_COLLECTION = "Dias";
const MEMORIAS_COLLECTION = "Memorias";
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- Helper para obtener referencias por usuario ---
function getUserDaysRef(userId) {
    return collection(db, USERS_COLLECTION, userId, DIAS_COLLECTION);
}
function getUserDayRef(userId, diaId) {
    return doc(db, USERS_COLLECTION, userId, DIAS_COLLECTION, diaId);
}
function getUserMemoriesRef(userId, diaId) {
    return collection(db, USERS_COLLECTION, userId, DIAS_COLLECTION, diaId, MEMORIAS_COLLECTION);
}
function getUserMemoryRef(userId, diaId, memId) {
    return doc(db, USERS_COLLECTION, userId, DIAS_COLLECTION, diaId, MEMORIAS_COLLECTION, memId);
}
// --- Fin Helpers ---


// --- 1. Lógica de Inicialización (Check/Repair) ---

// CAMBIO: Ahora necesita userId
async function checkAndRunApp(userId, onProgress) {
    if (!userId) throw new Error("checkAndRunApp requiere un userId.");
    console.log(`Store: Verificando base de datos para usuario ${userId}...`);
    const userDiasRef = getUserDaysRef(userId); // CAMBIO

    try {
        // CAMBIO: Usar referencia de usuario
        const checkDoc = await getDoc(getUserDayRef(userId, "01-01"));

        if (!checkDoc.exists()) {
             console.warn(`Store: El día 01-01 no existe para ${userId}. Regenerando BD del usuario...`);
             await _generateCleanDatabase(userId, onProgress); // CAMBIO: Pasar userId
        } else {
             console.log(`Store: Base de datos verificada para ${userId} (01-01 existe).`);
        }
    } catch (e) {
         console.error("Error al verificar la base de datos (puede ser por permisos o doc no existe):", e);
         try {
            await _generateCleanDatabase(userId, onProgress); // CAMBIO: Pasar userId
         } catch (genError) {
            console.error("Store: Fallo crítico al regenerar la base de datos del usuario.", genError);
            throw genError;
         }
    }
}

// CAMBIO: Ahora necesita userId
async function _generateCleanDatabase(userId, onProgress) {
    if (!userId) throw new Error("_generateCleanDatabase requiere un userId.");
    const userDiasRef = getUserDaysRef(userId); // CAMBIO

    // CAMBIO: Ya no borramos la colección entera, solo la del usuario.
    // Esto es MÁS SEGURO. Si un usuario tiene problemas, no afecta a otros.
    // Y es menos propenso a fallar por reglas de seguridad si las reglas permiten
    // al usuario borrar sus propios datos pero no los de la raíz.
    console.log(`Store: Generando 366 días limpios para ${userId}...`);
    onProgress("Generando 366 días limpios...");

    let genBatch = writeBatch(db);
    let ops = 0;
    let created = 0;

    try {
        // Primero, verificamos si ya existen días (por si acaso) y los borramos si es necesario.
        // Esto es opcional, pero puede ayudar si la generación falló a medias antes.
        // Podríamos decidir NO borrar y simplemente sobreescribir con set() más abajo.
        // Por simplicidad y seguridad, vamos a sobreescribir/crear.

        for (let m = 0; m < 12; m++) {
            const monthNum = m + 1;
            const monthStr = monthNum.toString().padStart(2, '0');
            const numDays = DAYS_IN_MONTH[m];

            for (let d = 1; d <= numDays; d++) {
                const dayStr = d.toString().padStart(2, '0');
                const diaId = `${monthStr}-${dayStr}`;

                const diaData = {
                    Nombre_Dia: `${d} de ${MONTH_NAMES[m]}`,
                    Icono: '',
                    Nombre_Especial: "Unnamed Day",
                    tieneMemorias: false
                };

                // CAMBIO: Usar referencia de usuario
                const docRef = getUserDayRef(userId, diaId);
                genBatch.set(docRef, diaData); // Usamos set() para crear o sobreescribir
                ops++;
                created++;

                if (created % 50 === 0) {
                    onProgress(`Generando ${created}/366...`);
                }

                if (ops >= 400) {
                    await genBatch.commit();
                    genBatch = writeBatch(db);
                    ops = 0;
                }
            }
        }

        if (ops > 0) {
            await genBatch.commit();
        }

        console.log(`Store: Regeneración completa para ${userId}: ${created} días creados/actualizados.`);
        onProgress(`Base de datos del usuario creada: ${created} días.`);

    } catch (e) {
        console.error(`Store: Error generando días para ${userId} (posiblemente reglas de Firestore):`, e);
        throw e;
    }
}

// --- 2. Lógica de Lectura (Días y Memorias) ---

// CAMBIO: Necesita userId
async function loadAllDaysData(userId) {
    if (!userId) throw new Error("loadAllDaysData requiere un userId.");
    const userDiasRef = getUserDaysRef(userId); // CAMBIO
    const q = query(userDiasRef, orderBy(documentId()));
    const querySnapshot = await getDocs(q);

    const allDays = [];
    querySnapshot.forEach((doc) => {
        // La validación del ID sigue siendo útil
        if (doc.id.length === 5 && doc.id.includes('-')) {
            allDays.push({ id: doc.id, ...doc.data() });
        }
    });

    console.log(`Store: Cargados ${allDays.length} días para ${userId}.`);
    // Si allDays está vacío (usuario nuevo?), checkAndRunApp debería haber corrido
    // y generado los días. Si aún así está vacío, podría ser un error.
    if (allDays.length === 0) {
        console.warn(`Store: No se encontraron días para ${userId}. ¿Es un usuario nuevo o hubo un error en checkAndRunApp?`);
        // Podríamos intentar regenerar aquí como fallback, pero es mejor que checkAndRunApp lo maneje.
    }
    return allDays;
}

// CAMBIO: Necesita userId
async function loadMemoriesForDay(userId, diaId) {
    if (!userId) throw new Error("loadMemoriesForDay requiere un userId.");
    const userMemoriasRef = getUserMemoriesRef(userId, diaId); // CAMBIO
    const q = query(userMemoriasRef, orderBy("Fecha_Original", "desc"));

    const querySnapshot = await getDocs(q);
    const memories = [];
    querySnapshot.forEach((doc) => {
        memories.push({ id: doc.id, ...doc.data() });
    });

    return memories;
}

// CAMBIO: Necesita userId
async function getTodaySpotlight(userId, todayId) {
    if (!userId) throw new Error("getTodaySpotlight requiere un userId.");
    try {
        const diaRef = getUserDayRef(userId, todayId); // CAMBIO
        const diaSnap = await getDoc(diaRef);
        const dayName = diaSnap.exists() ? (diaSnap.data().Nombre_Especial || 'Unnamed Day') : 'Unnamed Day';

        const memoriasRef = getUserMemoriesRef(userId, todayId); // CAMBIO
        const q = query(memoriasRef, orderBy("Fecha_Original", "desc"), limit(3));
        const memSnapshot = await getDocs(q);

        const memories = [];
        memSnapshot.forEach(doc => {
            memories.push({
                id: doc.id,
                diaId: todayId, // El diaId es el mismo
                ...doc.data()
            });
        });

        return { dayName, memories };

    } catch (err) {
        console.error("Store: Error cargando spotlight:", err);
        return { dayName: 'Error al cargar', memories: [] };
    }
}

// --- 3. Lógica de Escritura (Días y Memorias) ---

// CAMBIO: Necesita userId
async function saveDayName(userId, diaId, newName) {
    if (!userId) throw new Error("saveDayName requiere un userId.");
    const diaRef = getUserDayRef(userId, diaId); // CAMBIO
    const finalName = newName && newName.trim() !== '' ? newName.trim() : "Unnamed Day";
    await updateDoc(diaRef, {
        Nombre_Especial: finalName
    });
}

// CAMBIO: Necesita userId
async function saveMemory(userId, diaId, memoryData, memoryId) {
    if (!userId) throw new Error("saveMemory requiere un userId.");
    const diaRef = getUserDayRef(userId, diaId); // CAMBIO

    // La lógica de Timestamp y borrar 'file' e 'id' se mantiene
    if (memoryData.Fecha_Original && !(memoryData.Fecha_Original instanceof Timestamp)) {
        memoryData.Fecha_Original = Timestamp.fromDate(memoryData.Fecha_Original);
    }
    delete memoryData.file;
    delete memoryData.id;

    if (memoryId) { // Actualizar
        const memRef = getUserMemoryRef(userId, diaId, memoryId); // CAMBIO
        await updateDoc(memRef, memoryData);
    } else { // Añadir
        memoryData.Creado_En = Timestamp.now();
        const memRef = getUserMemoriesRef(userId, diaId); // CAMBIO
        await addDoc(memRef, memoryData);
    }

    // Marcar el día como que tiene memorias (la lógica se mantiene)
    await updateDoc(diaRef, {
        tieneMemorias: true
    });
}

// CAMBIO: Necesita userId
async function deleteMemory(userId, diaId, memId, imagenURL) {
    if (!userId) throw new Error("deleteMemory requiere un userId.");

    // Borrado de Storage no cambia conceptualmente, pero la URL ya contiene el userId
    if (imagenURL) {
        try {
            const imageRef = ref(storage, imagenURL);
            await deleteObject(imageRef);
            console.log("Store: Imagen borrada de Storage:", imagenURL);
        } catch (error) {
            console.warn("Store: No se pudo borrar la imagen de Storage:", error.code);
        }
    }

    // Borrar documento de Firestore
    const memRef = getUserMemoryRef(userId, diaId, memId); // CAMBIO
    await deleteDoc(memRef);

    // Comprobar si quedan memorias (la lógica se mantiene, pero usa refs de usuario)
    const memoriasRef = getUserMemoriesRef(userId, diaId); // CAMBIO
    const q = query(memoriasRef, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        const diaRef = getUserDayRef(userId, diaId); // CAMBIO
        await updateDoc(diaRef, {
            tieneMemorias: false
        });
    }
}

// UploadImage ya incluye userId en la ruta, no necesita más cambios lógicos aquí
async function uploadImage(file, userId, diaId) {
    // ... (sin cambios, ya usa userId para la ruta) ...
    if (!file || !userId || !diaId) {
        throw new Error("Faltan datos (archivo, userId o diaId) para subir la imagen.");
    }
    const fileExtension = file.name.split('.').pop();
    const uniqueName = `${diaId}_${Date.now()}.${fileExtension}`;
    const storagePath = `images/${userId}/${uniqueName}`; // Ruta ya incluye userId
    const imageRef = ref(storage, storagePath);
    console.log(`Store: Subiendo imagen a: ${storagePath}`);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Store: Imagen subida, URL:", downloadURL);
    return downloadURL;
}


// --- 4. Lógica de Búsqueda y "Almacén" ---

// CAMBIO: Necesita userId
async function searchMemories(userId, term) {
    if (!userId) throw new Error("searchMemories requiere un userId.");
    term = term.toLowerCase(); // Asegurarse de buscar en minúsculas

    const userDiasRef = getUserDaysRef(userId); // CAMBIO
    // Buscamos solo los días del usuario que tienen memorias
    const diasConMemoriasQuery = query(userDiasRef, where("tieneMemorias", "==", true));
    const diasSnapshot = await getDocs(diasConMemoriasQuery);

    let results = [];
    const searchPromises = [];

    diasSnapshot.forEach(diaDoc => {
        const diaId = diaDoc.id;
        // Validación del ID sigue siendo útil
        if (diaId.length !== 5 || !diaId.includes('-')) return;

        const p = (async () => {
            const memoriasRef = getUserMemoriesRef(userId, diaId); // CAMBIO
            const memSnapshot = await getDocs(memoriasRef);

            memSnapshot.forEach(memDoc => {
                const memoria = {
                    id: memDoc.id,
                    diaId: diaId,
                    Nombre_Dia: diaDoc.data().Nombre_Dia,
                    ...memDoc.data()
                };

                let searchableText = (memoria.Descripcion || '').toLowerCase();
                if (memoria.LugarNombre) searchableText += ' ' + (memoria.LugarNombre || '').toLowerCase();
                if (memoria.CancionInfo) searchableText += ' ' + (memoria.CancionInfo || '').toLowerCase();

                if (searchableText.includes(term)) {
                    results.push(memoria);
                }
            });
        })();

        searchPromises.push(p);
    });

    await Promise.all(searchPromises);

    // Ordenar resultados se mantiene
    results.sort((a, b) => {
        const dateA = a.Fecha_Original ? a.Fecha_Original.toMillis() : 0;
        const dateB = b.Fecha_Original ? b.Fecha_Original.toMillis() : 0;
        return dateB - dateA;
    });

    return results;
}

// CAMBIO: Necesita userId. Ya no podemos usar collectionGroup eficientemente
// para filtrar por usuario Y tipo. Lo reescribimos para iterar sobre los días del usuario.
async function getMemoriesByType(userId, type, pageSize = 10, lastVisibleDocSnapshot = null) {
    if (!userId) throw new Error("getMemoriesByType requiere un userId.");

    // 1. Obtener todos los días del usuario que TIENEN memorias
    const userDiasRef = getUserDaysRef(userId);
    const diasQuery = query(userDiasRef, where("tieneMemorias", "==", true), orderBy(documentId())); // Ordenar por ID de día es razonable
    const diasSnapshot = await getDocs(diasQuery);

    let items = [];
    let processedMemories = 0;
    let lastProcessedMemoryDoc = null; // Guardará el DocumentSnapshot de Firestore de la última memoria

    // Simular paginación manual: necesitamos saber desde dónde continuar si lastVisibleDocSnapshot existe
    let startProcessing = !lastVisibleDocSnapshot;
    const startAfterDiaId = lastVisibleDocSnapshot?.ref.parent.parent.id;
    const startAfterMemId = lastVisibleDocSnapshot?.id;

    // 2. Iterar sobre cada día y buscar memorias del tipo correcto
    for (const diaDoc of diasSnapshot.docs) {
        const diaId = diaDoc.id;

        // Lógica para saltar días hasta encontrar el punto de inicio de la paginación
        if (!startProcessing && startAfterDiaId) {
            if (diaId === startAfterDiaId) {
                // Encontramos el día, ahora procesaremos memorias a partir de la correcta
            } else {
                continue; // Saltar este día
            }
        }

        const memoriasRef = getUserMemoriesRef(userId, diaId);
        let q = query(memoriasRef, where("Tipo", "==", type), orderBy("Fecha_Original", "desc"));

        // Si estamos en el día donde nos quedamos, aplicamos startAfter a la memoria
        if (!startProcessing && startAfterDiaId === diaId && startAfterMemId && lastVisibleDocSnapshot) {
             q = query(q, startAfter(lastVisibleDocSnapshot));
        }
        startProcessing = true; // Empezar a procesar desde aquí

        const memSnapshot = await getDocs(q);

        for (const memDoc of memSnapshot.docs) {
            items.push(_formatStoreItem(memDoc, diaId)); // Formato sigue igual
            processedMemories++;
            lastProcessedMemoryDoc = memDoc; // Actualizar el último procesado

            if (processedMemories >= pageSize) {
                break; // Alcanzamos el tamaño de página
            }
        }

        if (processedMemories >= pageSize) {
            break; // Salir del bucle de días
        }
    }

    // 3. Comprobar si hay más resultados (simulación)
    // Buscamos UNA memoria más del mismo tipo después de la última encontrada.
    let hasMore = false;
    if (lastProcessedMemoryDoc) {
        // Necesitamos saber el diaId de la última memoria
        const lastDiaId = lastProcessedMemoryDoc.ref.parent.parent.id;
        
        // Primero, intentamos buscar más en el MISMO día
        const nextMemQuerySameDay = query(
            getUserMemoriesRef(userId, lastDiaId),
            where("Tipo", "==", type),
            orderBy("Fecha_Original", "desc"),
            startAfter(lastProcessedMemoryDoc),
            limit(1)
        );
        let nextSnapshot = await getDocs(nextMemQuerySameDay);
        
        if (!nextSnapshot.empty) {
            hasMore = true;
        } else {
            // Si no hay más en ese día, buscamos en los días SIGUIENTES
            const diasRestantesQuery = query(userDiasRef, where("tieneMemorias", "==", true), orderBy(documentId()), startAfter(await getDoc(getUserDayRef(userId, lastDiaId)))); // Empezar después del último día procesado
            const diasRestantesSnapshot = await getDocs(diasRestantesQuery);

            for (const nextDiaDoc of diasRestantesSnapshot.docs) {
                const nextMemQueryNextDays = query(
                    getUserMemoriesRef(userId, nextDiaDoc.id),
                    where("Tipo", "==", type),
                    limit(1) // Solo necesitamos saber si existe al menos una
                );
                nextSnapshot = await getDocs(nextMemQueryNextDays);
                if (!nextSnapshot.empty) {
                    hasMore = true;
                    break; // Encontramos una, ya sabemos que hay más
                }
            }
        }
    }


    return { items, lastVisible: lastProcessedMemoryDoc, hasMore }; // lastVisible es ahora el DocumentSnapshot
}


// CAMBIO: Necesita userId
async function getNamedDays(userId, pageSize = 10, lastVisibleDoc = null) {
    if (!userId) throw new Error("getNamedDays requiere un userId.");
    const userDiasRef = getUserDaysRef(userId); // CAMBIO

    let q;
    const baseQuery = query(userDiasRef,
                           where("Nombre_Especial", "!=", "Unnamed Day"),
                           orderBy("Nombre_Especial", "asc"), // Podría ser interesante ordenar por ID de día también
                           limit(pageSize));

    if (lastVisibleDoc) {
        q = query(baseQuery, startAfter(lastVisibleDoc));
    } else {
        q = baseQuery;
    }

    const querySnapshot = await getDocs(q);

    const items = [];
    querySnapshot.forEach(doc => {
        items.push(_formatStoreItem(doc, doc.id, true)); // true = isDay
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    // Comprobar si hay más (la lógica se mantiene)
    let hasMore = false;
    if (lastVisible) {
        const nextQuery = query(userDiasRef,
                                where("Nombre_Especial", "!=", "Unnamed Day"),
                                orderBy("Nombre_Especial", "asc"),
                                startAfter(lastVisible),
                                limit(1));
        const nextSnapshot = await getDocs(nextQuery);
        hasMore = !nextSnapshot.empty;
    }

    return { items, lastVisible, hasMore };
}


// --- 5. Funciones de Ayuda (Helpers) ---

// _formatStoreItem no necesita userId, ya que recibe el DocumentSnapshot
function _formatStoreItem(docSnap, diaId, isDay = false) {
    // ... (sin cambios) ...
    const data = docSnap.data();
    if (isDay) {
        return {
            id: docSnap.id,
            diaId: docSnap.id,
            type: 'Nombres',
            Nombre_Dia: data.Nombre_Dia,
            Nombre_Especial: data.Nombre_Especial
        };
    } else {
        return {
            id: docSnap.id,
            diaId: diaId,
            ...data
        };
    }
}

export {
    checkAndRunApp,
    loadAllDaysData,
    loadMemoriesForDay,
    saveDayName,
    saveMemory,
    deleteMemory,
    uploadImage,
    searchMemories,
    getTodaySpotlight,
    getMemoriesByType,
    getNamedDays
};
