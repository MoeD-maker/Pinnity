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
import { Checkbox } from "@/components/ui/checkbox";
import { apiPost } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function IndividualSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    watch,
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
      // Cast to satisfy the type constraint from the zod schema
      termsAccepted: false as unknown as true,
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
    setIsLoading(true);
    try {
      // Define the expected response type
      type RegistrationResponse = {
        message: string;
        userId: number;
        userType: string;
        token: string;
      };
      
      // Use CSRF-protected API call
      const response = await apiPost<RegistrationResponse>('/api/auth/register/individual', data);
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully",
      });
      
      // Store token in localStorage for login persistence
      if (response.token) {
        localStorage.setItem('token', response.token);
        // Redirect to onboarding flow
        window.location.href = `/onboarding/individual/${response.userId}`;
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
          showRequirements={true}
        />
        
        <PasswordStrengthIndicator 
          score={passwordStrength.score} 
          feedback={passwordStrength.feedback} 
        />
      </div>

      <PasswordInput
        label="Confirm password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
        showRequirements={false}
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

      <div className="flex items-start">
        <div className="flex items-center h-5">
          <Checkbox 
            id="terms" 
            {...register("termsAccepted")}
          />
        </div>
        <div className="ml-3 text-sm">
          <label 
            htmlFor="terms" 
            className={`${errors.termsAccepted ? "text-red-500" : "text-gray-500"}`}
          >
            I agree to the <a href="#" className="text-[#00796B] hover:text-[#004D40]">Terms of Service</a> and <a href="#" className="text-[#00796B] hover:text-[#004D40]">Privacy Policy</a>
          </label>
          {errors.termsAccepted && (
            <p className="text-xs text-red-500 mt-1">{errors.termsAccepted.message}</p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#00796B] hover:bg-[#004D40]"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
