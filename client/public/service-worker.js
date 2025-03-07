// Service Worker for Pinnity PWA
const CACHE_NAME = 'pinnity-cache-v1';
const OFFLINE_PAGE = '/offline.html';
const CACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/logo192.png',
  '/logo512.png',
  '/static/js/main.chunk.js',
  '/static/js/vendors.chunk.js',
  '/static/css/main.chunk.css'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker', event);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Create and cache offline page
        return fetch(OFFLINE_PAGE)
          .catch(() => {
            return new Response(
              '<html><head><title>Offline - Pinnity</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
              '<body style="margin:0;padding:20px;font-family:sans-serif;text-align:center;background-color:#f5f5f5;">' +
              '<div style="background-color:white;border-radius:10px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:500px;margin:40px auto;">' +
              '<h2 style="color:#00796B;margin-top:0;">You\'re offline</h2>' +
              '<p>Please check your internet connection and try again.</p>' +
              '<div style="background-color:#00796B;color:white;padding:12px 20px;border-radius:4px;display:inline-block;cursor:pointer;margin-top:10px;" onclick="window.location.reload()">Try Again</div>' +
              '</div></body></html>'
            );
          })
          .then((offlineResponse) => {
            if (offlineResponse.type === 'basic') {
              return cache.put(OFFLINE_PAGE, offlineResponse.clone());
            }
            return cache.addAll(CACHE_ASSETS);
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker', event);
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  console.log('[Service Worker] Fetch event', event.request.url);
  
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // API requests - network first, then offline response
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              // Only cache GET requests
              if (event.request.method === 'GET') {
                cache.put(event.request, responseClone);
              }
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if available
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }

  // Cache first, network fallback strategy for non-API requests
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Network request
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
            
            // Check if request is for an HTML page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match(OFFLINE_PAGE);
            }
          });
      })
  );
});

// Background sync for favorites and redemptions when offline
const syncFavorites = async () => {
  try {
    const offlineFavorites = await localforage.getItem('offline-favorites') || [];
    
    if (offlineFavorites.length === 0) return;
    
    // Process offline favorites
    const results = await Promise.all(
      offlineFavorites.map(async (item) => {
        try {
          const { userId, dealId, action } = item;
          const endpoint = `/api/user/${userId}/favorites${action === 'add' ? '' : `/${dealId}`}`;
          const method = action === 'add' ? 'POST' : 'DELETE';
          
          const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: action === 'add' ? JSON.stringify({ dealId }) : undefined
          });
          
          return response.ok;
        } catch (err) {
          return false;
        }
      })
    );
    
    // Filter out successful syncs
    const remainingOffline = offlineFavorites.filter((_, index) => !results[index]);
    await localforage.setItem('offline-favorites', remainingOffline);
    
    // Notify client of sync results
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'FAVORITES_SYNCED',
          success: offlineFavorites.length - remainingOffline.length,
          failed: remainingOffline.length
        });
      });
    });
  } catch (error) {
    console.error('[Service Worker] Sync favorites failed:', error);
  }
};

const syncRedemptions = async () => {
  try {
    const offlineRedemptions = await localforage.getItem('offline-redemptions') || [];
    
    if (offlineRedemptions.length === 0) return;
    
    // Process offline redemptions
    const results = await Promise.all(
      offlineRedemptions.map(async (item) => {
        try {
          const { userId, dealId } = item;
          const response = await fetch(`/api/user/${userId}/redemptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dealId })
          });
          
          return response.ok;
        } catch (err) {
          return false;
        }
      })
    );
    
    // Filter out successful syncs
    const remainingOffline = offlineRedemptions.filter((_, index) => !results[index]);
    await localforage.setItem('offline-redemptions', remainingOffline);
    
    // Notify client of sync results
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'REDEMPTIONS_SYNCED',
          success: offlineRedemptions.length - remainingOffline.length,
          failed: remainingOffline.length
        });
      });
    });
  } catch (error) {
    console.error('[Service Worker] Sync redemptions failed:', error);
  }
};

// Listen for sync events
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync', event.tag);
  
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  } else if (event.tag === 'sync-redemptions') {
    event.waitUntil(syncRedemptions());
  }
});

// Listen for push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received', event);
  
  const data = event.data.json();
  const title = data.title || 'Pinnity';
  const options = {
    body: data.message || 'New notification from Pinnity',
    icon: '/logo192.png',
    badge: '/favicon.ico',
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'explore',
        title: 'Explore'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/explore')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action (click on notification body)
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});