/**
 * API Utilities
 * Provides abstracted fetch utilities with CSRF protection for all state-changing requests
 * Features:
 * - CSRF token injection for all state-changing requests
 * - Exponential backoff retry mechanism for CSRF token fetching
 * - Detailed error handling for different failure scenarios
 * - Automatic token refresh on expiration
 */

import { handleError, ErrorCategory } from './errorHandling';

// CSRF token storage
let csrfToken: string | null = null;

// Maximum number of retry attempts for CSRF token fetching
const MAX_CSRF_RETRY_ATTEMPTS = 3;

// Base delay for exponential backoff (in milliseconds)
const BASE_RETRY_DELAY = 500;

/**
 * Sleep function for implementing delays between retries
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get exponential backoff delay
 * @param attempt Current attempt number (0-based)
 * @returns Delay in milliseconds with jitter
 */
function getBackoffDelay(attempt: number): number {
  // Exponential backoff formula: BASE_DELAY * 2^attempt + random jitter
  const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, attempt);
  // Add random jitter (±20%) to avoid thundering herd problem
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  return exponentialDelay + jitter;
}

/**
 * Fetch CSRF token with retry mechanism
 * @returns CSRF token or null if all retries fail
 */
async function fetchCSRFToken(): Promise<string | null> {
  let attempt = 0;

  while (attempt < MAX_CSRF_RETRY_ATTEMPTS) {
    try {
      console.log(`Fetching CSRF token (attempt ${attempt + 1}/${MAX_CSRF_RETRY_ATTEMPTS})...`);
      
      const response = await fetch('/api/csrf-token', { 
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const status = response.status;
        
        // Handle different error statuses
        if (status === 401 || status === 403) {
          console.warn('CSRF token fetch failed: Authentication required');
          throw new Error('Authentication required to fetch CSRF token');
        } else if (status >= 500) {
          console.warn(`CSRF token fetch failed: Server error (${status})`);
          throw new Error(`Server error (${status}) while fetching CSRF token`);
        } else {
          console.warn(`CSRF token fetch failed: Unexpected status (${status})`);
          throw new Error(`Unexpected error (${status}) while fetching CSRF token`);
        }
      }

      const data = await response.json();
      
      if (!data.csrfToken) {
        throw new Error('Invalid CSRF token response');
      }
      
      console.log('CSRF token obtained successfully');
      return data.csrfToken;

    } catch (err) {
      attempt++;
      
      if (attempt >= MAX_CSRF_RETRY_ATTEMPTS) {
        handleError(err, {
          defaultMessage: 'Failed to secure the connection after multiple attempts',
          silent: false
        });
        console.error('All CSRF token fetch attempts failed:', err);
        return null;
      }
      
      // Calculate backoff delay and wait before next attempt
      const delay = getBackoffDelay(attempt - 1);
      console.log(`Retrying CSRF token fetch in ${Math.round(delay)}ms...`);
      await sleep(delay);
    }
  }

  return null;
}

/**
 * Fetch with CSRF token injection
 * Gets a CSRF token if needed and injects it into request headers
 * Features exponential backoff retry for token fetching
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  // Fetch CSRF token if not already available
  if (!csrfToken) {
    csrfToken = await fetchCSRFToken();
  }

  // Set up headers with CSRF token
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (csrfToken) {
    headers.set('CSRF-Token', csrfToken);
  }

  // Build final options with credentials and headers
  const finalOptions = {
    ...options,
    credentials: 'include' as RequestCredentials,
    headers,
  };

  // Make the request
  const response = await fetch(url, finalOptions);
  
  // Check for CSRF token expiration (status 403 with specific message)
  if (response.status === 403) {
    try {
      const errorData = await response.clone().json();
      
      // If token is invalid or expired, try to get a new one and retry the request
      if (errorData.error === 'invalid_csrf_token' || 
          errorData.message?.includes('CSRF') || 
          errorData.message?.includes('csrf')) {
            
        console.log('CSRF token expired or invalid. Fetching new token...');
        csrfToken = null;
        csrfToken = await fetchCSRFToken();
        
        if (csrfToken) {
          // Update the headers with the new token
          const newHeaders = new Headers(finalOptions.headers);
          newHeaders.set('CSRF-Token', csrfToken);
          
          // Retry the original request with the new token
          return fetch(url, {
            ...finalOptions,
            headers: newHeaders
          });
        }
      }
    } catch (e) {
      // If we can't parse the response as JSON, continue with original response
    }
  }

  return response;
}

/**
 * Reset CSRF token (e.g., after logout)
 */
export function resetCSRFToken(): void {
  csrfToken = null;
}

/**
 * Process API error response
 * @param response Fetch response object
 * @param context Additional context for the error message
 * @throws Enhanced error object with status and detailed information
 */
async function processApiError(response: Response, context: string): Promise<never> {
  const status = response.status;
  const error: any = new Error();
  error.status = status;
  
  // Attempt to parse error as JSON first
  let errorData: any = {};
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData.message = await response.text();
    }
  } catch (e) {
    errorData.message = response.statusText || `${context} failed`;
  }
  
  // Create appropriate error message based on status code
  switch (status) {
    case 400:
      error.message = errorData.message || 'Invalid request data';
      error.details = errorData.details || 'Please check your input and try again';
      error.category = ErrorCategory.VALIDATION;
      break;
      
    case 401:
      error.message = 'Your session has expired';
      error.details = 'Please log in again to continue';
      error.category = ErrorCategory.AUTHENTICATION;
      break;
      
    case 403:
      error.message = 'Permission denied';
      error.details = errorData.message || 'You do not have permission to perform this action';
      error.category = ErrorCategory.PERMISSION;
      break;
      
    case 404:
      error.message = 'Resource not found';
      error.details = errorData.message || `The requested ${context.toLowerCase()} could not be found`;
      error.category = ErrorCategory.NOT_FOUND;
      break;
      
    case 422:
      error.message = errorData.message || 'Validation error';
      error.details = errorData.details || 'Please check your input for errors';
      error.category = ErrorCategory.VALIDATION;
      break;
      
    case 429:
      error.message = 'Too many requests';
      error.details = 'Please wait before trying again';
      error.category = ErrorCategory.TIMEOUT;
      break;
      
    case 500:
    case 502:
    case 503:
    case 504:
      error.message = 'Server error';
      error.details = 'The server encountered an error. Please try again later.';
      error.category = ErrorCategory.SERVER;
      break;
      
    default:
      error.message = errorData.message || `${context} failed`;
      error.details = errorData.details || `Unexpected error (${status})`;
      error.category = ErrorCategory.UNKNOWN;
  }
  
  // Add additional context from the server if available
  if (errorData.error) error.code = errorData.error;
  if (errorData.data) error.data = errorData.data;
  
  throw error;
}

/**
 * Generic API POST request with JSON payload and CSRF protection
 * Enhanced with detailed error handling
 */
export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    await processApiError(response, 'POST request');
  }

  return await response.json();
}

/**
 * Generic API PUT request with JSON payload and CSRF protection
 * Enhanced with detailed error handling
 */
export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    await processApiError(response, 'PUT request');
  }

  return await response.json();
}

/**
 * Generic API DELETE request with CSRF protection
 * Enhanced with detailed error handling
 */
export async function apiDelete<T>(url: string): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    await processApiError(response, 'DELETE request');
  }

  return await response.json();
}

/**
 * Generic API GET request with detailed error handling
 */
export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'GET',
  });

  if (!response.ok) {
    await processApiError(response, 'GET request');
  }

  return await response.json();
}

/**
 * Upload form data with CSRF protection
 * Enhanced with detailed error handling
 */
export async function uploadFormData<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'POST',
    body: formData,
    // Don't manually set Content-Type header for FormData
    // The browser will automatically set it with the correct boundary
  });

  if (!response.ok) {
    await processApiError(response, 'File upload');
  }

  return await response.json();
}