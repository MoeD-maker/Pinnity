import { QueryClient } from '@tanstack/react-query';
import { stores, queueRequest, cacheData, getCachedData } from './offlineStorage';

/**
 * Create an offline-aware API request function for React Query
 * This works with our existing queryClient but adds offline capabilities
 */
export function createOfflineAwareAPI() {
  // Helper to determine if we're currently online
  const isOnline = (): boolean => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  };

  /**
   * Make an API request with offline support
   * - When online: Makes the request normally
   * - When offline: 
   *   - For GET: Returns cached data if available
   *   - For mutations: Queues the request for later
   */
  async function offlineAwareRequest<T = any>(
    url: string,
    options: RequestInit = {},
    cacheKey?: string, // Optional explicit cache key
    cacheDuration?: number // Cache duration in ms
  ): Promise<T> {
    // Extract method, defaulting to GET
    const method = options.method?.toUpperCase() || 'GET';
    
    // If we're online, make the request normally
    if (isOnline()) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // If this is a GET request, cache the response for offline use
        if (method === 'GET') {
          const effectiveCacheKey = cacheKey || url;
          await cacheData(effectiveCacheKey, data, cacheDuration);
        }
        
        return data;
      } catch (error) {
        console.error('API request failed:', error);
        
        // Even though we thought we were online, the request failed
        // Let's see if we have cached data for GET requests
        if (method === 'GET') {
          const effectiveCacheKey = cacheKey || url;
          const cachedData = await getCachedData<T>(effectiveCacheKey);
          
          if (cachedData) {
            console.log(`Using cached data for ${url}`);
            return cachedData;
          }
        }
        
        throw error;
      }
    } else {
      // We're offline, handle accordingly
      console.log(`Device is offline. Handling ${method} request for ${url}`);
      
      // For GET requests, try to return cached data
      if (method === 'GET') {
        const effectiveCacheKey = cacheKey || url;
        const cachedData = await getCachedData<T>(effectiveCacheKey);
        
        if (cachedData) {
          console.log(`Using cached data for ${url}`);
          return cachedData;
        }
        
        throw new Error(`Cannot fetch ${url} while offline and no cached data is available`);
      } else {
        // For mutations (POST, PUT, DELETE, etc.), queue the request
        const body = options.body ? 
          (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : 
          undefined;
        
        const headers: Record<string, string> = {};
        if (options.headers) {
          if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => {
              headers[key] = value;
            });
          } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => {
              headers[key] = value;
            });
          } else {
            Object.assign(headers, options.headers);
          }
        }
        
        // Queue the request to be processed when online
        const queuedRequest = await queueRequest(url, method, body, headers);
        
        // Return a mock response that indicates the request was queued
        return {
          __offline: true,
          __queued: true,
          queuedRequestId: queuedRequest.id,
          message: `Request queued for processing when online`,
          timestamp: new Date().toISOString()
        } as unknown as T;
      }
    }
  }

  // Offline-aware mutation function for React Query
  async function offlineAwareMutation<T = any, V = any>(
    url: string,
    { body, ...options }: { body?: V } & Omit<RequestInit, 'body'>
  ): Promise<T> {
    const serializedBody = body ? JSON.stringify(body) : undefined;
    
    return offlineAwareRequest<T>(
      url,
      {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: serializedBody
      }
    );
  }

  return {
    offlineAwareRequest,
    offlineAwareMutation
  };
}

// Create a singleton instance for use throughout the app
export const { offlineAwareRequest, offlineAwareMutation } = createOfflineAwareAPI();

/**
 * Create a custom QueryClient configured for offline support
 */
export function createOfflineQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep cached data longer for offline support
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 60 * 60 * 1000, // 1 hour
        // Enable retries but don't retry too much
        retry: 2,
        // Include both new and stale data in result
        keepPreviousData: true,
        // Handle network errors more gracefully
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch only if online
        refetchOnWindowFocus: typeof navigator !== 'undefined' ? navigator.onLine : true,
      },
      mutations: {
        // Don't retry mutations automatically since we're queuing them
        retry: false,
      },
    },
  });
}