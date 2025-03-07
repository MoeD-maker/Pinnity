/* eslint-disable no-restricted-globals */
importScripts('https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js');

// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules
// for the list of available workbox modules

// Names of the two caches used in this version of the service worker.
// Change to v2, v3, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
const CACHE_NAME = 'pinnity-cache-v1';
const RUNTIME_CACHE = 'pinnity-runtime-v1';

// A list of local resources we always want to be cached.
const PRECACHE_RESOURCES = [
  'index.html',
  './', // Alias for index.html
  'static/js/main.js',
  'static/css/main.css',
  'manifest.json',
  'favicon.ico',
  'logo192.png',
  'logo512.png',
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_RESOURCES))
      .then(self.skipWaiting())
      .catch(error => {
        console.error('Pre-caching failed:', error);
      })
  );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// The fetch handler serves responses from a cache.
// If no response is found, it fetches it from the network.
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like those for Google Analytics.
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return caches.open(RUNTIME_CACHE).then(cache => {
          return fetch(event.request).then(response => {
            // Put a copy of the response in the runtime cache.
            return cache.put(event.request, response.clone()).then(() => {
              return response;
            });
          });
        });
      }).catch(error => {
        console.error('Fetch failed:', error);
        // Fall back to a network request
        return fetch(event.request);
      })
    );
  }
});

// This allows the web app to trigger skipWaiting via
// registration.waiting.postMessage({type: 'SKIP_WAITING'})
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync for offline first capabilities
self.addEventListener('sync', (event) => {
  if (event.tag === 'syncFavorites') {
    event.waitUntil(syncFavorites());
  } else if (event.tag === 'syncRedemptions') {
    event.waitUntil(syncRedemptions());
  }
});

// Background sync functions
async function syncFavorites() {
  const favoriteQueue = await localforage.getItem('favoriteQueue');
  if (favoriteQueue && favoriteQueue.length) {
    try {
      await Promise.all(favoriteQueue.map(async (favorite) => {
        await fetch('/api/user/' + favorite.userId + '/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await localforage.getItem('authToken')}`
          },
          body: JSON.stringify({ dealId: favorite.dealId })
        });
      }));
      await localforage.setItem('favoriteQueue', []);
    } catch (error) {
      console.error('Error syncing favorites:', error);
    }
  }
}

async function syncRedemptions() {
  const redemptionQueue = await localforage.getItem('redemptionQueue');
  if (redemptionQueue && redemptionQueue.length) {
    try {
      await Promise.all(redemptionQueue.map(async (redemption) => {
        await fetch('/api/user/' + redemption.userId + '/redemptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await localforage.getItem('authToken')}`
          },
          body: JSON.stringify({ dealId: redemption.dealId })
        });
      }));
      await localforage.setItem('redemptionQueue', []);
    } catch (error) {
      console.error('Error syncing redemptions:', error);
    }
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'New notification from Pinnity',
        icon: 'logo192.png',
        badge: 'favicon.ico',
        data: {
          url: data.url || '/'
        },
        actions: data.actions || []
      };

      event.waitUntil(
        self.registration.showNotification(
          data.title || 'Pinnity Notification', 
          options
        )
      );
    } catch (error) {
      console.error('Error processing push notification:', error);
      // Fallback for non-JSON data
      event.waitUntil(
        self.registration.showNotification('Pinnity Notification', {
          body: event.data.text(),
          icon: 'logo192.png',
          badge: 'favicon.ico'
        })
      );
    }
  }
});

// Notification click handler to open the app at the right place
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data?.url || '/';
      
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      return clients.openWindow(url);
    })
  );
});