import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { individualSignupSchema, type IndividualSignupFormValues } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";
import FormInput from "./FormInput";
import PasswordInput from "./PasswordInput";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import { calculatePasswordStrength } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { apiPost } from "@/lib/api";
import { Loader2, BadgeCheck, Phone, Smartphone } from "lucide-react";
import { useCsrfProtection } from "@/hooks/useCsrfProtection";
import { usePhoneVerification } from "@/hooks/use-phone-verification";
import { OtpVerificationForm } from "./OtpVerificationForm";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, PhoneAuthProvider } from "firebase/auth";

interface WindowWithRecaptcha extends Window {
  recaptchaVerifier: RecaptchaVerifier;
}

export default function IndividualSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState("");
  const [formData, setFormData] = useState<IndividualSignupFormValues | null>(null);
  const { toast } = useToast();
  const { isLoading: csrfLoading, isReady: csrfReady, error: csrfError, fetchWithProtection } = useCsrfProtection();
  const { 
    isVerifying, 
    phoneVerified, 
    verifiedPhoneNumber, 
    verificationCredential,
    handleVerificationComplete,
    resetVerification
  } = usePhoneVerification({
    onSuccess: (phoneNumber, verificationId) => {
      // Set the verified phone in the form
      setValue("phone", phoneNumber, { shouldValidate: true });
      setValue("phoneVerified", true, { shouldValidate: true });
      setValue("phoneVerificationId", verificationId, { shouldValidate: true });
      setShowPhoneVerification(false);
      
      toast({
        title: "Phone verified",
        description: "Your phone number has been successfully verified",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification failed",
        description: error?.message || "There was a problem verifying your phone number",
        variant: "destructive",
      });
    }
  });
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IndividualSignupFormValues>({
    resolver: zodResolver(individualSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      phoneVerified: false,
      phoneVerificationId: "",
      address: "",
      // Cast to satisfy the type constraint from the zod schema
      termsAccepted: false,
    },
    mode: "onChange",
  });

  // Watch password field to calculate strength
  const password = watch("password", "");
  
  // Update password strength whenever password changes
  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordStrength(calculatePasswordStrength(e.target.value));
  };

  const onSubmit = async (data: IndividualSignupFormValues) => {
    // Require phone verification before proceeding
    if (!data.phoneVerified) {
      toast({
        title: "Phone verification required",
        description: "Please verify your phone number before registering",
        variant: "destructive",
      });
      setShowPhoneVerification(true);
      return;
    }
    
    // Don't proceed if CSRF is still loading or errored out
    if (csrfLoading) {
      toast({
        title: "Please wait",
        description: "Security verification in progress...",
      });
      return;
    }
    
    if (csrfError) {
      toast({
        title: "Security Error",
        description: "Unable to secure your request. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (!csrfReady) {
      toast({
        title: "Security verification needed",
        description: "Please wait while we secure your request...",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // Define the expected response type
      type RegistrationResponse = {
        message: string;
        userId: number;
        userType: string;
        token: string;
      };
      
      // Add Firebase verification data if available
      const formDataWithVerification = {
        ...data,
        // Include verification data if we have it
        firebaseVerification: data.phoneVerified && verificationCredential ? {
          phoneNumber: verifiedPhoneNumber,
          verificationId: data.phoneVerificationId,
          credential: verificationCredential
        } : undefined
      };
      
      // Use CSRF-protected fetch directly
      const response = await fetchWithProtection(
        '/api/v1/auth/register/individual', 
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formDataWithVerification)
        }
      );
      
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      
      const responseData = await response.json() as RegistrationResponse;
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully",
      });
      
      // Store token in localStorage for login persistence
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        // Redirect to onboarding flow
        window.location.href = `/onboarding/individual/${responseData.userId}`;
      } else {
        // Redirect to login page
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please check your information and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormInput
          label="First name"
          {...register("firstName")}
          error={errors.firstName?.message}
        />
        
        <FormInput
          label="Last name"
          {...register("lastName")}
          error={errors.lastName?.message}
        />
      </div>

      <FormInput
        label="Email address"
        type="email"
        {...register("email")}
        error={errors.email?.message}
      />

      <div className="space-y-1">
        <PasswordInput
          label="Password"
          {...register("password", {
            onChange: onPasswordChange,
          })}
          error={errors.password?.message}
        />
        
        <PasswordStrengthIndicator 
          score={passwordStrength.score} 
          feedback={passwordStrength.feedback}
          password={watch("password") || ""}
        />
      </div>

      <PasswordInput
        label="Confirm password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone number <span className="text-destructive">*</span>
          </label>
          {phoneVerified && (
            <div className="flex items-center text-sm text-green-600">
              <BadgeCheck className="h-4 w-4 mr-1" />
              Verified
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="flex-grow space-y-1">
            <input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={verifiedPhoneNumber || watch("phone")}
              {...register("phone")}
              disabled={phoneVerified}
              className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md appearance-none focus:outline-none focus:border-[#00796B]"
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>
          
          <Button 
            type="button"
            variant={phoneVerified ? "outline" : "secondary"}
            onClick={() => {
              if (phoneVerified) {
                // Reset verification
                resetVerification();
                setValue("phoneVerified", false);
                setValue("phoneVerificationId", "");
              } else {
                // Show verification dialog
                setShowPhoneVerification(true);
              }
            }}
            className="whitespace-nowrap"
          >
            {phoneVerified ? (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Change
              </>
            ) : (
              <>
                <PhoneOutgoing className="h-4 w-4 mr-2" />
                Verify
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Phone verification dialog */}
      {showPhoneVerification && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg">
            <PhoneVerification 
              onVerificationComplete={handleVerificationComplete}
              onCancel={() => setShowPhoneVerification(false)}
              initialPhoneNumber={watch("phone")}
            />
          </div>
        </div>
      )}

      <FormInput
        label="Address"
        {...register("address")}
        error={errors.address?.message}
      />

      <div className="flex items-start">
        <div className="flex items-center h-5">
          <Checkbox 
            id="terms" 
            onCheckedChange={(checked) => {
              const checkValue = checked === true;
              const target = { name: "termsAccepted", value: checkValue };
              // Use setValue instead of manually creating a change event
              setValue("termsAccepted", checkValue, { shouldValidate: true });
            }}
          />
        </div>
        <div className="ml-3 text-sm">
          <label 
            htmlFor="terms" 
            className={`${errors.termsAccepted ? "text-red-500" : "text-gray-500"}`}
          >
            I agree to the <Link href="/terms" className="text-[#00796B] hover:text-[#004D40]">Terms of Service</Link> and <Link href="/privacy" className="text-[#00796B] hover:text-[#004D40]">Privacy Policy</Link>
          </label>
          {errors.termsAccepted && (
            <p className="text-xs text-red-500 mt-1">{errors.termsAccepted.message}</p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#00796B] hover:bg-[#004D40]"
        disabled={isLoading || csrfLoading || !csrfReady || !!csrfError}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Creating Account...
          </>
        ) : csrfLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Securing Connection...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
