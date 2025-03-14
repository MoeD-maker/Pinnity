import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

import { fetchWithCSRF } from './api';

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
  },
): Promise<any> {
  try {
    const method = options?.method || 'GET';
    const data = options?.data;
    
    console.log(`Making ${method} request to ${url}`, data);
    
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
  } catch (error) {
    console.error(`Error in apiRequest to ${url}:`, error);
    throw error;
  }
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
