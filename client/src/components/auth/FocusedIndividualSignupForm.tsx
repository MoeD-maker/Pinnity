import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { individualSignupSchema, type IndividualSignupFormValues } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";
import FormInput from "./FormInput";
import PasswordInput from "./PasswordInput";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import { calculatePasswordStrength } from "@/lib/utils";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

export default function FocusedIndividualSignupForm() {
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
      address: "",
      termsAccepted: false
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
    console.log("FORM SUBMITTED!", data);
    console.log("Terms accepted value:", data.termsAccepted);
    
    toast({
      title: "Form submitted",
      description: "See console for form data"
    });
    
    setIsLoading(true);
    try {
      // For testing only - log the data
      console.log("Would send this data to server:", JSON.stringify(data, null, 2));
      
      toast({
        title: "Form Validated Successfully",
        description: "Your data is valid, in a real scenario this would be sent to the server",
      });
      
      // Simulate success for testing
      setTimeout(() => {
        toast({
          title: "Test Successful",
          description: "Terms of Service validation is working correctly!"
        });
        setIsLoading(false);
      }, 1500);
      
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Simplified Form For Testing</h2>
      <p className="text-center text-gray-600 mb-6">
        This form focuses on the Terms of Service validation issue
      </p>
      
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
                setValue("termsAccepted", !!checked, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                console.log("Checkbox changed to:", !!checked);
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

        <button 
          type="submit" 
          className="w-full bg-[#00796B] hover:bg-[#004D40] mt-6 py-3 text-white font-medium rounded-md"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}