/**
 * User Utilities
 * 
 * This module provides centralized functions to retrieve user data
 * from various storage locations, handling legacy formats and
 * providing a consistent interface across the application.
 */

const USER_ID_KEY = 'pinnity_user_id';
const USER_TYPE_KEY = 'pinnity_user_type';
const AUTH_STATUS_KEY = 'pinnity_auth_status';

/**
 * Gets the current user ID from any available storage format
 * Handles multiple legacy storage formats for backwards compatibility
 */
export function getCurrentUserId(): number | null {
  try {
    // First try the current standard format
    const userId = localStorage.getItem(USER_ID_KEY);
    if (userId) {
      return parseInt(userId, 10);
    }

    // Then try legacy "userId" format
    const legacyUserId = localStorage.getItem('userId');
    if (legacyUserId) {
      console.log('Using legacy user ID format. Consider migrating to new format.');
      return parseInt(legacyUserId, 10);
    }

    // Try extracting from user object if it exists (very old format)
    const userObj = localStorage.getItem('user');
    if (userObj) {
      try {
        const parsed = JSON.parse(userObj);
        if (parsed && parsed.id) {
          console.log('Extracted user ID from user object. Consider migrating to new format.');
          return parsed.id;
        }
      } catch (e) {
        console.error('Error parsing user object from localStorage:', e);
      }
    }

    // User is not logged in or ID is not available
    return null;
  } catch (error) {
    console.error('Error retrieving user ID:', error);
    return null;
  }
}

/**
 * Gets the current user object with available data
 * Returns a basic user object or null if not authenticated
 */
export function getCurrentUser(): any | null {
  const userId = getCurrentUserId();
  if (!userId) return null;

  const userType = localStorage.getItem(USER_TYPE_KEY) || localStorage.getItem('userType') || 'individual';

  // First check for full user object
  const userObj = localStorage.getItem('user');
  if (userObj) {
    try {
      const parsed = JSON.parse(userObj);
      if (parsed && parsed.id) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing user object from localStorage:', e);
    }
  }

  // Return minimal user info
  return {
    id: userId,
    userType: userType
  };
}

/**
 * Saves user data consistently across all storage formats
 * for backwards compatibility
 */
export function saveUserData(userId: string | number, userType: string, userData: any = {}): void {
  try {
    // Store in current format
    localStorage.setItem(USER_ID_KEY, userId.toString());
    localStorage.setItem(USER_TYPE_KEY, userType);
    localStorage.setItem(AUTH_STATUS_KEY, 'authenticated');
    
    // Store minimal legacy format for backward compatibility
    localStorage.setItem('userId', userId.toString());
    localStorage.setItem('userType', userType);
    
    // If we have a full user object, store it too
    if (Object.keys(userData).length > 0) {
      localStorage.setItem('user', JSON.stringify({
        ...userData,
        id: userId,
        userType: userType
      }));
    }
  } catch (error) {
    console.error('Error saving user data:', error);
  }
}

/**
 * Clears all user data from storage on logout
 */
export function clearUserData(): void {
  try {
    // Clear current format
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_TYPE_KEY);
    localStorage.removeItem(AUTH_STATUS_KEY);
    
    // Clear legacy format for thoroughness
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('user');
    
    // Clear any session data
    localStorage.removeItem('session');
    localStorage.removeItem('auth_token');
    
    // Clear any custom preferences or states
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('theme_preference');
    
    // Add other items that should be cleared on logout
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
}