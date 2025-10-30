/*
 * store.js (v4.12 - Añadida la función de Timeline)
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
const USERS_COLLECTION = "Users"; 
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

async function checkAndRunApp(userId, onProgress) {
    if (!userId) throw new Error("checkAndRunApp requiere un userId.");
    console.log(`Store: Verificando base de datos para usuario ${userId}...`);
    const userDiasRef = getUserDaysRef(userId); 

    try {
        const checkDoc = await getDoc(getUserDayRef(userId, "01-01"));

        if (!checkDoc.exists()) {
             console.warn(`Store: El día 01-01 no existe para ${userId}. Regenerando BD del usuario...`);
             await _generateCleanDatabase(userId, onProgress); 
        } else {
             console.log(`Store: Base de datos verificada para ${userId} (01-01 existe).`);
        }
    } catch (e) {
         console.error("Error al verificar la base de datos (puede ser por permisos o doc no existe):", e);
         try {
            await _generateCleanDatabase(userId, onProgress); 
         } catch (genError) {
            console.error("Store: Fallo crítico al regenerar la base de datos del usuario.", genError);
            throw genError;
         }
    }
}

async function _generateCleanDatabase(userId, onProgress) {
    if (!userId) throw new Error("_generateCleanDatabase requiere un userId.");
    const userDiasRef = getUserDaysRef(userId); 

    console.log(`Store: Generando 366 días limpios para ${userId}...`);
    onProgress("Generando 366 días limpios...");

    let genBatch = writeBatch(db);
    let ops = 0;
    let created = 0;

    try {
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

                const docRef = getUserDayRef(userId, diaId);
                genBatch.set(docRef, diaData); 
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

async function loadAllDaysData(userId) {
    if (!userId) throw new Error("loadAllDaysData requiere un userId.");
    const userDiasRef = getUserDaysRef(userId); 
    const q = query(userDiasRef, orderBy(documentId()));
    const querySnapshot = await getDocs(q);

    const allDays = [];
    querySnapshot.forEach((doc) => {
        if (doc.id.length === 5 && doc.id.includes('-')) {
            allDays.push({ id: doc.id, ...doc.data() });
        }
    });

    console.log(`Store: Cargados ${allDays.length} días para ${userId}.`);
    if (allDays.length === 0) {
        console.warn(`Store: No se encontraron días para ${userId}. ¿Es un usuario nuevo o hubo un error en checkAndRunApp?`);
    }
    return allDays;
}

async function loadMemoriesForDay(userId, diaId) {
    if (!userId) throw new Error("loadMemoriesForDay requiere un userId.");
    const userMemoriasRef = getUserMemoriesRef(userId, diaId); 
    const q = query(userMemoriasRef, orderBy("Fecha_Original", "desc"));

    const querySnapshot = await getDocs(q);
    const memories = [];
    querySnapshot.forEach((doc) => {
        memories.push({ id: doc.id, ...doc.data() });
    });

    return memories;
}

async function getTodaySpotlight(userId, todayId) {
    if (!userId) throw new Error("getTodaySpotlight requiere un userId.");
    try {
        const diaRef = getUserDayRef(userId, todayId); 
        const diaSnap = await getDoc(diaRef);
        const dayName = diaSnap.exists() ? (diaSnap.data().Nombre_Especial || 'Unnamed Day') : 'Unnamed Day';

        const memoriasRef = getUserMemoriesRef(userId, todayId); 
        const q = query(memoriasRef, orderBy("Fecha_Original", "desc"), limit(3));
        const memSnapshot = await getDocs(q);

        const memories = [];
        memSnapshot.forEach(doc => {
            memories.push({
                id: doc.id,
                diaId: todayId, 
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

async function saveDayName(userId, diaId, newName) {
    if (!userId) throw new Error("saveDayName requiere un userId.");
    const diaRef = getUserDayRef(userId, diaId); 
    const finalName = newName && newName.trim() !== '' ? newName.trim() : "Unnamed Day";
    await updateDoc(diaRef, {
        Nombre_Especial: finalName
    });
}

async function saveMemory(userId, diaId, memoryData, memoryId) {
    if (!userId) throw new Error("saveMemory requiere un userId.");
    const diaRef = getUserDayRef(userId, diaId); 

    if (memoryData.Fecha_Original && !(memoryData.Fecha_Original instanceof Timestamp)) {
        memoryData.Fecha_Original = Timestamp.fromDate(memoryData.Fecha_Original);
    }
    delete memoryData.file;
    delete memoryData.id;

    if (memoryId) { // Actualizar
        const memRef = getUserMemoryRef(userId, diaId, memoryId); 
        await updateDoc(memRef, memoryData);
    } else { // Añadir
        memoryData.Creado_En = Timestamp.now();
        const memRef = getUserMemoriesRef(userId, diaId); 
        await addDoc(memRef, memoryData);
    }

    await updateDoc(diaRef, {
        tieneMemorias: true
    });
}

async function deleteMemory(userId, diaId, memId, imagenURL) {
    if (!userId) throw new Error("deleteMemory requiere un userId.");

    if (imagenURL) {
        try {
            const imageRef = ref(storage, imagenURL);
            await deleteObject(imageRef);
            console.log("Store: Imagen borrada de Storage:", imagenURL);
        } catch (error) {
            console.warn("Store: No se pudo borrar la imagen de Storage:", error.code);
        }
    }

    const memRef = getUserMemoryRef(userId, diaId, memId); 
    await deleteDoc(memRef);

    const memoriasRef = getUserMemoriesRef(userId, diaId); 
    const q = query(memoriasRef, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        const diaRef = getUserDayRef(userId, diaId); 
        await updateDoc(diaRef, {
            tieneMemorias: false
        });
    }
}

async function uploadImage(file, userId, diaId) {
    if (!file || !userId || !diaId) {
        throw new Error("Faltan datos (archivo, userId o diaId) para subir la imagen.");
    }
    const fileExtension = file.name.split('.').pop();
    const uniqueName = `${diaId}_${Date.now()}.${fileExtension}`;
    const storagePath = `images/${userId}/${uniqueName}`; 
    const imageRef = ref(storage, storagePath);
    console.log(`Store: Subiendo imagen a: ${storagePath}`);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("Store: Imagen subida, URL:", downloadURL);
    return downloadURL;
}


// --- 4. Lógica de Búsqueda y "Almacén" ---

async function searchMemories(userId, term) {
    if (!userId) throw new Error("searchMemories requiere un userId.");
    term = term.toLowerCase(); 

    const userDiasRef = getUserDaysRef(userId); 
    const diasConMemoriasQuery = query(userDiasRef, where("tieneMemorias", "==", true));
    const diasSnapshot = await getDocs(diasConMemoriasQuery);

    let results = [];
    const searchPromises = [];

    diasSnapshot.forEach(diaDoc => {
        const diaId = diaDoc.id;
        if (diaId.length !== 5 || !diaId.includes('-')) return;

        const p = (async () => {
            const memoriasRef = getUserMemoriesRef(userId, diaId); 
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

    results.sort((a, b) => {
        const dateA = a.Fecha_Original ? a.Fecha_Original.toMillis() : 0;
        const dateB = b.Fecha_Original ? b.Fecha_Original.toMillis() : 0;
        return dateB - dateA;
    });

    return results;
}

async function getMemoriesByType(userId, type, pageSize = 10, lastVisibleDocSnapshot = null) {
    if (!userId) throw new Error("getMemoriesByType requiere un userId.");

    const userDiasRef = getUserDaysRef(userId);
    const diasQuery = query(userDiasRef, where("tieneMemorias", "==", true), orderBy(documentId())); 
    const diasSnapshot = await getDocs(diasQuery);

    let items = [];
    let processedMemories = 0;
    let lastProcessedMemoryDoc = null; 

    let startProcessing = !lastVisibleDocSnapshot;
    const startAfterDiaId = lastVisibleDocSnapshot?.ref.parent.parent.id;
    const startAfterMemId = lastVisibleDocSnapshot?.id;

    for (const diaDoc of diasSnapshot.docs) {
        const diaId = diaDoc.id;

        if (!startProcessing && startAfterDiaId) {
            if (diaId === startAfterDiaId) {
                // Encontramos el día
            } else {
                continue; // Saltar este día
            }
        }

        const memoriasRef = getUserMemoriesRef(userId, diaId);
        let q = query(memoriasRef, where("Tipo", "==", type), orderBy("Fecha_Original", "desc"));

        if (!startProcessing && startAfterDiaId === diaId && startAfterMemId && lastVisibleDocSnapshot) {
             q = query(q, startAfter(lastVisibleDocSnapshot));
        }
        startProcessing = true; 

        const memSnapshot = await getDocs(q);

        for (const memDoc of memSnapshot.docs) {
            items.push(_formatStoreItem(memDoc, diaId)); 
            processedMemories++;
            lastProcessedMemoryDoc = memDoc; 

            if (processedMemories >= pageSize) {
                break; 
            }
        }

        if (processedMemories >= pageSize) {
            break; 
        }
    }

    let hasMore = false;
    if (lastProcessedMemoryDoc) {
        const lastDiaId = lastProcessedMemoryDoc.ref.parent.parent.id;
        
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
            const diasRestantesQuery = query(userDiasRef, where("tieneMemorias", "==", true), orderBy(documentId()), startAfter(await getDoc(getUserDayRef(userId, lastDiaId)))); 
            const diasRestantesSnapshot = await getDocs(diasRestantesQuery);

            for (const nextDiaDoc of diasRestantesSnapshot.docs) {
                const nextMemQueryNextDays = query(
                    getUserMemoriesRef(userId, nextDiaDoc.id),
                    where("Tipo", "==", type),
                    limit(1) 
                );
                nextSnapshot = await getDocs(nextMemQueryNextDays);
                if (!nextSnapshot.empty) {
                    hasMore = true;
                    break; 
                }
            }
        }
    }

    return { items, lastVisible: lastProcessedMemoryDoc, hasMore };
}


async function getNamedDays(userId, pageSize = 10, lastVisibleDoc = null) {
    if (!userId) throw new Error("getNamedDays requiere un userId.");
    const userDiasRef = getUserDaysRef(userId); 

    let q;
    const baseQuery = query(userDiasRef,
                              where("Nombre_Especial", "!=", "Unnamed Day"),
                              orderBy("Nombre_Especial", "asc"), 
                              limit(pageSize));

    if (lastVisibleDoc) {
        q = query(baseQuery, startAfter(lastVisibleDoc));
    } else {
        q = baseQuery;
    }

    const querySnapshot = await getDocs(q);

    const items = [];
    querySnapshot.forEach(doc => {
        items.push(_formatStoreItem(doc, doc.id, true)); 
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

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

// *** NUEVA FUNCIÓN PARA EL TIMELINE (v2.8) ***
/**
 * Obtiene todas las memorias de un usuario, agrupadas por mes y día,
 * ordenadas cronológicamente para la vista de Timeline.
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<Array>} Un array de objetos de mes.
 * Ej: [{ monthName: "Enero", days: [{ diaId: "01-01", ... memories: [...] }] }]
 */
// *** CORRECCIÓN: Quitar 'export' de aquí ***
async function getAllMemoriesForTimeline(userId) {
    if (!userId) throw new Error("getAllMemoriesForTimeline requiere un userId.");

    console.log("Store: Cargando datos de Timeline para", userId);
    
    // 1. Obtener todos los días que tienen memorias, ordenados por ID ("01-01", "01-02"...)
    const userDiasRef = getUserDaysRef(userId);
    const qDias = query(userDiasRef, where("tieneMemorias", "==", true), orderBy(documentId()));
    
    const diasSnapshot = await getDocs(qDias);
    
    const allDaysWithMemories = [];

    // 2. Para cada día con memorias, obtener sus memorias
    for (const diaDoc of diasSnapshot.docs) {
        const diaData = diaDoc.data();
        const diaId = diaDoc.id;

        // Obtener las memorias de este día, ordenadas por año
        const memoriasRef = getUserMemoriesRef(userId, diaId);
        const qMems = query(memoriasRef, orderBy("Fecha_Original", "desc"));
        const memSnapshot = await getDocs(qMems);

        const memories = memSnapshot.docs.map(memDoc => ({
            id: memDoc.id,
            ...memDoc.data()
        }));

        // Añadir solo si de verdad tiene memorias
        if (memories.length > 0) {
            allDaysWithMemories.push({
                diaId: diaId,
                nombreDia: diaData.Nombre_Dia,
                nombreEspecial: diaData.Nombre_Especial,
                memories: memories
            });
        }
    }

    // 3. Agrupar la lista plana de días en meses
    const groupedByMonth = [];
    let currentMonth = -1;
    
    allDaysWithMemories.forEach(day => {
        const monthIndex = parseInt(day.diaId.substring(0, 2), 10) - 1; // "01" -> 0
        
        if (monthIndex !== currentMonth) {
            // Es un nuevo mes, crear un nuevo grupo
            groupedByMonth.push({
                monthName: MONTH_NAMES[monthIndex],
                days: []
            });
            currentMonth = monthIndex;
        }
        
        // Añadir el día al último grupo de mes creado
        groupedByMonth[groupedByMonth.length - 1].days.push(day);
    });

    console.log(`Store: Timeline procesado. ${groupedByMonth.length} meses con datos.`);
    return groupedByMonth;
}


// --- 5. Funciones de Ayuda (Helpers) ---

function _formatStoreItem(docSnap, diaId, isDay = false) {
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
    getNamedDays,
    // *** CORRECCIÓN: Añadido aquí, sin 'export' inline ***
    getAllMemoriesForTimeline 
};
