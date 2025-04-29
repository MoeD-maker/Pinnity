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
  
  return withErrorHandling(async () => {
    // Use fetchWithCSRF to ensure CSRF protection for all API calls
    const res = await fetchWithCSRF(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
      // Headers and credentials are handled by fetchWithCSRF
    });

    await throwIfResNotOk(res);
    
    // Handle empty responses
    const text = await res.text();
    console.log(`Raw response text from ${url}:`, text);
    
    let result = null;
    try {
      // Check if the response starts with HTML doctype, which indicates an error page
      if (text && text.trim().toLowerCase().startsWith('<!doctype')) {
        console.error(`Received HTML instead of JSON from ${url}`);
        throw new Error('Received HTML response instead of JSON. The server might be returning an error page.');
      }
      
      result = text ? JSON.parse(text) : null;
      console.log(`Parsed response from ${url}:`, result);
    } catch (err) {
      console.error(`Error parsing JSON response from ${url}:`, err);
      console.log(`Response headers:`, res.headers);
      
      // If it's an HTML response, provide a better error message
      if (text && text.includes('<!DOCTYPE')) {
        throw new Error('The server returned an HTML page instead of JSON data. Please try again or contact support.');
      }
      
      // For debugging only - return the raw text or a simplified valid object for non-HTML errors
      return { valid: text.includes('true'), rawResponse: text };
    }
    
    return result;
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
