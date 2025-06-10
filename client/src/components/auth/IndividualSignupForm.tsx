import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import TwilioPhoneVerification from "./TwilioPhoneVerification";

// Schema with proper terms validation
const individualSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions" })
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type IndividualSignupData = z.infer<typeof individualSignupSchema>;

function IndividualSignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'phone' | 'complete'>('form');
  const { toast } = useToast();
  const { refreshToken } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<IndividualSignupData>({
    resolver: zodResolver(individualSignupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      termsAccepted: false as any // Will be overridden by setValue
    }
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  // Auto-submit when phone verification completes
  useEffect(() => {
    if (currentStep === 'complete' && isPhoneVerified) {
      console.log("=== USEEFFECT TRIGGERED SUBMISSION ===");
      console.log("Current step:", currentStep);
      console.log("Phone verified:", isPhoneVerified);
      handleSubmit(onSubmit)();
    }
  }, [currentStep, isPhoneVerified]);

  const onSubmit = async (data: IndividualSignupData) => {
    console.log("=== ONSUBMIT CALLED ===");
    console.log("Current step:", currentStep);
    console.log("Phone verified:", isPhoneVerified);
    console.log("Submission payload:", data);
    
    if (currentStep === 'form' && !isPhoneVerified) {
      console.log("Moving to phone verification step");
      // First step: validate form and move to phone verification
      setCurrentStep('phone');
      return;
    }
    
    if (currentStep === 'phone' && !isPhoneVerified) {
      console.log("Blocking submission - phone not verified");
      toast({
        title: "Phone verification required",
        description: "Please verify your phone number before continuing.",
        variant: "destructive",
      });
      return;
    }
    
    // Handle the completion step - this is when phone is verified and we're ready to submit
    if (currentStep === 'complete' && isPhoneVerified) {
      console.log("Proceeding with final registration submission...");
    } else if (currentStep === 'complete' && !isPhoneVerified) {
      console.log("Error: Complete step reached but phone not verified");
      return;
    } else {
      console.log("Unhandled submission state - currentStep:", currentStep, "phoneVerified:", isPhoneVerified);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Use direct API call to registration endpoint
      const response = await apiPost('/api/v1/auth/register/individual', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        phone: data.phone,
        address: data.address,
        termsAccepted: true,
        phoneVerified: isPhoneVerified
      });

      toast({
        title: "Registration successful!",
        description: "Your account has been created with verified phone number.",
      });

      // Refresh authentication state to ensure the app recognizes you're logged in
      await refreshToken();

      // Redirect to home page after successful registration
      setTimeout(() => {
        setLocation('/');
      }, 1500); // Small delay to show the success message
      
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setValue("termsAccepted", checked as any);
  };

  const handlePhoneVerification = (verified: boolean) => {
    console.log("=== PHONE VERIFICATION CALLBACK ===");
    console.log("Phone verification result:", verified);
    console.log("Current step before:", currentStep);
    console.log("Phone verified before:", isPhoneVerified);
    
    setIsPhoneVerified(verified);
    if (verified) {
      console.log("Phone verified successfully, proceeding to complete step");
      setCurrentStep('complete');
    }
  };

  const handlePhoneChange = (phone: string) => {
    setValue("phone", phone);
  };

  if (currentStep === 'phone') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Verify Your Phone</h2>
          <p className="text-gray-600 mt-2">We'll send a verification code to confirm your number</p>
        </div>

        <TwilioPhoneVerification
          phoneNumber={watch("phone")}
          onVerificationComplete={handlePhoneVerification}
          onPhoneChange={handlePhoneChange}
          disabled={isSubmitting}
        />

        <Button 
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setCurrentStep('form')}
          disabled={isSubmitting}
        >
          Back to Form
        </Button>
      </div>
    );
  }

  if (currentStep === 'complete') {
    return (
      <div className="space-y-6 text-center">
        <div className="text-green-600">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-green-600">Account Created Successfully!</h2>
        <p className="text-gray-600">Your phone number has been verified. You can now log in to your account.</p>
        <Button 
          onClick={() => {
            setCurrentStep('form');
            setIsPhoneVerified(false);
            form.reset();
          }}
          className="w-full"
        >
          Create Another Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create Individual Account</h2>
        <p className="text-gray-600 mt-2">Join Pinnity to discover amazing deals</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              {...register("firstName")}
              placeholder="Enter your first name"
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              {...register("lastName")}
              placeholder="Enter your last name"
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder="Create a strong password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              {...register("confirmPassword")}
              placeholder="Confirm your password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            {...register("phone")}
            placeholder="Enter your phone number"
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            {...register("address")}
            placeholder="Enter your address"
          />
          {errors.address && (
            <p className="text-sm text-red-500">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="termsAccepted"
              onCheckedChange={handleTermsChange}
            />
            <Label
              htmlFor="termsAccepted"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I accept the{" "}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms and Conditions
              </a>
            </Label>
          </div>
          {errors.termsAccepted && (
            <p className="text-sm text-red-500">{errors.termsAccepted.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Continue to Phone Verification"}
        </Button>
      </form>
    </div>
  );
}

export default IndividualSignupForm;