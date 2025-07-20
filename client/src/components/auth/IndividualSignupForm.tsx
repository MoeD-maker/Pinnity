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
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";
import TwilioPhoneVerification from "./TwilioPhoneVerification";
import { RoleSelector } from "./RoleSelector";


// Schema with proper terms validation including Google Places fields
const individualSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]*$/, "Password must contain at least one letter and one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions" })
  }),
  marketingConsent: z.boolean().optional(),
  role: z.enum(["individual", "vendor"]).optional().default("individual")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type IndividualSignupData = z.infer<typeof individualSignupSchema>;

// Static libraries array to prevent reloading
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];



function IndividualSignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'phone' | 'complete'>('form');
  const { toast } = useToast();
  const { refreshToken } = useAuth();
  const [, setLocation] = useLocation();
    
  
  
  // ——————————————————————————————
  // REST-based Google Places Autocomplete
  const [sessionToken, setSessionToken] = useState("");
  useEffect(() => {
    // create one session token per page load
    const token = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    setSessionToken(token);
  }, []);

  const [inputValue, setInputValue] = useState("");
  const [predictions, setPredictions] = useState<{ place_id: string; description: string; }[]>([]);
  const [isMapsLoaded] = useState(false); // Simplified for now

  useEffect(() => {
    if (!inputValue) {
      setPredictions([]);
      return;
    }
    const handle = setTimeout(() => {
      fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?` +
        `input=${encodeURIComponent(inputValue)}` +
        `&components=country:ca` +
        `&sessiontoken=${sessionToken}` +
        `&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      )
        .then(r => r.json())
        .then(d => setPredictions(d.predictions || []))
        .catch(() => setPredictions([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [inputValue, sessionToken]);

  


  

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
      postalCode: "",
      city: "",
      province: "",
      lat: undefined,
      lng: undefined,
      termsAccepted: false as any, // Will be overridden by setValue
      marketingConsent: true,
      role: "individual"
    }
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const handlePlaceSelect = (placeData: any) => {
    setValue("address", placeData.address);
    setValue("city", placeData.city);
    setValue("province", placeData.province);
    setValue("postalCode", placeData.postalCode);
    setValue("lat", placeData.lat);
    setValue("lng", placeData.lng);
  };

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
      console.log("=== STARTING REGISTRATION ===");
      console.log("Phone verified status:", isPhoneVerified);
      console.log("Form data:", data);

      // Registration with our gated backend endpoint
      const response = await fetch('/api/auth/gated/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          phone: data.phone,
          address: data.address,
          phoneVerified: isPhoneVerified,
          marketingConsent: data.marketingConsent,
          role: data.role || 'individual'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Registration error:", result);
        if (response.status === 403) {
          // User is gated - show special message
          toast({
            title: "Registration Successful! 🎉",
            description: result.message || "Thank you for signing up! We will email you as soon as we are live!",
            variant: "default",
          });
          // Don't redirect, show success but gated state
          setIsSubmitting(false);
          return;
        }
        throw new Error(result.message || 'Registration failed');
      }

      console.log("Registration successful:", result);

      // Check if user is live or gated based on role
      if (result.role === 'individual' && !result.is_live) {
        // Individual user is gated
        toast({
          title: "Registration Successful! 🎉",
          description: "Thank you for signing up! We will email you as soon as we are live!",
          variant: "default",
        });
        setIsSubmitting(false);
        return;
      }

      // User is live (vendor or admin) - proceed normally
      try {
        await refreshToken();
        console.log("✅ Authentication sync completed successfully");
      } catch (verifyError: any) {
        console.error("Authentication sync error:", verifyError);
        // Don't throw here as registration was successful
        console.log("Continuing with session");
      }

      console.log("Authentication successful, showing success toast");
      toast({
        title: "Registration successful!",
        description: "Welcome to Pinnity! You're now signed in.",
      });
      
      setTimeout(() => {
        console.log("Redirecting to homepage...");
        setLocation('/');
      }, 1500); // Small delay to show the success message
      
    } catch (error: any) {
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

  const handleMarketingConsentChange = (checked: boolean) => {
    setValue("marketingConsent", checked);
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
        {/* Role Selector */}
        <RoleSelector 
          role={watch("role") || "individual"}
          onRoleChange={(role) => setValue("role", role)}
        />

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
          <div className="text-xs text-gray-600 space-y-1">
            <p className="font-medium">Password requirements:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Minimum 8 characters</li>
              <li>Must contain at least one letter (A-Z or a-z)</li>
              <li>Must contain at least one number (0-9)</li>
              <li>Can include special characters (!@#$%^&*)</li>
            </ul>
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
            placeholder="Enter your full address"
          />
          {errors.address && (
            <p className="text-sm text-red-500">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...register("city")}
              placeholder={isMapsLoaded ? "Auto-filled from address" : "Enter your value"}
              readOnly={isMapsLoaded}
              className={isMapsLoaded ? "bg-gray-50 cursor-not-allowed" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Input
              id="province"
              {...register("province")}
              placeholder={isMapsLoaded ? "Auto-filled from address" : "Enter your value"}
              readOnly={isMapsLoaded}
              className={isMapsLoaded ? "bg-gray-50 cursor-not-allowed" : ""}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            {...register("postalCode")}
            placeholder={isMapsLoaded ? "Auto-filled from address" : "Enter your value"}
            readOnly={isMapsLoaded}
            className={isMapsLoaded ? "bg-gray-50 cursor-not-allowed" : ""}
            />
        </div>

        <div className="space-y-4">
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

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="marketingConsent"
                defaultChecked={true}
                checked={watch("marketingConsent")}
                onCheckedChange={handleMarketingConsentChange}
              />
              <Label
                htmlFor="marketingConsent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Keep me in the loop—I'm hungry for hot deals!
              </Label>
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}

export default IndividualSignupForm;