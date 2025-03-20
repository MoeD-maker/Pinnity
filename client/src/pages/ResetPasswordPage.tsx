import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Extract token from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');

    if (!tokenParam) {
      toast({
        title: 'Error',
        description: 'No reset token found. Please request a new password reset link.',
        variant: 'destructive',
      });
      navigate('/forgot-password');
      return;
    }

    setToken(tokenParam);
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-gray-600">
            Create a new password for your account.
          </p>
        </div>
        {token && <ResetPasswordForm token={token} />}
        <div className="text-center mt-6">
          <Button 
            variant="link" 
            onClick={() => navigate('/auth')}
            className="text-sm text-primary"
          >
            Return to Login
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;