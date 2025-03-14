import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { apiPost, resetCSRFToken, fetchWithCSRF } from '@/lib/api';

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
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        
        // Check for stored user ID
        const storedUserId = getUserId();
        const storedUserType = localStorage.getItem(USER_TYPE_KEY);
        
        // Also check for legacy storage (backward compatibility)
        let legacyUserId = null;
        let legacyUserType = null;
        
        if (!storedUserId) {
          legacyUserId = localStorage.getItem('userId');
          legacyUserType = localStorage.getItem('userType');
          
          // If found in legacy storage, migrate to new storage keys
          if (legacyUserId && legacyUserType) {
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
            // Our JWT token is in a secure HTTP-only cookie
            // so we just need to make the request and the browser will 
            // automatically include the cookie
            const userData = await apiRequest(`/api/user/${userId}`);
            
            if (userData) {
              setUser(userData);
              
              // Make sure we have the user ID and type stored
              if (userData.id) {
                saveUserData(userData.id.toString(), userData.userType);
              }
              
              // If we're on the root path or auth page, redirect based on user type 
              const path = window.location.pathname;
              if (path === '/' || path === '/auth') {
                if (userData.userType === 'admin' || userType === 'admin') {
                  setLocation('/admin');
                } else if (userData.userType === 'business' || userType === 'business') {
                  setLocation('/vendor');
                }
                // Keep individual users on the homepage if that's where they are
              }
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
            // If this fails, user is not authenticated
            removeUserData();
          }
        }
      } catch (err) {
        console.error('Auth status check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Use CSRF-protected API call
      const response = await apiPost<{
        message: string;
        userId: number;
        userType: string;
      }>('/api/auth/login', { email, password, rememberMe });

      if (response && response.userId) {
        // Store user ID and type in localStorage for client-side reference
        // The actual authentication token is in a secure HTTP-only cookie
        saveUserData(response.userId.toString(), response.userType);
        
        // Fetch complete user data
        const userData = await apiRequest(`/api/user/${response.userId}`);
        setUser(userData);

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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
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