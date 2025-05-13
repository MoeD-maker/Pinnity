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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, BadgeCheck } from "lucide-react";
import { useCsrfProtection } from "@/hooks/useCsrfProtection";
import { usePhoneVerification } from "@/hooks/use-phone-verification";
import { PhoneVerification } from "./PhoneVerification";

export default function IndividualSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [formData, setFormData] = useState<IndividualSignupFormValues | null>(null);
  const { toast } = useToast();
  const { isLoading: csrfLoading, isReady: csrfReady, error: csrfError, fetchWithProtection } = useCsrfProtection();
  const { 
    isVerifying, 
    phoneVerified, 
    verifiedPhoneNumber, 
    verificationCredential,
    handleVerificationComplete,
    resetVerification,
    sendVerificationCode
  } = usePhoneVerification({
    onSuccess: async (phoneNumber, verificationId) => {
      console.log("Phone verified successfully, completing registration");
      
      if (!formData) {
        toast({
          title: "Error",
          description: "Form data is missing, please try again",
          variant: "destructive",
        });
        setShowPhoneVerification(false);
        return;
      }
      
      // Continue with the registration process
      await completeRegistration({
        ...formData,
        phone: phoneNumber,
        phoneVerified: true,
        phoneVerificationId: verificationId
      });
    },
    onError: (error) => {
      setIsLoading(false);
      toast({
        title: "Verification failed",
        description: error?.message || "There was a problem verifying your phone number",
        variant: "destructive",
      });
    }
  });
  
  // Added for debugging
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formSubmitAttempts, setFormSubmitAttempts] = useState(0);
  
  // Restored validation schema now that we've fixed the checkbox issue
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<IndividualSignupFormValues>({
    // Restored resolver for proper validation
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
  
  // Track form state changes for debugging
  useEffect(() => {
    console.log("Form errors changed:", errors);
    const errorMessages = Object.entries(errors).map(
      ([field, error]) => `${field}: ${error?.message || 'Invalid'}`
    );
    setFormErrors(errorMessages);
  }, [errors]);
  
  // Track submission attempts
  useEffect(() => {
    if (submitCount > formSubmitAttempts) {
      setFormSubmitAttempts(submitCount);
      console.log("Form submission attempt:", submitCount);
    }
  }, [submitCount, formSubmitAttempts]);
  
  // Register termsAccepted field directly to ensure it's part of the form data
  register("termsAccepted");

  // Watch password field to calculate strength
  const password = watch("password", "");
  
  // Update password strength whenever password changes
  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordStrength(calculatePasswordStrength(e.target.value));
  };

  const completeRegistration = async (data: IndividualSignupFormValues) => {
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
      
      // Hide verification modal
      setShowPhoneVerification(false);
      
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

  // Add more verbose logging
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  
  const addDebugLog = (message: string) => {
    setDebugLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev.slice(0, 9)
    ]);
  };
  
  const onSubmit = async (data: IndividualSignupFormValues) => {
    addDebugLog(`Form submitted with data: ${JSON.stringify(data, null, 2)}`);
    addDebugLog(`Terms accepted value type: ${typeof data.termsAccepted}`);
    addDebugLog(`Terms accepted value: ${data.termsAccepted}`);
    
    const isChecked = watch("termsAccepted");
    addDebugLog(`Checkbox state from direct watch: ${isChecked}`);
    
    // Check that terms are accepted
    if (!data.termsAccepted) {
      addDebugLog("Terms not accepted, validation should block submission");
      toast({
        title: "Terms Required",
        description: "You must accept the terms and conditions to continue",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    // Store form data for later use
    setFormData(data);
    
    // Start the verification process
    try {
      // Initiate SMS verification
      addDebugLog(`Initiating SMS verification for phone: ${data.phone}`);
      await sendVerificationCode(data.phone);
      
      // Show verification dialog
      setShowPhoneVerification(true);
    } catch (error) {
      console.error("Verification initiation error:", error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "There was an error sending verification code to your phone",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            {...register("firstName")}
            placeholder="John"
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            {...register("lastName")}
            placeholder="Doe"
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="john.doe@example.com"
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

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
        <Label htmlFor="phone">
          Phone number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
        )}
      </div>
      
      {/* Phone verification dialog - shows after form submission */}
      {showPhoneVerification && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg">
            <PhoneVerification 
              onVerificationComplete={handleVerificationComplete}
              onCancel={() => {
                setShowPhoneVerification(false);
                setIsLoading(false);
              }}
              initialPhoneNumber={formData?.phone || ""}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="123 Main St, Anytown, US"
        />
        {errors.address && (
          <p className="text-xs text-red-500">{errors.address.message}</p>
        )}
      </div>

      <div className="flex items-start space-x-3 border p-3 rounded-md bg-gray-50">
        {/* This is the critical part - we need to bind a real input to register */}
        <input type="hidden" {...register("termsAccepted")} />
        
        <input
          type="checkbox"
          id="terms-checkbox"
          className="mt-1 h-4 w-4"
          checked={watch("termsAccepted")}
          onChange={(e) => {
            const isChecked = e.target.checked;
            setValue("termsAccepted", isChecked, { 
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true 
            });
            console.log("Manual checkbox set to:", isChecked);
          }}
        />
        <div>
          <label 
            htmlFor="terms-checkbox" 
            className={`${errors.termsAccepted ? "text-red-500" : "text-gray-700"} text-sm cursor-pointer font-medium`}
          >
            I agree to the <Link href="/terms" className="text-[#00796B] hover:text-[#004D40] underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#00796B] hover:text-[#004D40] underline">Privacy Policy</Link>
          </label>
          {errors.termsAccepted && (
            <p className="text-xs text-red-500 mt-1">{errors.termsAccepted.message}</p>
          )}
        </div>
      </div>
      
      {/* Debug output */}
      <div className="text-xs bg-gray-100 p-3 rounded border border-gray-300 my-4">
        <h3 className="font-bold mb-1 text-sm">Debug Information:</h3>
        <div className="space-y-2">
          <div>
            <div className="font-semibold">Form State:</div>
            <div>Terms accepted (watched): <span className="font-mono">{String(watch("termsAccepted"))}</span></div>
            <div>Terms accepted (type): <span className="font-mono">{typeof watch("termsAccepted")}</span></div>
            <div>Form is submitting: <span className="font-mono">{String(isSubmitting)}</span></div>
            <div>Submit attempts: <span className="font-mono">{formSubmitAttempts}</span></div>
          </div>
          
          {formErrors.length > 0 && (
            <div>
              <div className="font-semibold text-red-500">Form errors:</div>
              <ul className="list-disc pl-4 text-red-500">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {debugLogs.length > 0 && (
            <div>
              <div className="font-semibold">Event Logs:</div>
              <pre className="bg-black text-green-400 p-2 rounded text-[9px] mt-1 max-h-[100px] overflow-y-auto">
                {debugLogs.join('\n')}
              </pre>
            </div>
          )}
          
          <button 
            type="button" 
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            onClick={() => {
              addDebugLog("Manual debug log triggered");
              setValue("termsAccepted", true, { shouldValidate: true });
              addDebugLog(`Terms manually set to: ${watch("termsAccepted")}`);
            }}
          >
            Debug: Force Terms True
          </button>
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
