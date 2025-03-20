/**
 * Form Persistence Hook
 * 
 * This hook provides automatic persistence for form data using IndexedDB,
 * with features for saving, restoring, and managing form state across sessions.
 * It includes auto-save functionality, manual save actions, and dirty state tracking.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  storeData, 
  retrieveData, 
  removeData, 
  getFormStorageKey,
  getExpirationInfo,
  hasData
} from '@/lib/storage';

// Default auto-save interval in milliseconds (15 seconds)
const DEFAULT_AUTOSAVE_INTERVAL = 15 * 1000;

export interface FormPersistenceMetadata {
  lastSaved: number | null;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  hasPersistedData: boolean;
  isDirty: boolean;
  expiresAt: number | null;
}

export interface FormPersistenceOptions {
  // Form identifier (used in storage key)
  formId: string;
  
  // Whether to enable auto-save functionality
  autoSave?: boolean;
  
  // Auto-save interval in milliseconds
  autoSaveInterval?: number;
  
  // Maximum storage time in milliseconds (default: 24 hours)
  expirationMs?: number;
  
  // Optional callback to run on successful restore
  onRestoreSuccess?: (data: any) => void;
  
  // Optional callback to run when restore fails
  onRestoreError?: (error: any) => void;
  
  // Optional callback to run on save success
  onSaveSuccess?: () => void;
  
  // Optional callback to run on save error
  onSaveError?: (error: any) => void;
}

/**
 * Hook for form data persistence across sessions
 * 
 * @param formState Current form state to persist
 * @param options Configuration options for persistence behavior
 * @returns Object with form persistence functions and metadata
 */
export function useFormPersistence<T extends object>(
  formState: T,
  options: FormPersistenceOptions
): {
  // Save the current form state manually
  saveFormState: () => Promise<boolean>;
  
  // Restore form state from storage
  restoreFormState: () => Promise<T | null>;
  
  // Clear the stored form state
  clearFormState: () => Promise<boolean>;
  
  // Metadata about the persistence state
  metadata: FormPersistenceMetadata;
  
  // Check if there's previously saved data without loading it
  checkForSavedData: () => Promise<boolean>;
} {
  // Get auth context for user ID
  const { user } = useAuth();
  const userId = user?.id || null;
  
  // Set up initial metadata state
  const [metadata, setMetadata] = useState<FormPersistenceMetadata>({
    lastSaved: null,
    saveStatus: 'idle',
    hasPersistedData: false,
    isDirty: false,
    expiresAt: null,
  });
  
  // Previous form state for comparison
  const previousFormStateRef = useRef<string>(JSON.stringify(formState));
  
  // Storage key for this form
  const storageKey = getFormStorageKey(userId, options.formId);
  
  // Auto-save timer reference
  const autoSaveTimerRef = useRef<number | null>(null);
  
  // Default options
  const {
    autoSave = true,
    autoSaveInterval = DEFAULT_AUTOSAVE_INTERVAL,
    expirationMs,
    onRestoreSuccess,
    onRestoreError,
    onSaveSuccess,
    onSaveError,
  } = options;
  
  /**
   * Check if the form has been modified since last save
   */
  const checkIfDirty = useCallback(() => {
    const currentFormState = JSON.stringify(formState);
    const isDirty = currentFormState !== previousFormStateRef.current;
    
    setMetadata(prev => ({
      ...prev,
      isDirty,
    }));
    
    return isDirty;
  }, [formState]);
  
  /**
   * Save the current form state
   */
  const saveFormState = useCallback(async (): Promise<boolean> => {
    try {
      // Check if there are actual changes to save
      const isDirty = checkIfDirty();
      if (!isDirty) {
        console.log('No changes to save for form:', options.formId);
        return true; // Not saving but not an error
      }
      
      setMetadata(prev => ({ ...prev, saveStatus: 'saving' }));
      
      const success = await storeData(
        storageKey,
        formState,
        expirationMs
      );
      
      if (success) {
        const now = Date.now();
        setMetadata(prev => ({
          ...prev,
          lastSaved: now,
          saveStatus: 'success',
          hasPersistedData: true,
          isDirty: false,
        }));
        
        // Update the previous state reference
        previousFormStateRef.current = JSON.stringify(formState);
        
        // Get and store expiration info
        const expirationInfo = await getExpirationInfo(storageKey);
        if (expirationInfo) {
          setMetadata(prev => ({
            ...prev,
            expiresAt: expirationInfo.expiresAt,
          }));
        }
        
        onSaveSuccess?.();
        return true;
      } else {
        setMetadata(prev => ({ ...prev, saveStatus: 'error' }));
        onSaveError?.(new Error('Failed to save form state'));
        return false;
      }
    } catch (error) {
      console.error('Error saving form state:', error);
      setMetadata(prev => ({ ...prev, saveStatus: 'error' }));
      onSaveError?.(error);
      return false;
    }
  }, [
    checkIfDirty, 
    expirationMs, 
    formState, 
    onSaveError, 
    onSaveSuccess, 
    options.formId, 
    storageKey
  ]);
  
  /**
   * Restore form state from storage
   */
  const restoreFormState = useCallback(async (): Promise<T | null> => {
    try {
      const data = await retrieveData<T>(storageKey);
      
      if (data) {
        // Update the metadata to show we have valid data
        const expirationInfo = await getExpirationInfo(storageKey);
        setMetadata(prev => ({
          ...prev,
          hasPersistedData: true,
          lastSaved: expirationInfo?.expiresAt 
            ? expirationInfo.expiresAt - (expirationMs || 24 * 60 * 60 * 1000) 
            : Date.now(),
          expiresAt: expirationInfo?.expiresAt || null,
          isDirty: false,
        }));
        
        // Update the previous state reference
        previousFormStateRef.current = JSON.stringify(data);
        
        onRestoreSuccess?.(data);
        return data;
      }
      
      setMetadata(prev => ({
        ...prev,
        hasPersistedData: false,
      }));
      
      return null;
    } catch (error) {
      console.error('Error restoring form state:', error);
      onRestoreError?.(error);
      return null;
    }
  }, [expirationMs, onRestoreError, onRestoreSuccess, storageKey]);
  
  /**
   * Clear the stored form state
   */
  const clearFormState = useCallback(async (): Promise<boolean> => {
    try {
      await removeData(storageKey);
      
      setMetadata(prev => ({
        ...prev,
        hasPersistedData: false,
        lastSaved: null,
        expiresAt: null,
      }));
      
      return true;
    } catch (error) {
      console.error('Error clearing form state:', error);
      return false;
    }
  }, [storageKey]);
  
  /**
   * Check if there's previously saved data without loading it
   */
  const checkForSavedData = useCallback(async (): Promise<boolean> => {
    try {
      const exists = await hasData(storageKey);
      
      if (exists) {
        const expirationInfo = await getExpirationInfo(storageKey);
        
        setMetadata(prev => ({
          ...prev,
          hasPersistedData: true,
          expiresAt: expirationInfo?.expiresAt || null,
          lastSaved: expirationInfo?.expiresAt 
            ? expirationInfo.expiresAt - (expirationMs || 24 * 60 * 60 * 1000)
            : null,
        }));
      } else {
        setMetadata(prev => ({
          ...prev,
          hasPersistedData: false,
        }));
      }
      
      return exists;
    } catch (error) {
      console.error('Error checking for saved data:', error);
      return false;
    }
  }, [expirationMs, storageKey]);
  
  /**
   * Set up auto-save functionality and check for existing data
   */
  useEffect(() => {
    // Check for existing data on mount
    checkForSavedData();
    
    // Set up auto-save functionality if enabled
    if (autoSave) {
      const setupAutoSave = () => {
        // Clear any existing timer
        if (autoSaveTimerRef.current !== null) {
          window.clearInterval(autoSaveTimerRef.current);
        }
        
        // Set up new timer
        autoSaveTimerRef.current = window.setInterval(() => {
          const isDirty = checkIfDirty();
          if (isDirty) {
            saveFormState();
          }
        }, autoSaveInterval);
      };
      
      setupAutoSave();
      
      // Clean up timer on unmount
      return () => {
        if (autoSaveTimerRef.current !== null) {
          window.clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [
    autoSave, 
    autoSaveInterval, 
    checkForSavedData, 
    checkIfDirty, 
    saveFormState
  ]);
  
  /**
   * Check for form changes when formState changes
   */
  useEffect(() => {
    checkIfDirty();
  }, [checkIfDirty, formState]);
  
  return {
    saveFormState,
    restoreFormState,
    clearFormState,
    metadata,
    checkForSavedData,
  };
}