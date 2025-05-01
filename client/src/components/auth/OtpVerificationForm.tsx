import { useState, useEffect } from "react";
import { ConfirmationResult, PhoneAuthProvider } from "firebase/auth";
import { Loader2, Phone, AlertCircle, ChevronLeft } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface OtpVerificationFormProps {
  phoneNumber: string;
  confirmationResult: ConfirmationResult;
  onVerificationComplete: (phoneNumber: string, credential: any) => void;
  onBack: () => void;
}

export function OtpVerificationForm({
  phoneNumber,
  confirmationResult,
  onVerificationComplete,
  onBack,
}: OtpVerificationFormProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds countdown for resending
  const { toast } = useToast();

  // Start countdown timer when component mounts
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  // Verify the code
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    if (!confirmationResult) {
      setError("Something went wrong. Please try signing up again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;

      // Create a credential object that can be passed back
      const credential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        verificationCode
      );

      toast({
        title: "Phone verified",
        description: "Your phone number has been successfully verified",
      });

      // Call the callback with the verified phone number and credential
      onVerificationComplete(phoneNumber, credential);
    } catch (error: any) {
      console.error("Error verifying code:", error);
      setError(error.message || "Failed to verify code. Please try again.");

      toast({
        title: "Verification failed",
        description: error.message || "Failed to verify code",
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
          Verify Your Phone
        </CardTitle>
        <CardDescription>
          Enter the verification code we sent to {phoneNumber}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              id="code"
              type="text"
              placeholder="••••••"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={isLoading}
              maxLength={6}
              className="w-full text-center text-lg tracking-widest"
              autoFocus
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
              onClick={onBack}
              disabled={isLoading}
            >
              Try again with a different number
            </Button>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <Button
          onClick={handleVerifyCode}
          disabled={isLoading || verificationCode.length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & Create Account"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}