// Service Worker per Chora Planner PWA
const CACHE_NAME = 'chora-planner-v1.2';
const STATIC_CACHE = 'chora-static-v1.2';
const DYNAMIC_CACHE = 'chora-dynamic-v1.2';

// File statici da cachare immediatamente
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-32.png',
    './icon-192.png',
    './icon-512.png'
];

// CDN assets da cachare quando richiesti
const CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// Installazione del Service Worker
self.addEventListener('install', event => {
    console.log('[SW] Service Worker installato');
    
    event.waitUntil(
        Promise.all([
            // Cache degli asset statici
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            // Pre-cache degli asset CDN critici
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('[SW] Pre-caching CDN assets');
                return cache.addAll(CDN_ASSETS.slice(0, 2)); // Solo i primi 2 asset critici
            })
        ]).then(() => {
            console.log('[SW] Cache iniziale completata');
            // Forza l'attivazione immediata
            return self.skipWaiting();
        }).catch(error => {
            console.error('[SW] Errore durante l\'installazione:', error);
        })
    );
});

// Attivazione del Service Worker
self.addEventListener('activate', event => {
    console.log('[SW] Service Worker attivato');
    
    event.waitUntil(
        Promise.all([
            // Pulizia delle cache vecchie
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== CACHE_NAME) {
                            console.log('[SW] Eliminazione cache obsoleta:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Prendi il controllo di tutte le pagine
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Attivazione completata');
            // Notifica alle pagine che il SW è pronto
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ type: 'SW_ACTIVATED' });
                });
            });
        })
    );
});

// Gestione delle richieste di rete
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Ignora richieste non HTTP/HTTPS
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Strategia Cache First per asset statici
    if (STATIC_ASSETS.some(asset => request.url.includes(asset)) || 
        request.url.includes('icon-')) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }
    
    // Strategia Stale While Revalidate per CDN assets
    if (CDN_ASSETS.some(asset => request.url.includes(asset.split('/').pop()))) {
        event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
        return;
    }
    
    // Strategia Network First per tutto il resto
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
});

// Strategia Cache First
async function cacheFirst(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('[SW] Cache hit:', request.url);
            return cachedResponse;
        }
        
        console.log('[SW] Cache miss, fetching:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache First error:', error);
        // Fallback per file critici
        if (request.url.includes('index.html')) {
            return new Response('App offline - Ricarica quando torni online', {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        throw error;
    }
}

// Strategia Network First
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback per pagine HTML
        if (request.headers.get('accept').includes('text/html')) {
            const fallbackCache = await caches.open(STATIC_CACHE);
            return fallbackCache.match('./index.html');
        }
        
        throw error;
    }
}

// Strategia Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // Fetch in background per aggiornare la cache
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.log('[SW] Background fetch failed:', error);
    });
    
    // Restituisci immediatamente la versione cached se disponibile
    if (cachedResponse) {
        console.log('[SW] Serving from cache (stale):', request.url);
        return cachedResponse;
    }
    
    // Altrimenti aspetta il network
    console.log('[SW] No cache, waiting for network:', request.url);
    return fetchPromise;
}

// Gestione messaggi dall'app
self.addEventListener('message', event => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            console.log('[SW] Skip waiting richiesto');
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
            });
            break;
            
        default:
            console.log('[SW] Messaggio sconosciuto:', type);
    }
});

// Utility per ottenere la dimensione della cache
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// Utility per pulire tutte le cache
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// Gestione errori globali
self.addEventListener('error', event => {
    console.error('[SW] Errore globale:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Promise rejection non gestita:', event.reason);
});

console.log('[SW] Service Worker caricato');