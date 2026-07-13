// Minimaler Service Worker für die Installierbarkeit der Brauhaus-PWA.
// Aktuell wird bewusst keine eigene Cache-Strategie verwendet:
// - keine API-Antworten
// - keine Steuerungsstatus
// - keine Datenbankantworten
// - keine Build-Metadaten wie index.html, manifest.json, asset-manifest.json oder version.json
// So bleiben Browser-/Server-Caches und bestehende Versionsmechanismen maßgeblich.
self.addEventListener('install', function() {
  // skipWaiting() wird absichtlich nicht aufgerufen: Ein Update soll eine laufende
  // Brauansicht nicht ungefragt durch einen neuen Service Worker übernehmen.
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function() {
  // Keine Fetch-Antwort wird durch den Service Worker ersetzt: jede Anfrage läuft unverändert über Netzwerk,
  // Browser-Cache oder Server-Cache. Das gilt insbesondere für /api/database/*
  // und /api/controller/*.
});
