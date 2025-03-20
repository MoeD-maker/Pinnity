/**
 * Development-only utility for password reset testing
 * This module provides tools to test the password reset flow in a development environment
 * Without requiring actual email delivery.
 * 
 * WARNING: This should never be included in production builds!
 */

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Request a password reset for a test account and immediately 
 * redirect to the reset password page with the token
 * 
 * @param email Email address for the test account
 * @returns Promise resolving to a boolean indicating success
 */
export async function requestDevPasswordReset(email: string): Promise<boolean> {
  try {
    // Only allow this in development mode
    if (process.env.NODE_ENV !== 'development') {
      console.error('Development password reset utility should not be used in production!');
      return false;
    }

    // Send request to password reset request endpoint
    const response = await apiRequest('/api/v1/auth/password-reset/request', {
      method: 'POST',
      data: { email },
    });

    // Check if we received a token (only in development mode)
    if (response?.resetToken) {
      console.log('Development mode: Received reset token directly');
      
      // Redirect to the reset password page with the token
      window.location.href = `/reset-password?token=${encodeURIComponent(response.resetToken)}`;
      return true;
    } else {
      console.warn('No reset token received from server in development mode');
      return false;
    }
  } catch (error) {
    console.error('Development password reset request failed:', error);
    return false;
  }
}

/**
 * React hook to trigger a development password reset with toast notifications
 * @returns Function to trigger the development password reset 
 */
export function useDevPasswordReset() {
  const { toast } = useToast();
  
  return async (email: string) => {
    // Only allow this in development mode
    if (process.env.NODE_ENV !== 'development') {
      toast({
        title: 'Feature Disabled',
        description: 'This feature is only available in development mode.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Requesting Password Reset',
      description: 'Sending request for development testing...',
    });

    const success = await requestDevPasswordReset(email);
    
    if (!success) {
      toast({
        title: 'Reset Test Failed',
        description: 'Could not get reset token. Check the console for details.',
        variant: 'destructive',
      });
    }
  };
}