/**
 * Offline Utilities
 * Provides functions to detect, handle, and manage offline app state
 */

/**
 * Check if the application is currently offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Add event listeners for online/offline status changes
 */
export function addOfflineStatusListeners(
  onOffline: () => void,
  onOnline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Check if the browser supports service workers
 */
export function supportsServiceWorker(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Check if the browser supports background sync
 */
export function supportsBackgroundSync(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Check if the app is running as an installed PWA
 */
export function isInstalledPwa(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
}

/**
 * Dispatch an event to notify the app of offline status changes
 */
export function notifyOfflineStatusChanged(isOffline: boolean): void {
  window.dispatchEvent(
    new CustomEvent('offlineStatusChanged', { 
      detail: { isOffline } 
    })
  );
}

/**
 * Create a factory function for cached API requests
 * This provides a wrapper around fetch that will return cached data when offline
 */
export function createCachedFetch<T>(
  url: string, 
  cacheTime: number = 1000 * 60 * 60  // Default: 1 hour
): () => Promise<T> {
  // The cache key is derived from the URL
  const cacheKey = `pinnity-cache:${url}`;
  
  return async (): Promise<T> => {
    try {
      // Try to fetch fresh data
      if (navigator.onLine) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Network error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the fresh data with a timestamp
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        return data;
      }
      
      // If offline, look for cached data
      const cachedString = localStorage.getItem(cacheKey);
      if (cachedString) {
        const cached = JSON.parse(cachedString);
        
        // Check if the cache is still valid
        if (Date.now() - cached.timestamp < cacheTime) {
          return cached.data;
        }
      }
      
      throw new Error('No valid cached data available and network is offline');
    } catch (error) {
      console.error('Error with cached fetch:', error);
      
      // Last resort: return empty data based on expected type
      // This isn't ideal but prevents app crashes
      return {} as T;
    }
  };
}