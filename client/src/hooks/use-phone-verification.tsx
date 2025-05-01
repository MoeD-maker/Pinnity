import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  // Handle successful verification
  const handleVerificationComplete = useCallback((phoneNumber: string, credential: any) => {
    setVerifiedPhoneNumber(phoneNumber);
    setVerificationCredential(credential);
    setPhoneVerified(true);
    
    toast({
      title: "Phone Verified",
      description: "Your phone number has been successfully verified.",
    });
    
    if (onSuccess) {
      onSuccess(phoneNumber, credential?.verificationId || '');
    }
  }, [onSuccess, toast]);

  // Handle verification error
  const handleVerificationError = useCallback((error: any) => {
    console.error('Phone verification error:', error);
    
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
  }, []);

  return {
    isVerifying,
    setIsVerifying,
    phoneVerified,
    verifiedPhoneNumber,
    verificationCredential,
    handleVerificationComplete,
    handleVerificationError,
    resetVerification
  };
}