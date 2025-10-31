/*
 * store.js (v5.0 - Local First)
 * Sistema de almacenamiento local con backup opcional a Firebase
 */

import { generateId } from './utils.js';

// --- Constantes ---
const STORAGE_PREFIX = 'ephem_';
const DAYS_KEY = `${STORAGE_PREFIX}days`;
const MEMORIES_KEY = `${STORAGE_PREFIX}memories`;
const FIRST_RUN_KEY = `${STORAGE_PREFIX}first_run`;
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- Datos de Ejemplo (Efemérides de Wikipedia) ---
const SAMPLE_EPHEMERIDES = [
    { month: 1, day: 1, year: 1959, type: 'Texto', content: 'Triunfo de la Revolución Cubana' },
    { month: 2, day: 14, year: 1876, type: 'Texto', content: 'Alexander Graham Bell patenta el teléfono' },
    { month: 3, day: 14, year: 1879, type: 'Texto', content: 'Nacimiento de Albert Einstein' },
    { month: 3, day: 30, year: 1853, type: 'Texto', content: 'Nacimiento de Vincent van Gogh' },
    { month: 4, day: 12, year: 1961, type: 'Texto', content: 'Yuri Gagarin se convierte en el primer humano en el espacio' },
    { month: 5, day: 4, year: 1929, type: 'Texto', content: 'Nacimiento de Audrey Hepburn' },
    { month: 6, day: 28, year: 1712, type: 'Texto', content: 'Nacimiento de Jean-Jacques Rousseau' },
    { month: 7, day: 16, year: 1969, type: 'Texto', content: 'Lanzamiento del Apolo 11 hacia la Luna' },
    { month: 7, day: 20, year: 1969, type: 'Texto', content: 'Neil Armstrong pisa la Luna' },
    { month: 8, day: 15, year: 1769, type: 'Texto', content: 'Nacimiento de Napoleón Bonaparte' },
    { month: 9, day: 15, year: 1890, type: 'Texto', content: 'Nacimiento de Agatha Christie' },
    { month: 10, day: 31, year: 1517, type: 'Texto', content: 'Martín Lutero publica sus 95 tesis' },
    { month: 11, day: 9, year: 1989, type: 'Texto', content: 'Caída del Muro de Berlín' },
    { month: 12, day: 25, year: 1642, type: 'Texto', content: 'Nacimiento de Isaac Newton' }
];

// --- Helper: Storage Local ---

/**
 * Guarda datos en localStorage
 */
function saveToLocal(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.error('Error guardando en localStorage:', e);
        return false;
    }
}

/**
 * Carga datos de localStorage
 */
function loadFromLocal(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error('Error cargando de localStorage:', e);
        return defaultValue;
    }
}

/**
 * Borra datos de localStorage
 */
function removeFromLocal(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error('Error borrando de localStorage:', e);
        return false;
    }
}

// --- 1. Inicialización ---

/**
 * Verifica e inicializa la base de datos local.
 * Si es la primera vez, genera 366 días y carga datos de ejemplo.
 */
async function checkAndRunApp(onProgress) {
    console.log('Store: Verificando base de datos local...');
    
    const isFirstRun = !loadFromLocal(FIRST_RUN_KEY);
    
    if (isFirstRun) {
        console.log('Store: Primera ejecución detectada. Inicializando...');
        onProgress('Preparando tu calendario...');
        
        // Generar 366 días limpios
        await _generateCleanDatabase(onProgress);
        
        // Cargar datos de ejemplo
        onProgress('Añadiendo ejemplos...');
        await _loadSampleData();
        
        // Marcar como inicializado
        saveToLocal(FIRST_RUN_KEY, true);
        
        console.log('Store: Inicialización completada');
    } else {
        console.log('Store: Base de datos local verificada');
    }
}

/**
 * Genera 366 días limpios en localStorage
 */
async function _generateCleanDatabase(onProgress) {
    const allDays = {};
    let created = 0;
    
    for (let m = 0; m < 12; m++) {
        const monthNum = m + 1;
        const monthStr = monthNum.toString().padStart(2, '0');
        const numDays = DAYS_IN_MONTH[m];
        
        for (let d = 1; d <= numDays; d++) {
            const dayStr = d.toString().padStart(2, '0');
            const diaId = `${monthStr}-${dayStr}`;
            
            allDays[diaId] = {
                id: diaId,
                Nombre_Dia: `${d} de ${MONTH_NAMES[m]}`,
                Icono: '',
                Nombre_Especial: 'Unnamed Day',
                tieneMemorias: false
            };
            
            created++;
            if (created % 50 === 0) {
                onProgress(`Generando ${created}/366...`);
            }
        }
    }
    
    saveToLocal(DAYS_KEY, allDays);
    console.log(`Store: ${created} días generados`);
}

/**
 * Carga datos de ejemplo (efemérides)
 */
async function _loadSampleData() {
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    
    for (const ephem of SAMPLE_EPHEMERIDES) {
        const monthStr = ephem.month.toString().padStart(2, '0');
        const dayStr = ephem.day.toString().padStart(2, '0');
        const diaId = `${monthStr}-${dayStr}`;
        
        const memoryId = generateId();
        const fullDate = new Date(Date.UTC(ephem.year, ephem.month - 1, ephem.day));
        
        if (!memories[diaId]) {
            memories[diaId] = [];
        }
        
        memories[diaId].push({
            id: memoryId,
            Tipo: ephem.type,
            Descripcion: ephem.content,
            Fecha_Original: fullDate.toISOString(),
            Creado_En: new Date().toISOString(),
            isExample: true // Marcamos como ejemplo para poder borrar fácilmente
        });
        
        // Marcar día con memorias
        if (days[diaId]) {
            days[diaId].tieneMemorias = true;
        }
    }
    
    saveToLocal(MEMORIES_KEY, memories);
    saveToLocal(DAYS_KEY, days);
    console.log(`Store: ${SAMPLE_EPHEMERIDES.length} efemérides de ejemplo añadidas`);
}

/**
 * Borra todos los datos de ejemplo
 */
async function clearSampleData() {
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    let cleared = 0;
    
    // Recorrer todas las memorias
    for (const diaId in memories) {
        const dayMemories = memories[diaId];
        
        // Filtrar las que NO son ejemplos
        const filtered = dayMemories.filter(mem => !mem.isExample);
        
        if (filtered.length !== dayMemories.length) {
            cleared += (dayMemories.length - filtered.length);
        }
        
        if (filtered.length > 0) {
            memories[diaId] = filtered;
        } else {
            delete memories[diaId];
            // Actualizar día sin memorias
            if (days[diaId]) {
                days[diaId].tieneMemorias = false;
            }
        }
    }
    
    saveToLocal(MEMORIES_KEY, memories);
    saveToLocal(DAYS_KEY, days);
    
    console.log(`Store: ${cleared} ejemplos borrados`);
    return cleared;
}

// --- 2. Lectura de Datos ---

/**
 * Carga todos los días
 */
async function loadAllDaysData() {
    const days = loadFromLocal(DAYS_KEY, {});
    const allDays = Object.values(days).sort((a, b) => {
        return a.id.localeCompare(b.id);
    });
    
    console.log(`Store: Cargados ${allDays.length} días`);
    return allDays;
}

/**
 * Carga memorias de un día específico
 */
async function loadMemoriesForDay(diaId) {
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const dayMemories = memories[diaId] || [];
    
    // Convertir fechas ISO a objetos Date
    return dayMemories.map(mem => ({
        ...mem,
        Fecha_Original: new Date(mem.Fecha_Original),
        Creado_En: new Date(mem.Creado_En)
    })).sort((a, b) => b.Fecha_Original - a.Fecha_Original);
}

/**
 * Obtiene el spotlight de hoy
 */
async function getTodaySpotlight(todayId) {
    try {
        const days = loadFromLocal(DAYS_KEY, {});
        const dayData = days[todayId];
        const dayName = dayData?.Nombre_Especial || 'Unnamed Day';
        
        const memories = await loadMemoriesForDay(todayId);
        const recentMemories = memories.slice(0, 3);
        
        return {
            dayName,
            memories: recentMemories.map(mem => ({
                ...mem,
                diaId: todayId
            }))
        };
    } catch (err) {
        console.error('Store: Error cargando spotlight:', err);
        return { dayName: 'Error al cargar', memories: [] };
    }
}

// --- 3. Escritura de Datos ---

/**
 * Guarda el nombre de un día
 */
async function saveDayName(diaId, newName) {
    const days = loadFromLocal(DAYS_KEY, {});
    
    if (!days[diaId]) {
        throw new Error(`Día ${diaId} no encontrado`);
    }
    
    const finalName = newName && newName.trim() !== '' ? newName.trim() : 'Unnamed Day';
    days[diaId].Nombre_Especial = finalName;
    
    saveToLocal(DAYS_KEY, days);
}

/**
 * Guarda o actualiza una memoria
 */
async function saveMemory(diaId, memoryData, memoryId) {
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    
    if (!days[diaId]) {
        throw new Error(`Día ${diaId} no encontrado`);
    }
    
    // Convertir Date a ISO string si es necesario
    if (memoryData.Fecha_Original instanceof Date) {
        memoryData.Fecha_Original = memoryData.Fecha_Original.toISOString();
    }
    
    // Limpiar campos no necesarios
    delete memoryData.file;
    delete memoryData.id;
    
    if (!memories[diaId]) {
        memories[diaId] = [];
    }
    
    if (memoryId) {
        // Actualizar memoria existente
        const index = memories[diaId].findIndex(m => m.id === memoryId);
        if (index !== -1) {
            memories[diaId][index] = {
                ...memories[diaId][index],
                ...memoryData
            };
        }
    } else {
        // Añadir nueva memoria
        const newMemory = {
            id: generateId(),
            ...memoryData,
            Creado_En: new Date().toISOString()
        };
        memories[diaId].push(newMemory);
    }
    
    // Marcar día con memorias
    days[diaId].tieneMemorias = true;
    
    saveToLocal(MEMORIES_KEY, memories);
    saveToLocal(DAYS_KEY, days);
}

/**
 * Borra una memoria
 */
async function deleteMemory(diaId, memId, imagenURL) {
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    
    if (!memories[diaId]) return;
    
    // Filtrar la memoria a borrar
    memories[diaId] = memories[diaId].filter(m => m.id !== memId);
    
    // Si no quedan memorias, borrar el array y actualizar día
    if (memories[diaId].length === 0) {
        delete memories[diaId];
        if (days[diaId]) {
            days[diaId].tieneMemorias = false;
        }
    }
    
    saveToLocal(MEMORIES_KEY, memories);
    saveToLocal(DAYS_KEY, days);
    
    // Nota: En local no borramos imágenes de Storage automáticamente
    // Se manejaría con un sistema de limpieza periódica
}

/**
 * Sube una imagen (ahora como base64 en localStorage)
 */
async function uploadImage(file, diaId) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const base64 = e.target.result;
            // Guardar en un objeto separado de imágenes
            const images = loadFromLocal(`${STORAGE_PREFIX}images`, {});
            const imageId = generateId();
            
            images[imageId] = {
                id: imageId,
                diaId: diaId,
                data: base64,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };
            
            saveToLocal(`${STORAGE_PREFIX}images`, images);
            resolve(`local://${imageId}`); // URL local
        };
        
        reader.onerror = () => {
            reject(new Error('Error al leer la imagen'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Obtiene una imagen local por su ID
 */
function getLocalImage(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('local://')) {
        return null;
    }
    
    const imageId = imageUrl.replace('local://', '');
    const images = loadFromLocal(`${STORAGE_PREFIX}images`, {});
    return images[imageId]?.data || null;
}

// --- 4. Búsqueda y Filtrado ---

/**
 * Busca memorias por término
 */
async function searchMemories(term) {
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    const results = [];
    term = term.toLowerCase();
    
    for (const diaId in memories) {
        const dayMemories = memories[diaId];
        const dayData = days[diaId];
        
        dayMemories.forEach(mem => {
            let searchableText = (mem.Descripcion || '').toLowerCase();
            if (mem.LugarNombre) searchableText += ' ' + mem.LugarNombre.toLowerCase();
            if (mem.CancionInfo) searchableText += ' ' + mem.CancionInfo.toLowerCase();
            
            if (searchableText.includes(term)) {
                results.push({
                    ...mem,
                    diaId,
                    Nombre_Dia: dayData?.Nombre_Dia || 'Día',
                    Fecha_Original: new Date(mem.Fecha_Original)
                });
            }
        });
    }
    
    // Ordenar por fecha
    results.sort((a, b) => b.Fecha_Original - a.Fecha_Original);
    
    return results;
}

/**
 * Obtiene memorias por tipo (paginado)
 */
async function getMemoriesByType(type, pageSize = 10, lastVisibleId = null) {
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    const allItems = [];
    
    // Recopilar todas las memorias del tipo
    for (const diaId in memories) {
        const dayMemories = memories[diaId];
        const dayData = days[diaId];
        
        dayMemories.forEach(mem => {
            if (mem.Tipo === type) {
                allItems.push({
                    ...mem,
                    diaId,
                    Nombre_Dia: dayData?.Nombre_Dia || 'Día',
                    Fecha_Original: new Date(mem.Fecha_Original)
                });
            }
        });
    }
    
    // Ordenar por fecha
    allItems.sort((a, b) => b.Fecha_Original - a.Fecha_Original);
    
    // Paginar
    let startIndex = 0;
    if (lastVisibleId) {
        startIndex = allItems.findIndex(item => item.id === lastVisibleId) + 1;
    }
    
    const items = allItems.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < allItems.length;
    const lastVisible = items.length > 0 ? items[items.length - 1].id : null;
    
    return { items, lastVisible, hasMore };
}

/**
 * Obtiene días con nombres especiales (paginado)
 */
async function getNamedDays(pageSize = 10, lastVisibleId = null) {
    const days = loadFromLocal(DAYS_KEY, {});
    const namedDays = Object.values(days)
        .filter(day => day.Nombre_Especial !== 'Unnamed Day')
        .sort((a, b) => a.Nombre_Especial.localeCompare(b.Nombre_Especial));
    
    // Paginar
    let startIndex = 0;
    if (lastVisibleId) {
        startIndex = namedDays.findIndex(day => day.id === lastVisibleId) + 1;
    }
    
    const items = namedDays.slice(startIndex, startIndex + pageSize).map(day => ({
        ...day,
        diaId: day.id,
        type: 'Nombres'
    }));
    
    const hasMore = startIndex + pageSize < namedDays.length;
    const lastVisible = items.length > 0 ? items[items.length - 1].id : null;
    
    return { items, lastVisible, hasMore };
}

/**
 * Carga memorias de un mes para Timeline
 */
async function loadMonthForTimeline(monthIndex) {
    if (monthIndex < 0 || monthIndex > 11) {
        throw new Error('Índice de mes inválido');
    }
    
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    const monthName = MONTH_NAMES[monthIndex];
    const monthStr = (monthIndex + 1).toString().padStart(2, '0');
    
    const allDaysWithMemories = [];
    
    // Recorrer días del mes
    for (let d = 1; d <= DAYS_IN_MONTH[monthIndex]; d++) {
        const dayStr = d.toString().padStart(2, '0');
        const diaId = `${monthStr}-${dayStr}`;
        
        if (memories[diaId] && memories[diaId].length > 0) {
            const dayData = days[diaId];
            const dayMemories = memories[diaId].map(mem => ({
                ...mem,
                Fecha_Original: new Date(mem.Fecha_Original)
            })).sort((a, b) => b.Fecha_Original - a.Fecha_Original);
            
            allDaysWithMemories.push({
                diaId,
                nombreDia: dayData?.Nombre_Dia || 'Día',
                nombreEspecial: dayData?.Nombre_Especial || 'Unnamed Day',
                memories: dayMemories
            });
        }
    }
    
    if (allDaysWithMemories.length > 0) {
        console.log(`Store: Timeline procesado. ${allDaysWithMemories.length} días para ${monthName}`);
        return {
            monthName,
            days: allDaysWithMemories
        };
    }
    
    console.log(`Store: Timeline procesado. Sin datos para ${monthName}`);
    return null;
}

// --- 5. Importar/Exportar CSV ---

/**
 * Exporta todo a CSV
 */
async function exportToCSV() {
    console.log('Exportando datos a CSV...');
    
    const days = loadFromLocal(DAYS_KEY, {});
    const memories = loadFromLocal(MEMORIES_KEY, {});
    
    const rows = [];
    rows.push(['AÑO', 'MES', 'DÍA', 'TIPO', 'CONTENIDO', 'DATOS_EXTRA']);
    
    // Ordenar días
    const sortedDays = Object.keys(days).sort();
    
    for (const diaId of sortedDays) {
        const dayData = days[diaId];
        const [mes, dia] = diaId.split('-');
        
        // Exportar nombre del día
        if (dayData.Nombre_Especial && dayData.Nombre_Especial !== 'Unnamed Day') {
            rows.push(['', mes, dia, 'Nombre', dayData.Nombre_Especial, '']);
        }
        
        // Exportar memorias
        if (memories[diaId]) {
            memories[diaId].forEach(mem => {
                let year = '';
                if (mem.Fecha_Original) {
                    const date = new Date(mem.Fecha_Original);
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
    
    // Convertir a CSV
    const csvContent = rows.map(row =>
        row.map(cell => {
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
 * Importa desde CSV
 */
async function importFromCSV(csvContent, onProgress) {
    console.log('Importando datos desde CSV...');
    onProgress('Procesando archivo...');
    
    const lines = csvContent.split(/\r\n|\n/);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const row = _parseCSVLine(lines[i]);
        if (row.length >= 5) {
            rows.push(row);
        }
    }
    
    console.log(`CSV parseado: ${rows.length} filas`);
    onProgress(`Importando ${rows.length} elementos...`);
    
    const memories = loadFromLocal(MEMORIES_KEY, {});
    const days = loadFromLocal(DAYS_KEY, {});
    let imported = 0;
    let errors = 0;
    
    for (const row of rows) {
        try {
            const [year, mes, dia, tipo, contenido, datosExtra] = row.map(c => c.trim());
            
            if (!mes || !dia || !tipo || !contenido) {
                errors++;
                continue;
            }
            
            const mesNum = parseInt(mes);
            const diaNum = parseInt(dia);
            
            if (mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) {
                errors++;
                continue;
            }
            
            const diaId = `${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            
            // Importar nombre
            if (tipo === 'Nombre' && !year) {
                if (days[diaId]) {
                    days[diaId].Nombre_Especial = contenido;
                    imported++;
                }
            }
            // Importar memoria
            else if (year) {
                const yearNum = parseInt(year);
                if (yearNum < 1900 || yearNum > 2100) {
                    errors++;
                    continue;
                }
                
                const fullDate = new Date(Date.UTC(yearNum, mesNum - 1, diaNum));
                
                const memData = {
                    id: generateId(),
                    Tipo: tipo,
                    Fecha_Original: fullDate.toISOString(),
                    Creado_En: new Date().toISOString()
                };
                
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
                                console.warn('Error parseando datos extra de lugar:', e);
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
                                console.warn('Error parseando datos extra de música:', e);
                            }
                        }
                        break;
                }
                
                if (!memories[diaId]) {
                    memories[diaId] = [];
                }
                memories[diaId].push(memData);
                
                if (days[diaId]) {
                    days[diaId].tieneMemorias = true;
                }
                
                imported++;
            }
        } catch (e) {
            console.error('Error procesando fila:', row, e);
            errors++;
        }
    }
    
    saveToLocal(MEMORIES_KEY, memories);
    saveToLocal(DAYS_KEY, days);
    
    console.log(`Importación completa: ${imported} importados, ${errors} errores`);
    onProgress(`Importación completa: ${imported} elementos`);
    
    return { imported, errors };
}

/**
 * Helper para parsear línea CSV
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
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// --- Exportaciones ---
export {
    checkAndRunApp,
    loadAllDaysData,
    loadMemoriesForDay,
    saveDayName,
    saveMemory,
    deleteMemory,
    uploadImage,
    getLocalImage,
    searchMemories,
    getTodaySpotlight,
    getMemoriesByType,
    getNamedDays,
    loadMonthForTimeline,
    exportToCSV,
    importFromCSV,
    clearSampleData
};
