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

/**
 * Reset the CSRF token - forces a new token to be fetched on the next request
 * Used when token refresh is needed
 * @param newToken Optional new token to set directly
 */
export function resetCSRFToken(newToken?: string): void {
  if (newToken) {
    csrfToken = newToken;
    console.log('CSRF token updated with new value');
  } else {
    csrfToken = null;
    console.log('CSRF token reset - will fetch a new token on next request');
  }
}

// Base delay for exponential backoff (in milliseconds)
const BASE_RETRY_DELAY = 500;

// Global state for authentication token refresh operation
let isRefreshingAuth = false;
let failedRequests: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  config: RequestInit;
  url: string;
}> = [];

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
  
  // Add X-Requested-With header to identify AJAX requests
  // This helps some server configurations distinguish API calls from page requests
  headers.set('X-Requested-With', 'XMLHttpRequest');
  
  // For specific endpoints that have issues with Vite, add a special header
  if (url === '/api/v1/admin/deals' && options.method === 'POST') {
    headers.set('X-Bypass-Vite', 'true');
    
    // Also add a referrer to mimic browser behavior
    headers.set('Referer', window.location.origin + '/admin/deals/add');
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

// resetCSRFToken is defined at the top of the file

/**
 * Refresh authentication token
 * Uses the refresh token to obtain a new access token
 * @returns Promise resolving to true if token refresh was successful
 */
export async function refreshAuthToken(): Promise<boolean> {
  if (isRefreshingAuth) {
    // Return a promise that resolves when the current refresh operation completes
    return new Promise((resolve) => {
      // Add a simple callback that will be executed after refresh completes
      const checkComplete = setInterval(() => {
        if (!isRefreshingAuth) {
          clearInterval(checkComplete);
          resolve(true);
        }
      }, 100);
    });
  }

  isRefreshingAuth = true;
  console.log('Refreshing authentication token...');

  try {
    // Attempt to refresh the token
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      return false;
    }

    const result = await response.json();
    if (!result.success) {
      console.error('Token refresh rejected by server');
      return false;
    }

    console.log('Token refresh successful');
    
    // Process any queued requests that were waiting for a token refresh
    let request;
    while ((request = failedRequests.shift())) {
      try {
        const retryResponse = await fetchWithCSRF(request.url, request.config);
        request.resolve(retryResponse);
      } catch (error) {
        request.reject(error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Reject all queued requests on catastrophic refresh failure
    failedRequests.forEach(request => {
      request.reject(new Error('Authentication failed'));
    });
    failedRequests = [];
    
    return false;
  } finally {
    isRefreshingAuth = false;
  }
}

/**
 * Queue failed request for retry after token refresh
 * @param url Request URL
 * @param config Request configuration
 * @returns Promise that resolves with the retried request response
 */
function enqueueFailedRequest(url: string, config: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    failedRequests.push({ resolve, reject, config, url });
  });
}

/**
 * Process API error response
 * @param response Fetch response object
 * @param context Additional context for the error message
 * @param url Original request URL
 * @param options Original request options
 * @returns Promise resolving to retried Response on successful token refresh, or never (throws error)
 * @throws Enhanced error object with status and detailed information
 */
export async function processApiError(
  response: Response, 
  context: string, 
  url?: string, 
  options?: RequestInit
): Promise<Response | never> {
  const status = response.status;
  
  // Handle authentication errors with token refresh
  if (status === 401 && url && options) {
    // Skip token refresh for login attempts - we want to show "Invalid credentials" instead
    if (url.includes('/auth/login')) {
      console.log('Login failed with 401 status - invalid credentials');
    } else {
      // This is a 401 on a non-login endpoint, so it's likely a session expiration
      try {
        const errorData = await response.clone().json();
        
        // Check for token expired message from server
        if (errorData.error === 'token_expired' || 
            errorData.message?.includes('expired') ||
            errorData.code === 'auth/id-token-expired') {
              
          console.log('Access token expired. Attempting refresh...');
          
          // Try to refresh the token
          const refreshSuccess = await refreshAuthToken();
          
          if (refreshSuccess) {
            // If refresh was successful, retry the original request
            console.log('Retrying request after token refresh');
            
            // Don't immediately retry - enqueue it to avoid race conditions
            return enqueueFailedRequest(url, options);
          }
        }
      } catch (e) {
        // If we can't parse the response as JSON, continue with standard error handling
        console.log('Could not parse error response as JSON, continuing with standard error handling', e);
      }
    }
  }
  
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
      // Differentiate between login failures and session expirations
      if (url && url.includes('/auth/login')) {
        error.message = 'Invalid email or password';
        error.details = 'Please check your credentials and try again';
      } else {
        error.message = 'Your session has expired';
        error.details = 'Please log in again to continue';
      }
      error.category = ErrorCategory.AUTHENTICATION;
      break;
      
    case 403:
      error.message = 'Permission denied';
      error.details = errorData.message || 'You do not have permission to perform this action';
      error.category = ErrorCategory.AUTHORIZATION;
      break;
      
    case 404:
      error.message = 'Resource not found';
      error.details = errorData.message || `The requested ${context.toLowerCase()} could not be found`;
      error.category = ErrorCategory.CLIENT;
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
  
  // Log and handle the error appropriately
  handleError(error);
  
  throw error;
}

/**
 * Generic API POST request with JSON payload and CSRF protection
 * Enhanced with detailed error handling and token refresh
 */
export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const options = {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  };
  
  const response = await fetchWithCSRF(url, options);

  if (!response.ok) {
    const processedResponse = await processApiError(response, 'POST request', url, options);
    // If processApiError returns a response (after token refresh), use it
    if (processedResponse instanceof Response) {
      return await processedResponse.json();
    }
    // Otherwise processApiError would have thrown an error
  }

  return await response.json();
}

/**
 * Generic API PUT request with JSON payload and CSRF protection
 * Enhanced with detailed error handling and token refresh
 */
export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const options = {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  };
  
  const response = await fetchWithCSRF(url, options);

  if (!response.ok) {
    const processedResponse = await processApiError(response, 'PUT request', url, options);
    // If processApiError returns a response (after token refresh), use it
    if (processedResponse instanceof Response) {
      return await processedResponse.json();
    }
    // Otherwise processApiError would have thrown an error
  }

  return await response.json();
}

/**
 * Generic API DELETE request with CSRF protection
 * Enhanced with detailed error handling and token refresh
 */
export async function apiDelete<T>(url: string): Promise<T> {
  const options = {
    method: 'DELETE',
  };
  
  const response = await fetchWithCSRF(url, options);

  if (!response.ok) {
    const processedResponse = await processApiError(response, 'DELETE request', url, options);
    // If processApiError returns a response (after token refresh), use it
    if (processedResponse instanceof Response) {
      return await processedResponse.json();
    }
    // Otherwise processApiError would have thrown an error
  }

  return await response.json();
}

/**
 * Generic API GET request with detailed error handling and token refresh
 */
export async function apiGet<T>(url: string): Promise<T> {
  const options = {
    method: 'GET',
  };
  
  const response = await fetchWithCSRF(url, options);

  if (!response.ok) {
    const processedResponse = await processApiError(response, 'GET request', url, options);
    // If processApiError returns a response (after token refresh), use it
    if (processedResponse instanceof Response) {
      return await processedResponse.json();
    }
    // Otherwise processApiError would have thrown an error
  }

  return await response.json();
}

/**
 * Upload form data with CSRF protection
 * Enhanced with detailed error handling and token refresh
 */
export async function uploadFormData<T>(url: string, formData: FormData): Promise<T> {
  const options = {
    method: 'POST',
    body: formData,
    // Don't manually set Content-Type header for FormData
    // The browser will automatically set it with the correct boundary
  };
  
  const response = await fetchWithCSRF(url, options);

  if (!response.ok) {
    const processedResponse = await processApiError(response, 'File upload', url, options);
    // If processApiError returns a response (after token refresh), use it
    if (processedResponse instanceof Response) {
      return await processedResponse.json();
    }
    // Otherwise processApiError would have thrown an error
  }

  return await response.json();
}

/**
 * General-purpose API request with appropriate error handling and token refresh
 * @param url API endpoint URL
 * @param options Request options with method, data, etc.
 * @returns Promise resolving to the response data
 */
export async function apiRequest<T>(url: string, options: {
  method?: string;
  data?: any;
  silentError?: boolean;
} = {}): Promise<T> {
  const method = options.method || 'GET';
  const body = options.data ? JSON.stringify(options.data) : undefined;
  
  const fetchOptions = {
    method,
    body
  };
  
  const response = await fetchWithCSRF(url, fetchOptions);
  
  if (!response.ok) {
    try {
      const processedResponse = await processApiError(response, `${method} request`, url, fetchOptions);
      
      // If processApiError returns a response (after token refresh), use it
      if (processedResponse instanceof Response) {
        return await processedResponse.json();
      }
    } catch (error) {
      if (!options.silentError) {
        throw error;
      }
      return null as unknown as T;
    }
  }
  
  return await response.json();
}