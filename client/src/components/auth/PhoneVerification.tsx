import React, { useState, useEffect } from 'react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PhoneVerificationProps {
  onVerificationComplete: (phoneNumber: string, credential: any) => void;
  onCancel?: () => void;
  initialPhoneNumber?: string;
}

export function PhoneVerification({ 
  onVerificationComplete, 
  onCancel, 
  initialPhoneNumber = '' 
}: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const { toast } = useToast();

  // Set up invisible reCAPTCHA
  useEffect(() => {
    let verifier: any = null;

    try {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          setRecaptchaVerified(true);
        },
        'expired-callback': () => {
          setRecaptchaVerified(false);
          setError('reCAPTCHA has expired, please try again');
        }
      });
      
      verifier = window.recaptchaVerifier;
    } catch (err) {
      console.error('Error setting up reCAPTCHA:', err);
      setError('Failed to set up verification. Please try again later.');
    }

    return () => {
      if (verifier) {
        try {
          verifier.clear();
        } catch (err) {
          console.error('Error clearing reCAPTCHA:', err);
        }
      }
    };
  }, []);

  // Send verification code
  const handleSendCode = async () => {
    setError(null);
    
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }
    
    try {
      setIsSendingCode(true);
      
      // Format phone number with international format if not already formatted
      const formattedPhoneNumber = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;
      
      // Send verification code
      const confirmation = await signInWithPhoneNumber(
        auth, 
        formattedPhoneNumber, 
        window.recaptchaVerifier
      );
      
      setConfirmationResult(confirmation);
      
      toast({
        title: "Verification code sent",
        description: `We've sent a code to ${formattedPhoneNumber}`,
      });
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'The phone number format is incorrect. Please use international format (e.g. +1234567890)';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (err.code === 'auth/captcha-check-failed') {
        errorMessage = 'reCAPTCHA verification failed. Please try again.';
        
        // Reset reCAPTCHA on failure
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible'
          });
        } catch (clearError) {
          console.error('Error clearing reCAPTCHA:', clearError);
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify the code
  const handleVerifyCode = async () => {
    setError(null);
    
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }
    
    if (!confirmationResult) {
      setError('Verification session expired. Please request a new code.');
      return;
    }
    
    try {
      setIsVerifying(true);
      
      // Confirm the verification code
      const credential = await confirmationResult.confirm(verificationCode);
      
      // Call the callback with verified phone number and credentials
      onVerificationComplete(phoneNumber, credential);
      
      toast({
        title: "Phone verified",
        description: "Your phone number has been verified successfully!",
      });
    } catch (err: any) {
      console.error('Error verifying code:', err);
      
      let errorMessage = 'Failed to verify code. Please check the code and try again.';
      
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'The verification code is invalid. Please enter the correct code.';
      } else if (err.code === 'auth/code-expired') {
        errorMessage = 'The verification code has expired. Please request a new code.';
      }
      
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Phone Verification</h3>
        <p className="text-sm text-muted-foreground">
          We'll send a verification code to your phone number to verify your identity.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!confirmationResult ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone-input">
              Phone Number
            </label>
            <Input
              id="phone-input"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isSendingCode}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Please use international format (e.g. +1 for USA, +44 for UK)
            </p>
          </div>
          
          {/* Invisible reCAPTCHA container */}
          <div id="recaptcha-container"></div>
          
          <div className="flex space-x-2">
            {onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel}
                disabled={isSendingCode}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSendCode}
              disabled={isSendingCode || !phoneNumber.trim()}
              className={onCancel ? "flex-1" : "w-full"}
            >
              {isSendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="code-input">
              Verification Code
            </label>
            <Input
              id="code-input"
              type="text"
              placeholder="Enter the 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={isVerifying}
              maxLength={6}
              className="w-full text-center text-lg tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-digit code sent to your phone
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setConfirmationResult(null)}
              disabled={isVerifying}
              className="flex-1"
            >
              Change Number
            </Button>
            <Button
              onClick={handleVerifyCode}
              disabled={isVerifying || !verificationCode.trim()}
              className="flex-1"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// For TypeScript support with the global window object
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}