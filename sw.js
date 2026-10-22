// Service worker: lets Friend Caller open even with no internet.
// Bump VERSION whenever you change any file below so phones pick up the update.
const VERSION = "fc-v5";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/FriendCaller.css",
  "./src/FriendCaller.js",
  "./src/FriendCallerView.js",
  "./src/mithril-shim.js",
  "./vendor/mithril.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first, so updates show up right away when online; cache when offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
