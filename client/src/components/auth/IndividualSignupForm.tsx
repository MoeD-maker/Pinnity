import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import FormInput from "./FormInput";
import PasswordInput from "./PasswordInput";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import { calculatePasswordStrength } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// Define the schema for form validation
const individualSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(1, "Address is required"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions" })
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type IndividualSignupFormValues = z.infer<typeof individualSignupSchema>;

export default function IndividualSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  const { toast } = useToast();
  
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
      address: ""
    },
    mode: "onBlur",
  });

  // Watch password field to calculate strength
  const password = watch("password", "");
  const confirmPassword = watch("confirmPassword", "");
  
  // Update password strength whenever password changes
  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordStrength(calculatePasswordStrength(e.target.value));
  };

  // Check if passwords match in real-time
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const showPasswordMismatch = confirmPassword && password !== confirmPassword;

  const onSubmit = async (data: IndividualSignupFormValues) => {
    // Debug logs to see what's happening
    console.log("🚀 SUBMISSION PAYLOAD:", data);
    console.log("termsAccepted TYPE:", typeof data.termsAccepted);
    
    // Log the complete form data
    console.log("SUBMISSION PAYLOAD:", JSON.stringify(data, null, 2));
    console.log("Terms accepted value:", data.termsAccepted);
    
    toast({
      title: "Form submitted",
      description: "Your registration is being processed"
    });
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully"
      });
      
      // In a real application, we would redirect to a success page or login page
      // window.location.href = "/auth/login";
      
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
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
          password={password}
        />
      </div>

      <div className="space-y-1">
        <PasswordInput
          label="Confirm password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
        {showPasswordMismatch && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span className="text-red-500">✗</span>
            Passwords don't match
          </p>
        )}
        {passwordsMatch && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <span className="text-green-500">✓</span>
            Passwords match
          </p>
        )}
      </div>

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

      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={watch("termsAccepted")}
          onCheckedChange={(checked) =>
            setValue("termsAccepted", !!checked, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
        <Label htmlFor="terms" className="text-sm font-medium leading-none">
          I agree to the <Link href="/terms" className="text-[#00796B] hover:text-[#004D40]">Terms of Service</Link> and <Link href="/privacy" className="text-[#00796B] hover:text-[#004D40]">Privacy Policy</Link>
        </Label>
      </div>

      <input type="hidden" {...register("termsAccepted")} />

      {errors.termsAccepted && (
        <p className="text-xs text-red-500 mt-1">
          {errors.termsAccepted.message || "You must accept the Terms and Conditions"}
        </p>
      )}

      <button
        type="submit"
        className="w-full bg-[#00796B] hover:bg-[#004D40] mt-6 py-3 text-white font-medium rounded-md"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
          </div>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}