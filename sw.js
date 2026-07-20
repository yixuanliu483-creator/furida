const CACHE_NAME = 'furida-v2';
const urlsToCache = [
  '/chat.html',
  '/login.html',
  '/index.html',
  '/css/style.css',
  '/js/chat.js',
  '/js/login.js',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 逐个缓存，单个文件失败不影响其他文件、不影响整体安装
      await Promise.all(
        urlsToCache.map((url) =>
          cache.add(url).catch(() => {
            console.warn('缓存失败，跳过:', url);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只处理同源的 GET 请求；跨域请求（比如去 Worker 后端的 API 调用）一律放行，不拦截、不缓存
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => cachedResponse);
    })
  );
});
