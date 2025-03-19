
/**
 * Service Worker Registration & Management
 * This file handles the registration, updates, background sync,
 * and cache management for the Pinnity PWA.
 */

interface PinnityServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
  onMessage?: (event: MessageEvent) => void;
}

/**
 * Register the service worker for the application
 */
export function register(config?: PinnityServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/service-worker.js';
      
      // Listen for online/offline events
      if (config?.onOffline || config?.onOnline) {
        setupNetworkListeners(config);
      }
      
      registerValidSW(swUrl, config);
    });
  }
}

/**
 * Setup network status listeners
 */
function setupNetworkListeners(config: PinnityServiceWorkerConfig) {
  // Set initial state
  if (!navigator.onLine && config.onOffline) {
    config.onOffline();
  }
  
  // Add event listeners
  window.addEventListener('online', () => {
    console.log('App is online. Syncing data...');
    syncOfflineActions();
    if (config.onOnline) config.onOnline();
  });
  
  window.addEventListener('offline', () => {
    console.log('App is offline. Some features may be unavailable.');
    if (config.onOffline) config.onOffline();
  });
}

/**
 * Register and setup the service worker
 */
function registerValidSW(swUrl: string, config?: PinnityServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log('ServiceWorker registration successful');
      
      // Set up message listener
      if (config?.onMessage) {
        navigator.serviceWorker.addEventListener('message', (event) => {
          config.onMessage?.(event);
        });
      }
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.
              console.log('New content is available and will be used when all tabs for this page are closed');

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.
              console.log('Content is cached for offline use.');

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Error during service worker registration:', error);
    });
}

/**
 * Check if a new service worker is waiting and trigger update notification
 * 
 * Enhanced to use a custom event with registration details
 * to provide more information to the update notification component.
 */
export function checkForUpdates(callback?: () => void) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Check if a waiting worker already exists
      if (registration.waiting) {
        console.log('[Service Worker] Update already waiting on page load');
        
        // Dispatch custom event with registration details
        window.dispatchEvent(
          new CustomEvent('pwaUpdate', { 
            detail: { registration } 
          })
        );
        
        if (callback) callback();
        return;
      }
      
      // Otherwise listen for future updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[Service Worker] New version installed and waiting');
              
              // Dispatch custom event with registration details
              window.dispatchEvent(
                new CustomEvent('pwaUpdate', { 
                  detail: { registration } 
                })
              );
              
              if (callback) callback();
            }
          });
        }
      });
      
      // Periodically check for updates (every hour)
      setInterval(() => {
        console.log('[Service Worker] Checking for updates...');
        registration.update().catch(err => {
          console.error('[Service Worker] Update check failed:', err);
        });
      }, 60 * 60 * 1000);
    });
  }
}

/**
 * Apply updates from a waiting service worker
 * 
 * This function sends a SKIP_WAITING message to the service worker
 * and reloads the page to activate the new version.
 * Uses the updated event lifecycle patterns recommended by the PWA best practices.
 */
export function applyUpdates() {
  if ('serviceWorker' in navigator) {
    // Create a controller to handle the update process
    let refreshing = false;

    // Listen for the controlling service worker changing
    // This happens when a new service worker activates after skipWaiting()
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      
      console.log('[Service Worker] Controller changed, reloading...');
      refreshing = true;
      window.location.reload();
    });

    // Get the registration then send message to skip waiting
    navigator.serviceWorker.ready
      .then(registration => {
        if (registration.waiting) {
          // Log the update version if possible
          console.log('[Service Worker] Activating new version...');
          
          // Send the skip waiting message
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(err => {
        console.error('[Service Worker] Failed to apply updates:', err);
      });
  }
}

/**
 * Request permission for push notifications
 */
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return Promise.resolve('denied');
  }
  
  return Notification.requestPermission();
}

/**
 * Perform a background sync operation if supported
 */
export function performBackgroundSync(syncTag: string): Promise<boolean> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    return navigator.serviceWorker.ready
      .then(registration => {
        // Add type assertion for the sync property
        const regWithSync = registration as ServiceWorkerRegistration & {
          sync: {
            register(tag: string): Promise<void>;
          }
        };
        
        return regWithSync.sync.register(syncTag)
          .then(() => {
            console.log(`Background sync registered: ${syncTag}`);
            return true;
          })
          .catch((err: Error) => {
            console.error(`Background sync failed: ${err}`);
            return false;
          });
      });
  }
  
  console.log('Background sync not supported on this browser');
  return Promise.resolve(false);
}

/**
 * Sync offline actions when back online
 * 
 * This function triggers background sync for favorites and redemptions
 * when the device comes back online.
 */
export function syncOfflineActions() {
  if ('serviceWorker' in navigator) {
    // Attempt to sync favorites
    performBackgroundSync('sync-favorites')
      .then(() => console.log('Favorites sync initiated'))
      .catch((err: Error) => console.error('Favorites sync error:', err));
    
    // Attempt to sync redemptions
    performBackgroundSync('sync-redemptions')
      .then(() => console.log('Redemptions sync initiated'))
      .catch((err: Error) => console.error('Redemptions sync error:', err));
  }
}

/**
 * Cache a dynamic URL for offline use
 */
export function cacheUrl(url: string): Promise<boolean> {
  if ('caches' in window) {
    return caches.open('pinnity-dynamic-cache')
      .then(cache => {
        return fetch(url)
          .then(response => {
            cache.put(url, response.clone());
            return true;
          })
          .catch(() => false);
      });
  }
  return Promise.resolve(false);
}

/**
 * Unregister the service worker
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
}
