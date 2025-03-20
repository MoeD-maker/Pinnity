import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      // Send request to password reset API endpoint
      await apiRequest('/api/v1/auth/forgot-password', {
        method: 'POST',
        data: { email: data.email },
      });
      
      // If the request was successful (no error thrown), show success message
      setEmailSent(true);
      toast({
        title: 'Email Sent',
        description: 'If an account exists with that email, you will receive password reset instructions.',
      });
    } catch (error) {
      console.error('Forgot password request failed:', error);
      toast({
        title: 'Request Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <Card className="w-full border border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mb-4 rounded-full bg-green-50 p-3 inline-flex">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
            <p className="mt-2 text-sm text-gray-500">
              We've sent you instructions on how to reset your password. If you don't see the email, please check your spam folder.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button
            variant="outline"
            onClick={() => {
              setEmailSent(false);
              form.reset();
            }}
          >
            Send Again
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full mt-6 bg-[#00796B] hover:bg-[#004D40]" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center pb-6">
        <Button 
          variant="link" 
          onClick={() => window.location.href = '/auth'}
          className="text-sm text-[#00796B]"
        >
          Back to login
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ForgotPasswordForm;