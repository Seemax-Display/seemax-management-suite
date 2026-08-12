const CACHE = "seemax-management-v2-13-0";
const CORE = [
  "./", "./index.html", "./assets/css/app.css", "./assets/js/config.js",
  "./assets/js/seed.js", "./assets/js/store.js", "./assets/js/api.js",
  "./assets/js/app.js", "./assets/js/client-tools.js", "./assets/js/planner-native.js",
  "./assets/icons/icon.svg", "./manifest.webmanifest",
  "./assets/conformity/p19-1.png", "./assets/conformity/p19-2.png",
  "./assets/conformity/p25-1.png", "./assets/conformity/p25-2.png",
  "./assets/conformity/p3-1.png", "./assets/conformity/p3-2.png",
  "./assets/conformity/p391-1.png", "./assets/conformity/p391-2.png",
  "./assets/conformity/p4-1.png", "./assets/conformity/p4-2.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put("./index.html", copy)); return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  const liveCode = /\.(?:js|css)$/.test(url.pathname);
  if (liveCode) {
    event.respondWith(fetch(event.request).then((response) => {
      if (response && response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response && response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  })));
});
