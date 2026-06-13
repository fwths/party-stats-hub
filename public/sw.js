const CACHE_NAME = "mob-stats-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.png",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/merged-logo.png",
  "/manifest.webmanifest",
];

// Install Event - Precache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Precaching app shell");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", cache);
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch Event - Dynamic caching strategies
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Strategy for API requests: Network-First (try network, fallback to cache, update cache if network succeeds)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Put a clone of the response in the cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If offline, return cached response
          return caches.match(event.request);
        }),
    );
    return;
  }

  // Strategy for static assets and page routes: Stale-While-Revalidate
  // This ensures fast load times while updating the cache in the background
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback if network fails and no cache exists (e.g. offline and page not cached)
          // For navigation requests, fallback to '/' if offline
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });

      return cachedResponse || fetchPromise;
    }),
  );
});
