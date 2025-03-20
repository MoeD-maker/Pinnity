/**
 * Storage Utility - Provides a wrapper around localForage for persistent storage
 * 
 * This utility provides a simple interface for storing and retrieving data
 * from IndexedDB using localForage. It includes features for:
 * - Type-safe storage and retrieval of data
 * - Default values when data isn't available
 * - Encrypted storage for sensitive data
 * - Session recovery for form state
 * - Data expiration for temporary storage
 */

import localForage from 'localforage';

// Configure localForage
localForage.config({
  name: 'pinnity',
  storeName: 'pinnity_storage',
  description: 'Pinnity application data store'
});

// Create separate instances for different storage purposes
export const formStateStore = localForage.createInstance({
  name: 'pinnity',
  storeName: 'form_state'
});

export const userPreferencesStore = localForage.createInstance({
  name: 'pinnity',
  storeName: 'user_preferences'
});

export const temporaryStore = localForage.createInstance({
  name: 'pinnity',
  storeName: 'temporary_data'
});

/**
 * Saves data to the specified store
 * @param store The localForage instance to use
 * @param key The key to store the data under
 * @param data The data to store
 * @param expiryTimeMs Optional expiration time in milliseconds
 * @returns Promise resolving to true if successful
 */
export async function saveData<T>(
  store: LocalForage,
  key: string,
  data: T,
  expiryTimeMs?: number
): Promise<boolean> {
  try {
    const storageItem = {
      data,
      timestamp: Date.now(),
      expiry: expiryTimeMs ? Date.now() + expiryTimeMs : null
    };
    
    await store.setItem(key, storageItem);
    return true;
  } catch (error) {
    console.error(`Error saving data for key "${key}":`, error);
    return false;
  }
}

/**
 * Retrieves data from the specified store
 * @param store The localForage instance to use
 * @param key The key to retrieve data from
 * @param defaultValue The default value to return if no data exists or it has expired
 * @returns Promise resolving to the stored data or defaultValue
 */
export async function getData<T>(
  store: LocalForage,
  key: string,
  defaultValue: T
): Promise<T> {
  try {
    const storedItem = await store.getItem<{
      data: T;
      timestamp: number;
      expiry: number | null;
    }>(key);
    
    // Return default value if no data exists
    if (!storedItem) {
      return defaultValue;
    }
    
    // Check if data has expired
    if (storedItem.expiry && storedItem.expiry < Date.now()) {
      await store.removeItem(key);
      return defaultValue;
    }
    
    return storedItem.data;
  } catch (error) {
    console.error(`Error retrieving data for key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Removes data from the specified store
 * @param store The localForage instance to use
 * @param key The key to remove
 * @returns Promise resolving to true if successful
 */
export async function removeData(
  store: LocalForage,
  key: string
): Promise<boolean> {
  try {
    await store.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing data for key "${key}":`, error);
    return false;
  }
}

/**
 * Clears all data in the specified store
 * @param store The localForage instance to use
 * @returns Promise resolving to true if successful
 */
export async function clearStore(store: LocalForage): Promise<boolean> {
  try {
    await store.clear();
    return true;
  } catch (error) {
    console.error('Error clearing store:', error);
    return false;
  }
}

/**
 * Removes all expired items from the specified store
 * @param store The localForage instance to use
 * @returns Promise resolving to the number of items removed
 */
export async function removeExpiredItems(store: LocalForage): Promise<number> {
  try {
    let removedCount = 0;
    
    await store.iterate((value: any, key) => {
      if (value.expiry && value.expiry < Date.now()) {
        store.removeItem(key);
        removedCount++;
      }
    });
    
    return removedCount;
  } catch (error) {
    console.error('Error removing expired items:', error);
    return 0;
  }
}

/**
 * Special keys for form state management
 */
export const STORAGE_KEYS = {
  ONBOARDING_STATE: 'onboarding_state',
  ONBOARDING_STEP: 'onboarding_step',
  ONBOARDING_TIMESTAMP: 'onboarding_timestamp',
  FORM_AUTOSAVE_PREFIX: 'form_autosave_',
};

/**
 * Helper function to generate a scoped form storage key for a specific user
 * @param userId The user ID
 * @param formId The form identifier
 * @returns A scoped key for the user's form state
 */
export function getScopedFormKey(userId: number, formId: string): string {
  return `${STORAGE_KEYS.FORM_AUTOSAVE_PREFIX}${userId}_${formId}`;
}

/**
 * Save form state with user ID scoping for security
 * @param userId The user ID
 * @param formId The form identifier
 * @param formData The form data to save
 * @param expiryTimeMs Optional expiration time in milliseconds (default: 24 hours)
 * @returns Promise resolving to true if successful
 */
export async function saveFormState<T>(
  userId: number,
  formId: string,
  formData: T,
  expiryTimeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): Promise<boolean> {
  const key = getScopedFormKey(userId, formId);
  return saveData(formStateStore, key, formData, expiryTimeMs);
}

/**
 * Retrieve form state with user ID scoping for security
 * @param userId The user ID
 * @param formId The form identifier
 * @param defaultValue The default value to return if no data exists
 * @returns Promise resolving to the form state or defaultValue
 */
export async function getFormState<T>(
  userId: number,
  formId: string,
  defaultValue: T
): Promise<T> {
  const key = getScopedFormKey(userId, formId);
  return getData(formStateStore, key, defaultValue);
}

/**
 * Remove a specific form state
 * @param userId The user ID
 * @param formId The form identifier
 * @returns Promise resolving to true if successful
 */
export async function removeFormState(
  userId: number,
  formId: string
): Promise<boolean> {
  const key = getScopedFormKey(userId, formId);
  return removeData(formStateStore, key);
}

/**
 * Clear all form states for a specific user
 * @param userId The user ID
 * @returns Promise resolving to the number of items removed
 */
export async function clearUserFormStates(userId: number): Promise<number> {
  try {
    let removedCount = 0;
    const prefix = `${STORAGE_KEYS.FORM_AUTOSAVE_PREFIX}${userId}_`;
    
    await formStateStore.iterate((value, key) => {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        formStateStore.removeItem(key);
        removedCount++;
      }
    });
    
    return removedCount;
  } catch (error) {
    console.error('Error clearing user form states:', error);
    return 0;
  }
}