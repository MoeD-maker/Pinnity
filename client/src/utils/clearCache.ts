import { queryClient } from '@/lib/queryClient';

export function clearAllCaches() {
  // Clear React Query cache
  queryClient.clear();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  console.log('All caches cleared successfully');
}

// Auto-clear cache on module load to remove stale data
clearAllCaches();