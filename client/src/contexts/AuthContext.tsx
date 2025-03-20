import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { apiPost, resetCSRFToken, fetchWithCSRF } from '@/lib/api';
import { handleError, ErrorCategory } from '@/lib/errorHandling';

// Cookie-based authentication
// Since we're using secure HTTP-only cookies, we only need to keep track of auth status client-side
// Without storing the actual token in localStorage
const USER_ID_KEY = 'pinnity_user_id';
const USER_TYPE_KEY = 'pinnity_user_type';
const AUTH_STATUS_KEY = 'pinnity_auth_status';

// Function to get user ID from storage
const getUserId = (): string | null => {
  return localStorage.getItem(USER_ID_KEY);
};

// Function to save user data to storage
const saveUserData = (userId: string, userType: string): void => {
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(USER_TYPE_KEY, userType);
  localStorage.setItem(AUTH_STATUS_KEY, 'authenticated');
};

// Function to remove user data from storage
const removeUserData = (): void => {
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_TYPE_KEY);
  localStorage.removeItem(AUTH_STATUS_KEY);
};

// Define the User type based on your schema
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userType: 'individual' | 'business' | 'admin';
  username: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  silentRefresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  // Reference to the auto-refresh timer
  const refreshTimerRef = useRef<number | null>(null);
  
  // Track if component is mounted (for cleanup)
  const isMountedRef = useRef<boolean>(true);

  // Check if user is already logged in
  // Clean up effect to cancel refresh timer on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Clear token refresh timer if it exists
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // Token refresh function - used for both automatic and manual refresh
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!getUserId()) {
      return false;
    }
    
    try {
      console.log('Refreshing authentication token...');
      const response = await apiPost<{
        userId: number;
        userType: string;
        message: string;
      }>('/api/auth/refresh-token');
      
      if (response && response.userId) {
        // Update the user information
        saveUserData(response.userId.toString(), response.userType);
        
        // Fetch complete user data if needed
        if (!user || user.id !== response.userId) {
          const userData = await apiRequest(`/api/user/${response.userId}`);
          setUser(userData);
        }
        
        console.log('Token refresh successful');
        return true;
      }
      
      return false;
    } catch (error) {
      // Handle token refresh failure - could be expired token or network issues
      console.error('Token refresh failed:', error);
      
      // Only display a visible error if it's an authentication error (not a network issue)
      if (error && (error as any).status === 401) {
        handleError(error, {
          defaultMessage: 'Your session expired. Please log in again.',
          silent: false
        });
        
        // Clear user data on authentication error
        setUser(null);
        removeUserData();
        resetCSRFToken();
        
        // Redirect to login page
        setLocation('/auth');
      } else {
        // For network errors, log but don't disrupt the user experience
        handleError(error, {
          defaultMessage: 'Failed to refresh your session due to a connection issue.',
          silent: true
        });
      }
      
      return false;
    }
  }, [user]);
  
  // Silent refresh that doesn't disrupt user experience
  const silentRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const result = await refreshToken();
      
      // Schedule next refresh if current one succeeded and component is still mounted
      if (result && isMountedRef.current) {
        // Set next refresh 5 minutes before token expiration (assuming 1 hour token)
        refreshTimerRef.current = window.setTimeout(() => {
          silentRefresh();
        }, 55 * 60 * 1000); // 55 minutes
      }
      
      return result;
    } catch (error) {
      console.error('Silent refresh error:', error);
      return false;
    }
  }, [refreshToken]);
  
  // Setup initial authentication check and refresh timer
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        console.log('Checking authentication status...');
        
        // First, get a CSRF token so we can make authenticated requests
        try {
          console.log('Fetching CSRF token...');
          const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
          const csrfData = await csrfResponse.json();
          console.log('CSRF token obtained for session:', csrfData.csrfToken ? 'Yes' : 'No');
        } catch (csrfErr) {
          console.error('Error fetching CSRF token:', csrfErr);
          // Continue anyway - we may still be able to use existing tokens
        }
        
        // Check for stored user ID
        const storedUserId = getUserId();
        const storedUserType = localStorage.getItem(USER_TYPE_KEY);
        console.log('Stored user ID:', storedUserId ? 'Present' : 'Not found');
        
        // Also check for legacy storage (backward compatibility)
        let legacyUserId = null;
        let legacyUserType = null;
        
        if (!storedUserId) {
          legacyUserId = localStorage.getItem('userId');
          legacyUserType = localStorage.getItem('userType');
          
          // If found in legacy storage, migrate to new storage keys
          if (legacyUserId && legacyUserType) {
            console.log('Found legacy user data, migrating...');
            saveUserData(legacyUserId, legacyUserType);
            // Clean up legacy storage
            localStorage.removeItem('userId');
            localStorage.removeItem('userType');
          }
        }
        
        // Use either the new storage or the legacy storage
        const userId = storedUserId || legacyUserId;
        const userType = storedUserType || legacyUserType;
        
        if (userId) {
          try {
            console.log('Attempting to fetch user data with ID:', userId);
            // Our JWT token is in a secure HTTP-only cookie
            // so we just need to make the request and the browser will 
            // automatically include the cookie
            const userData = await apiRequest(`/api/user/${userId}`);
            
            if (userData) {
              console.log('User data received successfully');
              setUser(userData);
              
              // Make sure we have the user ID and type stored
              if (userData.id) {
                saveUserData(userData.id.toString(), userData.userType);
              }
              
              // Start token refresh timer
              if (isMountedRef.current) {
                // Schedule refresh for 5 minutes before token expiry
                refreshTimerRef.current = window.setTimeout(() => {
                  silentRefresh();
                }, 55 * 60 * 1000); // 55 minutes
                
                console.log('Token refresh timer scheduled');
              }
              
              // If we're on the root path or auth page, redirect based on user type 
              const path = window.location.pathname;
              if (path === '/' || path === '/auth') {
                if (userData.userType === 'admin' || userType === 'admin') {
                  console.log('Redirecting to admin dashboard');
                  setLocation('/admin');
                } else if (userData.userType === 'business' || userType === 'business') {
                  console.log('Redirecting to vendor dashboard');
                  setLocation('/vendor');
                } else {
                  console.log('User is individual type, keeping on homepage');
                }
                // Keep individual users on the homepage if that's where they are
              }
            } else {
              console.warn('No user data returned from API');
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
            // If this fails, user is not authenticated
            removeUserData();
          }
        } else {
          console.log('No user ID found in storage, user is not logged in');
        }
      } catch (err) {
        console.error('Auth status check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [silentRefresh]);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // First, get a CSRF token
      console.log('Fetching CSRF token before login...');
      try {
        const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
        const csrfData = await csrfResponse.json();
        console.log('CSRF token obtained successfully:', csrfData.csrfToken ? 'Yes' : 'No');
        // The fetchWithCSRF function will use this token automatically
        resetCSRFToken(); // Clear any existing token
      } catch (csrfErr) {
        console.error('Error fetching CSRF token:', csrfErr);
        // Continue with login anyway, but it will likely fail
      }

      // Use CSRF-protected API call
      console.log('Attempting login with credentials...');
      const response = await apiPost<{
        message: string;
        userId: number;
        userType: string;
      }>('/api/auth/login', { email, password, rememberMe });

      if (response && response.userId) {
        console.log('Login successful, user ID:', response.userId);
        // Store user ID and type in localStorage for client-side reference
        // The actual authentication token is in a secure HTTP-only cookie
        saveUserData(response.userId.toString(), response.userType);
        
        // Fetch complete user data
        console.log('Fetching complete user data...');
        const userData = await apiRequest(`/api/user/${response.userId}`);
        console.log('User data received:', userData ? 'Yes' : 'No');
        setUser(userData);
        
        // Start token refresh timer - in case the user stays logged in for a long time
        if (isMountedRef.current) {
          // Schedule refresh for 5 minutes before token expiry
          refreshTimerRef.current = window.setTimeout(() => {
            silentRefresh();
          }, 55 * 60 * 1000); // 55 minutes
          
          console.log('Token refresh timer scheduled after login');
        }

        // Redirect based on user type
        if (response.userType === 'admin') {
          setLocation('/admin');
        } else if (response.userType === 'business') {
          setLocation('/vendor');
        } else {
          setLocation('/');
        }
      } else {
        throw new Error('Login failed: Invalid response');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Make a request to invalidate the session and clear the secure HTTP-only cookie
      await apiPost('/api/auth/logout');
      
      // Clear user data from state
      setUser(null);
      
      // Remove client-side storage
      removeUserData();
      
      // Also remove legacy storage items (for backward compatibility)
      localStorage.removeItem('userId');
      localStorage.removeItem('userType');
      
      // Reset CSRF token
      resetCSRFToken();
      
      // Redirect to login
      setLocation('/auth');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear refresh timer on logout
  const enhancedLogout = async () => {
    // Clear token refresh timer if it exists
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    // Call the original logout function
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout: enhancedLogout,
        refreshToken,
        silentRefresh,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}