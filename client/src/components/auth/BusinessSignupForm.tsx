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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Define business categories
const businessCategories = [
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "hospitality", label: "Hospitality" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];

// Define the schema for form validation
const businessSignupSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  category: z.string().min(1, "Business category is required"),
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
  governmentId: z.any().optional(),
  proofOfAddress: z.any().optional(),
  proofOfBusinessOwnership: z.any().optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions" })
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type BusinessSignupFormValues = z.infer<typeof businessSignupSchema>;

export interface BusinessSignupFormProps {
  setUserType?: (type: "individual" | "business") => void;
}

export default function BusinessSignupForm({ setUserType }: BusinessSignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: "Password is required" });
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState({
    governmentId: null as File | null,
    proofOfAddress: null as File | null,
    proofOfBusinessOwnership: null as File | null,
  });
  
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
      category: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
      termsAccepted: false
    },
    mode: "onBlur",
  });

  // Watch password field to calculate strength
  const password = watch("password", "");
  
  // Update password strength whenever password changes
  const onPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordStrength(calculatePasswordStrength(e.target.value));
  };

  // Handle file uploads
  const handleFileUpload = (fieldName: keyof typeof uploadedFiles) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFiles(prev => ({
        ...prev,
        [fieldName]: file
      }));
      console.log(`File uploaded for ${fieldName}:`, file.name);
    }
  };

  const onSubmit = async (data: BusinessSignupFormValues) => {
    // Log the complete form data and files
    const submissionData = {
      ...data,
      uploads: {
        governmentId: uploadedFiles.governmentId?.name || null,
        proofOfAddress: uploadedFiles.proofOfAddress?.name || null,
        proofOfBusinessOwnership: uploadedFiles.proofOfBusinessOwnership?.name || null,
      }
    };
    
    console.log("SUBMISSION PAYLOAD:", JSON.stringify(submissionData, null, 2));
    console.log("Terms accepted value:", data.termsAccepted);
    
    toast({
      title: "Form submitted",
      description: "Your business registration is being processed"
    });
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Business account created",
        description: "Your business account has been created successfully. Verification is pending."
      });
      
      // In a real application, we would redirect to a success page or dashboard
      // window.location.href = "/business/dashboard";
      
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
      {/* Back button if needed */}
      {setUserType && (
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => setUserType("individual")}
          className="mb-4 text-sm font-medium text-gray-600 hover:text-[#00796B] flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Individual Signup
        </Button>
      )}
      
      {/* Business Information */}
      <FormInput
        label="Business name"
        {...register("businessName")}
        error={errors.businessName?.message}
      />

      <div className="space-y-2">
        <Label htmlFor="category">Business category</Label>
        <Select 
          onValueChange={(value) => setValue("category", value, { shouldValidate: true })}
          defaultValue={watch("category")}
        >
          <SelectTrigger id="category" className="w-full">
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
        {errors.category && (
          <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>
        )}
      </div>

      {/* Personal Information */}
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
        label="Business address"
        {...register("address")}
        error={errors.address?.message}
      />

      {/* Document Uploads */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Verification Documents</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="governmentId">Government ID</Label>
            <input
              id="governmentId"
              type="file"
              accept="image/*,.pdf"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#E0F2F1] file:text-[#00796B] hover:file:bg-[#B2DFDB]"
              onChange={handleFileUpload("governmentId")}
            />
            {uploadedFiles.governmentId && (
              <p className="text-xs text-green-600 mt-1">
                File selected: {uploadedFiles.governmentId.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofOfAddress">Proof of Address</Label>
            <input
              id="proofOfAddress"
              type="file"
              accept="image/*,.pdf"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#E0F2F1] file:text-[#00796B] hover:file:bg-[#B2DFDB]"
              onChange={handleFileUpload("proofOfAddress")}
            />
            {uploadedFiles.proofOfAddress && (
              <p className="text-xs text-green-600 mt-1">
                File selected: {uploadedFiles.proofOfAddress.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofOfBusinessOwnership">Proof of Business Ownership</Label>
            <input
              id="proofOfBusinessOwnership"
              type="file"
              accept="image/*,.pdf"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#E0F2F1] file:text-[#00796B] hover:file:bg-[#B2DFDB]"
              onChange={handleFileUpload("proofOfBusinessOwnership")}
            />
            {uploadedFiles.proofOfBusinessOwnership && (
              <p className="text-xs text-green-600 mt-1">
                File selected: {uploadedFiles.proofOfBusinessOwnership.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="business-terms"
          checked={watch("termsAccepted")}
          onCheckedChange={(checked) =>
            setValue("termsAccepted", !!checked, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
        <Label htmlFor="business-terms" className="text-sm font-medium leading-none">
          I agree to the <Link href="/terms" className="text-[#00796B] hover:text-[#004D40]">Terms of Service</Link> and <Link href="/privacy" className="text-[#00796B] hover:text-[#004D40]">Privacy Policy</Link>
        </Label>
      </div>

      <input type="hidden" {...register("termsAccepted")} />

      {errors.termsAccepted && (
        <p className="text-xs text-red-500 mt-1">
          {errors.termsAccepted.message || "You must accept the Terms and Conditions"}
        </p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-[#00796B] hover:bg-[#004D40] mt-6 py-3 text-white font-medium rounded-md"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Business Account...
          </div>
        ) : (
          "Create Business Account"
        )}
      </button>
    </form>
  );
}