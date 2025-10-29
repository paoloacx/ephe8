// utils.js - Funciones helper para la aplicación

/**
 * Formatea una fecha en formato legible español
 * @param {Date|string|number} date - La fecha a formatear
 * @param {Object} options - Opciones de formato
 * @returns {string} Fecha formateada
 */
export function formatDate(date, options = {}) {
    const {
        includeTime = false,
        includeSeconds = false,
        shortFormat = false
    } = options;

    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
        return 'Fecha inválida';
    }

    const dateOptions = {
        year: 'numeric',
        month: shortFormat ? '2-digit' : 'long',
        day: '2-digit'
    };

    if (includeTime) {
        dateOptions.hour = '2-digit';
        dateOptions.minute = '2-digit';
        if (includeSeconds) {
            dateOptions.second = '2-digit';
        }
    }

    return d.toLocaleDateString('es-ES', dateOptions);
}

/**
 * Formatea una fecha en formato ISO (YYYY-MM-DD)
 * @param {Date|string|number} date - La fecha a formatear
 * @returns {string} Fecha en formato ISO
 */
export function formatDateISO(date) {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
        return '';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Formatea una hora en formato HH:MM
 * @param {Date|string|number} date - La fecha/hora a formatear
 * @returns {string} Hora formateada
 */
export function formatTime(date) {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
        return '';
    }

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {Date|string|number} date1 - Primera fecha
 * @param {Date|string|number} date2 - Segunda fecha
 * @returns {number} Diferencia en días
 */
export function getDaysDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        return 0;
    }

    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Valida si una fecha es válida
 * @param {Date|string|number} date - La fecha a validar
 * @returns {boolean} True si es válida
 */
export function isValidDate(date) {
    const d = new Date(date);
    return !isNaN(d.getTime());
}

/**
 * Valida un email
 * @param {string} email - El email a validar
 * @returns {boolean} True si es válido
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valida una URL
 * @param {string} url - La URL a validar
 * @returns {boolean} True si es válida
 */
export function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Valida que un string no esté vacío
 * @param {string} str - El string a validar
 * @returns {boolean} True si no está vacío
 */
export function isNotEmpty(str) {
    return str && typeof str === 'string' && str.trim().length > 0;
}

/**
 * Valida que un número esté en un rango
 * @param {number} num - El número a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {boolean} True si está en el rango
 */
export function isInRange(num, min, max) {
    return typeof num === 'number' && num >= min && num <= max;
}

/**
 * Trunca un texto a una longitud máxima
 * @param {string} text - El texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @param {string} suffix - Sufijo a añadir (default: '...')
 * @returns {string} Texto truncado
 */
export function truncateText(text, maxLength, suffix = '...') {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitaliza la primera letra de un string
 * @param {string} str - El string a capitalizar
 * @returns {string} String capitalizado
 */
export function capitalize(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convierte un objeto en query string
 * @param {Object} params - Objeto con parámetros
 * @returns {string} Query string
 */
export function toQueryString(params) {
    if (!params || typeof params !== 'object') {
        return '';
    }
    
    return Object.keys(params)
        .filter(key => params[key] !== undefined && params[key] !== null)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
}

/**
 * Parsea un query string a objeto
 * @param {string} queryString - Query string a parsear
 * @returns {Object} Objeto con parámetros
 */
export function parseQueryString(queryString) {
    if (!queryString || typeof queryString !== 'string') {
        return {};
    }
    
    const params = {};
    const pairs = queryString.replace(/^\?/, '').split('&');
    
    pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
            params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
        }
    });
    
    return params;
}

/**
 * Debounce function - retrasa la ejecución de una función
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función con debounce
 */
export function debounce(func, wait = 300) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - limita la frecuencia de ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function} Función con throttle
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Genera un ID único
 * @returns {string} ID único
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formatea un número con separadores de miles
 * @param {number} num - Número a formatear
 * @param {number} decimals - Número de decimales
 * @returns {string} Número formateado
 */
export function formatNumber(num, decimals = 0) {
    if (typeof num !== 'number' || isNaN(num)) {
        return '0';
    }
    
    return num.toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Clona profundamente un objeto
 * @param {*} obj - Objeto a clonar
 * @returns {*} Objeto clonado
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Compara dos objetos para ver si son iguales
 * @param {*} obj1 - Primer objeto
 * @param {*} obj2 - Segundo objeto
 * @returns {boolean} True si son iguales
 */
export function isEqual(obj1, obj2) {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
        if (!keys2.includes(key)) return false;
        if (!isEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
}

/**
 * Obtiene un valor anidado de un objeto usando notación de punto
 * @param {Object} obj - Objeto
 * @param {string} path - Ruta (ej: 'user.address.city')
 * @param {*} defaultValue - Valor por defecto
 * @returns {*} Valor encontrado o defaultValue
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
    if (!obj || !path) return defaultValue;
    
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result == null || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
}

/**
 * Sanitiza un string para HTML
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
export function sanitizeHtml(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Escapa caracteres especiales para RegExp
 * @param {string} str - String a escapar
 * @returns {string} String escapado
 */
export function escapeRegExp(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Agrupa un array de objetos por una propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} key - Propiedad por la que agrupar
 * @returns {Object} Objeto con grupos
 */
export function groupBy(array, key) {
    if (!Array.isArray(array)) {
        return {};
    }
    
    return array.reduce((result, item) => {
        const group = getNestedValue(item, key);
        if (group !== undefined) {
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
        }
        return result;
    }, {});
}

/**
 * Ordena un array de objetos por una propiedad
 * @param {Array} array - Array a ordenar
 * @param {string} key - Propiedad por la que ordenar
 * @param {string} order - 'asc' o 'desc'
 * @returns {Array} Array ordenado
 */
export function sortBy(array, key, order = 'asc') {
    if (!Array.isArray(array)) {
        return [];
    }
    
    const sorted = [...array].sort((a, b) => {
        const valueA = getNestedValue(a, key);
        const valueB = getNestedValue(b, key);
        
        if (valueA === valueB) return 0;
        if (valueA === undefined) return 1;
        if (valueB === undefined) return -1;
        
        if (valueA < valueB) return order === 'asc' ? -1 : 1;
        return order === 'asc' ? 1 : -1;
    });
    
    return sorted;
}

/**
 * Elimina duplicados de un array
 * @param {Array} array - Array con posibles duplicados
 * @param {string} key - Propiedad para comparar (opcional)
 * @returns {Array} Array sin duplicados
 */
export function unique(array, key = null) {
    if (!Array.isArray(array)) {
        return [];
    }
    
    if (!key) {
        return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
        const value = getNestedValue(item, key);
        if (seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

/**
 * Convierte bytes a formato legible
 * @param {number} bytes - Número de bytes
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Tamaño formateado
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Pausa la ejecución por un tiempo determinado
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} Promise que se resuelve después del tiempo
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Reintentar una función async con backoff exponencial
 * @param {Function} fn - Función async a ejecutar
 * @param {Object} options - Opciones de reintento
 * @returns {Promise} Resultado de la función
 */
export async function retry(fn, options = {}) {
    const {
        maxAttempts = 3,
        delay = 1000,
        backoff = 2,
        onRetry = null
    } = options;
    
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt < maxAttempts) {
                const waitTime = delay * Math.pow(backoff, attempt - 1);
                
                if (onRetry) {
                    onRetry(attempt, waitTime, error);
                }
                
                await sleep(waitTime);
            }
        }
    }
    
    throw lastError;
}
