const CACHE = 'om-live-center-react-v2';
const SHELL = ['./', './index.html', './manifest.json', './assets/logo-om-live.svg', './assets/icon-192.png', './assets/icon-512.png', './data/mock.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
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
          if (response.ok) caches.open(CACHE).then((cache) => cache.put('./index.html', response.clone()));
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
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type !== 'SHOW_NOTIFICATION') return;
  event.waitUntil(self.registration.showNotification(event.data.title || 'OM Live Center', {
    body: event.data.body || 'Nouvelle information de match',
    icon: './assets/icon-192.png',
    badge: './assets/icon-192.png',
    tag: event.data.matchId ? `match-${event.data.matchId}` : 'om-live',
    data: { url: './#live' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || './#live'));
});
