// Service Worker for Pinnity PWA
// Import localforage for offline data storage
importScripts('https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js');

// Version is used to trigger updates when changed
const APP_VERSION = 'v1.2.0'; // Bumped version for offline capabilities
const CACHE_NAME = `pinnity-cache-${APP_VERSION}`;
const DEAL_CACHE_MAX_AGE = 3600000; // 1 hour in milliseconds
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
  '/static/css/main.chunk.css',
  '/localforage.min.js'
];

// Enhanced offline capabilities
const OFFLINE_QUEUE_STORE = 'requestQueue';
const OFFLINE_FORM_STORE = 'formData';
const OFFLINE_METADATA_STORE = 'offlineMetadata';
const OFFLINE_DATA_CACHE = 'dataCache';

// Create separate stores for different data types
const stores = {
  // For queued API requests
  requestQueue: localforage.createInstance({
    name: 'pinnity',
    storeName: OFFLINE_QUEUE_STORE,
    description: 'Queue for API requests made while offline'
  }),
  
  // For form data persistence
  formData: localforage.createInstance({
    name: 'pinnity',
    storeName: OFFLINE_FORM_STORE,
    description: 'Persistent storage for form data'
  }),
  
  // For metadata about offline status
  offlineMetadata: localforage.createInstance({
    name: 'pinnity',
    storeName: OFFLINE_METADATA_STORE,
    description: 'Metadata for offline mode and sync status'
  }),
  
  // For data cache
  dataCache: localforage.createInstance({
    name: 'pinnity',
    storeName: OFFLINE_DATA_CACHE,
    description: 'Cache for data that might be needed offline'
  })
};

// Install event - cache assets and initialize localforage
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker', event);
  
  // Initialize localforage instances
  console.log('[Service Worker] LocalForage availability check:', typeof localforage !== 'undefined');
  if (typeof localforage !== 'undefined') {
    // Initialize main localforage
    localforage.config({
      name: 'Pinnity Offline Storage',
      storeName: 'offline_data'
    });
    
    // Initialize all stores
    Promise.all([
      stores.requestQueue.ready(),
      stores.formData.ready(),
      stores.offlineMetadata.ready(),
      stores.dataCache.ready()
    ]).then(() => {
      console.log('[Service Worker] All offline storage instances initialized successfully');
      
      // Set up initial offline metadata
      stores.offlineMetadata.setItem('lastOnline', Date.now());
      stores.offlineMetadata.setItem('pendingRequests', 0);
    }).catch(err => {
      console.error('[Service Worker] Failed to initialize offline storage instances', err);
    });
    
    console.log('[Service Worker] LocalForage initialized successfully');
  } else {
    console.error('[Service Worker] LocalForage failed to load!');
  }
  
  // Cache assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Use dedicated offline page
        return fetch(OFFLINE_PAGE)
          .catch(() => {
            console.log('[Service Worker] Offline page not found, falling back to cache');
            return caches.match(OFFLINE_PAGE);
          })
          .then((offlineResponse) => {
            if (offlineResponse && offlineResponse.type === 'basic') {
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
  
  // Special handling for deal API requests with TTL
  if (event.request.url.includes('/api/deals')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful deal API responses with timestamp
          if (response.status === 200) {
            const responseClone = response.clone();
            
            // Create a new response with cache date headers
            const timestamp = Date.now();
            const headers = new Headers(responseClone.headers);
            headers.append('X-Cache-Date', timestamp.toString());
            
            // Create a modified response with the new headers
            const cachedResponseInit = {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: headers
            };
            
            // Store the response with the modified headers
            responseClone.text().then(body => {
              const modifiedResponse = new Response(body, cachedResponseInit);
              
              // Only cache GET requests
              if (event.request.method === 'GET') {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, modifiedResponse);
                  console.log('[Service Worker] Cached deal data with timestamp', timestamp);
                });
              }
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if available and not expired
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                // Check if the cached response has expired
                const cacheDate = cachedResponse.headers.get('X-Cache-Date');
                const cacheTimestamp = cacheDate ? parseInt(cacheDate, 10) : 0;
                const now = Date.now();
                
                // Skip returning cached deals older than DEAL_CACHE_MAX_AGE
                if (cacheTimestamp && (now - cacheTimestamp) > DEAL_CACHE_MAX_AGE) {
                  console.log('[Service Worker] Cached deal data expired, not using', cacheTimestamp);
                  return caches.match(OFFLINE_PAGE);
                }
                
                // Add headers to indicate this is a cached response
                const headers = new Headers(cachedResponse.headers);
                headers.append('X-Is-Cached', 'true');
                
                // Return the cached response with added headers
                return cachedResponse.text().then(body => {
                  return new Response(body, {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: headers
                  });
                });
              }
              return caches.match(OFFLINE_PAGE);
            });
        })
    );
    return;
  }
  
  // Other API requests - network first, then offline response
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

// Process the generic request queue
const processRequestQueue = async () => {
  try {
    console.log('[Service Worker] Processing request queue');
    
    // Get all pending requests
    const requests = [];
    await stores.requestQueue.iterate((value, key) => {
      if (value.status === 'pending' || value.status === 'failed') {
        requests.push({ key, ...value });
      }
    });
    
    if (requests.length === 0) {
      console.log('[Service Worker] No pending requests to process');
      return { success: 0, failed: 0 };
    }
    
    console.log(`[Service Worker] Found ${requests.length} pending requests`);
    
    // Sort by priority and timestamp
    requests.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
    });
    
    // Process each request
    let succeeded = 0;
    let failed = 0;
    
    for (const request of requests) {
      try {
        console.log(`[Service Worker] Processing request: ${request.method} ${request.url}`);
        
        // Update request status
        request.status = 'processing';
        request.lastAttempt = Date.now();
        await stores.requestQueue.setItem(request.key, request);
        
        // Make the request
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers
          },
          body: request.method !== 'GET' && request.body ? JSON.stringify(request.body) : undefined
        });
        
        if (response.ok) {
          console.log(`[Service Worker] Request succeeded: ${request.method} ${request.url}`);
          request.status = 'succeeded';
          succeeded++;
        } else {
          console.error(`[Service Worker] Request failed with status ${response.status}: ${request.method} ${request.url}`);
          request.status = 'failed';
          request.retryCount++;
          request.error = `Server returned ${response.status}`;
          failed++;
        }
      } catch (error) {
        console.error(`[Service Worker] Error processing request: ${request.method} ${request.url}`, error);
        request.status = 'failed';
        request.retryCount++;
        request.error = error.message || 'Unknown error';
        failed++;
      }
      
      // Update the request in storage
      await stores.requestQueue.setItem(request.key, request);
    }
    
    // Clean up succeeded requests
    let cleanedUp = 0;
    await stores.requestQueue.iterate((value, key) => {
      if (value.status === 'succeeded') {
        stores.requestQueue.removeItem(key);
        cleanedUp++;
      }
    });
    
    console.log(`[Service Worker] Cleaned up ${cleanedUp} completed requests`);
    
    // Update metadata
    const remaining = await stores.requestQueue.length();
    await stores.offlineMetadata.setItem('pendingRequests', remaining);
    await stores.offlineMetadata.setItem('lastSyncCompletion', Date.now());
    
    // Notify clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'QUEUE_PROCESSED',
          success: succeeded,
          failed: failed,
          remaining: remaining
        });
      });
    });
    
    return { success: succeeded, failed: failed };
    
  } catch (error) {
    console.error('[Service Worker] Failed to process request queue:', error);
    return { success: 0, failed: 0 };
  }
};

// Listen for sync events
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync', event.tag);
  
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  } else if (event.tag === 'sync-redemptions') {
    event.waitUntil(syncRedemptions());
  } else if (event.tag === 'pinnity-sync') {
    // Process all queued requests
    event.waitUntil(processRequestQueue());
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