import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

// Simple form schema with validation
const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  termsAccepted: z.boolean()
    .refine((val) => val === true, {
      message: "You must accept the Terms of Service"
    }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SimpleSignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      termsAccepted: false,
    },
  });

  const onSubmit = (data: SignupFormValues) => {
    console.log("FORM SUBMITTED!", data);
    console.log("Terms accepted:", data.termsAccepted, typeof data.termsAccepted);
    
    toast({
      title: "Success!",
      description: "Form submitted with Terms accepted: " + data.termsAccepted,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input 
            id="firstName" 
            {...register("firstName")} 
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input 
            id="lastName" 
            {...register("lastName")} 
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input 
          id="email" 
          type="email" 
          {...register("email")} 
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password" 
          type="password" 
          {...register("password")} 
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="terms"
            checked={watch("termsAccepted")}
            onCheckedChange={(checked) =>
              setValue("termsAccepted", !!checked, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          <Label htmlFor="terms" className="text-sm font-medium leading-none">
            I agree to the Terms of Service
          </Label>
        </div>

        <input type="hidden" {...register("termsAccepted")} />

        {errors.termsAccepted && (
          <p className="text-xs text-red-500 mt-1">
            {errors.termsAccepted.message || "You must accept the Terms and Conditions"}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Create Account
      </button>
    </form>
  );
}