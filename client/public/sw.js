// Service worker: lets the app install on phones, tablets and computers and open quickly.
// Pages and files are cached; the API (/api) is never cached, so questions and downloads are always live.
const CACHE = 'qp-gen-v2';
const SHELL = ['/', '/manifest.webmanifest', '/brand/icon-192.png', '/brand/icon-512.png', '/brand/crest.png', '/brand/favicon.ico'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api')) return;
  if (url.pathname.startsWith('/downloads/') || /\.(mp3|mp4)$/.test(url.pathname)) return;

  if (req.mode === 'navigate') {
    // network first so a new deployment shows up at once; cached page when offline
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); return r; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    })
  );
});
