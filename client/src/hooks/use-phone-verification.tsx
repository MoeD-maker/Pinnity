import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  getAuth 
} from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase';

interface UsePhoneVerificationProps {
  onSuccess?: (phoneNumber: string, verificationId: string) => void;
  onError?: (error: any) => void;
}

export function usePhoneVerification({
  onSuccess,
  onError
}: UsePhoneVerificationProps = {}) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhoneNumber, setVerifiedPhoneNumber] = useState<string | null>(null);
  const [verificationCredential, setVerificationCredential] = useState<any>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Function to send verification code via Firebase
  const sendVerificationCode = useCallback(async (phoneNumber: string) => {
    try {
      setIsVerifying(true);
      
      // Format phone number if needed
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+${phoneNumber}`;
      
      // Initialize invisible reCAPTCHA verifier
      const auth = getAuth(firebaseApp);
      
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          toast({
            title: "Security verification expired",
            description: "Please try again to verify your phone number",
            variant: "destructive"
          });
          setIsVerifying(false);
        }
      });
      
      // Create recaptcha container if it doesn't exist
      if (!document.getElementById('recaptcha-container')) {
        const recaptchaContainer = document.createElement('div');
        recaptchaContainer.id = 'recaptcha-container';
        recaptchaContainer.style.display = 'none';
        document.body.appendChild(recaptchaContainer);
      }
      
      // Send verification code
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setVerificationId(confirmationResult.verificationId);
      
      // Return the confirmation result for use in UI
      return confirmationResult;
      
    } catch (error) {
      console.error('Error sending verification code:', error);
      handleVerificationError(error);
      throw error;
    }
  }, [toast]);

  // Handle successful verification
  const handleVerificationComplete = useCallback((phoneNumber: string, credential: any) => {
    setVerifiedPhoneNumber(phoneNumber);
    setVerificationCredential(credential);
    setPhoneVerified(true);
    setIsVerifying(false);
    
    toast({
      title: "Phone Verified",
      description: "Your phone number has been successfully verified.",
    });
    
    if (onSuccess) {
      onSuccess(phoneNumber, credential?.verificationId || verificationId || '');
    }
  }, [onSuccess, toast, verificationId]);

  // Handle verification error
  const handleVerificationError = useCallback((error: any) => {
    console.error('Phone verification error:', error);
    setIsVerifying(false);
    
    toast({
      title: "Verification Failed",
      description: error?.message || "Failed to verify phone number. Please try again.",
      variant: "destructive"
    });
    
    if (onError) {
      onError(error);
    }
  }, [onError, toast]);

  // Reset verification state
  const resetVerification = useCallback(() => {
    setPhoneVerified(false);
    setVerifiedPhoneNumber(null);
    setVerificationCredential(null);
    setVerificationId(null);
    setIsVerifying(false);
  }, []);

  return {
    isVerifying,
    setIsVerifying,
    phoneVerified,
    verifiedPhoneNumber,
    verificationCredential,
    verificationId,
    handleVerificationComplete,
    handleVerificationError,
    resetVerification,
    sendVerificationCode
  };
}