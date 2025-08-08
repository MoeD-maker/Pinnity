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
import { pool } from '../db';

// Enhanced validation schemas with role field and business data
const gatedRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  phoneVerified: z.boolean().optional().default(false),
  marketingConsent: z.boolean().optional().default(false),
  role: z.enum(["individual", "vendor"]).optional().default("individual"),
  // Business-specific fields (optional for individual users)
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional()
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
    
    // Create user with Supabase Auth - handle existing phone numbers
    console.log("Creating Supabase user:", validatedData.email, "Role:", validatedData.role);
    let supabaseUser;
    let supabaseError;
    
    // First try with phone number - auto-confirm email since we use phone verification
    const createUserResult = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      phone: validatedData.phone,
      email_confirm: true, // Auto-confirm email since we only require phone verification
      user_metadata: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        address: validatedData.address,
        userType: 'individual',
        role: validatedData.role,
        phoneVerified: validatedData.phoneVerified,
        marketing_consent: validatedData.marketingConsent
      }
    });
    
    supabaseUser = createUserResult.data;
    supabaseError = createUserResult.error;
    
    // If phone exists, try without phone number
    if (supabaseError?.code === 'phone_exists') {
      console.log("Phone exists, creating user without phone number...");
      const createUserResultNoPhone = await supabaseAdmin.auth.admin.createUser({
        email: validatedData.email,
        password: validatedData.password,
        email_confirm: true, // Auto-confirm email since we only require phone verification
        user_metadata: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          phone: validatedData.phone,
          address: validatedData.address,
          userType: 'individual',
          role: validatedData.role,
          phoneVerified: validatedData.phoneVerified,
          marketing_consent: validatedData.marketingConsent
        }
      });
      
      supabaseUser = createUserResultNoPhone.data;
      supabaseError = createUserResultNoPhone.error;
    }

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

    // If this is a vendor registration, create a business record
    let businessId = null;
    if (validatedData.role === 'vendor' && validatedData.businessName && validatedData.businessCategory) {
      try {
        const business = await createBusiness(profile.id, {
          businessName: validatedData.businessName,
          businessCategory: validatedData.businessCategory,
          verificationStatus: 'pending' // Business needs verification
        });
        businessId = business.id;
        console.log("Business created:", businessId);
      } catch (businessError) {
        console.error("Failed to create business:", businessError);
        // Don't fail the entire registration if business creation fails
      }
    }

    // Generate JWT token for our app
    const token = generateToken({
      id: profile.id,
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
      is_live: profile.is_live,
      businessId: businessId
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
    console.info("[LOGIN] handler hit");
    
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
    
    // Check if individual user is gated (but allow admin and business users always)
    const isBusiness = userProfile.user_type === 'business' || userProfile.role === 'vendor';
    if (!isAdmin && !isBusiness && userProfile.role === 'individual' && !userProfile.is_live) {
      return res.status(403).json({ 
        message: 'Thank you for signing up! We will email you as soon as we are live!'
      });
    }

    // CRITICAL: Verify password with Supabase Auth - using client with bypass for email confirmation
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
    
    // First, ensure the user's email is confirmed in Supabase (required for signIn to work)
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error("Error listing users:", listError);
      return res.status(500).json({ message: "Authentication error" });
    }
    
    const supabaseUser = listData.users.find(u => u.email === validatedData.email);
    if (!supabaseUser) {
      console.log("No Supabase user found for:", validatedData.email);
      console.log("Attempting legacy password verification...");
      
      // Fall back to legacy password verification for existing users
      const bcrypt = await import('bcryptjs');
      
      // Check legacy users table for password
      const { rows: legacyUsers } = await pool.query(
        'SELECT id, email, password, user_type FROM users WHERE email = $1',
        [validatedData.email]
      );
      
      if (legacyUsers.length === 0 || !legacyUsers[0].password) {
        console.log("No legacy user found or no password set");
        return res.status(401).json({ 
          message: "Invalid email or password"
        });
      }
      
      const legacyUser = legacyUsers[0];
      const isValidPassword = await bcrypt.compare(validatedData.password, legacyUser.password);
      
      if (!isValidPassword) {
        console.log("Legacy password verification failed");
        return res.status(401).json({ 
          message: "Invalid email or password"
        });
      }
      
      console.log("Legacy password verification successful for:", validatedData.email);
      
      // Skip Supabase auth for legacy users, proceed to generate token
      console.log("Login successful for legacy user:", userProfile.email, "Role:", userProfile.role, "Is Live:", userProfile.is_live, "Admin:", isAdmin);

      // Generate JWT token for our app  
      const token = generateToken({
        id: userProfile.id,
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
    }
    
    // Auto-confirm email if not confirmed (since we only require phone verification)
    if (!supabaseUser.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
        email_confirm: true
      });
      console.log("Auto-confirmed email for phone-verified user:", validatedData.email);
    }
    
    // Now verify the password
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password
    });

    if (signInError) {
      console.error("Password verification failed:", signInError.message);
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    if (!signInData.user) {
      console.error("Password verification failed: No user returned");
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    console.log("Password verification successful for:", validatedData.email);

    console.log("Login successful for user:", userProfile.email, "Role:", userProfile.role, "Is Live:", userProfile.is_live, "Admin:", isAdmin);

    // Generate JWT token for our app  
    const token = generateToken({
      id: userProfile.id,
      email: userProfile.email,
      userType: userProfile.user_type
    });

    // Set secure cookie
    const cookieOptions = withCustomAge(
      authCookieConfig, 
      validatedData.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    );
    setAuthCookie(res, 'auth_token', token, cookieOptions);

    console.info("[LOGIN] success", validatedData.email);
    
    return res.status(200).json({
      message: "Login successful",
      userId: userProfile.id,
      userType: userProfile.user_type,
      role: userProfile.role,
      is_live: userProfile.is_live
    });

  } catch (err: any) {
    console.error("[LOGIN] error", { name: err.name, msg: err.message, code: err.code, stack: err.stack });
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error",
        errors: err.errors
      });
    }
    return res.status(500).json({ 
      message: "Internal server error"
    });
  }
}