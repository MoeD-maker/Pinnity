/**
 * CSRF Protection Hook
 * 
 * This hook manages CSRF token retrieval, error handling, and refresh functionality
 * for forms that require server-side state changes. It provides a secure way to
 * make requests with proper CSRF protection.
 * 
 * Features:
 * - Automatic token fetching
 * - Token refresh mechanism
 * - Error handling with automatic retry
 * - Security status indicators
 * - Fetch wrapper with built-in CSRF protection
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { resetCSRFToken, fetchWithCSRF } from '@/lib/api';

interface UseCsrfProtectionOptions {
  // On load error handling
  onError?: (error: Error) => void;
  
  // Auto-refresh behavior
  refreshInterval?: number | null;
  
  // Custom error messages
  errorMessages?: {
    fetchFailed?: string;
    tokenExpired?: string;
    networkError?: string;
  };
}

export function useCsrfProtection(
  autoFetch: boolean = true,
  options: UseCsrfProtectionOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Default options with fallbacks
  const {
    onError,
    refreshInterval = null,
    errorMessages = {
      fetchFailed: 'Failed to establish secure connection',
      tokenExpired: 'Security token expired, refreshing...',
      networkError: 'Network error, please check your connection'
    }
  } = options;

  /**
   * Fetch CSRF token from the server
   */
  const fetchCsrfToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/csrf-token');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }
      
      // Reset the CSRF token in the global fetch configuration
      resetCSRFToken(data.csrfToken);
      setIsReady(true);
      return data.csrfToken;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      if (onError) {
        onError(error);
      }
      
      toast({
        title: 'Security Error',
        description: errorMessages.fetchFailed,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onError, toast, errorMessages.fetchFailed]);

  /**
   * Refresh the CSRF token
   * Can be called manually when token expires or is invalid
   */
  const refreshCsrfToken = useCallback(async () => {
    return fetchCsrfToken();
  }, [fetchCsrfToken]);

  /**
   * Handle CSRF errors by refreshing the token
   * Use this when a fetch request fails with a CSRF error
   */
  const handleCsrfError = useCallback((error: Error) => {
    console.error('CSRF error detected:', error.message);
    toast({
      title: 'Security Token Expired',
      description: errorMessages.tokenExpired,
      variant: 'default',
    });
    
    return refreshCsrfToken();
  }, [refreshCsrfToken, toast, errorMessages.tokenExpired]);

  /**
   * Fetch wrapper with CSRF protection
   * Use this to make fetch requests that require CSRF protection
   */
  const fetchWithProtection = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!isReady) {
      await fetchCsrfToken();
    }
    
    try {
      return await fetchWithCSRF(url, options);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Check if it's a CSRF error
      if (error.message.includes('CSRF') || error.message.includes('csrf') || 
          (error instanceof Response && error.status === 403)) {
        await handleCsrfError(error);
        // Retry the request once with the new token
        return fetchWithCSRF(url, options);
      }
      
      // Re-throw other errors
      throw error;
    }
  }, [isReady, fetchCsrfToken, handleCsrfError]);

  // Initial fetch on mount if autoFetch is true
  useEffect(() => {
    if (autoFetch) {
      fetchCsrfToken();
    }
  }, [autoFetch, fetchCsrfToken]);

  // Set up token refresh interval if needed
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(() => {
        refreshCsrfToken();
      }, refreshInterval);
      
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, refreshCsrfToken]);

  return {
    isLoading,
    isReady,
    error,
    refreshCsrfToken,
    handleCsrfError,
    fetchWithProtection
  };
}

export default useCsrfProtection;