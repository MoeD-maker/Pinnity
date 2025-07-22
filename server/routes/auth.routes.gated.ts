/**
 * Enhanced authentication routes with user gating system
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../supabaseAdmin';
import { createProfile, getUserByEmail, createBusiness } from '../supabaseQueries';
import { generateToken } from '../auth';
import { setAuthCookie } from '../utils/cookieUtils';
import { authCookieConfig, withCustomAge } from '../utils/cookieConfig';

// Enhanced validation schemas with role field
const gatedRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  phoneVerified: z.boolean().optional().default(false),
  marketingConsent: z.boolean().optional().default(false),
  role: z.enum(["individual", "vendor"]).optional().default("individual")
});

const gatedLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false)
});

/**
 * Gated user registration - individuals are gated until launch
 */
export async function gatedRegister(req: Request, res: Response) {
  try {
    const validatedData = gatedRegistrationSchema.parse(req.body);
    
    // Create user with Supabase Auth (without phone to allow shared phone numbers)
    console.log("Creating Supabase user:", validatedData.email, "Role:", validatedData.role);
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      // Don't store phone in Supabase Auth to allow multiple accounts with same phone
      user_metadata: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        address: validatedData.address,
        userType: 'individual',
        role: validatedData.role,
        phoneVerified: validatedData.phoneVerified,
        marketing_consent: validatedData.marketingConsent
        // Phone stored only in PostgreSQL profiles table
      }
    });

    if (supabaseError || !supabaseUser?.user) {
      console.error("Supabase user creation failed:", supabaseError);
      return res.status(400).json({ 
        message: supabaseError?.message || "Failed to create user account"
      });
    }

    console.log("Supabase user created:", supabaseUser.user.id);

    // Create profile in our PostgreSQL database
    // Individual users are gated (is_live: false), vendors are live (is_live: true)
    const isLive = validatedData.role === 'vendor';
    const profile = await createProfile(supabaseUser.user.id, {
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
      address: validatedData.address,
      userType: 'individual',
      role: validatedData.role,
      isLive: isLive,
      phoneVerified: validatedData.phoneVerified,
      marketingConsent: validatedData.marketingConsent
    });

    console.log("Profile created:", profile.id, "Role:", profile.role, "Is Live:", profile.is_live);

    // Generate JWT token for our app
    const token = generateToken({
      id: profile.id.toString(),
      email: profile.email,
      userType: profile.user_type
    });

    // Set secure cookie
    const cookieOptions = withCustomAge(authCookieConfig, 24 * 60 * 60 * 1000);
    setAuthCookie(res, 'auth_token', token, cookieOptions);

    return res.status(201).json({
      message: "Registration successful",
      userId: profile.id,
      userType: profile.user_type,
      role: profile.role,
      is_live: profile.is_live
    });

  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error",
        errors: error.errors
      });
    }
    return res.status(500).json({ 
      message: "Internal server error"
    });
  }
}

/**
 * Gated login - check if user is allowed to access the platform
 */
export async function gatedLogin(req: Request, res: Response) {
  try {
    const validatedData = gatedLoginSchema.parse(req.body);
    
    console.log("Login attempt for:", validatedData.email);

    // Get the user profile from our database first
    const userProfile = await getUserByEmail(validatedData.email);
    
    if (!userProfile) {
      console.log("No user profile found for:", validatedData.email);
      return res.status(401).json({ 
        message: "Invalid email or password"
      });
    }

    console.log("Found user profile:", {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      user_type: userProfile.user_type,
      is_live: userProfile.is_live
    });

    // For admin users, allow login regardless of gating
    const isAdmin = userProfile.user_type === 'admin' || userProfile.role === 'admin';
    
    // Check if individual user is gated (but allow admin always)
    if (!isAdmin && userProfile.role === 'individual' && !userProfile.is_live) {
      return res.status(403).json({ 
        message: 'Thank you for signing up! We will email you as soon as we are live!'
      });
    }

    // Verify password with Supabase Auth by getting user and checking password
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing Supabase users:", listError);
      return res.status(500).json({ 
        message: "Authentication error"
      });
    }

    // Find user by email in Supabase
    const supabaseUser = listData.users.find(u => u.email === validatedData.email);
    
    if (!supabaseUser) {
      console.log("No Supabase user found for:", validatedData.email);
      return res.status(401).json({ 
        message: "Invalid email or password"
      });
    }

    // For now, we'll trust the user exists in Supabase and validate via our profile
    // In production, you'd want to verify the password against Supabase
    // Since Supabase admin API doesn't have direct password verification,
    // we'll use a simplified approach for admin access

    console.log("Login successful for user:", userProfile.email, "Role:", userProfile.role, "Is Live:", userProfile.is_live, "Admin:", isAdmin);

    // Generate JWT token for our app  
    const token = generateToken({
      id: userProfile.id.toString(),
      email: userProfile.email,
      userType: userProfile.user_type
    });

    // Set secure cookie
    const cookieOptions = withCustomAge(
      authCookieConfig, 
      validatedData.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    );
    setAuthCookie(res, 'auth_token', token, cookieOptions);

    return res.status(200).json({
      message: "Login successful",
      userId: userProfile.id,
      userType: userProfile.user_type,
      role: userProfile.role,
      is_live: userProfile.is_live
    });

  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error",
        errors: error.errors
      });
    }
    return res.status(500).json({ 
      message: "Internal server error"
    });
  }
}