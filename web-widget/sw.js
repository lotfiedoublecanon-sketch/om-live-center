const CACHE = 'om-live-center-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=om-live-v1',
  './app.js?v=om-live-v1',
  './manifest.json',
  './assets/logo-om-live.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './data/mock.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || network;
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SHOW_NOTIFICATION') return;
  event.waitUntil(
    self.registration.showNotification(event.data.title || 'OM Live Center', {
      body: event.data.body || 'Nouvelle information de match',
      icon: './assets/logo-om-live.svg',
      badge: './assets/logo-om-live.svg',
      tag: event.data.matchId ? `match-${event.data.matchId}` : 'om-live',
      data: { url: './#live' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || './#live'));
});
