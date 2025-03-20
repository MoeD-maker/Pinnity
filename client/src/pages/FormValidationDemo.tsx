import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ValidatedFormField } from "@/components/ui/validated-form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { CheckCircle2, Save, Loader2 } from "lucide-react";
import { ValidatedFieldGroup } from "@/components/onboarding/ValidatedFieldGroup";
import { ValidatedCheckboxGroup } from "@/components/onboarding/ValidatedCheckboxGroup";
import { BusinessHoursField } from "@/components/onboarding/BusinessHoursField";
import { useToast } from "@/hooks/use-toast";

// Validation schema for the form
const formSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
  
  confirmPassword: z.string().min(1, "Please confirm your password"),
  
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(30, "Display name cannot exceed 30 characters"),
  
  bio: z
    .string()
    .max(200, "Bio cannot exceed 200 characters")
    .optional(),
  
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
  
  categories: z.object({
    food: z.boolean().optional(),
    shopping: z.boolean().optional(),
    entertainment: z.boolean().optional(),
    travel: z.boolean().optional(),
  }).refine((data) => Object.values(data).some(val => val === true), {
    message: "Select at least one category",
    path: ["categories"],
  }),
  
  businessHours: z.object({
    monday: z.object({
      open: z.string().nullable().optional(),
      close: z.string().nullable().optional(),
      closed: z.boolean(),
    }),
    tuesday: z.object({
      open: z.string().nullable().optional(),
      close: z.string().nullable().optional(),
      closed: z.boolean(),
    }),
    // Add other days as needed
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Form data type from the schema
type FormValues = z.infer<typeof formSchema>;

// Default values for the form
const defaultValues: Partial<FormValues> = {
  email: "",
  password: "",
  confirmPassword: "",
  displayName: "",
  bio: "",
  acceptTerms: false,
  categories: {
    food: false,
    shopping: false,
    entertainment: false,
    travel: false,
  },
  businessHours: {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
  },
};

export default function FormValidationDemo() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  
  // Create form with zod validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });
  
  // Watch some form values to demonstrate real-time validation
  const password = form.watch("password");
  const acceptTerms = form.watch("acceptTerms");
  
  // Handle form submission
  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      setShowSuccess(true);
      
      // Log form data (in a real app, you'd send this to your API)
      console.log("Form submitted successfully:", data);
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
        variant: "default",
      });
      
      // Hide success message after a delay
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error("Error submitting form:", error);
      
      toast({
        title: "Submission failed",
        description: "There was a problem submitting your form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Category options for the checkbox group
  const categoryOptions = [
    { id: "food", label: "Food & Dining" },
    { id: "shopping", label: "Shopping" },
    { id: "entertainment", label: "Entertainment" },
    { id: "travel", label: "Travel" },
  ];
  
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Form Validation Demo
      </h1>
      
      {/* Success message */}
      {showSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Form Submitted Successfully</AlertTitle>
          <AlertDescription className="text-green-700">
            Your information has been processed. Thank you for your submission!
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic information field group */}
          <ValidatedFieldGroup
            title="Account Information"
            description="Please provide your basic account details"
            fieldNames={["email", "password", "confirmPassword"]}
          >
            <ValidatedFormField
              form={form}
              name="email"
              label="Email"
              placeholder="Enter your email"
              type="email"
              required
            />
            
            <ValidatedFormField
              form={form}
              name="password"
              label="Password"
              type="password"
              required
            />
            
            <ValidatedFormField
              form={form}
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              required
              showPasswordRequirements={false}
            />
          </ValidatedFieldGroup>
          
          {/* Profile information field group */}
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Tell us a bit about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ValidatedFormField
                form={form}
                name="displayName"
                label="Display Name"
                placeholder="How you'll appear to others"
                required
              />
              
              <ValidatedFormField
                form={form}
                name="bio"
                label="Bio"
                placeholder="A short description about yourself"
                type="textarea"
                description="Maximum 200 characters"
              />
            </CardContent>
          </Card>
          
          {/* Interest categories field group */}
          <ValidatedFieldGroup
            title="Interests"
            description="Select categories you're interested in"
            fieldNames={["categories"]}
          >
            <ValidatedCheckboxGroup
              name="categories"
              options={categoryOptions}
              required
              columns={2}
            />
          </ValidatedFieldGroup>
          
          {/* Business hours field group */}
          <ValidatedFieldGroup
            title="Business Hours"
            description="Set your regular business hours"
            fieldNames={["businessHours"]}
          >
            <BusinessHoursField 
              name="businessHours"
              required
            />
          </ValidatedFieldGroup>
          
          {/* Terms acceptance */}
          <ValidatedFormField
            form={form}
            name="acceptTerms"
            type="checkbox"
            checkboxLabel="I accept the terms and conditions"
            required
          />
          
          {/* Form actions */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting}
            >
              Reset Form
            </Button>
            
            <Button
              type="submit"
              disabled={isSubmitting || !acceptTerms || !form.formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Submit Form
                </>
              )}
            </Button>
          </div>
          
          {/* Display validation errors summary */}
          {Object.keys(form.formState.errors).length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Form contains errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field} className="text-sm">
                      {error?.message as React.ReactNode}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </form>
      </Form>
    </div>
  );
}