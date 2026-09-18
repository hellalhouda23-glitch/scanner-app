// Iskaan PWA service worker — v3 (English name + new cyan/blue icon)
const CACHE_VERSION = 'iskaan-v3-2026-09-17';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './Amiri-Regular.ttf',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(err => console.warn('SW precache partial:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (
    url.host.includes('tessdata') ||
    url.host.includes('tesseract') ||
    url.pathname.includes('worker.min') ||
    url.pathname.includes('core.wasm') ||
    url.pathname.includes('traineddata')
  ) return;
  if (url.host.includes('jsdelivr') && url.pathname.includes('jspdf')) {
    event.respondWith(
      caches.match(req).then(c => c || fetch(req).then(resp => {
        if (resp.ok) { const cl = resp.clone(); caches.open(CACHE_VERSION).then(co => co.put(req, cl)); }
        return resp;
      }))
    );
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp.ok && resp.type === 'basic') {
            const cl = resp.clone();
            caches.open(CACHE_VERSION).then(c => c.put(req, cl));
          }
          return resp;
        }).catch(() => caches.match('./index.html'));
      })
    );
  }
});
