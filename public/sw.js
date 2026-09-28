const CACHE_NAME = 'portfoliohubs-v4-cache';
const JSDELIVR_CACHE_NAME = 'portfoliohubs-jsdelivr-images-v1';

const ASSETS_TO_CACHE = [
  '/',
  './index.html',
  './manifest.webmanifest',
  './logo.png',
  './robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('SW pre-cache non-fatal error:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== JSDELIVR_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // 1. CacheFirst Strategy for jsDelivr CDN (Images & Assets)
  if (url.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.open(JSDELIVR_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Network failed and not in cache
              return new Response('', { status: 408, statusText: 'Offline CDN Asset' });
            });
        });
      })
    );
    return;
  }

  // Skip other cross-origin or chrome-extension requests
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Never cache admin authenticated route
  if (event.request.mode === 'navigate' && new URL(url).pathname.startsWith('/admin')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Stale-While-Revalidate Strategy for same-origin assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
