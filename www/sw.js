// يخزن ملفات التطبيق عشان يشتغل بدون نت
const CACHE = 'ghars-v2';
const ASSETS = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg',
  'js/app.js', 'js/store.js', 'js/trees.js', 'js/forest.js', 'js/sound.js', 'js/time.js', 'js/platform.js',
  'vendor/capacitor-core.js',
  'fonts/BalooBhaijaan2-500-arabic.woff2',
  'fonts/BalooBhaijaan2-500-latin.woff2',
  'fonts/BalooBhaijaan2-700-arabic.woff2',
  'fonts/BalooBhaijaan2-700-latin.woff2',
  'fonts/BalooBhaijaan2-800-arabic.woff2',
  'fonts/BalooBhaijaan2-800-latin.woff2',
  'fonts/Tajawal-200-arabic.woff2',
  'fonts/Tajawal-200-latin.woff2',
  'fonts/Tajawal-300-arabic.woff2',
  'fonts/Tajawal-300-latin.woff2',
  'fonts/Tajawal-400-arabic.woff2',
  'fonts/Tajawal-400-latin.woff2',
  'fonts/Tajawal-500-arabic.woff2',
  'fonts/Tajawal-500-latin.woff2',
  'fonts/Tajawal-700-arabic.woff2',
  'fonts/Tajawal-700-latin.woff2',
  'fonts/fonts.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match('index.html'))));
});
