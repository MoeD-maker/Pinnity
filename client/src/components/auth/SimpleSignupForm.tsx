import { useState, FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useCsrfProtection } from "@/hooks/useCsrfProtection";
import { usePhoneVerification } from "@/hooks/use-phone-verification";
import { PhoneVerification } from "./PhoneVerification";

// Simple form type without zod validation
type SimpleSignupForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
};

export default function SimpleSignupForm() {
  const [formData, setFormData] = useState<SimpleSignupForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: ""
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [savedFormData, setSavedFormData] = useState<SimpleSignupForm | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { isLoading: csrfLoading, isReady: csrfReady, error: csrfError, fetchWithProtection } = useCsrfProtection();
  
  // Logging function
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
    console.log(`[${timestamp}] ${message}`);
  };
  
  // Phone verification
  const { 
    isVerifying, 
    phoneVerified, 
    verifiedPhoneNumber, 
    verificationCredential,
    handleVerificationComplete,
    resetVerification,
    sendVerificationCode
  } = usePhoneVerification({
    onSuccess: async (phoneNumber, verificationId) => {
      addLog(`Phone verified successfully: ${phoneNumber}`);
      
      if (!savedFormData) {
        toast({
          title: "Error",
          description: "Form data is missing, please try again",
          variant: "destructive",
        });
        setShowPhoneVerification(false);
        setIsLoading(false);
        return;
      }
      
      // Continue with the registration process after verification
      await completeRegistration({
        ...savedFormData,
        phone: phoneNumber
      }, verificationId, verificationCredential);
    },
    onError: (error) => {
      setIsLoading(false);
      addLog(`Phone verification failed: ${error?.message || "Unknown error"}`);
      toast({
        title: "Verification failed",
        description: error?.message || "There was a problem verifying your phone number",
        variant: "destructive",
      });
    }
  });
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear any error for this field
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermsAccepted(e.target.checked);
    addLog(`Terms accepted changed to: ${e.target.checked}`);
    
    // Clear error if checked
    if (e.target.checked && formErrors.terms) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.terms;
        return newErrors;
      });
    }
  };
  
  // Basic validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName) errors.firstName = "First name is required";
    if (!formData.lastName) errors.lastName = "Last name is required";
    if (!formData.email) errors.email = "Email is required";
    if (!formData.email.includes('@')) errors.email = "Please enter a valid email";
    if (!formData.password) errors.password = "Password is required";
    if (formData.password.length < 8) errors.password = "Password must be at least 8 characters";
    if (formData.password !== confirmPassword) errors.confirmPassword = "Passwords don't match";
    if (!formData.phone) errors.phone = "Phone number is required";
    if (!formData.address) errors.address = "Address is required";
    if (!termsAccepted) errors.terms = "You must accept the terms and conditions";
    
    setFormErrors(errors);
    addLog(`Validation result: ${Object.keys(errors).length === 0 ? "Valid" : "Invalid"}`);
    addLog(`Validation errors: ${JSON.stringify(errors)}`);
    
    return Object.keys(errors).length === 0;
  };
  
  // Complete registration after verification
  const completeRegistration = async (data: SimpleSignupForm, verificationId: string, credential: any) => {
    try {
      addLog("Completing registration with verified phone");
      
      // Include verification data
      const submitData = {
        ...data,
        phoneVerified: true,
        phoneVerificationId: verificationId,
        termsAccepted: true,
        firebaseVerification: {
          phoneNumber: data.phone,
          verificationId: verificationId,
          credential: credential
        }
      };
      
      // Submit to server
      const response = await fetchWithProtection(
        '/api/v1/auth/register/individual', 
        { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        }
      );
      
      if (!response.ok) {
        throw new Error('Registration failed: ' + (await response.text()));
      }
      
      const responseData = await response.json();
      
      toast({
        title: "Account created",
        description: "Your account has been created successfully",
      });
      
      // Hide verification modal
      setShowPhoneVerification(false);
      
      // Handle successful registration
      if (responseData.token) {
        localStorage.setItem('token', responseData.token);
        // Redirect to onboarding flow
        window.location.href = `/onboarding/individual/${responseData.userId}`;
      } else {
        // Redirect to login page
        window.location.href = "/auth";
      }
    } catch (error) {
      console.error("Registration error:", error);
      addLog(`Registration error: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please check your information and try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    addLog("Form submitted");
    addLog(`Form data: ${JSON.stringify(formData)}`);
    addLog(`Terms accepted: ${termsAccepted}`);
    
    // Validate form
    if (!validateForm()) {
      addLog("Validation failed");
      return;
    }
    
    setIsLoading(true);
    addLog("Starting phone verification process");
    
    // Store form data for later use
    setSavedFormData(formData);
    
    // Start the verification process
    try {
      // Initiate SMS verification
      addLog(`Sending verification code to phone: ${formData.phone}`);
      await sendVerificationCode(formData.phone);
      
      // Show verification dialog
      setShowPhoneVerification(true);
    } catch (error) {
      addLog(`Failed to send verification code: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "There was an error sending verification code to your phone",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John"
          />
          {formErrors.firstName && (
            <p className="text-xs text-red-500">{formErrors.firstName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Doe"
          />
          {formErrors.lastName && (
            <p className="text-xs text-red-500">{formErrors.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john.doe@example.com"
        />
        {formErrors.email && (
          <p className="text-xs text-red-500">{formErrors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="********"
        />
        {formErrors.password && (
          <p className="text-xs text-red-500">{formErrors.password}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="********"
        />
        {formErrors.confirmPassword && (
          <p className="text-xs text-red-500">{formErrors.confirmPassword}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+1 (555) 123-4567"
        />
        {formErrors.phone && (
          <p className="text-xs text-red-500">{formErrors.phone}</p>
        )}
      </div>
      
      {/* Phone verification dialog - shows after form submission */}
      {showPhoneVerification && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg">
            <PhoneVerification 
              onVerificationComplete={handleVerificationComplete}
              onCancel={() => {
                setShowPhoneVerification(false);
                setIsLoading(false);
                addLog("Phone verification canceled");
              }}
              initialPhoneNumber={formData.phone}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="123 Main St, Anytown, US"
        />
        {formErrors.address && (
          <p className="text-xs text-red-500">{formErrors.address}</p>
        )}
      </div>

      <div className="flex items-start space-x-3 border p-3 rounded-md bg-gray-50">
        <input
          type="checkbox"
          id="terms-checkbox"
          className="mt-1 h-4 w-4"
          checked={termsAccepted}
          onChange={handleCheckboxChange}
        />
        <div>
          <label 
            htmlFor="terms-checkbox" 
            className={`${formErrors.terms ? "text-red-500" : "text-gray-700"} text-sm cursor-pointer font-medium`}
          >
            I agree to the <a href="/terms" className="text-[#00796B] hover:text-[#004D40] underline">Terms of Service</a> and <a href="/privacy" className="text-[#00796B] hover:text-[#004D40] underline">Privacy Policy</a>
          </label>
          {formErrors.terms && (
            <p className="text-xs text-red-500 mt-1">{formErrors.terms}</p>
          )}
        </div>
      </div>
      
      {/* Debug/logging output */}
      <div className="text-xs bg-gray-100 p-3 rounded border border-gray-300 my-4">
        <h3 className="font-bold mb-2 text-sm">Debug Information:</h3>
        <div className="space-y-1">
          <div>Terms accepted: <span className="font-mono">{String(termsAccepted)}</span></div>
          <div>Is loading: <span className="font-mono">{String(isLoading)}</span></div>
          <div>Has errors: <span className="font-mono">{String(Object.keys(formErrors).length > 0)}</span></div>
          
          {Object.keys(formErrors).length > 0 && (
            <div>
              <div className="font-semibold text-red-500">Current form errors:</div>
              <ul className="list-disc pl-4 text-red-500">
                {Object.entries(formErrors).map(([field, error]) => (
                  <li key={field}>{field}: {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {logs.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold">Event logs:</div>
              <pre className="bg-black text-green-400 p-2 rounded text-[9px] mt-1 max-h-[100px] overflow-y-auto">
                {logs.join('\n')}
              </pre>
            </div>
          )}
        </div>
        
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            onClick={() => {
              setTermsAccepted(true);
              addLog("Terms manually set to true");
            }}
          >
            Force Accept Terms
          </button>
          
          <button
            type="button"
            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
            onClick={() => {
              setFormErrors({});
              addLog("Errors manually cleared");
            }}
          >
            Clear Errors
          </button>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#00796B] hover:bg-[#004D40]"
        disabled={isLoading || csrfLoading || !csrfReady || !!csrfError}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Creating Account...
          </>
        ) : csrfLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Securing Connection...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}