import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { apiPost, resetCSRFToken, fetchWithCSRF } from '@/lib/api';
import { handleError, ErrorCategory } from '@/lib/errorHandling';
import { getCurrentUserId, saveUserData, clearUserData } from '@/utils/userUtils';

// Cookie-based authentication
// Since we're using secure HTTP-only cookies, we only need to keep track of auth status client-side
// Without storing the actual token in localStorage
const AUTH_STATUS_KEY = 'pinnity_auth_status';
const USER_TYPE_KEY = 'pinnity_user_type';

// Function to get user ID from storage - now from centralized utility
const getUserId = (): string | null => {
  const userId = getCurrentUserId();
  return userId ? userId.toString() : null;
};

// Define the User type based on your schema
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userType: 'individual' | 'business' | 'admin';
  username: string;
  phone?: string;
  address?: string;
  created_at?: string;
  // Add other user properties as needed
}

/**
 * Authentication state machine states
 * Represents the different states in the authentication flow
 */
export type AuthState = 
  | 'initializing'   // Initial state when app first loads
  | 'authenticating' // Actively verifying credentials  
  | 'authenticated'  // User is verified and logged in
  | 'unauthenticated' // User is not logged in
  | 'redirecting';    // Navigation in progress

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
  silentRefresh: () => Promise<boolean>;
  authStatusChecked: boolean; // Flag to indicate initial auth check is complete
  isRedirecting: boolean; // Flag to prevent multiple redirects
  authState: AuthState; // Current state in the authentication state machine
  redirectPath: string | null; // Path to redirect to after authentication
  getAppropriateRedirectPath: (user: User | null, currentPath: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Determines the appropriate redirect path based on user type and current location
 * This centralizes all redirection logic in one place for consistency
 * 
 * @param user The current user object or null if not authenticated
 * @param currentPath The current application path
 * @returns The path to redirect to
 */
function getAppropriateRedirectPathImpl(user: User | null, currentPath: string): string {
  // Debug logging with timestamps
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // Extract HH:MM:SS
  console.log(`[${timestamp}] Computing redirect: user=${user?.userType || 'null'}, path=${currentPath}`);
  
  // If no user (not authenticated), always go to auth page
  if (!user) {
    console.log(`[${timestamp}] No user, redirecting to /auth`);
    return '/auth';
  }
  
  // Skip redirection for diagnostic routes
  if (
    currentPath === '/test-page' || 
    currentPath === '/simple-explore' || 
    currentPath === '/test-login' ||
    currentPath === '/minimal' ||
    currentPath.startsWith('/test')
  ) {
    console.log(`[${timestamp}] Diagnostic page ${currentPath}, no redirect needed`);
    return currentPath;
  }
  
  // For authenticated users, redirect based on user type
  const { userType } = user;
  
  // User is on the auth page but already logged in - redirect based on role
  if (currentPath === '/auth') {
    if (userType === 'admin') {
      console.log(`[${timestamp}] Authenticated admin on /auth, redirecting to /admin`);
      return '/admin';
    } else if (userType === 'business') {
      console.log(`[${timestamp}] Authenticated business on /auth, redirecting to /vendor`);
      return '/vendor';
    } else {
      console.log(`[${timestamp}] Authenticated individual on /auth, redirecting to /`);
      return '/';
    }
  }
  
  // User is on the homepage but needs role-specific page
  if (currentPath === '/') {
    if (userType === 'admin') {
      console.log(`[${timestamp}] Admin on /, redirecting to /admin`);
      return '/admin';
    } else if (userType === 'business') {
      console.log(`[${timestamp}] Business on /, redirecting to /vendor`);
      return '/vendor';
    }
    // Individual users stay on homepage
    return '/';
  }
  
  // Enforce role-based access to sections
  if (userType === 'business' && !currentPath.startsWith('/vendor') && 
      currentPath !== '/profile' && currentPath !== '/settings') {
    console.log(`[${timestamp}] Business trying to access ${currentPath}, redirecting to /vendor`);
    return '/vendor';
  }
  
  if (userType === 'admin' && !currentPath.startsWith('/admin') && 
      currentPath !== '/profile' && currentPath !== '/settings') {
    console.log(`[${timestamp}] Admin trying to access ${currentPath}, redirecting to /admin`);
    return '/admin';
  }
  
  if (userType === 'individual' && 
      (currentPath.startsWith('/vendor') || currentPath.startsWith('/admin'))) {
    console.log(`[${timestamp}] Individual trying to access ${currentPath}, redirecting to /`);
    return '/';
  }
  
  // No redirection needed, user can access current path
  console.log(`[${timestamp}] No redirection needed for ${userType} on ${currentPath}`);
  return currentPath;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [authStatusChecked, setAuthStatusChecked] = useState<boolean>(false);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  
  // Reference to the auto-refresh timer
  const refreshTimerRef = useRef<number | null>(null);
  
  // Reference to track component mounted state
  const isMountedRef = useRef<boolean>(true);
  
  // Function to determine appropriate redirect path
  const getAppropriateRedirectPath = useCallback((user: User | null, currentPath: string): string => {
    return getAppropriateRedirectPathImpl(user, currentPath);
  }, []);

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
      
      // Use new API endpoint with versioning
      const response = await apiRequest('/api/v1/auth/refresh', {
        method: 'POST'
      }) as {
        userId: number;
        userType: string;
        message: string;
      };
      
      if (response && response.userId) {
        // Update the user information
        saveUserData(response.userId.toString(), response.userType);
        
        // Fetch complete user data if needed
        if (!user || user.id !== response.userId) {
          const userData = await apiRequest(`/api/v1/user/${response.userId}`);
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
        clearUserData();
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
  }, [user, setLocation]);
  
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
  // Track API request to prevent excessive calls
  const pendingUserRequestRef = useRef<boolean>(false);
  const userDataCacheRef = useRef<User | null>(null);
  const lastUserRequestTimeRef = useRef<number>(0);
  
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Set initial state
        setIsLoading(true);
        setAuthState('initializing');
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.log(`[${timestamp}] Checking authentication status...`);
        
        // First, get a CSRF token so we can make authenticated requests
        try {
          console.log(`[${timestamp}] Fetching CSRF token...`);
          const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
          const csrfData = await csrfResponse.json();
          console.log(`[${timestamp}] CSRF token obtained for session:`, csrfData.csrfToken ? 'Yes' : 'No');
        } catch (csrfErr) {
          console.error(`[${timestamp}] Error fetching CSRF token:`, csrfErr);
          // Continue anyway - we may still be able to use existing tokens
        }
        
        // Update state to show we're authenticating
        setAuthState('authenticating');
        
        // Check for stored user ID
        const storedUserId = getUserId();
        const storedUserType = localStorage.getItem(USER_TYPE_KEY);
        console.log(`[${timestamp}] Stored user ID:`, storedUserId ? 'Present' : 'Not found');
        
        // Also check for legacy storage (backward compatibility)
        let legacyUserId = null;
        let legacyUserType = null;
        
        if (!storedUserId) {
          legacyUserId = localStorage.getItem('userId');
          legacyUserType = localStorage.getItem('userType');
          
          // If found in legacy storage, migrate to new storage keys
          if (legacyUserId && legacyUserType) {
            console.log(`[${timestamp}] Found legacy user data, migrating...`);
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
            // To prevent excessive API calls, add request tracking and caching
            const now = Date.now();
            
            // Check if we already have a pending request or have made a request very recently (within 2 seconds)
            if (pendingUserRequestRef.current || (now - lastUserRequestTimeRef.current < 2000 && userDataCacheRef.current)) {
              console.log(`[${timestamp}] Using cached user data to prevent excessive requests`);
              
              // If we have cached data, use it instead of making a new request
              if (userDataCacheRef.current) {
                console.log(`[${timestamp}] Using cached user data`);
                setAuthState('authenticated');
                setUser(userDataCacheRef.current);
                
                // Still update redirect path using cached data
                const currentPath = window.location.pathname;
                const targetPath = getAppropriateRedirectPathImpl(userDataCacheRef.current, currentPath);
                
                if (targetPath !== currentPath) {
                  console.log(`[${timestamp}] Setting redirect path from ${currentPath} to ${targetPath} (using cache)`);
                  setRedirectPath(targetPath);
                }
                
                // Continue with token refresh scheduling
                if (isMountedRef.current) {
                  refreshTimerRef.current = window.setTimeout(() => {
                    silentRefresh();
                  }, 55 * 60 * 1000); // 55 minutes
                  
                  console.log(`[${timestamp}] Token refresh timer scheduled (using cached data)`);
                }
              } else {
                // If no cached data but request is pending, wait for it to complete
                console.log(`[${timestamp}] Waiting for pending user data request to complete`);
              }
            } else {
              // Mark that we're making a request
              pendingUserRequestRef.current = true;
              lastUserRequestTimeRef.current = now;
              
              console.log(`[${timestamp}] Attempting to fetch user data with ID:`, userId);
              
              // Our JWT token is in a secure HTTP-only cookie
              // so we just need to make the request and the browser will 
              // automatically include the cookie
              const userData = await apiRequest(`/api/v1/user/${userId}`);
              
              // Request complete
              pendingUserRequestRef.current = false;
              
              if (userData) {
                console.log(`[${timestamp}] User data received successfully`);
                
                // Cache the user data to prevent excessive requests
                userDataCacheRef.current = userData;
                
                // Update authenticated state before setting user to prevent flash
                setAuthState('authenticated');
                setUser(userData);
                
                // Determine the appropriate redirect path but don't redirect yet
                const currentPath = window.location.pathname;
                const targetPath = getAppropriateRedirectPathImpl(userData, currentPath);
                
                // Only set redirect path if it's different from current path
                if (targetPath !== currentPath) {
                  console.log(`[${timestamp}] Setting redirect path from ${currentPath} to ${targetPath}`);
                  setRedirectPath(targetPath);
                }
                
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
                  
                  console.log(`[${timestamp}] Token refresh timer scheduled`);
                }
              } else {
                console.warn(`[${timestamp}] No user data returned from API`);
                setAuthState('unauthenticated');
              }
            }
          } catch (err) {
            // Request complete even if it failed
            pendingUserRequestRef.current = false;
            
            console.error(`[${timestamp}] Error fetching user data:`, err);
            // If this fails, user is not authenticated
            clearUserData();
            setAuthState('unauthenticated');
          }
        } else {
          console.log(`[${timestamp}] No user ID found in storage, user is not logged in`);
          setAuthState('unauthenticated');
        }
      } catch (err) {
        const errorTimestamp = new Date().toISOString().split('T')[1].split('.')[0];
        console.error(`[${errorTimestamp}] Auth status check failed:`, err);
        setAuthState('unauthenticated');
      } finally {
        // Batch state updates together to prevent re-renders
        if (isMountedRef.current) {
          // Add a slight delay to ensure all auth state updates are processed
          setTimeout(() => {
            setIsLoading(false);
            setAuthStatusChecked(true);
            console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] Auth status check completed`);
          }, 500); // 500ms delay to stabilize state
        }
      }
    };

    checkAuthStatus();
  }, [silentRefresh]);

  const login = async (email: string, password: string, rememberMe = false) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    try {
      // Normalize email to lowercase for consistency
      const normalizedEmail = email.toLowerCase();
      
      // Update state for login process
      setIsLoading(true);
      setError(null);
      setAuthState('authenticating');
      
      // Prevent multiple redirects by setting flag
      setIsRedirecting(true);

      // First, get a CSRF token
      console.log(`[${timestamp}] Fetching CSRF token before login...`);
      let csrfAttempts = 0;
      const maxCsrfAttempts = 3;
      let csrfSuccess = false;
      
      while (csrfAttempts < maxCsrfAttempts && !csrfSuccess) {
        try {
          csrfAttempts++;
          const csrfResponse = await fetch('/api/csrf-token', { 
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store',
              'Pragma': 'no-cache'
            },
            // Add cache-busting parameter to avoid cached responses
            cache: 'no-store'
          });
          
          if (!csrfResponse.ok) {
            console.warn(`[${timestamp}] CSRF token fetch failed with status ${csrfResponse.status}`);
            
            if (csrfAttempts < maxCsrfAttempts) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 500 * csrfAttempts));
              continue;
            }
          }
          
          const csrfData = await csrfResponse.json();
          console.log(`[${timestamp}] CSRF token obtained successfully:`, csrfData.csrfToken ? 'Yes' : 'No');
          
          // The fetchWithCSRF function will use this token automatically
          resetCSRFToken(); // Clear any existing token
          csrfSuccess = true;
        } catch (csrfErr) {
          console.error(`[${timestamp}] Error fetching CSRF token (attempt ${csrfAttempts}/${maxCsrfAttempts}):`, csrfErr);
          
          if (csrfAttempts < maxCsrfAttempts) {
            // Wait longer for each retry
            await new Promise(resolve => setTimeout(resolve, 500 * csrfAttempts));
          }
        }
      }
      
      if (!csrfSuccess) {
        console.warn(`[${timestamp}] Proceeding without CSRF token after ${maxCsrfAttempts} failed attempts`);
      }

      // Use CSRF-protected API call
      console.log(`[${timestamp}] Attempting login with credentials for email: ${normalizedEmail}...`);
      
      // Add a short delay before sending login request to ensure CSRF token is processed
      await new Promise(resolve => setTimeout(resolve, 300)); 
      
      const response = await apiPost('/api/v1/auth/login', { 
        email: normalizedEmail, 
        password, 
        rememberMe 
      }) as {
        message: string;
        userId: number;
        userType: string;
      };

      if (response && response.userId) {
        console.log(`[${timestamp}] Login successful, user ID: ${response.userId}, type: ${response.userType}`);
        
        // Store user ID and type in localStorage for client-side reference
        // The actual authentication token is in a secure HTTP-only cookie
        saveUserData(response.userId.toString(), response.userType);
        
        // Add a short delay to allow cookie processing
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Fetch complete user data
        console.log(`[${timestamp}] Fetching complete user data...`);
        try {
          const userData = await apiRequest(`/api/v1/user/${response.userId}`);
          console.log(`[${timestamp}] User data received:`, userData ? 'Successfully' : 'Failed');
          
          // Update authentication state before setting user data to prevent UI flashing
          setAuthState('authenticated');
          setUser(userData);
          
          // Start token refresh timer - in case the user stays logged in for a long time
          if (isMountedRef.current) {
            // Schedule refresh for 5 minutes before token expiry
            refreshTimerRef.current = window.setTimeout(() => {
              silentRefresh();
            }, 55 * 60 * 1000); // 55 minutes
            
            console.log(`[${timestamp}] Token refresh timer scheduled after login`);
          }
        } catch (userDataErr) {
          console.error(`[${timestamp}] Error fetching user data:`, userDataErr);
          // Still mark as authenticated even if we couldn't fetch complete user data
          // We can retry fetching user data later
          setAuthState('authenticated');
          
          // Set minimal user data from login response
          setUser({
            id: response.userId,
            userType: response.userType as any,
            email: normalizedEmail,
            firstName: '',
            lastName: '',
            username: '',
            phone: '',
            address: '',
            created_at: new Date().toISOString()
          });
        }

        // Add a small delay before redirect to ensure all state updates have propagated
        console.log(`[${timestamp}] Preparing redirection after login...`);
        
        // Determine appropriate redirect path
        const currentPath = window.location.pathname;
        let targetPath = '/';
        
        if (response.userType === 'admin') {
          targetPath = '/admin';
        } else if (response.userType === 'business') {
          targetPath = '/vendor';
        }
        
        // Set redirect path and state
        console.log(`[${timestamp}] Setting redirect path to ${targetPath}`);
        setRedirectPath(targetPath);
        setAuthState('redirecting');
        
        // Use setTimeout to add a meaningful delay before redirecting to prevent rapid state changes
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`[${timestamp}] Executing redirect to ${targetPath}`);
            setLocation(targetPath);
            
            // Reset redirection flag after redirect is complete with longer delay
            setTimeout(() => {
              setAuthState('authenticated');
              setIsRedirecting(false);
              console.log(`[${timestamp}] Redirection completed, returning to authenticated state`);
            }, 500);
          }
        }, 300);
      } else {
        setAuthState('unauthenticated');
        setIsRedirecting(false);
        throw new Error('Login failed: Invalid response');
      }
    } catch (err) {
      console.error(`[${timestamp}] Login error:`, err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setAuthState('unauthenticated');
      setIsRedirecting(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    try {
      // Set state to indicate logout in progress
      setIsLoading(true);
      setIsRedirecting(true);
      setAuthState('redirecting');
      
      console.log(`[${timestamp}] Logout initiated`);
      
      // Make a request to invalidate the session and clear the secure HTTP-only cookie
      await apiPost('/api/v1/auth/logout');
      
      // Clear user data from state
      setUser(null);
      
      // Remove client-side storage
      clearUserData();
      
      // Also remove legacy storage items (for backward compatibility)
      localStorage.removeItem('userId');
      localStorage.removeItem('userType');
      
      // Reset CSRF token
      resetCSRFToken();
      
      console.log(`[${timestamp}] Logout successful, preparing redirect to login page...`);
      
      // Set redirect path
      setRedirectPath('/auth');
      
      // Add a meaningful delay before redirect to prevent rapid state changes
      setTimeout(() => {
        if (isMountedRef.current) {
          console.log(`[${timestamp}] Executing logout redirect to /auth`);
          setLocation('/auth');
          
          // Reset redirection flag after a longer delay to avoid flickering
          setTimeout(() => {
            setAuthState('unauthenticated');
            setIsRedirecting(false);
            console.log(`[${timestamp}] Logout redirect completed, state set to unauthenticated`);
          }, 500);
        }
      }, 300);
    } catch (err) {
      console.error(`[${timestamp}] Logout error:`, err);
      setAuthState('unauthenticated');
      setIsRedirecting(false);
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
        isAuthenticated: !!user,
        authStatusChecked,
        isRedirecting,
        authState,
        redirectPath,
        getAppropriateRedirectPath
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