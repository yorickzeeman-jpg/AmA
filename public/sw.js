// AEB Portal — Service Worker v1
// Caches the app shell for instant load and offline access.
// Strategy: Cache-first for assets, Network-first for API calls.

const CACHE_NAME  = 'aeb-portal-v1'
const SHELL_CACHE = 'aeb-shell-v1'

// App shell — files that make the app work offline
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// ── INSTALL — cache the app shell ─────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing AEB Portal service worker')
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => {
        console.log('[SW] Caching app shell')
        return cache.addAll(SHELL_FILES)
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Shell cache failed:', err))
  )
})

// ── ACTIVATE — clean up old caches ────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating new service worker')
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== SHELL_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// ── FETCH — serve from cache, update in background ────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Skip non-GET and external requests
  if (event.request.method !== 'GET') return
  if (!url.origin === location.origin) return

  // For navigation requests (page loads) — network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          return response
        })
        .catch(() => {
          // Offline — serve cached index.html (SPA handles routing)
          return caches.match('/index.html')
            || caches.match('/')
        })
    )
    return
  }

  // For assets (JS, CSS, images, fonts) — cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Serve from cache immediately, refresh in background
        const refresh = fetch(event.request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, response.clone()))
          }
          return response
        }).catch(() => {})
        return cached
      }
      // Not cached — fetch from network and cache it
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
        }
        return response
      }).catch(() => {
        // Offline and not cached — return empty response for assets
        return new Response('', { status: 408, statusText: 'Offline' })
      })
    })
  )
})

// ── MESSAGE — force update from app ───────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    console.log('[SW] Forced update — skipping waiting')
    self.skipWaiting()
  }
})
