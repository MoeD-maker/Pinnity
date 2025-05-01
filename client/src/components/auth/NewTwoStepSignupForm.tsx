import { useState, useEffect } from "react";
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
import { useCsrfProtection } from "@/hooks/useCsrfProtection";
import { usePhoneVerification } from "@/hooks/use-phone-verification";
import { OtpVerificationForm } from "./OtpVerificationForm";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, PhoneAuthProvider } from "firebase/auth";
import { Loader2, AlertCircle, Phone } from "lucide-react";

export default function NewTwoStepSignupForm() {
  // Form states
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  
  // OTP verification states
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [formData, setFormData] = useState<IndividualSignupFormValues | null>(null);
  
  // Invisible reCAPTCHA
  const [recaptchaInitialized, setRecaptchaInitialized] = useState(false);
  
  // Hooks
  const { toast } = useToast();
  const { isLoading: csrfLoading, isReady: csrfReady, error: csrfError, fetchWithProtection } = useCsrfProtection();

  // Setup reCAPTCHA when component mounts
  useEffect(() => {
    if (!recaptchaInitialized && !showOtpStep) {
      try {
        // Set up invisible reCAPTCHA
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            console.log('reCAPTCHA verified');
          },
          'expired-callback': () => {
            toast({
              title: "reCAPTCHA expired",
              description: "Please try again",
              variant: "destructive"
            });
          }
        });
        
        // Store in window for access in send code function
        (window as any).recaptchaVerifier = verifier;
        setRecaptchaInitialized(true);
        
        return () => {
          // Clean up
          try {
            if ((window as any).recaptchaVerifier) {
              (window as any).recaptchaVerifier.clear();
            }
          } catch (err) {
            console.error('Error clearing reCAPTCHA:', err);
          }
        };
      } catch (error) {
        console.error('Error setting up reCAPTCHA:', error);
        toast({
          title: "Verification setup failed",
          description: "Failed to set up verification. Please refresh and try again.",
          variant: "destructive"
        });
      }
    }
  }, [recaptchaInitialized, showOtpStep, toast]);

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
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
  
  // Format phone number for Firebase (needs E.164 format)
  const formatPhoneForFirebase = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Ensure US format with country code
    if (digits.startsWith('1')) {
      return `+${digits}`;
    } else {
      return `+1${digits}`;
    }
  };

  // Step 1: Initial signup data collection and SMS sending
  const onFirstStepSubmit = async (data: IndividualSignupFormValues) => {
    // Don't proceed if CSRF is still loading or errored out
    if (csrfLoading || !csrfReady || csrfError) {
      toast({
        title: "Please wait",
        description: "Security verification in progress...",
      });
      return;
    }
    
    setIsLoading(true);
    const formattedPhone = formatPhoneForFirebase(data.phone);
    
    try {
      // Send SMS verification code
      const recaptchaVerifier = (window as any).recaptchaVerifier;
      
      if (!recaptchaVerifier) {
        throw new Error("Verification system not initialized. Please refresh the page.");
      }
      
      // Store form data for the next step
      setFormData(data);
      setPhoneNumber(formattedPhone);
      
      // Send the SMS via Firebase
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      
      // Switch to OTP screen
      setShowOtpStep(true);
      
      toast({
        title: "Verification code sent",
        description: `We've sent a verification code to ${formattedPhone}`,
      });
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      
      toast({
        title: "Verification failed",
        description: error.message || "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
      
      // Reset the reCAPTCHA if there was an error
      try {
        if ((window as any).recaptchaVerifier) {
          (window as any).recaptchaVerifier.clear();
        }
        
        // Create a new invisible reCAPTCHA
        const newVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
        (window as any).recaptchaVerifier = newVerifier;
        setRecaptchaInitialized(true);
      } catch (err) {
        console.error('Error resetting reCAPTCHA:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Step 2: Handle OTP verification and final account creation
  const handleVerificationComplete = async (phoneNumber: string, credential: any) => {
    if (!formData) {
      toast({
        title: "Error",
        description: "Form data is missing. Please try again.",
        variant: "destructive",
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
      
      // Add Firebase verification data
      const formDataWithVerification = {
        ...formData,
        phoneVerified: true,
        phone: phoneNumber,
        firebaseVerification: {
          phoneNumber,
          verificationId: credential?.verificationId || '',
          credential
        }
      };
      
      // Use CSRF-protected fetch
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
  
  // Go back to the form from OTP screen
  const handleBack = () => {
    setShowOtpStep(false);
    setConfirmationResult(null);
    
    // Reset the reCAPTCHA
    try {
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
      }
      
      const newVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
      (window as any).recaptchaVerifier = newVerifier;
      setRecaptchaInitialized(true);
    } catch (err) {
      console.error('Error resetting reCAPTCHA:', err);
    }
  };

  // Render OTP verification screen
  if (showOtpStep && confirmationResult) {
    return (
      <OtpVerificationForm
        phoneNumber={phoneNumber}
        confirmationResult={confirmationResult}
        onVerificationComplete={handleVerificationComplete}
        onBack={handleBack}
      />
    );
  }

  // Render signup form (first step)
  return (
    <form onSubmit={handleSubmit(onFirstStepSubmit)} className="space-y-6">
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
          <div className="flex items-center text-xs text-muted-foreground">
            <Phone className="h-3 w-3 mr-1" />
            We'll send a verification code
          </div>
        </div>
        
        <div className="space-y-1">
          <input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            {...register("phone")}
            className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md appearance-none focus:outline-none focus:border-[#00796B]"
          />
          {errors.phone && (
            <p className="text-xs text-red-500 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" /> {errors.phone.message}
            </p>
          )}
        </div>
      </div>
      
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>

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
        disabled={isLoading || csrfLoading || !csrfReady || !!csrfError || !isValid}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Sending verification...
          </>
        ) : csrfLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Securing Connection...
          </>
        ) : (
          "Continue with phone verification"
        )}
      </Button>
    </form>
  );
}