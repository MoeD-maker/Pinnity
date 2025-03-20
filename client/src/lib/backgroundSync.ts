import { processQueue, updateLastOnline } from './offlineStorage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useState, useEffect, useCallback } from 'react';

/**
 * Enum for the current sync status
 */
export enum SyncStatus {
  Idle = 'idle',
  Syncing = 'syncing',
  Success = 'success',
  Error = 'error'
}

/**
 * Interface for the result of a sync operation
 */
export interface SyncResult {
  status: SyncStatus;
  success: number;
  failed: number;
  timestamp: Date;
  error?: string;
}

/**
 * Background sync service
 * This handles synchronizing queued requests when the device comes back online
 */
export function useBackgroundSync() {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.Idle);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isSyncingEnabled, setIsSyncingEnabled] = useState(true);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(true);
  
  // Function to perform the sync operation
  const performSync = useCallback(async (): Promise<SyncResult> => {
    console.log('Starting background sync operation');
    
    // Skip if disabled
    if (!isSyncingEnabled) {
      console.log('Sync is disabled, skipping');
      return {
        status: SyncStatus.Idle,
        success: 0,
        failed: 0,
        timestamp: new Date()
      };
    }
    
    // Set status to syncing
    setSyncStatus(SyncStatus.Syncing);
    
    try {
      // Update the last online timestamp since we're about to sync
      updateLastOnline();
      
      // Process the queue of pending requests
      const { success, failed } = await processQueue((processed, total) => {
        console.log(`Sync progress: ${processed}/${total}`);
      });
      
      // Update the status based on results
      const newStatus = failed > 0 ? SyncStatus.Error : SyncStatus.Success;
      
      // Create the result
      const result: SyncResult = {
        status: newStatus,
        success,
        failed,
        timestamp: new Date()
      };
      
      // Update state
      setSyncStatus(newStatus);
      setLastSyncResult(result);
      
      console.log(`Sync completed: ${success} succeeded, ${failed} failed`);
      
      return result;
    } catch (error) {
      console.error('Error syncing data:', error);
      
      // Create the error result
      const result: SyncResult = {
        status: SyncStatus.Error,
        success: 0,
        failed: 1,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error during sync'
      };
      
      // Update state
      setSyncStatus(SyncStatus.Error);
      setLastSyncResult(result);
      
      return result;
    }
  }, [isSyncingEnabled]);
  
  // Automatically sync when coming back online
  useEffect(() => {
    if (isOnline && isAutoSyncEnabled) {
      performSync();
    }
  }, [isOnline, isAutoSyncEnabled, performSync]);
  
  // Setup periodic sync when online
  useEffect(() => {
    if (!isOnline || !isAutoSyncEnabled) return;
    
    // Sync every 2 minutes when online
    const intervalId = setInterval(performSync, 2 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [isOnline, isAutoSyncEnabled, performSync]);
  
  // Enable/disable auto sync
  const toggleAutoSync = useCallback(() => {
    setIsAutoSyncEnabled(prev => !prev);
  }, []);
  
  // Enable/disable all syncing
  const toggleSyncing = useCallback(() => {
    setIsSyncingEnabled(prev => !prev);
  }, []);
  
  return {
    syncStatus,
    lastSyncResult,
    isSyncingEnabled,
    isAutoSyncEnabled,
    performSync,
    toggleAutoSync,
    toggleSyncing
  };
}

/**
 * Register a background sync for browsers that support it
 * This uses Service Worker's Background Sync API for more reliable syncing
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Register a background sync
      await registration.sync.register('pinnity-sync');
      
      console.log('Background sync registered');
      return true;
    } catch (error) {
      console.error('Failed to register background sync:', error);
      return false;
    }
  }
  
  console.log('Background sync not supported in this browser');
  return false;
}