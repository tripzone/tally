// Minimal service worker -- its only job is to exist with a fetch handler,
// which is what Chrome/Android require before they'll consider the app
// installable. It intentionally does no caching: Tally's data lives in
// Firestore and needs the network, so an offline cache would be misleading.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
