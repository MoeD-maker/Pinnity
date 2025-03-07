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
      await login(data.email, data.password, data.rememberMe);
      
      toast({
        title: "Success",
        description: "You have successfully logged in",
      });
    } catch (error) {
      console.error("Login error:", error);
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
        
        <a href="#" className="text-sm text-[#00796B] hover:text-[#004D40] font-medium">
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

      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-gray-200 absolute w-full"></div>
        <span className="bg-white px-4 relative text-sm text-gray-400">or continue with</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button 
          type="button" 
          variant="outline" 
          className="flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2 text-[#4267B2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12z"/>
          </svg>
          Facebook
        </Button>
      </div>
    </form>
  );
}
