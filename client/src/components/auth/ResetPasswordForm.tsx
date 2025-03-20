import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { PasswordInput } from "@/components/ui/password-input";

// Schema for password reset verification
const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: "Token is required" }),
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character" }),
    confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [, setLocation] = useLocation();

  // Get token from URL query parameter
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  // Initialize the form
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Form submission handler
  async function onSubmit(values: ResetPasswordFormValues) {
    setIsSubmitting(true);
    try {
      // Call the password reset verification API
      const response = await apiRequest("/api/v1/auth/password-reset/verify", {
        method: "POST",
        data: { 
          token: values.token,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword
        },
      });

      setIsSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: response.message || "Your password has been reset successfully. You can now log in with your new password.",
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    } catch (error) {
      console.error("Password reset verification error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was a problem resetting your password. The token may be invalid or expired.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password to complete the password reset process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSuccess ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Hidden token field */}
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <Input type="hidden" {...field} />
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Enter your new password"
                          autoComplete="new-password"
                          showRequirements={true}
                          {...field}
                        />
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
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Confirm your new password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-4 text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 className="text-lg font-medium mb-2">Password Reset Successful</h3>
                <p className="text-gray-600 mb-4">
                  Your password has been reset successfully. You will be redirected to the login page in a few seconds.
                </p>
              </motion.div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}