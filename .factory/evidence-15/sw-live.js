const CACHE = 'living-room-lobby-5aa0299dc151b2ee16ac10be6f2e07be20a7bfd2';
const SHELL = ["/","/demo","/privacy","/terms","/manifest.webmanifest","/assets/lobby-hero.webp","/assets/index-D7uU5jl5.js","/assets/index-B2lU5tGs.css"];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  const navigation = event.request.mode === 'navigate';
  event.respondWith((async () => {
    if (navigation) {
      try {
        const response = await fetch(event.request);
        if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
        return response;
      } catch {
        return (await caches.match(event.request)) || (await caches.match('/')) || Response.error();
      }
    }

    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, response.clone())));
      return response;
    } catch {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
