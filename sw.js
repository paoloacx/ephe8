/*
 * sw.js - Service Worker para modo offline
 * Caché de recursos estáticos y páginas visitadas
 */

const CACHE_VERSION = 'ephe-v1.0';
const OFFLINE_URL = '/ephe8/offline.html';

// Recursos críticos para cachear en la instalación
const STATIC_CACHE_URLS = [
    '/ephe8/',
    '/ephe8/index.html',
    '/ephe8/offline.html',
    '/ephe8/favicon.png',
    '/ephe8/style-base.css',
    '/ephe8/style-layout.css',
    '/ephe8/style-components.css',
    '/ephe8/style-views.css',
    '/ephe8/style-modals.css',
    '/ephe8/main.js',
    '/ephe8/ui.js',
    '/ephe8/ui-forms.js',
    '/ephe8/ui-modals.js',
    '/ephe8/ui-maps.js',
    '/ephe8/ui-render.js',
    '/ephe8/firebase.js',
    '/ephe8/auth.js',
    '/ephe8/store.js',
    '/ephe8/api.js',
    '/ephe8/utils.js',
    '/ephe8/settings.js',
    'https://fonts.googleapis.com/css2?family=Material+Icons+Outlined',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker v' + CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[SW] Cacheando recursos estáticos');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .catch((error) => {
                console.error('[SW] Error cacheando recursos:', error);
            })
    );
    self.skipWaiting();
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker v' + CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_VERSION) {
                        console.log('[SW] Eliminando caché antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Estrategia de fetch: Network First, luego Cache
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones no-GET y peticiones a dominios externos (excepto APIs conocidas)
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    
    // No cachear Firebase o APIs dinámicas
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('firestore') ||
        url.hostname.includes('googleapis') ||
        url.pathname.includes('/api/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Si la respuesta es válida, clonarla y guardarla en caché
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Si falla la red, intentar servir desde caché
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    
                    // Si es una página HTML y no está en caché, servir offline.html
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match(OFFLINE_URL);
                    }
                    
                    return new Response('Contenido no disponible offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// Mensaje del cliente para forzar actualización
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
