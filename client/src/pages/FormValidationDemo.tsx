import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, CheckIcon, XIcon } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { passwordSchema } from '@/schemas/authValidation';

// Basic form validation schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  age: z.coerce.number().min(18, {
    message: "You must be at least 18 years old.",
  }).max(120, {
    message: "Age must be less than 120.",
  }),
  website: z.string().url({
    message: "Please enter a valid URL.",
  }).optional().or(z.literal('')),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions.",
  }),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Advanced form validation schema
const addressSchema = z.object({
  street: z.string().min(3, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format")
});

const phoneSchema = z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Phone must be in format (123) 456-7890");

const advancedFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: phoneSchema,
  address: addressSchema,
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  skills: z.array(z.string()).min(1, "Select at least one skill"),
  experience: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Please select your experience level" })
  }),
  portfolioUrl: z.string().url({ message: "Please enter a valid URL" }).optional().or(z.literal('')),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

// Real-time validation component that displays validation status
const ValidationStatus = ({ isValid, message }: { isValid: boolean; message: string }) => {
  return (
    <div className="flex items-center gap-2 text-sm mt-1">
      {isValid ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <XIcon className="h-4 w-4 text-red-500" />
      )}
      <span className={isValid ? "text-green-700" : "text-red-700"}>
        {message}
      </span>
    </div>
  );
};

// Component to demonstrate real-time field validation
const RealTimeValidation = () => {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  
  // Email validation
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const isValidEmail = emailRegex.test(value);
  const hasAtSymbol = value.includes('@');
  const hasDomain = value.includes('.') && value.indexOf('.') > value.indexOf('@');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Field Validation</CardTitle>
        <CardDescription>
          See validation feedback as you type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-validation">Email Address</Label>
            <Input
              id="email-validation"
              placeholder="Enter your email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setTouched(true)}
              className={touched ? (isValidEmail ? "border-green-500" : "border-red-500") : ""}
            />
            
            {touched && (
              <div className="mt-2 space-y-1">
                <ValidationStatus 
                  isValid={hasAtSymbol}
                  message="Contains @ symbol"
                />
                <ValidationStatus 
                  isValid={hasDomain}
                  message="Has valid domain (contains .)"
                />
                <ValidationStatus 
                  isValid={isValidEmail}
                  message="Valid email format"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Basic form demonstration
const BasicFormDemo = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      age: undefined,
      website: "",
      agreeTerms: false,
      password: "",
      confirmPassword: "",
    },
  });
  
  const [formData, setFormData] = useState<z.infer<typeof formSchema> | null>(null);
  
  function onSubmit(values: z.infer<typeof formSchema>) {
    setFormData(values);
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Form Validation</CardTitle>
          <CardDescription>
            Example of a form with Zod schema validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter your age" 
                        {...field} 
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave blank if you don't have a website
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm your password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agreeTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the terms and conditions
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full">Submit</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {formData && (
        <Card>
          <CardHeader>
            <CardTitle>Form Submission Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded-md overflow-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Advanced form demonstration with more complex validations
const AdvancedFormDemo = () => {
  const form = useForm<z.infer<typeof advancedFormSchema>>({
    resolver: zodResolver(advancedFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: ""
      },
      bio: "",
      skills: [],
      experience: undefined,
      portfolioUrl: "",
      agreeTerms: false
    }
  });
  
  const [formData, setFormData] = useState<z.infer<typeof advancedFormSchema> | null>(null);
  
  const skillOptions = [
    { id: "react", label: "React" },
    { id: "vue", label: "Vue" },
    { id: "angular", label: "Angular" },
    { id: "nodejs", label: "Node.js" },
    { id: "python", label: "Python" }
  ];
  
  function onSubmit(values: z.infer<typeof advancedFormSchema>) {
    setFormData(values);
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Advanced Form Validation</CardTitle>
          <CardDescription>
            Complex form with nested objects, arrays, and conditional validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormDescription>Format: (123) 456-7890</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Address Information</h3>
                
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address.zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about yourself" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum 500 characters
                    </FormDescription>
                    <div className="text-xs text-muted-foreground mt-1">
                      {field.value?.length || 0}/500 characters
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="skills"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Skills</FormLabel>
                      <FormDescription>
                        Select all the skills that apply
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {skillOptions.map((skill) => (
                        <FormField
                          key={skill.id}
                          control={form.control}
                          name="skills"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={skill.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(skill.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, skill.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== skill.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {skill.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Experience Level</FormLabel>
                    <FormControl>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="experience-beginner"
                            value="beginner"
                            checked={field.value === "beginner"}
                            onChange={() => field.onChange("beginner")}
                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor="experience-beginner">Beginner</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="experience-intermediate"
                            value="intermediate"
                            checked={field.value === "intermediate"}
                            onChange={() => field.onChange("intermediate")}
                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor="experience-intermediate">Intermediate</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="experience-advanced"
                            value="advanced"
                            checked={field.value === "advanced"}
                            onChange={() => field.onChange("advanced")}
                            className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <Label htmlFor="experience-advanced">Advanced</Label>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="portfolioUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://myportfolio.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="agreeTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the terms of service and privacy policy
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full">Submit Advanced Form</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {formData && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Form Submission Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-100 p-4 rounded-md overflow-auto">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Password validation visualizer
const PasswordValidationDemo = () => {
  const [password, setPassword] = useState("");
  
  // Password validation rules
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  // Calculate password strength
  const passwordStrength = 
    (minLength ? 1 : 0) + 
    (hasUppercase ? 1 : 0) + 
    (hasLowercase ? 1 : 0) + 
    (hasNumber ? 1 : 0) + 
    (hasSpecial ? 1 : 0);
  
  let strengthLabel = "Weak";
  let strengthColor = "bg-red-500";
  
  if (passwordStrength >= 5) {
    strengthLabel = "Strong";
    strengthColor = "bg-green-500";
  } else if (passwordStrength >= 3) {
    strengthLabel = "Moderate";
    strengthColor = "bg-yellow-500";
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Validation</CardTitle>
        <CardDescription>
          Real-time password strength indicator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password-demo">Password</Label>
          <Input
            id="password-demo"
            type="password"
            placeholder="Enter a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Password Strength:</span>
            <Badge variant={passwordStrength >= 3 ? passwordStrength >= 5 ? "default" : "outline" : "destructive"}>
              {strengthLabel}
            </Badge>
          </div>
          
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${strengthColor}`}
              style={{ width: `${(passwordStrength / 5) * 100}%` }}
            ></div>
          </div>
          
          <div className="space-y-1 mt-3">
            <ValidationStatus 
              isValid={minLength}
              message="At least 8 characters"
            />
            <ValidationStatus 
              isValid={hasUppercase}
              message="Contains uppercase letter"
            />
            <ValidationStatus 
              isValid={hasLowercase}
              message="Contains lowercase letter"
            />
            <ValidationStatus 
              isValid={hasNumber}
              message="Contains number"
            />
            <ValidationStatus 
              isValid={hasSpecial}
              message="Contains special character"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main form validation demo page
const FormValidationDemo = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Form Validation System</h1>
        <p className="text-muted-foreground">
          A comprehensive demonstration of form validation techniques using Zod, React Hook Form, and real-time feedback
        </p>
      </div>
      
      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Validation Demo</AlertTitle>
        <AlertDescription>
          This page demonstrates the various form validation techniques implemented in the Pinnity app.
          It showcases real-time validation, complex form structures, and password strength indicators.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="basic">
        <TabsList className="grid grid-cols-4 w-full max-w-xl mx-auto mb-8">
          <TabsTrigger value="basic">Basic Form</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Form</TabsTrigger>
          <TabsTrigger value="realtime">Real-time Validation</TabsTrigger>
          <TabsTrigger value="password">Password Validation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="mt-6">
          <BasicFormDemo />
        </TabsContent>
        
        <TabsContent value="advanced" className="mt-6">
          <AdvancedFormDemo />
        </TabsContent>
        
        <TabsContent value="realtime" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RealTimeValidation />
            <PasswordValidationDemo />
          </div>
        </TabsContent>
        
        <TabsContent value="password" className="mt-6">
          <div className="max-w-md mx-auto">
            <PasswordValidationDemo />
          </div>
        </TabsContent>
      </Tabs>
      
      <Separator className="my-8" />
      
      <div className="prose max-w-none">
        <h2>Implementation Notes</h2>
        <p>
          The form validation system used throughout the Pinnity application uses a combination of:
        </p>
        <ul>
          <li><strong>Zod:</strong> For schema-based validation with strong TypeScript integration</li>
          <li><strong>React Hook Form:</strong> For form state management and validation triggering</li>
          <li><strong>Custom Validation Components:</strong> For specialized validation needs</li>
          <li><strong>Real-time Feedback:</strong> To provide immediate validation feedback</li>
        </ul>
        
        <h3>Key Features</h3>
        <p>
          The validation system provides:
        </p>
        <ul>
          <li>Strongly typed forms with TypeScript inference</li>
          <li>Immediate validation feedback during typing</li>
          <li>Complex nested object validation</li>
          <li>Array and collection validation</li>
          <li>Cross-field validation (e.g., password confirmation)</li>
          <li>Custom validation rules and error messages</li>
          <li>Accessibility-friendly error reporting</li>
        </ul>
      </div>
    </div>
  );
};

export default FormValidationDemo;