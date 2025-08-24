// Service Worker per Chora Planner PWA - Versione Offline Completa
const CACHE_NAME = 'chora-planner-v2.0';
const STATIC_CACHE = 'chora-static-v2.0';
const DYNAMIC_CACHE = 'chora-dynamic-v2.0';
const OFFLINE_CACHE = 'chora-offline-v2.0';

// File statici da cachare immediatamente
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-32.png',
    './icon-192.png',
    './icon-512.png'
];

// CDN assets critici da cachare immediatamente per funzionamento offline
const CRITICAL_CDN_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
];

// Assets aggiuntivi da cachare quando richiesti
const OPTIONAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.ttf',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.ttf',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.ttf'
];

// Installazione del Service Worker con caching completo per offline
self.addEventListener('install', event => {
    console.log('[SW] Service Worker installato - Preparazione cache offline');
    
    event.waitUntil(
        Promise.all([
            // Cache degli asset statici
            caches.open(STATIC_CACHE).then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            // Cache completa degli asset CDN critici per funzionamento offline
            caches.open(OFFLINE_CACHE).then(cache => {
                console.log('[SW] Pre-caching critical CDN assets for offline');
                return Promise.allSettled(
                    CRITICAL_CDN_ASSETS.map(async (url) => {
                        try {
                            const response = await fetch(url, { 
                                mode: 'cors',
                                cache: 'force-cache'
                            });
                            if (response.ok) {
                                await cache.put(url, response);
                                console.log('[SW] Cached:', url);
                            }
                        } catch (error) {
                            console.warn('[SW] Failed to cache:', url, error);
                        }
                    })
                );
            })
        ]).then(() => {
            console.log('[SW] Cache offline completata - App pronta per funzionamento offline');
            // Forza l'attivazione immediata
            return self.skipWaiting();
        }).catch(error => {
            console.error('[SW] Errore durante l\'installazione:', error);
            // Anche in caso di errore, procedi con l'installazione
            return self.skipWaiting();
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
                            cacheName !== OFFLINE_CACHE &&
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

// Gestione delle richieste di rete con supporto offline completo
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
        event.respondWith(cacheFirstOffline(request, STATIC_CACHE));
        return;
    }
    
    // Strategia Cache First per CDN assets critici (per funzionamento offline)
    if (CRITICAL_CDN_ASSETS.some(asset => request.url.includes(asset.split('/').pop()))) {
        event.respondWith(cacheFirstOffline(request, OFFLINE_CACHE));
        return;
    }
    
    // Strategia Cache First per font files
    if (request.url.includes('webfonts/') || request.url.includes('.woff') || request.url.includes('.ttf')) {
        event.respondWith(cacheFirstOffline(request, OFFLINE_CACHE));
        return;
    }
    
    // Strategia Network First per tutto il resto
    event.respondWith(networkFirstWithOfflineFallback(request, DYNAMIC_CACHE));
});

// Strategia Cache First ottimizzata per offline
async function cacheFirstOffline(request, cacheName) {
    try {
        // Prova prima tutte le cache disponibili
        const cacheNames = [cacheName, OFFLINE_CACHE, STATIC_CACHE, DYNAMIC_CACHE];
        
        for (const cache_name of cacheNames) {
            const cache = await caches.open(cache_name);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
                console.log('[SW] Cache hit in', cache_name, ':', request.url);
                return cachedResponse;
            }
        }
        
        console.log('[SW] Cache miss, fetching:', request.url);
        const networkResponse = await fetch(request, { 
            mode: 'cors',
            cache: 'default'
        });
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache First Offline error:', error);
        
        // Fallback per file critici - prova in tutte le cache
        const cacheNames = [OFFLINE_CACHE, STATIC_CACHE, DYNAMIC_CACHE];
        for (const cache_name of cacheNames) {
            try {
                const cache = await caches.open(cache_name);
                const fallbackResponse = await cache.match(request);
                if (fallbackResponse) {
                    console.log('[SW] Fallback found in', cache_name);
                    return fallbackResponse;
                }
            } catch (e) {
                console.warn('[SW] Fallback cache error:', e);
            }
        }
        
        // Ultimo fallback per HTML
        if (request.url.includes('index.html') || request.headers.get('accept')?.includes('text/html')) {
            try {
                const staticCache = await caches.open(STATIC_CACHE);
                const indexResponse = await staticCache.match('./index.html');
                if (indexResponse) {
                    return indexResponse;
                }
            } catch (e) {
                console.error('[SW] Index fallback failed:', e);
            }
        }
        
        throw error;
    }
}

// Strategia Network First con fallback offline robusto
async function networkFirstWithOfflineFallback(request, cacheName) {
    try {
        const networkResponse = await fetch(request, {
            mode: 'cors',
            cache: 'default'
        });
        
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying offline fallback:', request.url);
        
        // Prova in tutte le cache disponibili
        const cacheNames = [cacheName, OFFLINE_CACHE, STATIC_CACHE, DYNAMIC_CACHE];
        
        for (const cache_name of cacheNames) {
            try {
                const cache = await caches.open(cache_name);
                const cachedResponse = await cache.match(request);
                
                if (cachedResponse) {
                    console.log('[SW] Offline fallback found in', cache_name);
                    return cachedResponse;
                }
            } catch (e) {
                console.warn('[SW] Cache access error:', e);
            }
        }
        
        // Fallback per pagine HTML
        if (request.headers.get('accept')?.includes('text/html')) {
            try {
                const staticCache = await caches.open(STATIC_CACHE);
                const indexResponse = await staticCache.match('./index.html');
                if (indexResponse) {
                    console.log('[SW] HTML fallback served');
                    return indexResponse;
                }
            } catch (e) {
                console.error('[SW] HTML fallback failed:', e);
            }
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