/**
 * A&B Design Studio Collaboration Portal — Production Service Worker
 *
 * Security & Reliability Rules:
 * 1. ONLY static application shell assets, public brand logos, and offline fallback are cached.
 * 2. Authenticated API calls (/api/*), WebSockets (/socket.io/*), OTPs, tokens, and private
 *    drawings are strictly NEVER cached.
 * 3. Navigation requests use Network-First with fallback to App Shell or branded offline.html.
 * 4. Stale caches are purged on activation and user logout.
 */

const CACHE_VERSION = 'afdesign-v1.0.0';
const STATIC_CACHE = `afdesign-static-${CACHE_VERSION}`;
const IMMUTABLE_CACHE = `afdesign-immutable-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-192-maskable.png',
  '/assets/icons/icon-512-maskable.png',
  '/assets/auth/asf_logo.svg',
  '/assets/auth/asf_logo.png',
  '/assets/auth/editorial_courtyard_clean.png',
];

// URLs that must NEVER be intercepted or cached
function shouldBypassCache(url, request) {
  // Only GET requests can ever be cached
  if (request.method !== 'GET') {
    return true;
  }

  const pathname = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();

  // 1. Backend REST APIs
  if (pathname.startsWith('/api/')) {
    return true;
  }

  // 2. Real-time WebSocket transports
  if (pathname.startsWith('/socket.io/')) {
    return true;
  }

  // 3. Sensitive authentication tokens, credentials, and OTPs
  if (
    pathname.includes('auth') ||
    pathname.includes('login') ||
    pathname.includes('logout') ||
    pathname.includes('otp') ||
    pathname.includes('token') ||
    pathname.includes('setup') ||
    pathname.includes('invite') ||
    pathname.includes('secret') ||
    search.includes('token') ||
    search.includes('otp')
  ) {
    return true;
  }

  // 4. Blob URLs, data URLs, and temporary uploads
  if (url.protocol === 'blob:' || url.protocol === 'data:') {
    return true;
  }

  return false;
}

// Install Event — Pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[PWA SW] Precache partial error (ignoring non-critical):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event — Remove outdated caches and take control
self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE, IMMUTABLE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (!allowedCaches.includes(name)) {
              console.log('[PWA SW] Removing old cache:', name);
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event — Safe, Secure Request Handling
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Strict Security Bypass: Never cache APIs or sensitive endpoints
  if (shouldBypassCache(url, request)) {
    return; // Pass through to standard browser network stack
  }

  // 2. Navigation Requests (HTML Pages)
  // Strategy: Network-First -> Fallback to Cached Shell -> Fallback to Branded offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response from server, update cached index.html
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // If network failed, try cached version of requested page or /index.html
          const cachedPage = await caches.match(request);
          if (cachedPage) return cachedPage;

          const cachedShell = await caches.match('/index.html');
          if (cachedShell) return cachedShell;

          // If completely offline and shell is unavailable, serve branded offline.html
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) return offlinePage;

          return new Response('A&F Design Portal is currently offline.', {
            headers: { 'Content-Type': 'text/plain' },
          });
        })
    );
    return;
  }

  // 3. Immutable Hashed Assets (/assets/*.js, /assets/*.css, fonts)
  // Strategy: Cache-First
  const isHashedAsset =
    url.pathname.startsWith('/assets/') &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.woff2'));

  if (isHashedAsset) {
    event.respondWith(
      caches.open(IMMUTABLE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 4. Static Images and Icons
  // Strategy: Stale-While-Revalidate
  const isStaticImage =
    url.pathname.startsWith('/assets/icons/') ||
    url.pathname.startsWith('/assets/auth/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg');

  if (isStaticImage) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);

        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).catch(() => {
          return new Response('', { status: 408, statusText: 'Request timed out' });
        })
      );
    })
  );
});

// Message Listener — Update Management & Session Purge
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Skip Waiting: Immediately activate new Service Worker
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Clear Session: Triggered on user logout to prevent cross-account cache leakage
  if (event.data.type === 'CLEAR_SESSION') {
    console.log('[PWA SW] Clearing volatile caches on session termination...');
    caches.keys().then((keys) => {
      keys.forEach((key) => {
        if (!key.startsWith('afdesign-static-')) {
          caches.delete(key);
        }
      });
    });
  }
});

// Push Event Listener — Native Web Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'A&F Design Portal', body: 'New notification received' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'A&F Design Portal', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || data.rawBody || 'New update available',
    icon: '/assets/icons/icon-192.png',
    badge: '/favicon.svg',
    data: {
      url: data.deepLink || data.url || '/',
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'A&F Design', options));
});

// Notification Click Listener — Focus or open app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

