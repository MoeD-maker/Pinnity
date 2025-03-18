import { z } from "zod";

// Login form schema
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Base user schema for both individual and business
const baseUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(1, "Address is required"),
  termsAccepted: z.boolean()
    .refine(val => val === true, {
      message: "You must accept the terms and conditions"
    }),
});

// Add confirmPassword validation
export const individualSignupSchema = baseUserSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export type IndividualSignupFormValues = z.infer<typeof individualSignupSchema>;

// Business signup schema
export const businessSignupSchema = baseUserSchema
  .extend({
    businessName: z.string().min(1, "Business name is required"),
    businessCategory: z.string().min(1, "Please select a business category"),
    governmentId: z
      .instanceof(File)
      .refine((file) => file.size > 0, "Government ID is required"),
    proofOfAddress: z
      .instanceof(File)
      .refine((file) => file.size > 0, "Proof of address is required"),
    proofOfBusiness: z
      .instanceof(File)
      .refine((file) => file.size > 0, "Proof of business ownership is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type BusinessSignupFormValues = z.infer<typeof businessSignupSchema>;

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
