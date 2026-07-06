// AEB Portal — Service Worker v3
// Fixed: external requests (Supabase, APIs) are never intercepted
// Strategy: Cache-first for local assets only. All external requests go direct to network.

const CACHE_NAME  = 'aeb-portal-v3'
const SHELL_CACHE = 'aeb-shell-v3'

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Domains that must NEVER be intercepted by the service worker
const PASSTHROUGH_DOMAINS = [
  'supabase.co',
  'resend.com',
  'anthropic.com',
]

function isPassthrough(url) {
  return PASSTHROUGH_DOMAINS.some(domain => url.hostname.endsWith(domain))
}

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW v3] Installing')
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW v3] Shell cache failed:', err))
  )
})

// ── ACTIVATE — clean ALL old caches ──────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW v3] Activating — clearing old caches')
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== SHELL_CACHE)
          .map(key => {
            console.log('[SW v3] Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    ).then(() => self.clients.claim())
  )
})

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // CRITICAL: never intercept external APIs — let them go straight to network
  if (isPassthrough(url)) return
  if (url.origin !== location.origin) return

  // Skip non-GET
  if (event.request.method !== 'GET') return

  // Navigation — network first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match('/index.html') || caches.match('/'))
    )
    return
  }

  // Local assets — cache first, refresh in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()))
        }
        return response
      }).catch(() => null)

      return cached || networkFetch
    })
  )
})

// ── MESSAGE ───────────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
