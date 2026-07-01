const CACHE_NAME = 'destana-iklim-v1';

// Daftar file lokal yang wajib di-cache saat pertama kali install
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './enso.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate dan bersihkan cache lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Strategi Intercept Fetch Request
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Strategi "Network First" untuk API Cuaca Open-Meteo
    // Selalu coba ambil data cuaca terbaru, jika offline, gunakan data cache terakhir
    if (url.hostname.includes('api.open-meteo.com')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clonedResponse = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 2. Strategi "Stale-While-Revalidate" untuk file lain (HTML, CDN Tailwind, Leaflet, FontAwesome)
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Simpan ke cache untuk penggunaan berikutnya
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Biarkan jika gagal fetch (offline)
            });

            // Return cache langsung jika ada, sambari background fetch memperbarui cache
            return cachedResponse || fetchPromise;
        })
    );
});