/*
 * store.js (v4.14 - Importar/Exportar CSV)
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

async function loadMonthForTimeline(userId, monthIndex) {
    if (!userId) throw new Error("loadMonthForTimeline requiere un userId.");
    if (monthIndex < 0 || monthIndex > 11) {
        throw new Error("loadMonthForTimeline requiere un monthIndex válido (0-11).");
    }

    const monthName = MONTH_NAMES[monthIndex];
    console.log(`Store: Cargando datos de Timeline para ${userId} - Mes: ${monthName}`);
    
    const monthStr = (monthIndex + 1).toString().padStart(2, '0');
    const startId = `${monthStr}-01`;
    const endId = `${monthStr}-${DAYS_IN_MONTH[monthIndex]}`;

    const userDiasRef = getUserDaysRef(userId);
    const qDias = query(userDiasRef,
        where("tieneMemorias", "==", true),
        where(documentId(), ">=", startId),
        where(documentId(), "<=", endId),
        orderBy(documentId())
    );
    
    const diasSnapshot = await getDocs(qDias);
    
    const allDaysWithMemories = [];

    for (const diaDoc of diasSnapshot.docs) {
        const diaData = diaDoc.data();
        const diaId = diaDoc.id();

        const memoriasRef = getUserMemoriesRef(userId, diaId);
        const qMems = query(memoriasRef, orderBy("Fecha_Original", "desc"));
        const memSnapshot = await getDocs(qMems);

        const memories = memSnapshot.docs.map(memDoc => ({
            id: memDoc.id,
            ...memDoc.data()
        }));

        if (memories.length > 0) {
            allDaysWithMemories.push({
                diaId: diaId,
                nombreDia: diaData.Nombre_Dia,
                nombreEspecial: diaData.Nombre_Especial,
                memories: memories
            });
        }
    }

    if (allDaysWithMemories.length > 0) {
        const monthData = {
            monthName: monthName,
            days: allDaysWithMemories
        };
        console.log(`Store: Timeline procesado. ${allDaysWithMemories.length} días para ${monthName}.`);
        return monthData;
    } else {
        console.log(`Store: Timeline procesado. Sin datos para ${monthName}.`);
        return null;
    }
}

// --- 6. Importar/Exportar CSV ---

/**
 * Exporta todas las memorias y nombres de días a formato CSV
 */
async function exportToCSV(userId) {
    if (!userId) throw new Error("exportToCSV requiere un userId.");
    
    console.log("Exportando datos a CSV...");
    
    const userDiasRef = getUserDaysRef(userId);
    const diasSnapshot = await getDocs(query(userDiasRef, orderBy(documentId())));
    
    const rows = [];
    rows.push(['AÑO', 'MES', 'DÍA', 'TIPO', 'CONTENIDO', 'DATOS_EXTRA']); // Header
    
    for (const diaDoc of diasSnapshot.docs) {
        const diaId = diaDoc.id;
        const diaData = diaDoc.data();
        const [mes, dia] = diaId.split('-');
        
        // Exportar nombre del día si no es "Unnamed Day"
        if (diaData.Nombre_Especial && diaData.Nombre_Especial !== 'Unnamed Day') {
            rows.push([
                '', // AÑO vacío
                mes,
                dia,
                'Nombre',
                diaData.Nombre_Especial,
                ''
            ]);
        }
        
        // Exportar memorias del día
        if (diaData.tieneMemorias) {
            const memoriasRef = getUserMemoriesRef(userId, diaId);
            const memSnapshot = await getDocs(query(memoriasRef, orderBy("Fecha_Original", "desc")));
            
            memSnapshot.forEach(memDoc => {
                const mem = memDoc.data();
                let year = '';
                if (mem.Fecha_Original) {
                    const date = mem.Fecha_Original.toDate();
                    year = date.getFullYear();
                }
                
                let contenido = '';
                let datosExtra = {};
                
                switch (mem.Tipo) {
                    case 'Texto':
                        contenido = mem.Descripcion || '';
                        break;
                    case 'Lugar':
                        contenido = mem.LugarNombre || '';
                        datosExtra = {
                            lat: mem.Latitud,
                            lng: mem.Longitud
                        };
                        break;
                    case 'Musica':
                        contenido = mem.CancionInfo || '';
                        datosExtra = {
                            artist: mem.Artista,
                            artwork_url: mem.ArtworkURL
                        };
                        break;
                }
                
                rows.push([
                    year,
                    mes,
                    dia,
                    mem.Tipo,
                    contenido,
                    Object.keys(datosExtra).length > 0 ? JSON.stringify(datosExtra) : ''
                ]);
            });
        }
    }
    
    // Convertir a CSV string
    const csvContent = rows.map(row => 
        row.map(cell => {
            // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',')
    ).join('\n');
    
    console.log(`Exportación completa: ${rows.length - 1} filas`);
    return csvContent;
}

/**
 * Importa memorias y nombres de días desde un CSV
 */
async function importFromCSV(userId, csvContent, onProgress) {
    if (!userId) throw new Error("importFromCSV requiere un userId.");
    
    console.log("Importando datos desde CSV...");
    onProgress("Procesando archivo...");
    
    // Parsear CSV
    const lines = csvContent.split('\n');
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) { // Saltar header
        if (!lines[i].trim()) continue;
        
        const row = _parseCSVLine(lines[i]);
        if (row.length >= 5) {
            rows.push(row);
        }
    }
    
    console.log(`CSV parseado: ${rows.length} filas`);
    onProgress(`Importando ${rows.length} elementos...`);
    
    let batch = writeBatch(db);
    let batchOps = 0;
    let imported = 0;
    let errors = 0;
    
    for (const row of rows) {
        try {
            const [year, mes, dia, tipo, contenido, datosExtra] = row;
            
            if (!mes || !dia || !tipo || !contenido) {
                console.warn("Fila incompleta, saltando:", row);
                errors++;
                continue;
            }
            
            const mesNum = parseInt(mes);
            const diaNum = parseInt(dia);
            
            if (mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) {
                console.warn("Fecha inválida, saltando:", row);
                errors++;
                continue;
            }
            
            const diaId = `${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            
            // Importar nombre de día
            if (tipo === 'Nombre' && !year.trim()) {
                const diaRef = getUserDayRef(userId, diaId);
                batch.update(diaRef, {
                    Nombre_Especial: contenido.trim()
                });
                batchOps++;
                imported++;
            }
            // Importar memoria
            else if (year.trim()) {
                const yearNum = parseInt(year);
                if (yearNum < 1900 || yearNum > 2100) {
                    console.warn("Año inválido, saltando:", row);
                    errors++;
                    continue;
                }
                
                const fullDate = new Date(Date.UTC(yearNum, mesNum - 1, diaNum));
                
                const memData = {
                    Tipo: tipo,
                    Fecha_Original: Timestamp.fromDate(fullDate),
                    Creado_En: Timestamp.now()
                };
                
                // Parsear contenido según tipo
                switch (tipo) {
                    case 'Texto':
                        memData.Descripcion = contenido;
                        break;
                    case 'Lugar':
                        memData.LugarNombre = contenido;
                        if (datosExtra) {
                            try {
                                const extra = JSON.parse(datosExtra);
                                memData.Latitud = extra.lat || 0;
                                memData.Longitud = extra.lng || 0;
                            } catch (e) {
                                console.warn("Error parseando datos extra de lugar:", e);
                            }
                        }
                        break;
                    case 'Musica':
                        memData.CancionInfo = contenido;
                        if (datosExtra) {
                            try {
                                const extra = JSON.parse(datosExtra);
                                memData.Artista = extra.artist || '';
                                memData.ArtworkURL = extra.artwork_url || '';
                            } catch (e) {
                                console.warn("Error parseando datos extra de música:", e);
                            }
                        }
                        break;
                }
                
                const memRef = doc(getUserMemoriesRef(userId, diaId));
                batch.set(memRef, memData);
                batchOps++;
                
                // Marcar día como con memorias
                const diaRef = getUserDayRef(userId, diaId);
                batch.update(diaRef, { tieneMemorias: true });
                batchOps++;
                
                imported++;
            }
            
            // Commit batch cada 400 operaciones
            if (batchOps >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchOps = 0;
                onProgress(`Importados ${imported}/${rows.length}...`);
            }
            
        } catch (e) {
            console.error("Error procesando fila:", row, e);
            errors++;
        }
    }
    
    // Commit final
    if (batchOps > 0) {
        await batch.commit();
    }
    
    console.log(`Importación completa: ${imported} importados, ${errors} errores`);
    onProgress(`Importación completa: ${imported} elementos`);
    
    return { imported, errors };
}

/**
 * Helper para parsear una línea CSV respetando comillas
 */
function _parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

// --- 7. Funciones de Ayuda (Helpers) ---

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
    loadMonthForTimeline,
    exportToCSV,
    importFromCSV
};
