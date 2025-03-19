/**
 * Error Handling Utility
 * 
 * Centralized error handling system for API calls and application errors.
 * Provides standardized error handling, user-friendly messages, and recovery options.
 */

import { toast } from '@/hooks/use-toast';

// Error categories for consistent handling
export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  SERVER = 'server',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown'
}

// Base error structure
export interface AppError {
  message: string;
  category: ErrorCategory;
  statusCode?: number;
  details?: string;
  originalError?: any;
  recoverable?: boolean;
  retryFn?: () => Promise<any>;
}

/**
 * Determine error category from various error types
 */
export function categorizeError(error: any): ErrorCategory {
  // Check for network errors
  if (!navigator.onLine || error.message?.includes('offline') || error.message?.includes('network')) {
    return ErrorCategory.OFFLINE;
  }

  // Check for fetch/response errors with status codes
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    
    if (status === 401 || status === 403) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    if (status === 404) {
      return ErrorCategory.NOT_FOUND;
    }
    
    if (status === 400 || status === 422) {
      return ErrorCategory.VALIDATION;
    }
    
    if (status >= 500) {
      return ErrorCategory.SERVER;
    }
  }

  // Check common error messages
  if (error.message) {
    const msg = error.message.toLowerCase();
    
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }
    
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
      return ErrorCategory.NETWORK;
    }
    
    if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('access denied')) {
      return ErrorCategory.PERMISSION;
    }
    
    if (msg.includes('not found')) {
      return ErrorCategory.NOT_FOUND;
    }
    
    if (msg.includes('validation') || msg.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
  }

  // If we can't categorize, it's unknown
  return ErrorCategory.UNKNOWN;
}

/**
 * Convert any error to an AppError
 */
export function normalizeError(error: any, defaultMessage = 'An unexpected error occurred'): AppError {
  // If it's already an AppError, return it
  if (error.category && typeof error.message === 'string') {
    return error as AppError;
  }
  
  // Extract status code if available
  let statusCode: number | undefined;
  if (error.status && typeof error.status === 'number') {
    statusCode = error.status;
  } else if (error.statusCode && typeof error.statusCode === 'number') {
    statusCode = error.statusCode;
  }
  
  // Extract message
  let message = defaultMessage;
  if (error.message && typeof error.message === 'string') {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  // Try to get more details
  let details: string | undefined;
  if (error.details) {
    details = typeof error.details === 'string' 
      ? error.details 
      : JSON.stringify(error.details);
  } else if (error.data) {
    details = typeof error.data === 'string' 
      ? error.data 
      : JSON.stringify(error.data);
  }
  
  // Determine if error is likely recoverable
  const category = categorizeError(error);
  const recoverable = [
    ErrorCategory.NETWORK, 
    ErrorCategory.TIMEOUT, 
    ErrorCategory.OFFLINE
  ].includes(category);
  
  return {
    message,
    category,
    statusCode,
    details,
    originalError: error,
    recoverable
  };
}

/**
 * Get user-friendly message based on error category
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return 'Network connection issue. Please check your connection and try again.';
    
    case ErrorCategory.AUTHENTICATION:
      return 'Your session has expired. Please log in again.';
    
    case ErrorCategory.SERVER:
      return 'The server encountered an error. Our team has been notified.';
    
    case ErrorCategory.VALIDATION:
      return error.message || 'Please check your information and try again.';
    
    case ErrorCategory.NOT_FOUND:
      return 'The requested information could not be found.';
    
    case ErrorCategory.PERMISSION:
      return 'You don\'t have permission to perform this action.';
    
    case ErrorCategory.TIMEOUT:
      return 'The request took too long to complete. Please try again.';
    
    case ErrorCategory.OFFLINE:
      return 'You appear to be offline. Please check your connection.';
    
    case ErrorCategory.UNKNOWN:
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get appropriate UI variant based on error category
 */
export function getErrorVariant(error: AppError): 'default' | 'destructive' {
  switch (error.category) {
    case ErrorCategory.NETWORK:
    case ErrorCategory.TIMEOUT:
    case ErrorCategory.OFFLINE:
      return 'default';
    
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.SERVER:
    case ErrorCategory.VALIDATION:
    case ErrorCategory.NOT_FOUND:
    case ErrorCategory.PERMISSION:
    case ErrorCategory.UNKNOWN:
    default:
      return 'destructive';
  }
}

/**
 * Log error details to console with appropriate level
 */
export function logError(error: AppError): void {
  const { category, message, details, statusCode, originalError } = error;
  
  const logData = {
    category,
    message,
    details,
    statusCode,
    timestamp: new Date().toISOString(),
  };
  
  switch (category) {
    case ErrorCategory.NETWORK:
    case ErrorCategory.TIMEOUT:
    case ErrorCategory.OFFLINE:
      console.warn('[Pinnity Error]', logData);
      break;
    
    case ErrorCategory.VALIDATION:
    case ErrorCategory.NOT_FOUND:
      console.info('[Pinnity Error]', logData);
      break;
    
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.PERMISSION:
    case ErrorCategory.SERVER:
    case ErrorCategory.UNKNOWN:
    default:
      console.error('[Pinnity Error]', logData, originalError);
  }
}

/**
 * Provide recovery function based on error type
 */
export function getRecoveryAction(error: AppError, retryFn?: () => Promise<any>): (() => void) | undefined {
  // Use provided retry function if available
  if (retryFn) {
    return () => {
      toast({
        title: 'Retrying...',
        description: 'Attempting to recover from the error',
      });
      retryFn().catch(e => handleError(e));
    };
  }
  
  // Return built-in recovery action based on error category
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      return () => {
        // Redirect to login page
        window.location.href = '/auth';
      };
    
    case ErrorCategory.OFFLINE:
      return () => {
        toast({
          title: 'Checking connection...',
          description: 'Attempting to reconnect',
        });
        
        // Try to reload the page after a short delay
        setTimeout(() => {
          if (navigator.onLine) {
            window.location.reload();
          } else {
            toast({
              title: 'Still offline',
              description: 'Please check your internet connection',
              variant: 'destructive',
            });
          }
        }, 1500);
      };
    
    default:
      return error.retryFn ? () => {
        error.retryFn!().catch(e => handleError(e));
      } : undefined;
  }
}

/**
 * Main error handler - call this from try/catch blocks
 */
export function handleError(error: any, options?: {
  defaultMessage?: string;
  retryFn?: () => Promise<any>;
  silent?: boolean;
  duration?: number;
}): AppError {
  const appError = normalizeError(error, options?.defaultMessage);
  
  // Set retry function if provided
  if (options?.retryFn) {
    appError.retryFn = options.retryFn;
    appError.recoverable = true;
  }
  
  // Log error details
  logError(appError);
  
  // Show toast notification unless silent option is true
  if (!options?.silent) {
    const userMessage = getUserFriendlyMessage(appError);
    const variant = getErrorVariant(appError);
    const recovery = getRecoveryAction(appError, options?.retryFn);
    
    toast({
      title: 'Error',
      description: userMessage,
      variant,
      duration: options?.duration || 5000,
      action: recovery && appError.recoverable ? {
        label: 'Retry',
        onClick: recovery,
      } : undefined,
    });
  }
  
  return appError;
}

/**
 * Safe wrapper for async functions that handles errors automatically
 */
export function withErrorHandling<T>(
  asyncFn: () => Promise<T>,
  options?: {
    defaultMessage?: string;
    silent?: boolean;
    duration?: number;
  }
): Promise<T> {
  return asyncFn().catch(error => {
    const appError = handleError(error, {
      ...options,
      retryFn: () => withErrorHandling(asyncFn, options),
    });
    
    // Re-throw the normalized error for further handling if needed
    throw appError;
  });
}

/**
 * Query error handler for react-query
 */
export function handleQueryError(error: any): void {
  handleError(error);
}

/**
 * Create a custom fetch with error handling
 */
export function createFetchWithErrorHandling(
  baseUrl: string = '',
  defaultOptions: RequestInit = {}
) {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const fullUrl = baseUrl ? `${baseUrl}${url}` : url;
    
    const fetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };
    
    return withErrorHandling(async () => {
      const response = await fetch(fullUrl, fetchOptions);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData: any = {};
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            errorData.message = await response.text();
          }
        } catch (e) {
          // If we can't parse the response, just use the status text
          errorData.message = response.statusText;
        }
        
        const error = new Error(errorData.message || 'Request failed');
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }
      
      return response;
    });
  };
}