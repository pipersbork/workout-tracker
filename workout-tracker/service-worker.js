const CACHE_NAME = "workout-tracker-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/style.css",
  "./assets/js/onboarding.js",
  "./assets/js/auth.js",
  "./assets/js/sync.js",
  "./assets/js/db.js",
  "./assets/js/app.js",
  "./assets/js/navigation.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// ✅ Install Event - Cache All Core Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("✅ Service Worker: Caching assets");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ✅ Activate Event - Remove Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🗑 Service Worker: Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ✅ Fetch Event - Offline-First Strategy
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request)
          .then((response) => {
            // Cache new resources dynamically
            return caches.open(CACHE_NAME).then((cache) => {
              if (event.request.url.startsWith("http")) {
                cache.put(event.request, response.clone());
              }
              return response;
            });
          })
          .catch(() => {
            // Optional: Return a fallback page if offline
            if (event.request.mode === "navigate") {
              return caches.match("./index.html");
            }
          })
      );
    })
  );
});
