import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to detect and manage online/offline status
 * @returns Object containing online status and related utilities
 */
export function useOnlineStatus() {
  // Initialize with the current online status
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  // Last time we were online (for displaying time since last connection)
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    isOnline ? new Date() : null
  );
  
  // Track connection attempts for better UX
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Test the connection by making a lightweight request
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Attempt to fetch a small resource with a cache-busting parameter
      const testEndpoint = `/api/health?_=${Date.now()}`;
      const response = await fetch(testEndpoint, { 
        method: 'HEAD',
        // Short timeout to avoid long waits
        signal: AbortSignal.timeout(3000) 
      });
      
      const isConnected = response.ok;
      
      if (isConnected && !isOnline) {
        setIsOnline(true);
        setLastOnlineAt(new Date());
      } else if (!isConnected && isOnline) {
        setIsOnline(false);
      }
      
      return isConnected;
    } catch (error) {
      // If the request fails, assume we're offline
      if (isOnline) {
        setIsOnline(false);
      }
      return false;
    } finally {
      setConnectionAttempts(prev => prev + 1);
    }
  }, [isOnline]);
  
  // Manual reconnection attempt that users can trigger
  const attemptReconnection = useCallback(async (): Promise<boolean> => {
    console.log('Manually attempting to reconnect...');
    setConnectionAttempts(prev => prev + 1);
    return testConnection();
  }, [testConnection]);
  
  // Set up event listeners for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser reports online status');
      // Don't immediately trust the browser - verify with a real request
      testConnection().then(isConnected => {
        if (isConnected) {
          console.log('Connection verified as online');
        } else {
          console.log('Browser reports online but connection test failed');
        }
      });
    };
    
    const handleOffline = () => {
      console.log('Browser reports offline status');
      setIsOnline(false);
    };
    
    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial connection test
    testConnection();
    
    // Set up periodic connection testing when offline
    let intervalId: number | undefined;
    
    if (!isOnline) {
      // Test connection every 30 seconds when offline
      intervalId = window.setInterval(testConnection, 30000);
    }
    
    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline, testConnection]);
  
  return {
    isOnline,
    lastOnlineAt,
    connectionAttempts,
    testConnection,
    attemptReconnection,
    offlineDuration: lastOnlineAt ? new Date().getTime() - lastOnlineAt.getTime() : null
  };
}