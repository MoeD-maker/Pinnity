/**
 * API utilities for handling CSRF protection and common API tasks
 */

// Store CSRF token in memory
let csrfToken: string | null = null;

/**
 * Fetch with CSRF token injection
 * Gets a CSRF token if needed and injects it into request headers
 */
export async function fetchWithCSRF(url: string, options: RequestInit = {}): Promise<Response> {
  // Get CSRF token if we don't have one
  if (!csrfToken) {
    try {
      const response = await fetch('/api/csrf-token');
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const data = await response.json();
      csrfToken = data.csrfToken;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      // Continue without CSRF token - server will reject if needed
    }
  }
  
  // Add token to headers
  const headers = {
    ...options.headers,
    'CSRF-Token': csrfToken || '',
  };
  
  return fetch(url, { ...options, headers, credentials: 'same-origin' });
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Generic API PUT request with JSON payload and CSRF protection
 */
export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.status}`);
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
    throw new Error(errorText || `API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Upload form data with CSRF protection
 */
export async function uploadFormData<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetchWithCSRF(url, {
    method: 'POST',
    // Don't set Content-Type with FormData - browser sets it with boundary
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.status}`);
  }
  
  return response.json();
}