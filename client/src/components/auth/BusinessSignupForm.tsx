import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api";
import { Eye, EyeOff, Upload } from "lucide-react";

// Schema with proper terms validation
const businessSignupSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  category: z.string().min(1, "Business category is required"),
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

type BusinessSignupData = z.infer<typeof businessSignupSchema>;

const businessCategories = [
  "Restaurant",
  "Retail", 
  "Services",
  "Hospitality",
  "Entertainment",
  "Other"
];

function BusinessSignupForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({
    governmentId: null as File | null,
    proofOfAddress: null as File | null,
    proofOfBusiness: null as File | null
  });
  const { toast } = useToast();

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
      termsAccepted: false as any // Will be overridden by setValue
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
    
    setIsSubmitting(true);
    
    try {
      // Use direct API call to registration endpoint
      const response = await apiPost('/api/v1/auth/register/business', {
        businessName: data.businessName,
        category: data.category,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        phone: data.phone,
        address: data.address,
        termsAccepted: true // Ensure this is explicitly true
      });

      toast({
        title: "Business registration successful!",
        description: "Your business account has been created and is pending verification.",
      });

      // Clear form to prevent state issues
      form.reset();
      
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

  const handleCategoryChange = (value: string) => {
    setValue("category", value);
  };

  const handleFileUpload = (fileType: keyof typeof uploadedFiles) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      console.log(`${fileType} uploaded:`, file.name);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create Business Account</h2>
        <p className="text-gray-600 mt-2">Join Pinnity as a vendor to offer deals</p>
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

        {/* Document Upload Section */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-semibold">Required Documents</h3>
          
          <div className="space-y-2">
            <Label htmlFor="governmentId">Government ID</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="governmentId"
                type="file"
                accept="image/*,.pdf"
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
                accept="image/*,.pdf"
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
                accept="image/*,.pdf"
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
          {isSubmitting ? "Creating Business Account..." : "Create Business Account"}
        </Button>
      </form>
    </div>
  );
}

export default BusinessSignupForm;