import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { stores, queueRequest } from '../lib/offlineStorage';
import { useToast } from './use-toast';

export interface PersistenceMetadata {
  hasPersistedData: boolean;
  lastSaved: string | null;
  lastSyncedToServer: string | null;
  isSaving: boolean;
  isSyncing: boolean;
  isOfflineSyncPending: boolean;
  savingError: string | null;
}

export interface FormPersistenceOptions {
  formId: string;
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  syncToServerEndpoint?: string; // If provided, will sync to server when online
  onRestoreSuccess?: (data: any) => void;
  onRestoreError?: (error: any) => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: any) => void;
  onSyncSuccess?: () => void;
  onSyncError?: (error: any) => void;
}

/**
 * Enhanced hook for form persistence with offline support
 * Saves form state locally and syncs to server when online
 */
export function useOfflineFormPersistence<T>(
  formData: T,
  options: FormPersistenceOptions
) {
  const {
    formId,
    autoSave = false,
    autoSaveInterval = 60000, // Default to 1 minute
    syncToServerEndpoint,
    onRestoreSuccess,
    onRestoreError,
    onSaveSuccess,
    onSaveError,
    onSyncSuccess,
    onSyncError
  } = options;

  const { isOnline } = useOnlineStatus();
  const { toast } = useToast();
  
  // Form state metadata
  const [metadata, setMetadata] = useState<PersistenceMetadata>({
    hasPersistedData: false,
    lastSaved: null,
    lastSyncedToServer: null,
    isSaving: false,
    isSyncing: false,
    isOfflineSyncPending: false,
    savingError: null
  });
  
  // Keep track of changes since last server sync
  const unsyncedChanges = useRef<boolean>(false);
  
  // Store key for this form
  const formStoreKey = `form_${formId}`;
  const metadataStoreKey = `form_${formId}_metadata`;

  // Load initial metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const savedMetadata = await stores.formData.getItem<PersistenceMetadata>(metadataStoreKey);
        
        if (savedMetadata) {
          // Check if there are unsynced changes
          const isOfflineSyncPending = Boolean(
            savedMetadata.lastSaved && 
            (!savedMetadata.lastSyncedToServer || 
             new Date(savedMetadata.lastSaved) > new Date(savedMetadata.lastSyncedToServer))
          );
          
          setMetadata({
            ...savedMetadata,
            isSaving: false,
            isSyncing: false,
            isOfflineSyncPending
          });
          
          unsyncedChanges.current = isOfflineSyncPending;
        }
      } catch (error) {
        console.error('Error loading form metadata:', error);
      }
    };
    
    loadMetadata();
  }, [metadataStoreKey]);

  // Save form state to local storage
  const saveFormState = useCallback(async (): Promise<boolean> => {
    try {
      setMetadata(prev => ({ ...prev, isSaving: true, savingError: null }));
      
      // Save form data
      await stores.formData.setItem(formStoreKey, formData);
      
      // Update metadata
      const now = new Date().toISOString();
      const updatedMetadata: PersistenceMetadata = {
        ...metadata,
        hasPersistedData: true,
        lastSaved: now,
        isSaving: false,
        savingError: null,
        // If we've never synced or have unsynced changes, mark as pending
        isOfflineSyncPending: !isOnline && (
          !metadata.lastSyncedToServer || 
          unsyncedChanges.current
        )
      };
      
      await stores.formData.setItem(metadataStoreKey, updatedMetadata);
      setMetadata(updatedMetadata);
      
      // Mark that we have unsynced changes
      unsyncedChanges.current = true;
      
      // Trigger success callback
      if (onSaveSuccess) onSaveSuccess();
      
      console.log(`Form state saved locally for ${formId}`);
      
      // If we're online and have a sync endpoint, sync to server
      if (isOnline && syncToServerEndpoint) {
        syncToServer();
      }
      
      return true;
    } catch (error) {
      console.error('Error saving form state:', error);
      
      setMetadata(prev => ({ 
        ...prev, 
        isSaving: false, 
        savingError: error instanceof Error ? error.message : 'Unknown error saving form data' 
      }));
      
      // Trigger error callback
      if (onSaveError) onSaveError(error);
      
      return false;
    }
  }, [formData, formId, formStoreKey, isOnline, metadata, metadataStoreKey, onSaveError, onSaveSuccess, syncToServerEndpoint]);

  // Restore form state from local storage
  const restoreFormState = useCallback(async (): Promise<T | null> => {
    try {
      const savedData = await stores.formData.getItem<T>(formStoreKey);
      
      if (savedData) {
        // Trigger success callback
        if (onRestoreSuccess) onRestoreSuccess(savedData);
        return savedData;
      }
      
      return null;
    } catch (error) {
      console.error('Error restoring form state:', error);
      
      // Trigger error callback
      if (onRestoreError) onRestoreError(error);
      
      return null;
    }
  }, [formStoreKey, onRestoreError, onRestoreSuccess]);

  // Clear form state from local storage
  const clearFormState = useCallback(async (): Promise<void> => {
    try {
      await stores.formData.removeItem(formStoreKey);
      await stores.formData.removeItem(metadataStoreKey);
      
      setMetadata({
        hasPersistedData: false,
        lastSaved: null,
        lastSyncedToServer: null,
        isSaving: false,
        isSyncing: false,
        isOfflineSyncPending: false,
        savingError: null
      });
      
      unsyncedChanges.current = false;
      
      console.log(`Form state cleared for ${formId}`);
    } catch (error) {
      console.error('Error clearing form state:', error);
    }
  }, [formId, formStoreKey, metadataStoreKey]);

  // Check if saved data exists
  const checkForSavedData = useCallback(async (): Promise<boolean> => {
    try {
      const savedData = await stores.formData.getItem(formStoreKey);
      return Boolean(savedData);
    } catch (error) {
      console.error('Error checking for saved data:', error);
      return false;
    }
  }, [formStoreKey]);

  // Sync form data to server
  const syncToServer = useCallback(async (): Promise<boolean> => {
    // Skip if no sync endpoint or no unsynced changes
    if (!syncToServerEndpoint || !unsyncedChanges.current) {
      return false;
    }
    
    setMetadata(prev => ({ ...prev, isSyncing: true }));
    
    try {
      if (isOnline) {
        // We're online, make a direct API call
        const response = await fetch(syncToServerEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            formId,
            data: formData,
            lastSaved: metadata.lastSaved
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server sync failed with status ${response.status}`);
        }
        
        // Update metadata with sync time
        const now = new Date().toISOString();
        const updatedMetadata = {
          ...metadata,
          lastSyncedToServer: now,
          isSyncing: false,
          isOfflineSyncPending: false
        };
        
        await stores.formData.setItem(metadataStoreKey, updatedMetadata);
        setMetadata(updatedMetadata);
        
        // Reset unsynced changes flag
        unsyncedChanges.current = false;
        
        // Trigger success callback
        if (onSyncSuccess) onSyncSuccess();
        
        console.log(`Form data synced to server for ${formId}`);
        return true;
      } else {
        // We're offline, queue the request for later
        await queueRequest(
          syncToServerEndpoint,
          'POST',
          {
            formId,
            data: formData,
            lastSaved: metadata.lastSaved
          },
          { 'Content-Type': 'application/json' },
          'high' // High priority for form data sync
        );
        
        // Update metadata to indicate pending sync
        const updatedMetadata = {
          ...metadata,
          isSyncing: false,
          isOfflineSyncPending: true
        };
        
        await stores.formData.setItem(metadataStoreKey, updatedMetadata);
        setMetadata(updatedMetadata);
        
        // Notify user
        toast({
          title: "Offline mode detected",
          description: "Form data will be synced when you're back online.",
          duration: 3000
        });
        
        console.log(`Form data queued for sync when online for ${formId}`);
        return true;
      }
    } catch (error) {
      console.error('Error syncing form data to server:', error);
      
      // Update metadata to indicate sync error
      setMetadata(prev => ({ ...prev, isSyncing: false }));
      
      // Trigger error callback
      if (onSyncError) onSyncError(error);
      
      return false;
    }
  }, [formData, formId, isOnline, metadata, metadataStoreKey, onSyncError, onSyncSuccess, syncToServerEndpoint, toast]);

  // Set up auto-save if enabled
  useEffect(() => {
    if (!autoSave || autoSaveInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      saveFormState();
    }, autoSaveInterval);
    
    return () => clearInterval(intervalId);
  }, [autoSave, autoSaveInterval, formData, saveFormState]);

  // Attempt to sync to server when coming back online
  useEffect(() => {
    if (isOnline && metadata.isOfflineSyncPending && syncToServerEndpoint) {
      syncToServer();
    }
  }, [isOnline, metadata.isOfflineSyncPending, syncToServer, syncToServerEndpoint]);

  return {
    saveFormState,
    restoreFormState,
    clearFormState,
    checkForSavedData,
    syncToServer,
    metadata
  };
}