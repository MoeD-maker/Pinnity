import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

// JWT token utilities
const TOKEN_KEY = 'pinnity_auth_token';

// Function to get token from storage
const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Function to save token to storage
const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

// Function to remove token from storage
const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
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
        
        // Check for JWT token
        const token = getToken();
        
        // Also check for stored userId (backward compatibility)
        const storedUserId = localStorage.getItem('userId');
        
        if (token || storedUserId) {
          try {
            // If we have a token, the API request will include it in the header
            // If we have a userId but no token, try to fetch user data anyway
            const userId = storedUserId || '';
            const userData = await apiRequest(`/api/user/${userId}`);
            
            if (userData) {
              setUser(userData);
              
              // If we have user data but no token, store the userId for backward compatibility
              if (!token && userData.id) {
                localStorage.setItem('userId', userData.id.toString());
                localStorage.setItem('userType', userData.userType);
              }
              
              // If we're on the root path or auth page, redirect based on user type 
              const path = window.location.pathname;
              if (path === '/' || path === '/auth') {
                if (userData.userType === 'admin') {
                  setLocation('/admin');
                } else if (userData.userType === 'business') {
                  setLocation('/vendor');
                }
                // Keep individual users on the homepage if that's where they are
              }
            }
          } catch (err) {
            // If this fails, user is not authenticated
            removeToken();
            localStorage.removeItem('userId');
            localStorage.removeItem('userType');
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

      const response = await apiRequest('/api/auth/login', {
        method: 'POST',
        data: { email, password, rememberMe }
      });

      if (response && response.token) {
        // Store JWT token
        saveToken(response.token);
        
        // For backward compatibility, also store user ID and type
        if (response.userId) {
          localStorage.setItem('userId', response.userId.toString());
          localStorage.setItem('userType', response.userType);
        }
        
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
      
      // In a real app with server-side session management, you'd make a request to invalidate the session
      // await apiRequest('/api/auth/logout', { method: 'POST' });
      
      // Clear user data
      setUser(null);
      
      // Remove JWT token
      removeToken();
      
      // Also remove legacy storage items
      localStorage.removeItem('userId');
      localStorage.removeItem('userType');
      
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