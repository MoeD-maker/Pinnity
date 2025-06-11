import { queryClient } from '@/lib/queryClient';

export function clearAllCaches() {
  // Clear React Query cache
  queryClient.clear();
  queryClient.invalidateQueries();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear service worker caches
  if ('serviceWorker' in navigator && 'caches' in window) {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
  }
  
  // Clear any IndexedDB data
  if (window.indexedDB) {
    try {
      import('localforage').then(localforage => {
        localforage.clear();
      });
    } catch (e) {
      console.log('LocalForage not available');
    }
  }
  
  console.log('All caches cleared successfully');
}

// Auto-clear cache on module load to remove stale data - only run once
const hasCleared = sessionStorage.getItem('pinnity-cache-cleared');
if (!hasCleared) {
  clearAllCaches();
  sessionStorage.setItem('pinnity-cache-cleared', 'true');
}