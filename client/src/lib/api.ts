/**
 * API Utilities
 * Provides abstracted fetch utilities with CSRF protection for all state-changing requests
 */

let csrfToken: string | null = null;

/**
 * Fetch with CSRF token injection
 * Gets a CSRF token if needed and injects it into request headers
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  if (!csrfToken) {
    // Fetch a new CSRF token
    try {
      const response = await fetch('/api/csrf-token', { credentials: 'include' });
      const data = await response.json();
      csrfToken = data.csrfToken;
    } catch (err) {
      console.error('Failed to fetch CSRF token:', err);
      // Continue with the request anyway
    }
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
    credentials: 'include' as RequestCredential,
    headers,
  };

  // Make the request
  return fetch(url, finalOptions);
}

/**
 * Reset CSRF token (e.g., after logout)
 */
export function resetCSRFToken(): void {
  csrfToken = null;
}

/**
 * Generic API POST request with JSON payload and CSRF protection
 */
export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Generic API PUT request with JSON payload and CSRF protection
 */
export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Generic API DELETE request with CSRF protection
 */
export async function apiDelete<T>(url: string): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Upload form data with CSRF protection
 */
export async function uploadFormData<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'POST',
    body: formData,
    // Don't manually set Content-Type header for FormData
    // The browser will automatically set it with the correct boundary
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Upload failed: ${response.status}`);
  }

  return response.json();
}