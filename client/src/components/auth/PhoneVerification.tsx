import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { initializeRecaptcha, sendSMSVerification, verifySMSCode, formatPhoneNumber, cleanupRecaptcha } from "@/lib/firebase";
import { Loader2, Phone, Shield } from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";

interface PhoneVerificationProps {
  phoneNumber: string;
  onVerificationComplete: (verified: boolean) => void;
  onPhoneChange?: (phone: string) => void;
  disabled?: boolean;
}

export function PhoneVerification({ 
  phoneNumber, 
  onVerificationComplete, 
  onPhoneChange,
  disabled = false 
}: PhoneVerificationProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [recaptchaId] = useState(() => `recaptcha-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const { toast } = useToast();

  // Countdown timer for resend
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Cleanup on unmount and step changes
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, []);

  // Reset reCAPTCHA when component resets to phone step
  useEffect(() => {
    if (step === 'phone') {
      cleanupRecaptcha();
    }
  }, [step]);

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Format phone number to E.164 format
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('Sending SMS to:', formattedPhone);

      // Initialize reCAPTCHA with unique ID
      const recaptchaVerifier = initializeRecaptcha(recaptchaId);
      
      // Send SMS
      const confirmation = await sendSMSVerification(formattedPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      setStep('code');
      setTimeLeft(60); // 60 second cooldown

      toast({
        title: "Code sent!",
        description: `Verification code sent to ${formattedPhone}`,
      });
    } catch (error) {
      console.error('SMS sending error:', error);
      
      let errorMessage = "Failed to send verification code";
      if (error instanceof Error) {
        if (error.message.includes('quota')) {
          errorMessage = "SMS quota exceeded. Please try again later.";
        } else if (error.message.includes('invalid')) {
          errorMessage = "Invalid phone number format";
        } else if (error.message.includes('captcha')) {
          errorMessage = "Please complete the security verification";
        }
      }

      toast({
        title: "SMS Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationResult || !verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const isValid = await verifySMSCode(confirmationResult, verificationCode);
      
      if (isValid) {
        toast({
          title: "Phone verified!",
          description: "Your phone number has been successfully verified",
        });
        onVerificationComplete(true);
      } else {
        toast({
          title: "Invalid code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    setStep('phone');
    setVerificationCode('');
    setConfirmationResult(null);
    cleanupRecaptcha();
  };

  if (step === 'phone') {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="h-4 w-4" />
          <span>Phone verification required for account security</span>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => onPhoneChange?.(e.target.value)}
            disabled={disabled || isLoading}
            className="pl-12"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <Button 
          onClick={handleSendCode}
          disabled={disabled || isLoading || !phoneNumber}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Code...
            </>
          ) : (
            <>
              <Phone className="mr-2 h-4 w-4" />
              Send Verification Code
            </>
          )}
        </Button>

        {/* Hidden reCAPTCHA container */}
        <div id={recaptchaId} className="hidden"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Shield className="h-4 w-4" />
        <span>Enter the 6-digit code sent to {formatPhoneNumber(phoneNumber)}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verification-code">Verification Code</Label>
        <Input
          id="verification-code"
          type="text"
          placeholder="123456"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={disabled || isLoading}
          maxLength={6}
          className="text-center text-lg tracking-widest"
        />
      </div>

      <div className="flex space-x-2">
        <Button 
          onClick={handleVerifyCode}
          disabled={disabled || isLoading || verificationCode.length !== 6}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Verify Code
            </>
          )}
        </Button>

        <Button 
          variant="outline"
          onClick={handleResendCode}
          disabled={disabled || timeLeft > 0}
          className="flex-1"
        >
          {timeLeft > 0 ? `Resend (${timeLeft}s)` : 'Resend Code'}
        </Button>
      </div>

      {/* Hidden reCAPTCHA container */}
      <div id="recaptcha-container" className="hidden"></div>
    </div>
  );
}

export default PhoneVerification;