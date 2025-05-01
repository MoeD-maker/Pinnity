import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, PhoneAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface PhoneVerificationProps {
  onVerificationComplete: (phoneNumber: string, credential: any) => void;
  onCancel?: () => void;
  initialPhoneNumber?: string;
}

// Extend Window interface to include recaptchaVerifier property
interface WindowWithRecaptcha extends Window {
  recaptchaVerifier: RecaptchaVerifier;
}

export function PhoneVerification({ 
  onVerificationComplete, 
  onCancel,
  initialPhoneNumber = '' 
}: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();

  // Set up recaptcha when component mounts
  useEffect(() => {
    // If verification code has been sent, start countdown timer
    if (codeSent && timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    }
    
    // Create and clean up recaptcha verifier
    if (!codeSent) {
      try {
        // Set up invisible reCAPTCHA to avoid UI issues
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            console.log('reCAPTCHA verified');
            setError(null);
          },
          'expired-callback': () => {
            setError('reCAPTCHA expired. Please try again.');
          }
        });
        
        // Store in window for access in send code function
        (window as unknown as WindowWithRecaptcha).recaptchaVerifier = verifier;
        
        return () => {
          // Clean up
          try {
            if ((window as unknown as WindowWithRecaptcha).recaptchaVerifier) {
              (window as unknown as WindowWithRecaptcha).recaptchaVerifier.clear();
            }
          } catch (err) {
            console.error('Error clearing reCAPTCHA:', err);
          }
        };
      } catch (error) {
        console.error('Error setting up reCAPTCHA:', error);
        setError('Failed to set up verification. Please refresh and try again.');
      }
    }
  }, [codeSent, timeLeft]);
  
  // Format the phone number as the user types
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only digits
    const digits = e.target.value.replace(/\D/g, '');
    setPhoneNumber(digits);
    
    // Format the phone number for display
    let formatted = digits;
    if (digits.length > 0) {
      // Add the country code if not present
      if (!digits.startsWith('1')) {
        formatted = '+1' + digits;
      } else {
        formatted = '+' + digits;
      }
    }
    setFormattedPhoneNumber(formatted);
  };

  // Send verification code
  const handleSendCode = async () => {
    if (!formattedPhoneNumber || formattedPhoneNumber.length < 12) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const recaptchaVerifier = (window as unknown as WindowWithRecaptcha).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhoneNumber, recaptchaVerifier);
      
      setConfirmationResult(confirmation);
      setCodeSent(true);
      setTimeLeft(60); // 60 seconds countdown for resending code
      
      toast({
        title: "Verification code sent",
        description: `We've sent a verification code to ${formattedPhoneNumber}`,
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      setError(error.message || 'Failed to send verification code. Please try again.');
      
      toast({
        title: "Verification failed",
        description: error.message || 'Failed to send verification code',
        variant: "destructive",
      });
      
      // Reset the reCAPTCHA if there was an error
      try {
        if ((window as unknown as WindowWithRecaptcha).recaptchaVerifier) {
          (window as unknown as WindowWithRecaptcha).recaptchaVerifier.clear();
        }
        
        // Create a new invisible reCAPTCHA
        const newVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
        (window as unknown as WindowWithRecaptcha).recaptchaVerifier = newVerifier;
      } catch (err) {
        console.error('Error resetting reCAPTCHA:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }
    
    if (!confirmationResult) {
      setError('Something went wrong. Please try sending the code again.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      // Create a credential object that can be passed back
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, verificationCode);
      
      toast({
        title: "Phone verified",
        description: "Your phone number has been successfully verified",
      });
      
      // Call the callback with the verified phone number and credential
      onVerificationComplete(formattedPhoneNumber, credential);
    } catch (error: any) {
      console.error('Error verifying code:', error);
      setError(error.message || 'Failed to verify code. Please try again.');
      
      toast({
        title: "Verification failed",
        description: error.message || 'Failed to verify code',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          Phone Verification
        </CardTitle>
        <CardDescription>
          {!codeSent 
            ? "Verify your phone number to secure your account" 
            : "Enter the verification code we sent to your phone"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!codeSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formattedPhoneNumber}
                onChange={handlePhoneNumberChange}
                disabled={isLoading}
                className="w-full"
              />
              {error && (
                <p className="text-sm text-destructive flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" /> {error}
                </p>
              )}
            </div>
            
            {/* Invisible reCAPTCHA container */}
            <div id="recaptcha-container"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
                maxLength={6}
                className="w-full text-center text-lg tracking-widest"
              />
              {error && (
                <p className="text-sm text-destructive flex items-center mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" /> {error}
                </p>
              )}
            </div>
            
            {timeLeft > 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                Resend code in {timeLeft} seconds
              </p>
            ) : (
              <Button 
                variant="link" 
                className="w-full" 
                onClick={() => {
                  setCodeSent(false);
                  setConfirmationResult(null);
                }}
                disabled={isLoading}
              >
                Send new code
              </Button>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        
        <Button 
          className="ml-auto"
          onClick={!codeSent ? handleSendCode : handleVerifyCode}
          disabled={isLoading || (!codeSent && (!formattedPhoneNumber || formattedPhoneNumber.length < 12))}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              {!codeSent ? "Sending..." : "Verifying..."}
            </>
          ) : !codeSent ? (
            "Send Verification Code"
          ) : (
            "Verify Code"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}