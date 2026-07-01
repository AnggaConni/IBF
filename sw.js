// Ubah versi cache (misal v2) setiap kali Anda melakukan perombakan besar
// agar browser membuang cache lama dan mengambil yang baru
const CACHE_NAME = 'destana-iklim-v2';

// Daftar file awal yang wajib disimpan saat pertama kali diinstal
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './enso.json',
    './icon-192x192.png',
    './icon-512x512.png',
    './screenshot.jpg'
];

// 1. Pendaftaran / Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache berhasil dibuka');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting(); // Memaksa SW baru segera aktif
});

// 2. Aktivasi & Pembersihan Cache Lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Hapus cache versi lama (v1) jika ada
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Memastikan SW langsung mengambil alih halaman
});

// 3. Strategi: NETWORK FIRST, FALLBACK TO CACHE
self.addEventListener('fetch', (event) => {
    // Kita hanya meng-cache request dengan metode GET (jangan cache POST/PUT)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        // LANGKAH 1: Selalu coba ambil dari Internet (Network First)
        fetch(event.request)
            .then((networkResponse) => {
                // Jika berhasil, kloning respon tersebut untuk disimpan ke dalam Cache
                // agar kita selalu punya salinan paling baru (Last Connection)
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                
                // Berikan data terbaru langsung ke aplikasi
                return networkResponse;
            })
            .catch(() => {
                // LANGKAH 2: Jika gagal (karena Offline/Tidak ada sinyal)
                // Coba cari data tersebut di dalam Cache (Secondary Offline Use)
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // (Opsional) Jika tidak ada di cache sama sekali dan offline,
                    // Anda bisa mengembalikan halaman offline custom di sini jika mau
                });
            })
    );
});
