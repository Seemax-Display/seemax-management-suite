const CACHE = "seemax-management-v1-9-1";
const CORE = [
  "./", "./index.html", "./assets/css/app.css", "./assets/js/config.js",
  "./assets/js/seed.js", "./assets/js/store.js", "./assets/js/api.js",
  "./assets/js/app.js", "./assets/js/client-tools.js", "./assets/vendor/libphonenumber-min.js",
  "./assets/data/italy-locations.json", "./assets/icons/icon.svg", "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
});
