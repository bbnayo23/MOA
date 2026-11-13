// MOA service worker: opens instantly (and offline) from cache, always prefers fresh pages.
const CACHE = 'moa-v1';
// ponytail: runtime cache capped by entry count, not a build-time precache list; switch to one if offline must be exact.
const MAX_ENTRIES = 40;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

async function put(req, res) {
  if (!res.ok) return res;
  const cache = await caches.open(CACHE);
  await cache.put(req, res.clone());
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) await cache.delete(keys[0]); // oldest first
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // network first; offline → the last app shell we saw
    e.respondWith(fetch(req).then((res) => put('/', res)).catch(() => caches.match('/')));
  } else if (url.pathname.startsWith('/assets/')) {
    // hashed build files never change: cache first
    e.respondWith(caches.match(req).then((hit) => hit ?? fetch(req).then((res) => put(req, res))));
  } else {
    e.respondWith(fetch(req).then((res) => put(req, res)).catch(() => caches.match(req)));
  }
});
