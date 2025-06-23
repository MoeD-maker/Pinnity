import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, type LoginFormValues } from "@/lib/validation";
import FormInput from "./FormInput";
import PasswordInput from "./PasswordInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginForm() {
  const { login, isLoading: authLoading, error: authError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Show auth error as a toast when it changes
  useEffect(() => {
    if (authError) {
      toast({
        title: "Login failed",
        description: typeof authError === 'string' ? authError : "Please check your credentials and try again",
        variant: "destructive",
      });
    }
  }, [authError, toast]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      console.log('Login form submission with:', { email: data.email, rememberMe: data.rememberMe });
      
      // Attempt to login
      await login(data.email, data.password, data.rememberMe);
      
      console.log('Login successful, not showing success toast');
    } catch (error) {
      console.error("Login form submission error:", error);
      
      // Show a more specific error message if possible
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error instanceof Error) {
        // Handle specific error messages
        if (error.message.includes('CSRF')) {
          errorMessage = "Security validation failed. Please refresh the page and try again.";
        } else if (error.message.includes('401') || error.message.includes('Invalid')) {
          errorMessage = "Invalid email or password. Please check your credentials.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Error is already handled by the auth context and shown via the useEffect above
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormInput
        label="Email address"
        type="email"
        {...register("email")}
        error={errors.email?.message}
      />

      <PasswordInput
        label="Password"
        {...register("password")}
        error={errors.password?.message}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="remember-me" {...register("rememberMe")} />
          <Label 
            htmlFor="remember-me" 
            className="text-sm text-gray-500 font-normal cursor-pointer"
          >
            Remember me
          </Label>
        </div>
        
        <a href="/forgot-password" className="text-sm text-[#00796B] hover:text-[#004D40] font-medium">
          Forgot password?
        </a>
      </div>

      <Button 
        type="submit" 
        className="w-full bg-[#00796B] hover:bg-[#004D40]"
        disabled={isSubmitting || authLoading}
      >
        {(isSubmitting || authLoading) ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Signing in...
          </>
        ) : (
          "Log In"
        )}
      </Button>


    </form>
  );
}
