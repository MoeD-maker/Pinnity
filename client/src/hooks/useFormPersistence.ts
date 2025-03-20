/**
 * Form Persistence Hook
 * 
 * This hook provides automatic form state persistence with:
 * - Auto-saving form state as the user interacts
 * - Restoring form state when returning to a form
 * - Session recovery if the browser crashes or page is refreshed
 * - Support for "Save & Continue Later" functionality
 * - Auto-expiration of old/unused form state
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  saveFormState, 
  getFormState, 
  removeFormState 
} from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';

export interface FormPersistenceOptions {
  /** How often to auto-save (in milliseconds). Set to 0 to disable auto-save. */
  autoSaveInterval?: number;
  /** How long to keep the form data (in milliseconds) */
  expiryTime?: number;
  /** Whether to automatically restore form data on mount */
  autoRestore?: boolean;
  /** Whether to show debugging information in console */
  debug?: boolean;
}

const DEFAULT_OPTIONS: FormPersistenceOptions = {
  autoSaveInterval: 5000, // 5 seconds
  expiryTime: 24 * 60 * 60 * 1000, // 24 hours
  autoRestore: true,
  debug: false
};

export interface FormPersistenceMetadata {
  lastSaved: Date | null;
  isDirty: boolean;
  hasPersistedData: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

/**
 * Hook for form state persistence
 * @param formId Unique identifier for the form
 * @param initialState Initial form state (before any persistence)
 * @param options Configuration options
 * @returns An object containing form state, metadata, and control functions
 */
export function useFormPersistence<T extends Record<string, any>>(
  formId: string,
  initialState: T,
  options: FormPersistenceOptions = {}
) {
  // Merge default options with provided options
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { debug, autoSaveInterval, expiryTime, autoRestore } = mergedOptions;

  // Get authenticated user
  const { user } = useAuth();
  const userId = user?.id;

  // Form state and metadata
  const [formState, setFormState] = useState<T>(initialState);
  const [metadata, setMetadata] = useState<FormPersistenceMetadata>({
    lastSaved: null,
    isDirty: false,
    hasPersistedData: false,
    saveStatus: 'idle'
  });
  
  // Track if the form has been modified since last save
  const [isDirty, setIsDirty] = useState(false);
  const formStateRef = useRef(formState);
  const autoSaveTimerRef = useRef<number | null>(null);
  
  // Log debug information if enabled
  const logDebug = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[FormPersistence:${formId}] ${message}`, data || '');
    }
  }, [debug, formId]);

  // Load form state from storage on mount
  useEffect(() => {
    if (!userId || !autoRestore) return;
    
    const loadFormState = async () => {
      try {
        logDebug('Loading form state from storage');
        const savedState = await getFormState<T | null>(userId, formId, null);
        
        if (savedState) {
          logDebug('Loaded saved state', savedState);
          setFormState(savedState);
          setMetadata(prev => ({
            ...prev,
            hasPersistedData: true,
            lastSaved: new Date()
          }));
        } else {
          logDebug('No saved state found, using initial state');
          setFormState(initialState);
        }
      } catch (error) {
        console.error('Error loading form state:', error);
        setFormState(initialState);
      }
    };
    
    loadFormState();
  }, [userId, formId, initialState, autoRestore, logDebug]);
  
  // Update formStateRef when formState changes
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);
  
  // Save form state to storage
  const saveState = useCallback(async () => {
    if (!userId) {
      logDebug('No user ID available, skipping save');
      return false;
    }
    
    try {
      logDebug('Saving form state to storage', formStateRef.current);
      setMetadata(prev => ({ ...prev, saveStatus: 'saving' }));
      
      const success = await saveFormState(
        userId, 
        formId, 
        formStateRef.current,
        expiryTime
      );
      
      if (success) {
        logDebug('Form state saved successfully');
        setIsDirty(false);
        setMetadata(prev => ({
          ...prev,
          lastSaved: new Date(),
          isDirty: false,
          hasPersistedData: true,
          saveStatus: 'saved'
        }));
        return true;
      } else {
        throw new Error('Save operation returned false');
      }
    } catch (error) {
      console.error('Error saving form state:', error);
      setMetadata(prev => ({ ...prev, saveStatus: 'error' }));
      return false;
    }
  }, [userId, formId, expiryTime, logDebug]);
  
  // Auto-save effect
  useEffect(() => {
    if (!userId || !autoSaveInterval || autoSaveInterval <= 0) return;
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      window.clearInterval(autoSaveTimerRef.current);
    }
    
    // Set up auto-save interval
    autoSaveTimerRef.current = window.setInterval(() => {
      if (isDirty) {
        logDebug('Auto-saving form state');
        saveState();
      }
    }, autoSaveInterval);
    
    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [userId, isDirty, autoSaveInterval, saveState, logDebug]);

  // Handle beforeunload event to save state when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        // Save state synchronously using localStorage as a fallback
        // since async operations might not complete before page unloads
        try {
          localStorage.setItem(
            `emergency_form_state_${formId}`, 
            JSON.stringify({
              data: formStateRef.current,
              userId,
              timestamp: Date.now()
            })
          );
        } catch (error) {
          console.error('Error saving emergency form state:', error);
        }
        
        // Modern browsers ignore this message but require returnValue to be set
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [userId, formId, isDirty]);
  
  // Check for emergency saved state on mount and restore if needed
  useEffect(() => {
    const checkEmergencyState = () => {
      try {
        const key = `emergency_form_state_${formId}`;
        const savedJson = localStorage.getItem(key);
        
        if (savedJson) {
          const saved = JSON.parse(savedJson);
          
          // Only restore if it's for the current user
          if (saved.userId === userId) {
            logDebug('Found emergency saved state, restoring', saved.data);
            setFormState(saved.data);
            setIsDirty(true);
            setMetadata(prev => ({
              ...prev, 
              hasPersistedData: true,
              lastSaved: new Date(saved.timestamp)
            }));
          }
          
          // Remove the emergency state
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error('Error checking emergency form state:', error);
      }
    };
    
    if (userId && autoRestore) {
      checkEmergencyState();
    }
  }, [userId, formId, autoRestore, logDebug]);
  
  // Update form state and mark as dirty
  const updateFormState = useCallback((newState: Partial<T> | ((prev: T) => T)) => {
    setFormState(prev => {
      const nextState = typeof newState === 'function'
        ? (newState as Function)(prev)
        : { ...prev, ...newState };
      
      // Only mark as dirty if state has actually changed
      const hasChanged = JSON.stringify(nextState) !== JSON.stringify(prev);
      if (hasChanged && !isDirty) {
        setIsDirty(true);
        setMetadata(prevMetadata => ({ ...prevMetadata, isDirty: true }));
      }
      
      return nextState;
    });
  }, [isDirty]);
  
  // Save immediately
  const saveImmediately = useCallback(async () => {
    return await saveState();
  }, [saveState]);
  
  // Clear saved state
  const clearSavedState = useCallback(async () => {
    if (!userId) return false;
    
    try {
      logDebug('Clearing saved form state');
      const success = await removeFormState(userId, formId);
      
      if (success) {
        setFormState(initialState);
        setIsDirty(false);
        setMetadata({
          lastSaved: null,
          isDirty: false,
          hasPersistedData: false,
          saveStatus: 'idle'
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error clearing saved form state:', error);
      return false;
    }
  }, [userId, formId, initialState, logDebug]);
  
  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormState(initialState);
    setIsDirty(true);
    setMetadata(prev => ({
      ...prev,
      isDirty: true
    }));
  }, [initialState]);
  
  return {
    // Form state and update function
    formState,
    updateFormState,
    
    // Metadata for the UI
    metadata,
    
    // Actions
    save: saveImmediately,
    reset: resetForm,
    clear: clearSavedState,
    
    // Additional helpers
    isDirty
  };
}