import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ValidatedField, ValidatedFieldGroup, ValidatedCheckboxGroup } from '@/components/ui/validated-form-field';
import { PasswordInput, standardPasswordRequirements } from '@/components/ui/password-input';
import { FormErrorMessage } from '@/components/ui/form-error-message';
import { NetworkRetryButton } from '@/components/ui/network-retry-button';
import { ErrorBoundary, FormErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, ChevronRight, Lock, User, Mail, Phone, Check, AlertCircle } from 'lucide-react';

// Import our validation schemas (create this if it doesn't exist)
// import { loginSchema, signupSchema } from '@/schemas/authValidation';

// Define the validation schemas here for the demo
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" })
});

const signupSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters" }),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, { message: "Please enter a valid phone number" }).optional(),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
  confirmPassword: z.string(),
  agreeTerms: z.boolean().refine(val => val === true, { message: "You must agree to the terms and conditions" }),
  notifications: z.array(z.string()).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

/**
 * Demo page showcasing the form validation components and error handling
 */
export default function FormValidationDemo() {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Login form setup
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  // Signup form setup
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
      notifications: []
    }
  });

  // Handle login form submission
  const handleLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setFormErrors([]);

    try {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (data.email === "error@example.com") {
        throw new Error("Invalid email or password");
      }
      
      // Success!
      toast({
        title: "Login Successful",
        description: `Welcome back! You've successfully logged in as ${data.email}`,
      });
      
      // Reset the form on success
      loginForm.reset();
    } catch (error) {
      // Handle errors
      const message = error instanceof Error ? error.message : "Something went wrong";
      setFormErrors([message]);
      
      toast({
        title: "Login Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle signup form submission
  const handleSignupSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    setFormErrors([]);

    try {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (data.email === "taken@example.com") {
        throw new Error("This email is already registered");
      }
      
      // Success!
      toast({
        title: "Account Created",
        description: `Welcome ${data.firstName}! Your account has been created successfully.`,
      });
      
      // Reset the form on success
      signupForm.reset();
    } catch (error) {
      // Handle errors
      const message = error instanceof Error ? error.message : "Something went wrong";
      setFormErrors([message]);
      
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate a network retry
  const handleRetry = async () => {
    // Simulate network delay and success
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return success after delay
    return true;
  };

  // Function to simulate an error
  const handleSimulateError = () => {
    // Create a test error and throw it
    throw new Error("This is a simulated error to demonstrate the error boundary.");
  };

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Form Validation Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the form validation components, error handling, and UI elements
          that have been implemented in our application.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Authentication Forms</h2>
            <Card className="shadow-md">
              <CardHeader>
                <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <TabsContent value="login" className="mt-0">
                  <FormErrorBoundary>
                    <FormProvider {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                        <ValidatedField
                          name="email"
                          label="Email"
                          type="email"
                          placeholder="Enter your email address"
                          autoComplete="email"
                          required
                        />
                        
                        <div className="space-y-2">
                          <label htmlFor="password" className="text-sm font-medium">
                            Password <span className="text-destructive">*</span>
                          </label>
                          <PasswordInput
                            id="password"
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            showRequirements={false}
                            error={loginForm.formState.errors.password?.message}
                            {...loginForm.register("password")}
                          />
                        </div>
                        
                        {formErrors.length > 0 && (
                          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            {formErrors.map((error, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Logging in...
                              </>
                            ) : (
                              <>
                                <Lock className="mr-2 h-4 w-4" />
                                Login
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </FormProvider>
                  </FormErrorBoundary>
                </TabsContent>
                
                <TabsContent value="signup" className="mt-0">
                  <FormErrorBoundary>
                    <FormProvider {...signupForm}>
                      <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <ValidatedField
                            name="firstName"
                            label="First Name"
                            type="text"
                            placeholder="Enter your first name"
                            autoComplete="given-name"
                            required
                          />
                          
                          <ValidatedField
                            name="lastName"
                            label="Last Name"
                            type="text"
                            placeholder="Enter your last name"
                            autoComplete="family-name"
                            required
                          />
                        </div>
                        
                        <ValidatedField
                          name="email"
                          label="Email"
                          type="email"
                          placeholder="Enter your email address"
                          autoComplete="email"
                          required
                          hint="We'll never share your email with anyone else"
                        />
                        
                        <ValidatedField
                          name="phone"
                          label="Phone Number"
                          type="text"
                          placeholder="Enter your phone number"
                          autoComplete="tel"
                          hint="Optional - for account recovery purposes"
                        />
                        
                        <div className="space-y-2">
                          <label htmlFor="signup-password" className="text-sm font-medium">
                            Password <span className="text-destructive">*</span>
                          </label>
                          <PasswordInput
                            id="signup-password"
                            placeholder="Create a secure password"
                            autoComplete="new-password"
                            error={signupForm.formState.errors.password?.message}
                            {...signupForm.register("password")}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="confirmPassword" className="text-sm font-medium">
                            Confirm Password <span className="text-destructive">*</span>
                          </label>
                          <PasswordInput
                            id="confirmPassword"
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            error={signupForm.formState.errors.confirmPassword?.message}
                            showRequirements={false}
                            {...signupForm.register("confirmPassword")}
                          />
                        </div>
                        
                        <ValidatedCheckboxGroup
                          name="notifications"
                          label="Notification Preferences"
                          description="Choose how you'd like to be notified"
                          options={[
                            { id: "email", label: "Email notifications" },
                            { id: "push", label: "Push notifications" },
                            { id: "sms", label: "SMS notifications" }
                          ]}
                        />
                        
                        <ValidatedField
                          name="agreeTerms"
                          label="Terms and Conditions"
                          type="checkbox"
                          checkboxLabel="I agree to the Terms of Service and Privacy Policy"
                          required
                        />
                        
                        {formErrors.length > 0 && (
                          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            {formErrors.map((error, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Creating Account...
                              </>
                            ) : (
                              <>
                                <User className="mr-2 h-4 w-4" />
                                Create Account
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </FormProvider>
                  </FormErrorBoundary>
                </TabsContent>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Error Handling Components</h2>
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Network Retry Button</CardTitle>
                  <CardDescription>
                    Handles retry logic with exponential backoff and visual feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <NetworkRetryButton
                      onRetry={handleRetry}
                      maxRetries={3}
                    />
                    
                    <NetworkRetryButton
                      onRetry={handleRetry}
                      maxRetries={3}
                      variant="outline"
                    >
                      Custom Retry Text
                    </NetworkRetryButton>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Error Boundary</CardTitle>
                  <CardDescription>
                    Catches JavaScript errors and displays a fallback UI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <div className="flex justify-between items-center">
                      <p>Click the button to trigger an error</p>
                      <Button 
                        variant="destructive"
                        onClick={handleSimulateError}
                      >
                        Simulate Error
                      </Button>
                    </div>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Form Field Components</h2>
            <Card>
              <CardHeader>
                <CardTitle>Validated Form Fields</CardTitle>
                <CardDescription>
                  Form fields with built-in validation and real-time feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ValidatedFieldGroup
                  label="Contact Information"
                  description="Enter your contact details"
                  hint="All fields with * are required"
                  required
                >
                  <div className="grid grid-cols-2 gap-4">
                    <ValidatedField
                      name="demo-firstName"
                      label="First Name"
                      type="text"
                      placeholder="Jane"
                      required
                      defaultValue=""
                    />
                    
                    <ValidatedField
                      name="demo-lastName"
                      label="Last Name"
                      type="text"
                      placeholder="Doe"
                      required
                      defaultValue=""
                    />
                  </div>
                  
                  <ValidatedField
                    name="demo-email"
                    label="Email"
                    type="email"
                    placeholder="jane.doe@example.com"
                    required
                    defaultValue=""
                    hint="We'll use this for account recovery"
                  />
                </ValidatedFieldGroup>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Password Input</h3>
                  <p className="text-sm text-muted-foreground">
                    A secure password input with visibility toggle, requirement checking, and strength meter
                  </p>
                  
                  <PasswordInput
                    placeholder="Enter a password"
                    requirements={standardPasswordRequirements}
                    showRequirements={true}
                    showStrengthMeter={true}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Other Field Types</h3>
                  
                  <ValidatedField
                    name="demo-date"
                    label="Date"
                    type="date"
                    defaultValue=""
                  />
                  
                  <ValidatedField
                    name="demo-textarea"
                    label="Bio"
                    type="textarea"
                    placeholder="Tell us about yourself"
                    defaultValue=""
                  />
                  
                  <ValidatedField
                    name="demo-select"
                    label="Country"
                    type="select"
                    options={[
                      { value: "us", label: "United States" },
                      { value: "ca", label: "Canada" },
                      { value: "mx", label: "Mexico" },
                      { value: "uk", label: "United Kingdom" },
                    ]}
                    emptyOptionLabel="Select a country"
                    defaultValue=""
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}