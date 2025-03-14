import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { businessSignupSchema, type BusinessSignupFormValues } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";
import FormInput from "./FormInput";
import PasswordInput from "./PasswordInput";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import FileUpload from "./FileUpload";
import { calculatePasswordStrength } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { uploadFormData } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function BusinessSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessSignupFormValues>({
    resolver: zodResolver(businessSignupSchema),
    defaultValues: {
      businessName: "",
      businessCategory: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      // This will be properly validated during form submission
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

  // Set file values with the registering (for file inputs)
  const handleFileChange = (name: "governmentId" | "proofOfAddress" | "proofOfBusiness") => (file: File | null) => {
    setValue(name, file as File, { shouldValidate: true });
  };

  const onSubmit = async (data: BusinessSignupFormValues) => {
    setIsLoading(true);
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'boolean') {
          formData.append(key, value ? 'true' : 'false');
        } else if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      
      // Use CSRF-protected upload with proper typing
      type RegistrationResponse = {
        message: string;
        userId: number;
        userType: string;
        token: string;
      };
      
      const result = await uploadFormData<RegistrationResponse>('/api/auth/register/business', formData);
      
      toast({
        title: "Business account created",
        description: "Your business account has been created successfully",
      });
      
      // Store token in localStorage for login persistence
      if (result.token) {
        localStorage.setItem('token', result.token);
        // Redirect to dashboard
        window.location.href = "/";
      } else {
        // Redirect to login page
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error("Business registration error:", error);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please check your information and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const businessCategories = [
    { value: "restaurant", label: "Restaurant" },
    { value: "retail", label: "Retail" },
    { value: "services", label: "Services" },
    { value: "hospitality", label: "Hospitality" },
    { value: "entertainment", label: "Entertainment" },
    { value: "other", label: "Other" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormInput
        label="Business name"
        {...register("businessName")}
        error={errors.businessName?.message}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 mb-1">Business category</label>
        <Select
          onValueChange={(value) => setValue("businessCategory", value, { shouldValidate: true })}
        >
          <SelectTrigger className={`w-full ${errors.businessCategory ? "border-red-500" : ""}`}>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {businessCategories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.businessCategory && (
          <p className="text-xs text-red-500">{errors.businessCategory.message}</p>
        )}
      </div>

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

      <div className="space-y-4">
        <FileUpload
          label="Government ID"
          onFileChange={handleFileChange("governmentId")}
          error={errors.governmentId?.message}
        />

        <FileUpload
          label="Proof of Address"
          onFileChange={handleFileChange("proofOfAddress")}
          error={errors.proofOfAddress?.message}
        />

        <FileUpload
          label="Proof of Business Ownership"
          onFileChange={handleFileChange("proofOfBusiness")}
          error={errors.proofOfBusiness?.message}
        />
      </div>

      <div className="flex items-start">
        <div className="flex items-center h-5">
          <Checkbox 
            id="business-terms" 
            {...register("termsAccepted")}
          />
        </div>
        <div className="ml-3 text-sm">
          <label 
            htmlFor="business-terms" 
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
            Creating Business Account...
          </>
        ) : (
          "Create Business Account"
        )}
      </Button>
    </form>
  );
}
