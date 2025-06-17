/**
 * Unit Tests for CSRF Protection Hook
 * 
 * These tests verify the functionality of the useCsrfProtection hook,
 * which provides security for forms and other state-changing operations.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { useCsrfProtection } from '../useCsrfProtection';

// Mock the toast functionality
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

// Mock fetch implementation for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock resetCSRFToken function
jest.mock('@/lib/api', () => ({
  resetCSRFToken: jest.fn(),
  fetchWithCSRF: jest.fn()
}));

describe('useCsrfProtection Hook', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should initialize with correct default values', () => {
    // Mock a successful response for the initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'test-token' })
    });

    const { result } = renderHook(() => useCsrfProtection(false)); // Don't auto-fetch

    // Check initial values
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isReady).toBe(false);
    expect(typeof result.current.refreshCsrfToken).toBe('function');
    expect(typeof result.current.handleCsrfError).toBe('function');
    expect(typeof result.current.fetchWithProtection).toBe('function');
  });

  it('should auto-fetch token when autoFetch is true', async () => {
    // Mock a successful response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'test-token' })
    });

    const { result, waitForNextUpdate } = renderHook(() => useCsrfProtection(true));

    // Should start loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the fetch to complete
    await waitForNextUpdate();

    // Should be ready with no errors
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isReady).toBe(true);
  });

  it('should handle fetch errors correctly', async () => {
    // Mock an error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error'
    });

    const { result, waitForNextUpdate } = renderHook(() => useCsrfProtection(true));

    // Wait for the fetch to complete
    await waitForNextUpdate();

    // Should have error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.isReady).toBe(false);
  });

  it('should refresh token when refreshCsrfToken is called', async () => {
    // First, mock the initial state
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'initial-token' })
    });

    const { result, waitForNextUpdate } = renderHook(() => useCsrfProtection(false));

    // Call the refresh function
    act(() => {
      // Mock a successful refresh response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ csrfToken: 'refreshed-token' })
      });

      result.current.refreshCsrfToken();
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Wait for the refresh to complete
    await waitForNextUpdate();

    // Should be ready again with the new token
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isReady).toBe(true);
  });

  it('should handle CSRF errors through handleCsrfError', () => {
    const { result } = renderHook(() => useCsrfProtection(false));

    // Mock the refreshCsrfToken function
    const refreshMock = jest.fn();
    result.current.refreshCsrfToken = refreshMock;

    // Call handleCsrfError
    act(() => {
      result.current.handleCsrfError(new Error('CSRF test error'));
    });

    // Should attempt to refresh the token
    expect(refreshMock).toHaveBeenCalled();
  });

  it('should make protected fetch requests', async () => {
    // Setup successful fetch responses
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'test-token' })
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: 'test data' })
    });

    const { result, waitForNextUpdate } = renderHook(() => useCsrfProtection(true));

    // Wait for initial token fetch
    await waitForNextUpdate();

    // Make a protected fetch request
    let fetchResult;
    await act(async () => {
      fetchResult = await result.current.fetchWithProtection('/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      });
    });

    // Should return the response data
    expect(fetchResult).toEqual({ success: true, data: 'test data' });
  });
});