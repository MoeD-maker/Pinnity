import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

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
        
        // Try to get user data from local storage
        const storedUserId = localStorage.getItem('userId');
        const storedUserType = localStorage.getItem('userType');
        
        if (storedUserId) {
          try {
            // Try to fetch user data to verify authentication
            const userData = await apiRequest(`/api/user/${storedUserId}`);
            setUser(userData);
          } catch (err) {
            // If this fails, user is not authenticated
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

      if (response && response.userId) {
        // Store user info in localStorage for persistence
        localStorage.setItem('userId', response.userId.toString());
        localStorage.setItem('userType', response.userType);
        
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
      
      // In a real app, you'd make a request to invalidate the session
      // await apiRequest('/api/auth/logout', { method: 'POST' });
      
      // Clear user data
      setUser(null);
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