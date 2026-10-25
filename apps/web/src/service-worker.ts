const sw = globalThis as unknown as any;

const CACHE_NAME = 'afdesign-portal-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

sw.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  sw.skipWaiting();
});

sw.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  sw.clients.claim();
});

sw.addEventListener('fetch', (event: any) => {
  // Network-first strategy for API and fast caching for assets
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          return caches.match('/index.html') as Promise<Response>;
        })
      );
    })
  );
});

sw.addEventListener('push', (event: any) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'A&F Design Notification';
    const options = {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: data.url || '/',
    };

    event.waitUntil(sw.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error receiving push message', err);
  }
});
