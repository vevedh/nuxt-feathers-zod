// Minimal service worker placeholder for the playground.
// This avoids Vue Router warnings when something requests /sw.js in dev.
// You can replace this with a real SW (PWA) later.
self.addEventListener('install', (event) => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
