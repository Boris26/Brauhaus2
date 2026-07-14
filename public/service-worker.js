// Minimaler Service Worker für die Installierbarkeit der Brauhaus-PWA.
// Aktuell wird bewusst keine eigene Cache-Strategie verwendet:
// - keine API-Antworten
// - keine Steuerungsstatus
// - keine Datenbankantworten
// - keine Build-Metadaten wie index.html, manifest.json, asset-manifest.json oder version.json
// So bleiben Browser-/Server-Caches und bestehende Versionsmechanismen maßgeblich.
const SERVICE_WORKER_VERSION = 'brauhaus-push-v2';

self.addEventListener('install', function() {
  console.debug('[ServiceWorker] Installed', SERVICE_WORKER_VERSION);
  // skipWaiting() wird absichtlich nicht aufgerufen: Ein Update soll eine laufende
  // Brauansicht nicht ungefragt durch einen neuen Service Worker übernehmen.
});

self.addEventListener('activate', function(event) {
  console.debug('[ServiceWorker] Activated', SERVICE_WORKER_VERSION);
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function() {
  // Keine Fetch-Antwort wird durch den Service Worker ersetzt: jede Anfrage läuft unverändert über Netzwerk,
  // Browser-Cache oder Server-Cache. Das gilt insbesondere für /api/database/*
  // und /api/controller/*.
});

const DEFAULT_NOTIFICATION = {
  title: 'Brauhaus',
  body: 'Eine neue Brauhaus-Benachrichtigung ist eingegangen.',
  url: '/',
  tag: 'brauhaus-push',
  icon: '/logo192.png',
  badge: '/logo192.png'
};

function parsePushPayload(event) {
  if (!event.data) {
    return DEFAULT_NOTIFICATION;
  }

  try {
    const payload = event.data.json();
    return Object.assign({}, DEFAULT_NOTIFICATION, payload || {});
  } catch (error) {
    console.error('[ServiceWorker] Push payload parsing failed', error);
    return DEFAULT_NOTIFICATION;
  }
}

function getPayloadData(payload) {
  if (payload && payload.data && typeof payload.data === 'object') {
    return payload.data;
  }
  return {};
}

function sameOriginUrl(url) {
  try {
    const target = new URL(url || '/', self.location.origin);
    if (target.origin !== self.location.origin) {
      return '/';
    }
    return target.pathname + target.search + target.hash;
  } catch (error) {
    return '/';
  }
}

self.addEventListener('push', function(event) {
  console.debug('[ServiceWorker] Push event received');
  const payload = parsePushPayload(event);
  const title = typeof payload.title === 'string' && payload.title ? payload.title : DEFAULT_NOTIFICATION.title;
  const options = {
    body: typeof payload.body === 'string' ? payload.body : DEFAULT_NOTIFICATION.body,
    icon: typeof payload.icon === 'string' ? payload.icon : DEFAULT_NOTIFICATION.icon,
    badge: typeof payload.badge === 'string' ? payload.badge : DEFAULT_NOTIFICATION.badge,
    tag: typeof payload.tag === 'string' ? payload.tag : DEFAULT_NOTIFICATION.tag,
    renotify: true,
    data: Object.assign({}, getPayloadData(payload), {
      url: sameOriginUrl(payload.url),
      serviceWorkerVersion: SERVICE_WORKER_VERSION
    })
  };

  const notificationPromise = self.registration.showNotification(title, options)
    .catch(function(error) {
      console.error('[ServiceWorker] Notification display failed', error);
      throw error;
    });

  event.waitUntil(notificationPromise);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = sameOriginUrl(event.notification && event.notification.data && event.notification.data.url);

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
    for (const client of clientList) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === self.location.origin && 'focus' in client) {
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
    return undefined;
  }));
});
