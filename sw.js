/* Uncle Safe — minimal offline shell service worker */
var CACHE = 'uncle-safe-v1';
var SHELL = [
  './',
  'tracker.html',
  'watch.html',
  'manifest.json',
  'icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE;
      }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* App pages: network-first with cache fallback (so updates arrive, offline still opens).
   Cloud API calls (supabase.co) are never cached — live data only. */
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname.indexOf('supabase') !== -1) return;
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then(function (res) {
      try {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      } catch (err) { /* ignore */ }
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('./');
      });
    })
  );
});
