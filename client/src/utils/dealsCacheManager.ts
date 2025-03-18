/**
 * Deals Cache Manager 
 * 
 * Centralized utility for managing deal data caching across the application.
 * Provides consistent functions for cache validation, refresh, and header parsing.
 */

import { queryClient } from '@/lib/queryClient';

/**
 * Maximum age for cached deals data in milliseconds 
 * Must be kept in sync with the service worker cache settings
 */
export const DEAL_CACHE_MAX_AGE = 3600000; // 1 hour

/**
 * Information about a cached response
 */
export interface CacheStatus {
  /** Whether the data is from cache */
  isCached: boolean;
  
  /** Timestamp when the data was fetched or cached (milliseconds since epoch) */
  cacheDate?: number;
}

/**
 * Checks if cached deals are still valid based on timestamp
 * 
 * @param timestamp Timestamp to check (milliseconds since epoch)
 * @returns Whether the cached data is still valid
 */
export function isCacheValid(timestamp?: number): boolean {
  if (!timestamp) return false;
  
  const now = Date.now();
  const age = now - timestamp;
  
  return age < DEAL_CACHE_MAX_AGE;
}

/**
 * Extracts cache status information from a response
 * 
 * @param response Fetch API Response object
 * @returns Cache status information
 */
export function getCacheStatusFromResponse(response: Response): CacheStatus {
  const isCached = response.headers.get('X-Is-Cached') === 'true';
  const cacheDateHeader = response.headers.get('X-Cache-Date');
  
  return {
    isCached,
    cacheDate: cacheDateHeader ? parseInt(cacheDateHeader, 10) : undefined
  };
}

/**
 * Forces refresh of all deals data by invalidating React Query cache
 * Used when connectivity is restored or when data freshness is important
 */
export function refreshAllDealsData(): void {
  // Invalidate main deals list
  queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
  
  // Invalidate featured deals
  queryClient.invalidateQueries({ queryKey: ['/api/deals/featured'] });
  
  // Invalidate admin deals
  queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
  
  console.log('Deals cache invalidated, fetching fresh data');
}

/**
 * Creates a fresh cache status object with current timestamp
 * Used when forcing refresh or updating timestamps
 * 
 * @returns Fresh cache status with current timestamp
 */
export function getFreshCacheStatus(): CacheStatus {
  return {
    isCached: false,
    cacheDate: Date.now()
  };
}

/**
 * Determines if data should be considered stale and refreshed
 * Use this to decide when to automatically refresh data
 * 
 * @param cacheStatus The current cache status
 * @returns Whether the data should be refreshed
 */
export function shouldRefreshData(cacheStatus: CacheStatus): boolean {
  if (!cacheStatus.cacheDate) return true;
  
  // If data is from cache and older than half the max age, refresh
  if (cacheStatus.isCached) {
    const now = Date.now();
    const age = now - cacheStatus.cacheDate;
    
    // Refresh if older than half the max age
    return age > (DEAL_CACHE_MAX_AGE / 2);
  }
  
  // For non-cached data, use the full max age
  return !isCacheValid(cacheStatus.cacheDate);
}

/**
 * Custom event name for announcing connectivity restoration
 * Used to trigger data refreshes across components
 */
export const CONNECTION_RESTORED_EVENT = 'connectionRestored';

/**
 * Dispatches an event to notify components that connection has been restored
 * This will trigger automatic data refreshes in listening components
 */
export function dispatchConnectionRestoredEvent(): void {
  window.dispatchEvent(new CustomEvent(CONNECTION_RESTORED_EVENT));
}

/**
 * Register a listener for connection restoration events
 * 
 * @param callback Function to call when connection is restored
 * @returns Cleanup function to remove the event listener
 */
export function listenForConnectionRestoration(
  callback: () => void
): () => void {
  window.addEventListener(CONNECTION_RESTORED_EVENT, callback);
  
  return () => {
    window.removeEventListener(CONNECTION_RESTORED_EVENT, callback);
  };
}