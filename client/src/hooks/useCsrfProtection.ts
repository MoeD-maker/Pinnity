/**
 * CSRF Protection Hook
 * 
 * This hook provides consistent CSRF protection for forms and API calls.
 * Features:
 * - Automatic CSRF token fetching and injection
 * - Error handling for CSRF validation failures
 * - Token refresh on expiration
 * - Integration with toast notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { fetchWithCSRF, resetCSRFToken } from '@/lib/api';

interface UseCsrfProtectionReturn {
  /**
   * Indicates whether the CSRF token is currently being fetched
   */
  isLoading: boolean;
  
  /**
   * Error message in case CSRF token fetch fails
   */
  error: string | null;
  
  /**
   * Indicates whether the CSRF protection is ready to use
   */
  isReady: boolean;
  
  /**
   * Force refresh the CSRF token
   */
  refreshCsrfToken: () => Promise<boolean>;
  
  /**
   * Handle CSRF errors with consistent error messages and recovery
   */
  handleCsrfError: (error: any) => void;
  
  /**
   * Protected fetch that includes CSRF token in the request
   */
  fetchWithProtection: <T>(url: string, options?: RequestInit) => Promise<T>;
}

/**
 * Hook for consistent CSRF protection across forms
 * 
 * @param autoFetch Whether to automatically fetch CSRF token on mount
 * @returns CSRF protection utilities
 */
export function useCsrfProtection(autoFetch: boolean = true): UseCsrfProtectionReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();

  /**
   * Fetch CSRF token from the server
   */
  const refreshCsrfToken = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Reset the token to force a new fetch
      resetCSRFToken();
      
      // Make a request to force token fetch
      const response = await fetchWithCSRF('/api/csrf-token', { 
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }
      
      setIsReady(true);
      return true;
    } catch (err) {
      console.error('CSRF token fetch error:', err);
      
      let errorMessage = 'Failed to secure the connection';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Show toast for user feedback
      toast({
        title: 'Security Error',
        description: 'Failed to secure the connection. Please refresh the page.',
        variant: 'destructive'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  /**
   * Handle CSRF errors with consistent messaging
   */
  const handleCsrfError = useCallback((error: any) => {
    console.error('CSRF validation error:', error);
    
    let errorMessage = 'Security validation failed. Please refresh the page and try again.';
    
    // Show user-friendly error message
    toast({
      title: 'Security Error',
      description: errorMessage,
      variant: 'destructive'
    });
    
    // Try to refresh the token automatically
    refreshCsrfToken();
  }, [refreshCsrfToken, toast]);
  
  /**
   * Protected fetch function that includes CSRF token
   */
  const fetchWithProtection = useCallback(async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    try {
      const response = await fetchWithCSRF(url, options);
      
      if (!response.ok) {
        // Check if it's a CSRF validation error
        if (response.status === 403) {
          try {
            const errorData = await response.clone().json();
            
            if (errorData.error === 'invalid_csrf_token' || 
                errorData.message?.includes('CSRF') || 
                errorData.message?.includes('csrf')) {
              
              throw new Error('CSRF validation failed');
            }
          } catch (e) {
            // If can't parse as JSON, handle as generic error
            if (e instanceof Error && e.message === 'CSRF validation failed') {
              throw e;
            }
          }
        }
        
        throw new Error(`Request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      if (err instanceof Error && err.message === 'CSRF validation failed') {
        handleCsrfError(err);
      }
      throw err;
    }
  }, [handleCsrfError]);
  
  // Auto-fetch token on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      refreshCsrfToken();
    }
  }, [autoFetch, refreshCsrfToken]);
  
  return {
    isLoading,
    error,
    isReady,
    refreshCsrfToken,
    handleCsrfError,
    fetchWithProtection
  };
}

export default useCsrfProtection;