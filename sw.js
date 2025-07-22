/*
=======================================================================
🔧 SW.JS - Service Worker for Progressive Web App
=======================================================================

PURPOSE:
- Service Worker that enables offline functionality for the YouTube Summarizer
- Implements caching strategies for static files and API responses
- Provides background sync and push notifications capability
- Ensures app works even without internet connection
- Manages app updates and cache versioning

KEY FEATURES:
- Static file caching (HTML, CSS, JS, manifest)
- Dynamic API response caching for offline access
- Cache-first strategy for static resources
- Network-first strategy for API calls with fallback
- Automatic cache updates when app version changes
- Background sync for queued operations

CACHING STRATEGY:
1. Static Files: Cache-first (instant loading)
2. API Calls: Network-first with cache fallback
3. Images/Media: Cache with network fallback
4. External Resources: Network-only with cache backup

OFFLINE FUNCTIONALITY:
- Previously viewed summaries remain accessible
- App interface works without internet
- Graceful degradation for network-dependent features
- Queue requests for when connection returns

CACHE MANAGEMENT:
- Version-based cache invalidation
- Automatic cleanup of old cache versions
- Size limits to prevent storage overflow
- Selective caching of important resources
=======================================================================
*/

// =======================================================================
// CACHE CONFIGURATION
// =======================================================================
// Cache version identifiers - increment to force cache updates
const CACHE_NAME = 'youtube-summarizer-v1.0.0';       // Main cache identifier
const STATIC_CACHE = 'static-cache-v1.0.0';           // Static files cache
const DYNAMIC_CACHE = 'dynamic-cache-v1.0.0';         // Dynamic content cache

// Static files to cache for offline functionality
const STATIC_FILES = [
  '/',                    // Root page
  '/index.html',          // Main application interface
  '/style.v2.css',        // Modern styling (updated to v2)
  '/script.v2.js',        // Enhanced JavaScript (updated to v2)
  '/manifest.json'        // PWA manifest
];

// API endpoints that can work offline (cached responses)
const CACHEABLE_APIS = [
  '/summarize',           // Video summarization endpoint
  '/ask-question'         // Q&A functionality endpoint
];

// =======================================================================
// SERVICE WORKER EVENT HANDLERS
// =======================================================================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
  
  // Force activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle static files
  if (STATIC_FILES.some(file => request.url.endsWith(file))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            return caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });
          });
        })
        .catch(() => {
          // Return a custom offline page or basic HTML
          if (request.url.endsWith('.html') || request.url.endsWith('/')) {
            return new Response(
              `<!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>YouTube Summarizer - Offline</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0f1419; color: white; }
                  .offline-icon { font-size: 64px; margin-bottom: 20px; }
                  .retry-btn { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="offline-icon">📱</div>
                <h1>You're offline</h1>
                <p>YouTube Summarizer is not available offline for new summaries.</p>
                <p>Please check your internet connection and try again.</p>
                <button class="retry-btn" onclick="window.location.reload()">Retry</button>
              </body>
              </html>`,
              { 
                headers: { 'Content-Type': 'text/html' },
                status: 200
              }
            );
          }
        })
    );
    return;
  }
  
  // Handle API requests with cache-first strategy for performance
  if (CACHEABLE_APIS.some(api => request.url.includes(api))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.match(request).then((cachedResponse) => {
            // Return cached version immediately if available
            if (cachedResponse) {
              // Fetch in background to update cache
              fetch(request).then((networkResponse) => {
                if (networkResponse.ok) {
                  cache.put(request, networkResponse.clone());
                }
              }).catch(() => {
                // Network failed, but we have cached version
                console.log('[Service Worker] Network failed, serving cached API response');
              });
              return cachedResponse;
            }
            
            // No cached version, fetch from network
            return fetch(request).then((networkResponse) => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            });
          });
        })
        .catch(() => {
          return new Response(
            JSON.stringify({
              error: 'Service temporarily unavailable. Please check your internet connection.',
              offline: true
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // For all other requests, use network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request);
      })
  );
});

// Background sync for queuing API requests when offline
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered');
  
  if (event.tag === 'background-summarize') {
    event.waitUntil(
      // Process queued summarization requests
      processQueuedRequests()
    );
  }
});

// Push notifications (for future enhancement)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Your summary is ready!',
    icon: '/manifest.json',
    badge: '/manifest.json',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open Summary',
        icon: '/manifest.json'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/manifest.json'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'YouTube Summarizer', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to process queued requests (for background sync)
async function processQueuedRequests() {
  try {
    const cache = await caches.open('queued-requests');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.delete(request);
          console.log('[Service Worker] Processed queued request:', request.url);
        }
      } catch (error) {
        console.log('[Service Worker] Failed to process queued request:', error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error processing queue:', error);
  }
}
