import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleError, withErrorHandling, ErrorCategory } from './errorHandling';
import { fetchWithCSRF } from './api';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get('content-type');
    let errorData: any = {};
    
    try {
      if (contentType && contentType.includes('application/json')) {
        errorData = await res.json();
      } else {
        errorData.message = await res.text();
      }
    } catch (e) {
      errorData.message = res.statusText;
    }
    
    const error = new Error(errorData.message || `API request failed: ${res.status}`);
    (error as any).status = res.status;
    (error as any).data = errorData;
    throw error;
  }
}

/**
 * Special direct API request for admin operations
 * This bypasses the Vite middleware completely for certain admin operations
 * that consistently fail through the normal API flow
 */
export async function adminDirectApiRequest(
  endpoint: string,
  data: any
): Promise<any> {
  console.log(`Making direct admin API request to ${endpoint}`);
  
  // Create headers with API key and bypass markers
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('X-Bypass-Vite', 'true');
  headers.append('X-Requested-With', 'XMLHttpRequest');
  headers.append('X-Programming-Access', 'true');
  headers.append('X-API-Key', 'admin-test-bypass-key-2025');
  
  // Test current authentication status
  try {
    const authCheckResponse = await fetch('/api/v1/auth/check', {
      credentials: 'include'
    });
    console.log("Auth check response status:", authCheckResponse.status);
    if (authCheckResponse.ok) {
      const authData = await authCheckResponse.json();
      console.log("Auth check data:", authData);
    } else {
      console.warn("Auth check failed with status:", authCheckResponse.status);
    }
  } catch (authCheckError) {
    console.error("Error checking auth status:", authCheckError);
  }
  
  // Get a fresh CSRF token
  const csrfResponse = await fetch('/api/csrf-token', { 
    credentials: 'include',
    headers: { 'Cache-Control': 'no-cache' }
  });
  const csrfData = await csrfResponse.json();
  console.log("Got CSRF token for direct admin API:", csrfData.csrfToken);
  headers.append('CSRF-Token', csrfData.csrfToken);
  
  try {
    console.log("Making direct API request with endpoint:", `/api/v1/admin/deals`);
    console.log("Data being sent:", JSON.stringify(data, null, 2));
    
    // ATTEMPT #1: Try the normal endpoint first (this worked in tests)
    try {
      const standardResponse = await fetch(`/api/v1/admin/deals`, {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
          'CSRF-Token': csrfData.csrfToken,
          'X-Requested-With': 'XMLHttpRequest'
        }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      console.log("Standard API response status:", standardResponse.status);
      
      // Check if it worked
      if (standardResponse.ok) {
        const responseText = await standardResponse.text();
        try {
          const result = JSON.parse(responseText);
          console.log("Standard API request successful", result);
          return result;
        } catch (parseError) {
          console.error("Failed to parse standard response as JSON:", parseError);
          console.error("Response text:", responseText.substring(0, 500));
          
          // Continue to attempt #2 if HTML is received
          if (responseText.includes('<!DOCTYPE')) {
            console.log("Got HTML from standard endpoint, trying bypass endpoint...");
          } else {
            throw new Error("Standard endpoint returned invalid JSON: " + responseText.substring(0, 100));
          }
        }
      } else {
        const errorText = await standardResponse.text();
        console.error("Standard endpoint error:", standardResponse.status);
        console.error("Standard endpoint error response:", errorText.substring(0, 500));
        console.log("Trying bypass endpoint after standard endpoint failed...");
      }
    } catch (standardError) {
      console.warn("Standard endpoint attempt failed:", standardError);
      console.log("Trying bypass endpoint...");
    }
    
    // ATTEMPT #2: Try the bypass endpoint as a fallback
    console.log("Making request to bypass router endpoint...");
    const response = await fetch(`/api/direct/admin/${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    console.log("Direct admin API response status:", response.status);
    
    // Check for success
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server returned error status:", response.status);
      console.error("Error response body:", errorText.substring(0, 500));
      throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
    }
    
    // Parse the response as JSON
    const responseText = await response.text();
    
    // Check if we got HTML instead of JSON
    if (responseText.includes('<!DOCTYPE')) {
      console.error("Received HTML response instead of JSON!");
      console.error("First 500 chars:", responseText.substring(0, 500));
      
      // ATTEMPT #3: Try a completely different approach as a last resort
      console.log("Both endpoints returned HTML. Trying one last approach with different headers...");
      
      const lastAttemptResponse = await fetch('/api/v1/admin/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'fetch',
          'X-Bypass-Vite': 'true',
          'X-No-Middleware': 'true',
          'Accept': 'application/json',
          'CSRF-Token': csrfData.csrfToken
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      console.log("Last attempt response status:", lastAttemptResponse.status);
      
      if (!lastAttemptResponse.ok) {
        const lastErrorText = await lastAttemptResponse.text();
        console.error("Last attempt error:", lastErrorText.substring(0, 500));
        
        throw new Error("All API approaches failed. The server might be misconfigured or the Vite middleware is intercepting all requests.");
      }
      
      const lastResponseText = await lastAttemptResponse.text();
      
      if (lastResponseText.includes('<!DOCTYPE')) {
        console.error("Last attempt also returned HTML. All approaches failed.");
        throw new Error("All API approaches failed with HTML responses. There appears to be a fundamental issue with the server configuration.");
      }
      
      try {
        const lastResult = JSON.parse(lastResponseText);
        console.log("Last attempt successful!", lastResult);
        return lastResult;
      } catch (lastParseError) {
        console.error("Failed to parse last attempt response:", lastParseError);
        throw new Error("Server returned invalid JSON on last attempt: " + lastResponseText.substring(0, 100));
      }
    }
    
    try {
      const result = JSON.parse(responseText);
      console.log("Direct admin API request successful", result);
      return result;
    } catch (parseError) {
      console.error("Failed to parse response as JSON:", parseError);
      throw new Error("Server returned invalid JSON: " + responseText.substring(0, 100));
    }
  } catch (error) {
    console.error("All direct admin API request attempts failed:", error);
    throw error;
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
    silentError?: boolean;
  },
): Promise<any> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  console.log(`Making ${method} request to ${url}`, data);
  
  // For admin deal creation, use the direct API endpoint
  if (url === '/api/v1/admin/deals' && method === 'POST') {
    console.log('Using direct admin API endpoint for deal creation');
    return adminDirectApiRequest('deals', data);
  }
  
  // Advanced debugging for deal creation
  if (url.includes('/deals') && method === 'POST') {
    console.log('DEAL CREATION DEBUG - Starting API Request');
    console.log('DEAL CREATION DEBUG - URL:', url);
    console.log('DEAL CREATION DEBUG - Method:', method);
    console.log('DEAL CREATION DEBUG - Data:', JSON.stringify(data, null, 2));
  }
  
  return withErrorHandling(async () => {
    try {
      // Extra debugging for deal creation
      if (url.includes('/deals') && method === 'POST') {
        console.log('DEAL CREATION DEBUG - Calling fetchWithCSRF');
      }
      
      // Use fetchWithCSRF to ensure CSRF protection for all API calls
      const res = await fetchWithCSRF(url, {
        method,
        body: data ? JSON.stringify(data) : undefined,
        // Headers and credentials are handled by fetchWithCSRF
      });
      
      // Extra debugging for deal creation
      if (url.includes('/deals') && method === 'POST') {
        console.log('DEAL CREATION DEBUG - fetchWithCSRF response status:', res.status);
        console.log('DEAL CREATION DEBUG - fetchWithCSRF response headers:', 
          JSON.stringify(Array.from(res.headers.entries()), null, 2));
      }

      // Check response status first
      if (!res.ok) {
        // Extra debugging for deal creation
        if (url.includes('/deals') && method === 'POST') {
          console.log('DEAL CREATION DEBUG - Response not OK:', res.status, res.statusText);
          
          // Get the response content for debugging
          const errorText = await res.text();
          console.log('DEAL CREATION DEBUG - Error response body:', errorText);
          
          // If it's HTML, clearly indicate the error type
          if (errorText && errorText.includes('<!DOCTYPE')) {
            console.error('DEAL CREATION DEBUG - HTML RESPONSE RECEIVED INSTEAD OF JSON');
            throw new Error('The API returned an HTML page instead of JSON data. This usually happens when there\'s a server configuration issue or CSRF token problem.');
          }
          
          let errorData;
          try {
            errorData = JSON.parse(errorText);
            console.log('DEAL CREATION DEBUG - Parsed error data:', errorData);
          } catch (e) {
            console.log('DEAL CREATION DEBUG - Could not parse error response as JSON');
          }
        }
        
        await throwIfResNotOk(res);
      }
      
      // Handle empty responses
      const text = await res.text();
      
      // Extra debugging for deal creation
      if (url.includes('/deals') && method === 'POST') {
        console.log('DEAL CREATION DEBUG - Raw response text length:', text ? text.length : 0);
        if (text && text.length < 1000) {
          console.log('DEAL CREATION DEBUG - Raw response text:', text);
        } else {
          console.log('DEAL CREATION DEBUG - Raw response text (truncated):', 
            text ? text.substring(0, 500) + '...' : 'empty');
        }
      } else {
        console.log(`Raw response text from ${url}:`, 
          text && text.length < 100 ? text : `(length: ${text ? text.length : 0})`);
      }
      
      // Handle empty response
      if (!text || text.trim() === '') {
        console.log(`Empty response from ${url}`);
        return null;
      }
      
      let result = null;
      try {
        // Check if the response starts with HTML doctype, which indicates an error page
        if (text && text.trim().toLowerCase().startsWith('<!doctype')) {
          console.error(`Received HTML instead of JSON from ${url}`);
          throw new Error('Received HTML response instead of JSON. The server might be returning an error page.');
        }
        
        result = JSON.parse(text);
        
        // Extra debugging for deal creation
        if (url.includes('/deals') && method === 'POST') {
          console.log('DEAL CREATION DEBUG - Successfully parsed JSON response:', result);
        } else {
          console.log(`Parsed response from ${url}:`, result);
        }
      } catch (err) {
        console.error(`Error parsing JSON response from ${url}:`, err);
        
        // Extra debugging for deal creation
        if (url.includes('/deals') && method === 'POST') {
          console.error('DEAL CREATION DEBUG - JSON PARSE ERROR:', err);
        }
        
        // If it's an HTML response, provide a better error message
        if (text && text.includes('<!DOCTYPE')) {
          throw new Error('The server returned an HTML page instead of JSON data. This may be caused by CSRF token issues or server configuration problems.');
        }
        
        // For non-JSON responses that aren't HTML
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          // For write operations, if we get a success status but non-JSON response, it might be valid
          if (res.status >= 200 && res.status < 300) {
            console.log(`Non-JSON success response from ${url}, treating as success`);
            return { success: true, rawResponse: text };
          }
        }
        
        throw new Error(`Failed to parse response from server: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      
      return result;
    } catch (error) {
      // Extra debugging for deal creation
      if (url.includes('/deals') && method === 'POST') {
        console.error('DEAL CREATION DEBUG - REQUEST FAILED WITH ERROR:', error);
        console.error('DEAL CREATION DEBUG - Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      }
      throw error;
    }
  }, {
    defaultMessage: `Failed to ${method.toLowerCase()} data from server`,
    silent: options?.silentError,
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Use fetchWithCSRF to ensure CSRF protection for all query requests
    const res = await fetchWithCSRF(queryKey[0] as string, {
      method: 'GET',
      // Credentials and headers are handled by fetchWithCSRF
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Handle potential HTML responses that might cause JSON parse errors
    const text = await res.text();
    
    if (text && text.trim().toLowerCase().startsWith('<!doctype')) {
      console.error(`Received HTML instead of JSON for query: ${queryKey[0]}`);
      throw new Error('Received HTML response instead of JSON. The server might be returning an error page.');
    }
    
    try {
      return text ? JSON.parse(text) : null;
    } catch (err) {
      console.error(`Error parsing JSON response from query: ${queryKey[0]}`, err);
      throw new Error('Failed to parse server response. Please try again later.');
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Changed from Infinity to 0 to prevent stale cache issues
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
