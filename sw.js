// BABLAT Service Worker — Network-first para HTML, cache-first para assets estáticos
const CACHE = 'bablat-v4';
const STATIC = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

// Al instalar: solo cachea librerías externas
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting(); // Activa inmediatamente sin esperar
});

// Al activar: elimina cachés viejos y toma control
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Toma control de todas las pestañas
  );
});

// Fetch: network-first para HTML/datos, cache-first para Chart.js
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Chart.js y assets CDN → cache-first (no cambian)
  if (url.includes('cdnjs.cloudflare.com')) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // index.html y todo lo demás → network-first (siempre datos frescos)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cachea una copia para uso offline
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // Si no hay red → usa caché
  );
});
