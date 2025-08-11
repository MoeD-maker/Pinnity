/**
 * Enhanced authentication routes with user gating system
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../supabaseAdmin';
import { createProfile, getUserByEmail, createBusiness } from '../supabaseQueries';
import { generateToken } from '../auth';
import { provisionSupabaseUser } from '../services/AuthProvisioner';
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
    
    // Normalize input data 
    const email = validatedData.email.trim().toLowerCase();
    const password = validatedData.password;
    const phone = validatedData.phone.trim();
    const phoneVerified = validatedData.phoneVerified;
    
    // SERVER-SIDE phone verification check
    const mode = process.env.EMAIL_CONFIRM_MODE || 'auto_on_phone_verify';
    if (!phoneVerified && mode === 'auto_on_phone_verify') {
      return res.status(400).json({ 
        message: 'Phone must be verified'
      });
    }
    
    // Provision Supabase user with email confirmation based on phone verification
    console.log("Provisioning Supabase user:", email, "Role:", validatedData.role);
    const { userId, email_confirmed } = await provisionSupabaseUser({
      email,
      password,
      phone,
      phoneVerified
    });

    console.log("Supabase user provisioned:", userId, "email_confirmed:", email_confirmed);

    // Upsert profile in PostgreSQL database with conflict resolution
    const isLive = validatedData.role === 'vendor';
    const client = await pool.connect();
    let profileId;
    
    try {
      const profileResult = await client.query(`
        INSERT INTO profiles (
          supabase_user_id, email, first_name, last_name, phone, address, 
          user_type, phone_verified, role, is_live, marketing_consent, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'individual', $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (email) 
        DO UPDATE SET 
          supabase_user_id = EXCLUDED.supabase_user_id,
          updated_at = NOW()
        RETURNING id
      `, [userId, email, validatedData.firstName, validatedData.lastName, phone, 
          validatedData.address, phoneVerified, validatedData.role, isLive, 
          validatedData.marketingConsent]);
      
      profileId = profileResult.rows[0].id;
      console.log("Profile created/updated:", profileId, "Role:", validatedData.role, "Is Live:", isLive);
      
    } finally {
      client.release();
    }

    // If this is a vendor registration, create a business record
    let businessId = null;
    if (validatedData.role === 'vendor' && validatedData.businessName && validatedData.businessCategory) {
      try {
        const business = await createBusiness(profileId, {
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
    const userForToken = {
      id: profileId,
      email: email,
      userType: 'individual',
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      password: '', // Not needed for token generation
      phone: phone,
      address: validatedData.address,
      phoneVerified: phoneVerified,
      username: email, // Use email as username
      created_at: new Date().toISOString()
    };
    const token = generateToken(userForToken);

    // Set secure cookie
    const cookieOptions = withCustomAge(authCookieConfig, 24 * 60 * 60 * 1000);
    setAuthCookie(res, 'auth_token', token, cookieOptions);

    return res.status(201).json({
      message: "Registration successful",
      profileId: profileId,
      userId: userId,
      emailConfirmed: email_confirmed,
      userType: 'individual',
      role: validatedData.role,
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
        
        // Handle specific email confirmation error
        if (error?.message?.includes('Email not confirmed')) {
          return res.status(403).json({ 
            message: 'Email not confirmed. Please verify your email or complete phone verification.' 
          });
        }
        
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
    const userForToken = {
      id: parseInt(userProfile.id.toString()),
      email: userProfile.email,
      userType: userProfile.user_type,
      firstName: userProfile.first_name || '',
      lastName: userProfile.last_name || '',
      password: '', // Not needed for token generation
      phone: userProfile.phone || '',
      address: userProfile.address || '',
      phoneVerified: userProfile.phone_verified || false,
      username: userProfile.email, // Use email as username
      created_at: userProfile.created_at || new Date().toISOString()
    };
    const token = generateToken(userForToken);

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