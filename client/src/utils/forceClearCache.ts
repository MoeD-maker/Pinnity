// Force clear all browser caches and reload with fresh data
export function forceClearAllCaches() {
  // Clear all storage types
  localStorage.clear();
  sessionStorage.clear();
  
  // Clear IndexedDB
  if (window.indexedDB) {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    }).catch(() => {
      // Fallback for browsers that don't support databases()
      const dbsToDelete = ['localforage', 'pinnity-cache', 'workbox-cache'];
      dbsToDelete.forEach(dbName => {
        try {
          indexedDB.deleteDatabase(dbName);
        } catch (e) {
          console.log(`Could not delete ${dbName}`);
        }
      });
    });
  }
  
  // Clear service worker cache
  if ('serviceWorker' in navigator && 'caches' in window) {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
  }
  
  // Clear cookies (if possible)
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('All caches forcefully cleared');
}

// Add to window for manual access
declare global {
  interface Window {
    forceClearCache: () => void;
  }
}

window.forceClearCache = forceClearAllCaches;