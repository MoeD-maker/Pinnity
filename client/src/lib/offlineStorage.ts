import localforage from 'localforage';

// Configure separate stores for different data types
export const stores = {
  // For form data persistence
  formData: localforage.createInstance({
    name: 'pinnity',
    storeName: 'formData',
    description: 'Persistent storage for form data'
  }),
  
  // For queued API requests
  requestQueue: localforage.createInstance({
    name: 'pinnity',
    storeName: 'requestQueue',
    description: 'Queue for API requests made while offline'
  }),
  
  // For data cache
  dataCache: localforage.createInstance({
    name: 'pinnity',
    storeName: 'dataCache',
    description: 'Cache for data that might be needed offline'
  }),
  
  // For offline metadata and status tracking
  offlineMetadata: localforage.createInstance({
    name: 'pinnity',
    storeName: 'offlineMetadata',
    description: 'Metadata for offline mode and sync status'
  })
};

// Interface for queued requests
export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'failed' | 'succeeded';
  lastAttempt?: number;
  error?: string;
}

// Generate a unique ID for queued requests
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Queue an API request to be sent when back online
 */
export async function queueRequest(
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string>,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<QueuedRequest> {
  const request: QueuedRequest = {
    id: generateRequestId(),
    url,
    method,
    body,
    headers: headers || {},
    timestamp: Date.now(),
    retryCount: 0,
    priority,
    status: 'pending'
  };
  
  await stores.requestQueue.setItem(request.id, request);
  console.log(`Request queued for later: ${method} ${url}`);
  
  // Update metadata about pending requests
  const pendingCount = await getPendingRequestCount();
  await stores.offlineMetadata.setItem('pendingRequests', pendingCount + 1);
  
  return request;
}

/**
 * Get the number of pending requests
 */
export async function getPendingRequestCount(): Promise<number> {
  const pendingCount = await stores.offlineMetadata.getItem<number>('pendingRequests');
  return pendingCount || 0;
}

/**
 * Get all queued requests
 */
export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  const requests: QueuedRequest[] = [];
  
  await stores.requestQueue.iterate<QueuedRequest, void>((value) => {
    if (value.status === 'pending' || value.status === 'failed') {
      requests.push(value);
    }
  });
  
  // Sort by priority (high -> medium -> low) and then by timestamp (oldest first)
  return requests.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
  });
}

/**
 * Process the queue of pending requests
 */
export async function processQueue(
  onProgress?: (processed: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const requests = await getQueuedRequests();
  let succeeded = 0;
  let failed = 0;
  
  // Update the metadata with the sync start time
  await stores.offlineMetadata.setItem('lastSyncAttempt', Date.now());
  
  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    
    // Update progress
    if (onProgress) {
      onProgress(i, requests.length);
    }
    
    // Update request status to processing
    request.status = 'processing';
    request.lastAttempt = Date.now();
    await stores.requestQueue.setItem(request.id, request);
    
    try {
      // Attempt to send the request
      const response = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers
        },
        body: request.method !== 'GET' && request.body ? JSON.stringify(request.body) : undefined
      });
      
      if (response.ok) {
        // Request succeeded
        request.status = 'succeeded';
        succeeded++;
        console.log(`Successfully processed queued request: ${request.method} ${request.url}`);
      } else {
        // Request failed with an error response
        request.status = 'failed';
        request.retryCount++;
        request.error = `Server returned ${response.status}`;
        failed++;
        console.error(`Failed to process queued request: ${request.method} ${request.url} - ${response.status}`);
      }
    } catch (error) {
      // Request failed due to network error
      request.status = 'failed';
      request.retryCount++;
      request.error = error instanceof Error ? error.message : 'Unknown error';
      failed++;
      console.error(`Error processing queued request: ${request.method} ${request.url}`, error);
    }
    
    // Update the request in storage
    await stores.requestQueue.setItem(request.id, request);
  }
  
  // Clean up succeeded requests
  await cleanupSucceededRequests();
  
  // Update metadata
  await stores.offlineMetadata.setItem('lastSyncCompletion', Date.now());
  await stores.offlineMetadata.setItem('pendingRequests', failed);
  
  return { success: succeeded, failed };
}

/**
 * Clean up succeeded requests to prevent storage bloat
 */
async function cleanupSucceededRequests(): Promise<void> {
  const keysToRemove: string[] = [];
  
  await stores.requestQueue.iterate<QueuedRequest, void>((value, key) => {
    if (value.status === 'succeeded') {
      keysToRemove.push(key);
    }
  });
  
  for (const key of keysToRemove) {
    await stores.requestQueue.removeItem(key);
  }
  
  console.log(`Cleaned up ${keysToRemove.length} completed requests`);
}

/**
 * Clear all pending requests (use with caution)
 */
export async function clearRequestQueue(): Promise<void> {
  await stores.requestQueue.clear();
  await stores.offlineMetadata.setItem('pendingRequests', 0);
  console.log('Request queue cleared');
}

/**
 * Save data to the cache
 */
export async function cacheData(key: string, data: any, expiration?: number): Promise<void> {
  const entry = {
    data,
    timestamp: Date.now(),
    expiration: expiration ? Date.now() + expiration : undefined
  };
  
  await stores.dataCache.setItem(key, entry);
}

/**
 * Get data from the cache
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const entry = await stores.dataCache.getItem<{
    data: T;
    timestamp: number;
    expiration?: number;
  }>(key);
  
  if (!entry) return null;
  
  // Check if the entry has expired
  if (entry.expiration && entry.expiration < Date.now()) {
    await stores.dataCache.removeItem(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Initialize the offline storage system
 */
export async function initOfflineStorage(): Promise<void> {
  try {
    await Promise.all([
      stores.formData.ready(),
      stores.requestQueue.ready(),
      stores.dataCache.ready(),
      stores.offlineMetadata.ready()
    ]);
    
    console.log('Offline storage system initialized');
    
    // Set up the last online timestamp if not present
    const lastOnline = await stores.offlineMetadata.getItem<number>('lastOnline');
    if (!lastOnline) {
      await stores.offlineMetadata.setItem('lastOnline', Date.now());
    }
  } catch (error) {
    console.error('Failed to initialize offline storage', error);
  }
}

/**
 * Update the last online timestamp
 */
export async function updateLastOnline(): Promise<void> {
  await stores.offlineMetadata.setItem('lastOnline', Date.now());
}