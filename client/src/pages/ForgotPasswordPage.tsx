import React, { useState } from 'react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useDevPasswordReset } from '@/utils/devPasswordReset';

export function ForgotPasswordPage() {
  const [devEmail, setDevEmail] = useState('');
  const [isDevLoading, setIsDevLoading] = useState(false);
  const triggerDevReset = useDevPasswordReset();

  // Development mode only handler
  const handleDevTest = async () => {
    if (!devEmail) return;
    
    setIsDevLoading(true);
    try {
      await triggerDevReset(devEmail);
    } finally {
      setIsDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Forgot Password</h1>
          <p className="mt-2 text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        <ForgotPasswordForm />
        
        {/* Development-only testing tool */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-8 border border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">Development Testing</h3>
              <p className="text-xs text-yellow-700 mb-4">
                This section is only visible in development mode. Use it to test the password reset flow directly.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Test account email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  className="text-sm"
                />
                <Button 
                  onClick={handleDevTest} 
                  disabled={isDevLoading || !devEmail}
                  size="sm"
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {isDevLoading ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Reset'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;