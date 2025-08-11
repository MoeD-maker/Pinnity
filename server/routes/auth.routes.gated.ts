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
    // Normalize email to lowercase for case-insensitive matching
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    
    // Validate with normalized data
    const validatedData = gatedLoginSchema.parse({ email, password, rememberMe: req.body.rememberMe });
    
    console.info('[LOGIN] handler hit for', email);

    // Get the user profile from our database first (now case-insensitive)
    const userProfile = await getUserByEmail(email);
    
    if (!userProfile) {
      console.log("No user profile found for:", email);
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
    
    // Check if user is a vendor or has a business
    const isVendor = userProfile.role === 'vendor';
    const { rows: businessRows } = await pool.query(
      'SELECT 1 FROM businesses_new WHERE profile_id = $1 LIMIT 1',
      [userProfile.id]
    );
    const hasBusiness = businessRows.length > 0;
    
    console.info('[LOGIN] gate decision', { 
      role: userProfile.role, 
      is_live: userProfile.is_live, 
      hasBusiness: !!hasBusiness 
    });
    
    // Allow admin, vendors, or users with businesses to bypass gating
    if (!isAdmin && !isVendor && !hasBusiness && userProfile.role === 'individual' && !userProfile.is_live) {
      return res.status(403).json({ 
        message: 'Thank you for signing up! We will email you as soon as we are live!'
      });
    }

    // Check authentication path based on Supabase user ID
    if (userProfile.supabase_user_id) {
      // Use Supabase Auth for users with Supabase user ID
      console.log("Authenticating with Supabase for user:", email);
      
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseClient = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      
      if (error || !data.user) {
        console.error("Supabase authentication failed:", error?.message);
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      console.log("Supabase authentication successful for:", email);
    } else {
      // Legacy path for users without Supabase user ID
      console.log("Using legacy authentication for user:", email);
      
      // Lookup in legacy users table only with case-insensitive comparison
      const { rows: legacyUsers } = await pool.query(
        'SELECT id, email, password, user_type FROM users WHERE lower(email) = lower($1)',
        [email]
      );
      
      if (legacyUsers.length === 0 || !legacyUsers[0].password) {
        console.log("No legacy user found or no password set for:", email);
        return res.status(409).json({ 
          message: "Account needs reconciliation. Please reset your password." 
        });
      }
      
      // Verify password with bcrypt
      const isValidPassword = await bcrypt.compare(password, legacyUsers[0].password);
      if (!isValidPassword) {
        console.log("Legacy password verification failed for:", email);
        return res.status(409).json({ 
          message: "Account needs reconciliation. Please reset your password." 
        });
      }
      
      console.log("Legacy password verification successful for:", email);
    }

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

    console.info('[LOGIN] success', validatedData.email);
    
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