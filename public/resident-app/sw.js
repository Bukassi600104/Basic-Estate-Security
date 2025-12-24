/* Minimal service worker for installability.
   Scope: /resident-app/
*/

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first; no offline caching behavior required.
  event.respondWith(fetch(event.request));
});
