/**
 * Centralized Error Handling System
 * 
 * This module provides a comprehensive error handling system for the application.
 * It standardizes error objects, provides categorization, and logging utilities.
 */

import { toast } from '@/hooks/use-toast';

// Error categories for better handling and recovery
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  OFFLINE = 'offline',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  CLIENT = 'client',
  PERSISTENCE = 'persistence',
  INTEGRATION = 'integration',
  UNKNOWN = 'unknown'
}

// Standardized application error structure
export interface AppError extends Error {
  category: ErrorCategory;
  code?: string;
  status?: number;
  details?: Record<string, any>;
  timestamp: Date;
  handled: boolean;
  recoverable: boolean;
  originalError?: any;
}

/**
 * Convert any error to a standardized AppError
 * @param error Original error
 * @param defaultMessage Default message to use if original error has no message
 * @returns Normalized AppError
 */
export function normalizeError(error: any, defaultMessage: string = 'An unexpected error occurred'): AppError {
  // If it's already an AppError, return it
  if (error && typeof error === 'object' && 'category' in error && 'timestamp' in error) {
    return error as AppError;
  }
  
  // Create a normalized error object
  const normalizedError: AppError = {
    name: error?.name || 'Error',
    message: error?.message || defaultMessage,
    stack: error?.stack,
    category: ErrorCategory.UNKNOWN,
    timestamp: new Date(),
    handled: false,
    recoverable: false,
    originalError: error
  };
  
  // Try to determine the error category
  if (error) {
    // Check error message for clues
    const message = String(error.message || '').toLowerCase();
    const statusCode = typeof error.status === 'number' ? error.status : 
                      typeof error.statusCode === 'number' ? error.statusCode : 
                      null;
    
    // Handle specific error types
    if (error.name === 'ValidationError' || message.includes('validation') || message.includes('invalid')) {
      normalizedError.category = ErrorCategory.VALIDATION;
      normalizedError.recoverable = true;
    } else if (error.name === 'AuthenticationError' || statusCode === 401 || 
              message.includes('unauthorized') || message.includes('unauthenticated') || 
              message.includes('authentication') || message.includes('login')) {
      normalizedError.category = ErrorCategory.AUTHENTICATION;
      normalizedError.recoverable = true;
    } else if (error.name === 'AuthorizationError' || statusCode === 403 || 
              message.includes('forbidden') || message.includes('permission')) {
      normalizedError.category = ErrorCategory.AUTHORIZATION;
      normalizedError.recoverable = false;
    } else if (error.name === 'NetworkError' || error.name === 'FetchError' || 
              message.includes('network') || message.includes('fetch') || 
              message.includes('request failed') || statusCode === 0) {
      normalizedError.category = ErrorCategory.NETWORK;
      normalizedError.recoverable = true;
    } else if (!navigator.onLine || message.includes('offline') || message.includes('internet')) {
      normalizedError.category = ErrorCategory.OFFLINE;
      normalizedError.recoverable = true;
    } else if (error.name === 'TimeoutError' || message.includes('timeout') || message.includes('timed out')) {
      normalizedError.category = ErrorCategory.TIMEOUT;
      normalizedError.recoverable = true;
    } else if (statusCode && statusCode >= 500 || message.includes('server')) {
      normalizedError.category = ErrorCategory.SERVER;
      normalizedError.recoverable = true;
    } else if (statusCode && statusCode >= 400 && statusCode < 500) {
      normalizedError.category = ErrorCategory.CLIENT;
      normalizedError.recoverable = true;
    } else if (message.includes('storage') || message.includes('database') || message.includes('indexeddb')) {
      normalizedError.category = ErrorCategory.PERSISTENCE;
      normalizedError.recoverable = true;
    } else if (message.includes('api') || message.includes('service') || message.includes('integration')) {
      normalizedError.category = ErrorCategory.INTEGRATION;
      normalizedError.recoverable = true;
    }
    
    // Add HTTP status to standardized error if available
    if (statusCode) {
      normalizedError.status = statusCode;
    }
    
    // Add error code if available
    if (error.code) {
      normalizedError.code = error.code;
    }
    
    // Add error details if available
    if (error.details || error.data) {
      normalizedError.details = error.details || error.data;
    }
  }
  
  return normalizedError;
}

/**
 * Handle an error with toast notification and logging
 * @param error Error to handle
 * @param options Options for error handling
 * @returns The normalized error
 */
export function handleError(
  error: any, 
  options: {
    silent?: boolean;
    logLevel?: 'error' | 'warn' | 'info';
    context?: string;
    defaultMessage?: string;
    retryFn?: () => Promise<any>;
    redirectPath?: string;
  } = {}
): AppError {
  // Normalize the error
  const appError = normalizeError(error, options.defaultMessage);
  
  // Mark as handled
  appError.handled = true;
  
  // Log the error
  const logLevel = options.logLevel || 'error';
  const logPrefix = options.context ? `[${options.context}] ` : '';
  
  if (logLevel === 'error') {
    console.error(`${logPrefix}Error (${appError.category}):`, appError);
  } else if (logLevel === 'warn') {
    console.warn(`${logPrefix}Warning (${appError.category}):`, appError);
  } else {
    console.info(`${logPrefix}Info (${appError.category}):`, appError);
  }
  
  // Show toast notification unless silent mode is enabled
  if (!options.silent) {
    const title = getErrorTitle(appError);
    const description = appError.message;
    const variant = appError.category === ErrorCategory.OFFLINE || 
                   appError.category === ErrorCategory.NETWORK ? 
                   'default' : 'destructive';
    
    toast({
      title,
      description,
      variant,
      duration: 5000,
    });
  }
  
  return appError;
}

/**
 * Get a user-friendly error title based on the error category
 * @param error AppError
 * @returns User-friendly error title
 */
function getErrorTitle(error: AppError): string {
  switch (error.category) {
    case ErrorCategory.VALIDATION:
      return 'Validation Error';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication Error';
    case ErrorCategory.AUTHORIZATION:
      return 'Authorization Error';
    case ErrorCategory.NETWORK:
      return 'Network Error';
    case ErrorCategory.OFFLINE:
      return 'You Are Offline';
    case ErrorCategory.TIMEOUT:
      return 'Request Timeout';
    case ErrorCategory.SERVER:
      return 'Server Error';
    case ErrorCategory.CLIENT:
      return 'Request Error';
    case ErrorCategory.PERSISTENCE:
      return 'Storage Error';
    case ErrorCategory.INTEGRATION:
      return 'Integration Error';
    default:
      return 'Error';
  }
}

/**
 * Create a retry function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Function with retry capability
 */
export function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, delay: number) => void;
    retryableCategories?: ErrorCategory[];
  } = {}
): () => Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelay = options.initialDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 10000;
  const retryableCategories = options.retryableCategories ?? [
    ErrorCategory.NETWORK,
    ErrorCategory.TIMEOUT,
    ErrorCategory.SERVER,
    ErrorCategory.OFFLINE
  ];
  
  let attempts = 0;
  
  const retry = async (): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      // Normalize error
      const appError = normalizeError(error);
      
      // Check if retry is possible
      if (
        attempts < maxRetries && 
        retryableCategories.includes(appError.category) &&
        appError.recoverable
      ) {
        attempts++;
        
        // Calculate backoff delay with jitter
        const delay = Math.min(
          initialDelay * Math.pow(2, attempts - 1) + Math.random() * 1000, 
          maxDelay
        );
        
        if (options.onRetry) {
          options.onRetry(attempts, delay);
        }
        
        // Wait for backoff delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry
        return retry();
      }
      
      // If we can't retry, rethrow the error
      throw appError;
    }
  };
  
  return retry;
}

/**
 * Wrap a function with error handling
 * @param fn Function to wrap
 * @param options Error handling options
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    silent?: boolean;
    logLevel?: 'error' | 'warn' | 'info';
    context?: string;
    defaultMessage?: string;
    retryOptions?: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      retryableCategories?: ErrorCategory[];
    };
  } = {}
): Promise<T> {
  // Create a function with retry if retry options are provided
  const fnWithRetry = options.retryOptions 
    ? withRetry(fn, {
        ...options.retryOptions,
        onRetry: (attempt, delay) => {
          console.log(`Retrying (${attempt}/${options.retryOptions?.maxRetries || 3})...`);
        }
      })
    : fn;
  
  // Execute with error handling
  return fnWithRetry().catch(error => {
    handleError(error, {
      silent: options.silent,
      logLevel: options.logLevel,
      context: options.context,
      defaultMessage: options.defaultMessage
    });
    
    // Re-throw the error for further handling
    throw error;
  });
}

/**
 * Create a safe version of an async function that handles errors
 * @param fn Original function
 * @param errorHandler Custom error handler
 * @returns Safe function that handles errors
 */
export function createSafeAsyncFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: AppError, ...args: T) => R | Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = normalizeError(error);
      
      // Log the error
      console.error(`Error in safe function: ${appError.message}`, appError);
      
      // Use custom error handler if provided
      if (errorHandler) {
        return errorHandler(appError, ...args);
      }
      
      // Re-throw normalized error
      throw appError;
    }
  };
}