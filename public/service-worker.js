// Einfache Service Worker-Implementierung für PWA-Funktionalität
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Aktivierungscode
});

self.addEventListener('fetch', function(event) {
  // Standard: Netzwerkanfragen nicht cachen, aber hier könnte man erweitern
});

