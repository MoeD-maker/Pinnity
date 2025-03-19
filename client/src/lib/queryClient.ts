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
    const result = text ? JSON.parse(text) : null;
    console.log(`Response from ${url}:`, result);
    
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
    return await res.json();
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
