import { stores, processQueue, updateLastOnline, initOfflineStorage } from './offlineStorage';
import { offlineAwareRequest, offlineAwareMutation } from './queryClientOffline';

// Initialize the offline storage system on module load
initOfflineStorage().catch(error => {
  console.error('Failed to initialize offline storage:', error);
});

/**
 * Enhanced API client with offline capabilities
 */
export const offlineApiClient = {
  /**
   * Make a GET request with offline support
   * Returns cached data when offline
   */
  async get<T = any>(url: string, options: RequestInit = {}, cacheKey?: string): Promise<T> {
    return offlineAwareRequest<T>(url, { ...options, method: 'GET' }, cacheKey);
  },
  
  /**
   * Make a POST request with offline support
   * Queues the request when offline
   */
  async post<T = any, D = any>(url: string, data: D, options: RequestInit = {}): Promise<T> {
    return offlineAwareMutation<T, D>(url, {
      ...options,
      method: 'POST',
      body: data
    });
  },
  
  /**
   * Make a PUT request with offline support
   * Queues the request when offline
   */
  async put<T = any, D = any>(url: string, data: D, options: RequestInit = {}): Promise<T> {
    return offlineAwareMutation<T, D>(url, {
      ...options,
      method: 'PUT',
      body: data
    });
  },
  
  /**
   * Make a DELETE request with offline support
   * Queues the request when offline
   */
  async delete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
    return offlineAwareRequest<T>(url, {
      ...options,
      method: 'DELETE'
    });
  },
  
  /**
   * Process the queue of pending requests
   * @param onProgress Optional callback for progress updates
   * @returns Object with success and failure counts
   */
  async processOfflineQueue(
    onProgress?: (processed: number, total: number) => void
  ): Promise<{ success: number; failed: number }> {
    updateLastOnline();
    return processQueue(onProgress);
  },
  
  /**
   * Check if there are any pending requests in the queue
   * @returns Promise resolving to the number of pending requests
   */
  async getPendingRequestCount(): Promise<number> {
    return stores.offlineMetadata.getItem<number>('pendingRequests') || 0;
  },
  
  /**
   * Get the last online timestamp
   * @returns Promise resolving to the last online timestamp or null
   */
  async getLastOnlineTimestamp(): Promise<number | null> {
    return stores.offlineMetadata.getItem<number>('lastOnline');
  }
};

/**
 * Helper function to determine if the app is running in offline mode
 * Checks both navigator.onLine and our last successful connection
 */
export async function isInOfflineMode(): Promise<boolean> {
  // First check the browser's online status
  const browserIsOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  if (!browserIsOnline) {
    return true; // Definitely offline
  }
  
  // Next, check when we were last definitely online
  const lastOnline = await stores.offlineMetadata.getItem<number>('lastOnline');
  const lastSyncAttempt = await stores.offlineMetadata.getItem<number>('lastSyncAttempt');
  
  if (!lastOnline) {
    // We've never recorded being online, so we're in an uncertain state
    return false; // Optimistically assume online
  }
  
  // If we have pending requests, we're functionally in offline mode
  const pendingRequests = await stores.offlineMetadata.getItem<number>('pendingRequests') || 0;
  if (pendingRequests > 0) {
    return true;
  }
  
  // If we haven't had a successful sync in 5 minutes but the browser reports online,
  // we could be in a "lie-fi" situation (connected but not really working)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  if (lastSyncAttempt && lastSyncAttempt > lastOnline && lastOnline < fiveMinutesAgo) {
    return true; // Functionally offline
  }
  
  // Otherwise, trust the browser's online status
  return !browserIsOnline;
}