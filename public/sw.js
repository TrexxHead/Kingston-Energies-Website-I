// Storm prep offline support — best-effort, not a full app-shell precache.
// Static Next.js build assets (hashed, immutable) are cached the first time
// they're fetched; page documents are cached network-first so the most
// recent version wins while online, with the last-cached copy as a fallback
// when the network (or the power) is down. This does not guarantee a page
// works offline unless it's been opened at least once while online — that
// limitation is disclosed in the UI, not hidden.

const STATIC_CACHE = 'ke-static-v1'
const PAGE_CACHE = 'ke-pages-v1'
const OFFLINE_FALLBACK = '/hub/storm-prep'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') return caches.match(OFFLINE_FALLBACK)
        return Response.error()
      }),
  )
})
