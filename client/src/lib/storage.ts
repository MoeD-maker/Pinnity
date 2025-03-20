/**
 * Storage utilities for client-side persistence
 * 
 * This module provides utilities for storing and retrieving data from IndexedDB
 * using the localforage library. It handles serialization, storage limits,
 * and expiration of stored data.
 */

import localforage from 'localforage';

// Configure localforage
localforage.config({
  name: 'pinnity',
  version: 1.0,
  storeName: 'pinnity_userdata',
  description: 'Pinnity user data and form persistence',
});

// Default expiration time for stored data (24 hours)
const DEFAULT_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// Maximum size for stored values (in bytes)
const MAX_VALUE_SIZE = 5 * 1024 * 1024; // 5MB

// Types for stored data
export interface StoredData<T> {
  value: T;
  timestamp: number;
  expiresAt: number;
  size: number;
}

/**
 * Store data in IndexedDB with expiration
 * 
 * @param key Storage key
 * @param value Data to store
 * @param expirationMs Expiration time in milliseconds (default: 24 hours)
 * @returns Promise resolving to success status
 */
export async function storeData<T>(
  key: string, 
  value: T, 
  expirationMs: number = DEFAULT_EXPIRATION_MS
): Promise<boolean> {
  try {
    // Serialize the value to JSON to get its size
    const serialized = JSON.stringify(value);
    
    // Check if the value exceeds the maximum size
    if (serialized.length > MAX_VALUE_SIZE) {
      console.error(`Data for key '${key}' exceeds maximum size limit`);
      return false;
    }
    
    // Store with metadata including expiration
    const now = Date.now();
    const storedData: StoredData<T> = {
      value,
      timestamp: now,
      expiresAt: now + expirationMs,
      size: serialized.length,
    };
    
    await localforage.setItem(key, storedData);
    return true;
  } catch (error) {
    console.error(`Error storing data for key '${key}':`, error);
    return false;
  }
}

/**
 * Retrieve data from IndexedDB, checking for expiration
 * 
 * @param key Storage key
 * @returns Promise resolving to the stored value or null if not found or expired
 */
export async function retrieveData<T>(key: string): Promise<T | null> {
  try {
    const storedData = await localforage.getItem<StoredData<T>>(key);
    
    // Check if data exists
    if (!storedData) {
      return null;
    }
    
    // Check if data has expired
    if (Date.now() > storedData.expiresAt) {
      console.log(`Data for key '${key}' has expired, removing it`);
      await localforage.removeItem(key);
      return null;
    }
    
    return storedData.value;
  } catch (error) {
    console.error(`Error retrieving data for key '${key}':`, error);
    return null;
  }
}

/**
 * Remove data from IndexedDB
 * 
 * @param key Storage key
 * @returns Promise resolving to success status
 */
export async function removeData(key: string): Promise<boolean> {
  try {
    await localforage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing data for key '${key}':`, error);
    return false;
  }
}

/**
 * Check if data exists for a key (and is not expired)
 * 
 * @param key Storage key
 * @returns Promise resolving to boolean indicating existence
 */
export async function hasData(key: string): Promise<boolean> {
  const data = await retrieveData(key);
  return data !== null;
}

/**
 * Get expiration info for stored data
 * 
 * @param key Storage key
 * @returns Promise resolving to expiration timestamp or null if not found
 */
export async function getExpirationInfo(key: string): Promise<{ 
  expiresAt: number; 
  remainingMs: number;
} | null> {
  try {
    const storedData = await localforage.getItem<StoredData<any>>(key);
    
    if (!storedData) {
      return null;
    }
    
    const now = Date.now();
    const remainingMs = Math.max(0, storedData.expiresAt - now);
    
    return {
      expiresAt: storedData.expiresAt,
      remainingMs,
    };
  } catch (error) {
    console.error(`Error getting expiration info for key '${key}':`, error);
    return null;
  }
}

/**
 * Clear all stored data
 * 
 * @returns Promise resolving to success status
 */
export async function clearAllData(): Promise<boolean> {
  try {
    await localforage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}

/**
 * Generate a unique storage key based on user ID and form ID
 * 
 * @param userId User ID (can be null for anonymous users)
 * @param formId Form identifier
 * @returns Unique storage key
 */
export function getFormStorageKey(userId: number | null, formId: string): string {
  return `form:${userId || 'anonymous'}:${formId}`;
}

/**
 * Clean up expired data (can be called periodically)
 * 
 * @returns Promise resolving to number of items removed
 */
export async function cleanupExpiredData(): Promise<number> {
  try {
    let removedCount = 0;
    
    await localforage.iterate<StoredData<any>, void>((storedData, key) => {
      if (Date.now() > storedData.expiresAt) {
        localforage.removeItem(key);
        removedCount++;
      }
    });
    
    return removedCount;
  } catch (error) {
    console.error('Error cleaning up expired data:', error);
    return 0;
  }
}