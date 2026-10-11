// Offline service worker for the capture page. vite.config.ts fills in VERSION and FILES at build time and
// writes it out as dist/sw.js; a new build changes the bytes, so phones pick up the new version by themselves.
//
// Cache first for everything of ours: the page opens instantly and works with no network at all.
// Notes are NOT here: they live in IndexedDB, which the service worker never touches.

const VERSION = "0840f0919fc09429";
const FILES = [
  "/study-capture-pages/",
  "/study-capture-pages/assets/index-7EpHUZMG.js",
  "/study-capture-pages/assets/index-D0O9RG73.css",
  "/study-capture-pages/icons/icon-180.png",
  "/study-capture-pages/icons/icon-192.png",
  "/study-capture-pages/icons/icon-512-maskable.png",
  "/study-capture-pages/icons/icon-512.png",
  "/study-capture-pages/manifest.webmanifest"
];
const CACHE = `capture-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES.map((path) => new Request(path, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('capture-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    const scope = self.registration.scope;
    event.respondWith(
      (async () => {
        // Cloudflare Pages redirects /index.html to /. Use the canonical root shell first,
        // and never return a redirected response for a navigation (Safari rejects it).
        const shell = await caches.match(scope);
        if (shell && !shell.redirected) return shell;

        const response = await fetch(request);
        if (!response.redirected) return response;

        const canonical = await fetch(scope);
        if (!canonical.redirected) return canonical;

        throw new TypeError('No non-redirected navigation response is available');
      })(),
    );
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)));
});
