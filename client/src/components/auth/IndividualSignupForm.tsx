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
import { Loader2 } from "lucide-react";
import { useCsrfProtection } from "@/hooks/useCsrfProtection";

export default function IndividualSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  const { toast } = useToast();
  const { isLoading: csrfLoading, isReady: csrfReady, error: csrfError, fetchWithProtection } = useCsrfProtection();
  
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
      address: "",
      // Omit termsAccepted as it needs to be explicitly set by user
    } as IndividualSignupFormValues,
    mode: "onChange",
  });

  // Watch password field to calculate strength
  const password = watch("password", "");
  
  // Update password strength whenever password changes
  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordStrength(calculatePasswordStrength(e.target.value));
  };

  const onSubmit = async (data: IndividualSignupFormValues) => {
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
      
      // Log submission payload for debugging
      console.log("SUBMISSION PAYLOAD:", data);
      
      // Use CSRF-protected fetch directly
      const response = await fetchWithProtection(
        '/api/v1/auth/register/individual', 
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
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

      <FormInput
        label="Phone number"
        type="tel"
        {...register("phone")}
        error={errors.phone?.message}
      />

      <FormInput
        label="Address"
        {...register("address")}
        error={errors.address?.message}
      />

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={watch("termsAccepted") === true}
            onCheckedChange={(checked) => {
              // Must be exactly true to satisfy z.literal(true)
              setValue("termsAccepted", checked === true ? true : undefined, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />
          <label
            htmlFor="terms"
            className={`text-sm font-medium ${
              errors.termsAccepted ? "text-red-500" : "text-gray-700"
            }`}
          >
            I agree to the <Link href="/terms" className="text-[#00796B] hover:text-[#004D40]">Terms of Service</Link> and <Link href="/privacy" className="text-[#00796B] hover:text-[#004D40]">Privacy Policy</Link>
          </label>
        </div>
        
        <input type="hidden" {...register("termsAccepted")} />

        {errors.termsAccepted && (
          <p className="text-xs text-red-500">
            {errors.termsAccepted.message}
          </p>
        )}
      </div>

      {/* Simplified button for testing */}
      <Button 
        type="submit" 
        className="w-full bg-[#00796B] hover:bg-[#004D40] mt-6 py-3 text-white font-medium rounded-md"
      >
        Create Account
      </Button>
      
      {/* Additional fallback button in case the Button component has issues */}
      <button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700 mt-3 py-3 text-white font-medium rounded-md"
      >
        Create Account (Fallback)
      </button>
    </form>
  );
}
