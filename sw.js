// Service Worker: يجعل التطبيق قابلًا للتثبيت ويفتح بسرعة.
// ملفات التطبيق: الشبكة أولًا (حتى تصل التحديثات فورًا) ثم النسخة المخزّنة عند انقطاع الإنترنت.
// طلبات Supabase والـ CDN لا تمر من هنا ولا تُخزَّن أبدًا (البيانات دائمًا من الشبكة).
const CACHE = 'contractor-v1'
const SHELL = [
  './', 'index.html', 'config.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'js/calc.js', 'js/store.js', 'js/ui.js', 'js/dashboard.js', 'js/workers.js',
  'js/invoices.js', 'js/grouppay.js', 'js/project.js', 'js/archive.js', 'js/app.js',
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  )
})
