import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendSMSVerification, verifySMSCode, formatPhoneForDisplay } from "@/lib/smsService";
import { Loader2, Phone, Shield } from "lucide-react";

interface PhoneVerificationProps {
  phoneNumber: string;
  onVerificationComplete: (verified: boolean) => void;
  onPhoneChange?: (phone: string) => void;
  onOtpChange?: (otp: string) => void;
  disabled?: boolean;
}

export function TwilioPhoneVerification({ 
  phoneNumber, 
  onVerificationComplete, 
  onPhoneChange,
  onOtpChange,
  disabled = false 
}: PhoneVerificationProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();

  // Countdown timer for resend
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

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
      console.log('Sending SMS to:', phoneNumber);

      // Send SMS using Twilio
      const success = await sendSMSVerification(phoneNumber);
      
      if (success) {
        setStep('code');
        setTimeLeft(60); // 60 second cooldown

        toast({
          title: "Code sent!",
          description: `Verification code sent to ${formatPhoneForDisplay(phoneNumber)}`,
        });
      } else {
        throw new Error('Failed to send SMS');
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      
      toast({
        title: "SMS Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the complete 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('About to verify SMS code:', verificationCode, 'for phone:', phoneNumber);
      const isValid = await verifySMSCode(phoneNumber, verificationCode);
      console.log('SMS verification result:', isValid);
      
      if (isValid) {
        console.log('Verification successful, calling onVerificationComplete(true)');
        toast({
          title: "Verification successful!",
          description: "Your phone number has been verified",
        });
        
        // Update backend to mark user as phone verified
        try {
          await fetch('/api/v1/auth/verify-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber })
          });
          console.log('Backend phone verification status updated');
        } catch (error) {
          console.error('Failed to update backend phone verification:', error);
        }
        onVerificationComplete(true);
      } else {
        console.log('Verification failed, showing error toast');
        toast({
          title: "Invalid code",
          description: "The verification code is incorrect or expired",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timeLeft > 0) return;
    
    setVerificationCode('');
    await handleSendCode();
  };

  const handlePhoneNumberChange = (value: string) => {
    // Allow only digits, spaces, parentheses, and hyphens
    const cleaned = value.replace(/[^\d\s\(\)\-\+]/g, '');
    onPhoneChange?.(cleaned);
  };

  // Phone number input step
  if (step === 'phone') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phoneNumber}
            onChange={(e) => handlePhoneNumberChange(e.target.value)}
            disabled={disabled || isLoading}
            className="text-lg"
          />
          <p className="text-sm text-gray-600">
            We'll send a verification code to this number
          </p>
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
      </div>
    );
  }

  // Verification code input step
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Shield className="h-4 w-4" />
        <span>Enter the 6-digit code sent to {formatPhoneForDisplay(phoneNumber)}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verification-code">Verification Code</Label>
        <Input
          id="verification-code"
          type="text"
          placeholder="123456"
          value={verificationCode}
          onChange={(e) => {
            const code = e.target.value.replace(/\D/g, '').slice(0, 6);
            setVerificationCode(code);
            onOtpChange?.(code);
          }}
          disabled={disabled || isLoading}
          maxLength={6}
          className="text-center text-lg tracking-widest"
        />
      </div>

      <Button 
        onClick={handleVerifyCode}
        disabled={disabled || isLoading || verificationCode.length !== 6}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Code"
        )}
      </Button>

      <div className="flex items-center justify-between text-sm">
        <Button
          variant="ghost"
          onClick={() => setStep('phone')}
          disabled={disabled || isLoading}
        >
          Change Phone Number
        </Button>

        <Button
          variant="ghost"
          onClick={handleResendCode}
          disabled={disabled || isLoading || timeLeft > 0}
        >
          {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend Code'}
        </Button>
      </div>
    </div>
  );
}

export default TwilioPhoneVerification;