import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
// Using fetchWithProtection from useCsrfProtection hook instead of apiRequest
import { PasswordField } from './PasswordField';
import { useCsrfProtection } from '@/hooks/useCsrfProtection';

// Password validation schema with strong requirements
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' })
    .regex(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Use CSRF protection hook to secure the form
  const { 
    isLoading: csrfLoading, 
    isReady: csrfReady, 
    error: csrfError,
    fetchWithProtection 
  } = useCsrfProtection(true); // Auto-fetch CSRF token on mount

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Check if CSRF protection is ready before submitting
  useEffect(() => {
    if (csrfError) {
      toast({
        title: 'Security Error',
        description: 'Could not establish a secure connection. Please refresh the page and try again.',
        variant: 'destructive'
      });
    }
  }, [csrfError, toast]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    // Don't submit if CSRF protection isn't ready
    if (!csrfReady) {
      toast({
        title: 'Security Not Ready',
        description: 'Please wait while we establish a secure connection...',
        variant: 'default'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Send request to reset password API endpoint with CSRF protection
      const response = await fetchWithProtection('/api/v1/auth/password-reset/verify', {
        method: 'POST',
        body: JSON.stringify({
          token,
          newPassword: data.password,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset failed');
      }
      
      // If the request was successful, show success message
      setResetComplete(true);
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been successfully reset. You can now log in with your new password.',
      });
    } catch (error) {
      console.error('Password reset failed:', error);
      toast({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (resetComplete) {
    return (
      <Card className="w-full border border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mb-4 rounded-full bg-green-50 p-3 inline-flex">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Password Reset Complete</h3>
            <p className="mt-2 text-sm text-gray-500">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button
            onClick={() => navigate('/auth')}
            className="bg-[#00796B] hover:bg-[#004D40]"
          >
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full border border-gray-200 shadow-sm">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <PasswordField
                      placeholder="Create a strong password"
                      {...field}
                      showRequirements={true}
                      securityStatus={csrfLoading ? 'loading' : csrfError ? 'insecure' : csrfReady ? 'secure' : 'none'}
                      securityMessage={csrfError ? 'Security features unavailable. Your data may not be protected.' : 'Your password is secured with CSRF protection.'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordField
                      placeholder="Confirm your password"
                      {...field}
                      securityStatus={csrfLoading ? 'loading' : csrfError ? 'insecure' : csrfReady ? 'secure' : 'none'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Security status indicator */}
            <div className="flex items-center space-x-2 text-sm">
              {csrfLoading && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-gray-500">Establishing secure connection...</span>
                </>
              )}
              {csrfReady && !csrfError && (
                <>
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-600">Secure connection established</span>
                </>
              )}
              {csrfError && (
                <>
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-red-600">Could not establish secure connection</span>
                </>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6 bg-[#00796B] hover:bg-[#004D40]" 
              disabled={isSubmitting || csrfLoading || !csrfReady || !!csrfError}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ResetPasswordForm;