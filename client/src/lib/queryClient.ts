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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
