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
import { useLoadScript } from "@react-google-maps/api";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

// Schema with proper terms validation including Google Places fields
const individualSignupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type IndividualSignupData = z.infer<typeof individualSignupSchema>;

const libraries: ("places")[] = ["places"];

// PlacesAutocomplete component
function PlacesAutocomplete({ onPlaceSelect }: { onPlaceSelect: (place: any) => void }) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "ca" }, // Restrict to Canada
    },
    debounce: 300,
  });

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      
      // Parse address components
      const addressComponents = results[0].address_components;
      let streetNumber = "";
      let route = "";
      let locality = "";
      let administrativeAreaLevel1 = "";
      let postalCode = "";

      addressComponents.forEach((component) => {
        const types = component.types;
        if (types.includes("street_number")) {
          streetNumber = component.long_name;
        } else if (types.includes("route")) {
          route = component.long_name;
        } else if (types.includes("locality")) {
          locality = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          administrativeAreaLevel1 = component.short_name;
        } else if (types.includes("postal_code")) {
          postalCode = component.long_name;
        }
      });

      const fullAddress = `${streetNumber} ${route}`.trim();
      
      onPlaceSelect({
        address: fullAddress,
        city: locality,
        province: administrativeAreaLevel1,
        postalCode: postalCode,
        lat,
        lng,
      });
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        placeholder="Start typing your address..."
        className="w-full"
      />
      
      {status === "OK" && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {data.map(({ place_id, description }) => (
            <div
              key={place_id}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelect(description)}
            >
              {description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IndividualSignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'phone' | 'complete'>('form');
  const { toast } = useToast();
  const { refreshToken } = useAuth();
  const [, setLocation] = useLocation();

  // Load Google Maps script
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

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
      termsAccepted: false as any // Will be overridden by setValue
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

      // Registration API call
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

      console.log("Registration response:", response);

      // Save user data immediately to localStorage before calling refreshToken
      const responseData = response as { userId: number; userType: string; message: string };
      if (responseData.userId && responseData.userType) {
        console.log("Saving user data to localStorage:", responseData.userId, responseData.userType);
        // Import saveUserData function
        const { saveUserData } = await import('../../utils/userUtils');
        saveUserData(responseData.userId.toString(), responseData.userType);
        
        // Verify the data was saved
        const userIdFromStorage = localStorage.getItem('pinnity_user_id');
        console.log("Verified saved user ID:", userIdFromStorage);
      }

      // Instead of using refreshToken(), directly verify the authentication by checking the user
      console.log("Verifying authentication after registration...");
      try {
        // Try to fetch the user data to verify authentication worked
        const userResponse = await fetch(`/api/v1/user/${responseData.userId}`, {
          credentials: 'include', // Include cookies
        });
        
        if (userResponse.ok) {
          console.log("Authentication verified successfully");
          // Trigger auth context refresh to update the UI state
          const authEvent = new CustomEvent('authStateChange', { 
            detail: { authenticated: true, userId: responseData.userId } 
          });
          window.dispatchEvent(authEvent);
        } else {
          console.error("User verification failed with status:", userResponse.status);
          throw new Error("Authentication verification failed after registration");
        }
      } catch (verifyError: any) {
        console.error("Authentication verification threw an error:", verifyError);
        throw new Error(`Authentication verification failed: ${verifyError?.message || 'Unknown error'}`);
      }

      console.log("Authentication successful, showing success toast");
      toast({
        title: "Registration successful!",
        description: "Redirecting to homepage...",
      });

      // Immediate redirect to home page after successful registration
      console.log("Redirecting to homepage...");
      setLocation('/');
      
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
          <Label htmlFor="poBox">PO Box</Label>
          <Input
            id="poBox"
            onChange={handlePOBoxChange}
            placeholder="Enter PO Box number (e.g., 1000, 2000, 3000)"
          />
          <p className="text-xs text-gray-600">
            Supported PO Boxes: 1000 (Toronto), 2000 (Mississauga), 3000 (Ottawa)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            {...register("address")}
            placeholder="Address will be auto-filled based on PO Box"
            readOnly
            className="bg-gray-50 cursor-not-allowed"
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