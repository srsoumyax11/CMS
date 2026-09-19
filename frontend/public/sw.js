const CACHE_NAME = 'cms-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json' // Optional: if it exists
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if found
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // Don't cache non-success or non-basic responses
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Cache API responses specifically for /notices and /timetable
            const url = new URL(event.request.url);
            if (url.pathname.includes('/api/notices') || url.pathname.includes('/api/timetable')) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return networkResponse;
          }
        ).catch(() => {
            // Fallback for API endpoints if offline and not in cache
            if (event.request.url.includes('/api/')) {
                return new Response(JSON.stringify({
                    success: false,
                    error: "You are offline. Unable to fetch fresh data.",
                    data: null
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
