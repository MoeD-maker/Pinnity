import { useState, Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import TwilioPhoneVerification from "./TwilioPhoneVerification";
import { Eye, EyeOff, Upload } from "lucide-react";

interface BusinessSignupFormProps {
  setUserType?: Dispatch<SetStateAction<"business" | "individual">>;
}

// Schema with proper terms validation and address fields
const businessSignupSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  category: z.string().min(1, "Business category is required"),
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
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms and Conditions" })
  }),
  marketingConsent: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type BusinessSignupData = z.infer<typeof businessSignupSchema>;

const businessCategories = [
  "Restaurant",
  "Retail", 
  "Services",
  "Hospitality",
  "Entertainment",
  "Other"
];

function BusinessSignupForm({ setUserType }: BusinessSignupFormProps = {}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [currentStep, setCurrentStep] = useState<'form' | 'phone' | 'complete'>('form');
  const [skipPhoneVerification] = useState(true); // Temporarily skip phone verification
  const [uploadedFiles, setUploadedFiles] = useState({
    governmentId: null as File | null,
    proofOfAddress: null as File | null,
    proofOfBusiness: null as File | null
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<BusinessSignupData>({
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
      postalCode: "",
      city: "",
      province: "",
      termsAccepted: false as any, // Will be overridden by setValue
      marketingConsent: true
    }
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  const onSubmit = async (data: BusinessSignupData) => {
    console.log("SUBMISSION PAYLOAD:", data);
    console.log("Uploaded files:", {
      governmentId: uploadedFiles.governmentId?.name,
      proofOfAddress: uploadedFiles.proofOfAddress?.name,
      proofOfBusiness: uploadedFiles.proofOfBusiness?.name
    });
    
    // Skip phone verification if disabled for testing
    if (!skipPhoneVerification && !isPhoneVerified) {
      setCurrentStep('phone');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Check if all required files are uploaded
      if (!uploadedFiles.governmentId || !uploadedFiles.proofOfAddress || !uploadedFiles.proofOfBusiness) {
        toast({
          title: "Missing documents",
          description: "Please upload all required documents before registering.",
          variant: "destructive"
        });
        return;
      }

      // Create form data with all business registration info and documents
      const formData = new FormData();
      
      // Add business data
      formData.append('businessName', data.businessName);
      formData.append('businessCategory', data.category);
      formData.append('firstName', data.firstName);
      formData.append('lastName', data.lastName);
      formData.append('email', data.email);
      formData.append('password', data.password);
      formData.append('phone', data.phone);
      formData.append('address', data.address);
      formData.append('city', data.city || '');
      formData.append('province', data.province || '');
      formData.append('postalCode', data.postalCode || '');
      formData.append('termsAccepted', 'true');
      formData.append('marketingConsent', data.marketingConsent ? 'true' : 'false');
      
      // Add documents
      formData.append('governmentId', uploadedFiles.governmentId);
      formData.append('proofOfAddress', uploadedFiles.proofOfAddress);
      formData.append('proofOfBusiness', uploadedFiles.proofOfBusiness);

      // Register business using our backend endpoint (handles Supabase + local DB + file upload)
      const response = await fetch('/api/v1/auth/register/business', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      let result: any;
      try {
        result = await response.json();
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid server response');
      }

      if (!response.ok) {
        console.error('Business registration failed:', result?.message);
        throw new Error(result?.message || 'Registration failed');
      }

      console.log('Business registration succeeded:', result);
      
      // Move to completion step
      setCurrentStep('complete');
      
      // Show success message and redirect to home page
      toast({
        title: "Business registration successful!",
        description: "Welcome to Pinnity! Your business is now registered and you're signed in.",
      });
      
      setTimeout(() => {
        console.log("Redirecting business user to homepage...");
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

  const handlePhoneVerificationComplete = (verified: boolean) => {
    if (verified) {
      setIsPhoneVerified(true);
      setCurrentStep('form');
      toast({
        title: "Phone verified!",
        description: "You can now complete your business registration.",
      });
    }
  };

  const handleTermsChange = (checked: boolean) => {
    setValue("termsAccepted", checked as any);
  };

  const handleMarketingConsentChange = (checked: boolean) => {
    setValue("marketingConsent", checked);
  };

  const handleCategoryChange = (value: string) => {
    setValue("category", value);
  };

  const handleFileUpload = (fileType: keyof typeof uploadedFiles) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: "Please upload only JPG, PNG, WebP, GIF, or PDF files.",
          variant: "destructive",
        });
        event.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files smaller than 5MB.",
          variant: "destructive",
        });
        event.target.value = ''; // Clear the input
        return;
      }
      
      setUploadedFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      console.log(`${fileType} uploaded:`, file.name);
      
      toast({
        title: "File uploaded",
        description: `${file.name} has been selected successfully.`,
      });
    }
  };

  // Show phone verification step
  if (currentStep === 'phone') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Verify Your Phone</h2>
          <p className="text-gray-600 mt-2">We need to verify your phone number before creating your business account</p>
        </div>

        <TwilioPhoneVerification
          phoneNumber={watch("phone")}
          onVerificationComplete={handlePhoneVerificationComplete}
          onPhoneChange={(phone) => setValue("phone", phone)}
        />

        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep('form')}
          >
            Back to Form
          </Button>
        </div>
      </div>
    );
  }

  // Show completion step
  if (currentStep === 'complete') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-green-600">Registration Complete!</h2>
          <p className="text-gray-600 mt-2">Your business account has been created and is pending verification.</p>
          <p className="text-sm text-gray-500 mt-1">You'll be redirected shortly...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create Business Account</h2>
        <p className="text-gray-600 mt-2">Join Pinnity as a vendor to offer deals</p>
        {skipPhoneVerification && (
          <div className="inline-flex items-center gap-2 mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Phone verification temporarily disabled
          </div>
        )}
        {!skipPhoneVerification && isPhoneVerified && (
          <div className="inline-flex items-center gap-2 mt-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Phone verified
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            {...register("businessName")}
            placeholder="Enter your business name"
          />
          {errors.businessName && (
            <p className="text-sm text-red-500">{errors.businessName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Business Category</Label>
          <Select onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select your business category" />
            </SelectTrigger>
            <SelectContent>
              {businessCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-red-500">{errors.category.message}</p>
          )}
        </div>

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
            placeholder="Enter your business address"
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
              placeholder="Enter your city"
            />
            {errors.city && (
              <p className="text-sm text-red-500">{errors.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Input
              id="province"
              {...register("province")}
              placeholder="Enter your province"
            />
            {errors.province && (
              <p className="text-sm text-red-500">{errors.province.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input
            id="postalCode"
            {...register("postalCode")}
            placeholder="Enter your postal code"
          />
          {errors.postalCode && (
            <p className="text-sm text-red-500">{errors.postalCode.message}</p>
          )}
        </div>

        {/* Document Upload Section */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold">Required Documents</h3>
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <p className="font-medium mb-1">Accepted file types:</p>
            <p>• Images: JPG, JPEG, PNG, WebP, GIF</p>
            <p>• Documents: PDF only</p>
            <p>• Maximum file size: 5MB per file</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="governmentId">Government ID</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="governmentId"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={handleFileUpload('governmentId')}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('governmentId')?.click()}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Government ID</span>
              </Button>
              {uploadedFiles.governmentId && (
                <span className="text-sm text-green-600">
                  ✓ {uploadedFiles.governmentId.name}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofOfAddress">Proof of Address</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="proofOfAddress"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={handleFileUpload('proofOfAddress')}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('proofOfAddress')?.click()}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Proof of Address</span>
              </Button>
              {uploadedFiles.proofOfAddress && (
                <span className="text-sm text-green-600">
                  ✓ {uploadedFiles.proofOfAddress.name}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofOfBusiness">Proof of Business Ownership</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="proofOfBusiness"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={handleFileUpload('proofOfBusiness')}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('proofOfBusiness')?.click()}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Business License</span>
              </Button>
              {uploadedFiles.proofOfBusiness && (
                <span className="text-sm text-green-600">
                  ✓ {uploadedFiles.proofOfBusiness.name}
                </span>
              )}
            </div>
          </div>
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
          {isSubmitting ? "Creating Business Account..." : isPhoneVerified ? "Create Business Account" : "Continue"}
        </Button>
      </form>
    </div>
  );
}

export default BusinessSignupForm;