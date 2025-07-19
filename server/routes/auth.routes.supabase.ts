/**
 * Refactored authentication routes using Supabase Auth + PostgreSQL profiles
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../supabaseAdmin';
import { createProfile, getUserByEmail, createBusiness } from '../supabaseQueries';
import { generateToken } from '../auth';
import { setAuthCookie } from '../utils/cookieUtils';
import { authCookieConfig, withCustomAge } from '../utils/cookieConfig';
import { moveFilesToUserFolder } from '../fileManager';
import { pool } from '../db';

// Validation schemas
const individualRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  phoneVerified: z.boolean().optional().default(false)
});

const businessRegistrationSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessCategory: z.string().min(1, "Business category is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  phoneVerified: z.boolean().optional().default(false)
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false)
});

/**
 * Individual user registration
 */
export async function registerIndividual(req: Request, res: Response) {
  try {
    const validatedData = individualRegistrationSchema.parse(req.body);
    
    // Create user with Supabase Auth
    console.log("Creating Supabase user for individual:", validatedData.email);
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      phone: validatedData.phone,
      user_metadata: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        address: validatedData.address,
        userType: 'individual',
        phoneVerified: validatedData.phoneVerified
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
    const profile = await createProfile(supabaseUser.user.id, {
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
      address: validatedData.address,
      userType: 'individual',
      phoneVerified: validatedData.phoneVerified
    });

    console.log("Profile created:", profile.id);

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
      message: "Individual registration successful",
      userId: profile.id,
      userType: profile.user_type
    });

  } catch (error) {
    console.error("Individual registration error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error",
        errors: error.errors
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Business user registration
 */
export async function registerBusiness(req: Request, res: Response) {
  try {
    // Handle form data from multer
    const businessName = req.body.businessName;
    const businessCategory = req.body.businessCategory;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const password = req.body.password;
    const phone = req.body.phone;
    const address = req.body.address;
    const phoneVerified = req.body.phoneVerified === 'true' || false;

    // Validate required fields
    if (!businessName || !businessCategory || !firstName || !lastName || 
        !email || !password || !phone || !address) {
      return res.status(400).json({ 
        message: "Missing required fields"
      });
    }

    // Validate file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files.governmentId?.[0] || !files.proofOfAddress?.[0] || !files.proofOfBusiness?.[0]) {
      return res.status(400).json({ 
        message: "Missing required document uploads"
      });
    }

    // Create user with Supabase Auth
    console.log("Creating Supabase user for business:", email);
    const { data: supabaseUser, error: supabaseError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      phone: phone,
      user_metadata: {
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        address: address,
        userType: 'business',
        phoneVerified: phoneVerified,
        businessName: businessName,
        businessCategory: businessCategory
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
    const profile = await createProfile(supabaseUser.user.id, {
      email: email,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      address: address,
      userType: 'business',
      phoneVerified: phoneVerified
    });

    console.log("Profile created:", profile.id);

    // Get uploaded file paths
    const tempGovernmentIdPath = files.governmentId[0].supabasePath || files.governmentId[0].filename;
    const tempProofOfAddressPath = files.proofOfAddress[0].supabasePath || files.proofOfAddress[0].filename;
    const tempProofOfBusinessPath = files.proofOfBusiness[0].supabasePath || files.proofOfBusiness[0].filename;

    // Move files from pending to business-specific folder
    const sanitizedBusinessName = businessName.replace(/[^a-zA-Z0-9\-_]/g, '_');
    const filesToMove = [tempGovernmentIdPath, tempProofOfAddressPath, tempProofOfBusinessPath];
    const movedFiles = await moveFilesToUserFolder(filesToMove, sanitizedBusinessName);

    console.log("Files moved:", Object.values(movedFiles));

    // Create business record
    const business = await createBusiness(profile.id, {
      businessName: businessName,
      businessCategory: businessCategory,
      governmentId: Object.values(movedFiles)[0],
      proofOfAddress: Object.values(movedFiles)[1],
      proofOfBusiness: Object.values(movedFiles)[2]
    });

    console.log("Business created:", business.id);

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
      message: "Business registration successful",
      userId: profile.id,
      userType: profile.user_type
    });

  } catch (error) {
    console.error("Business registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * User login
 */
export async function login(req: Request, res: Response) {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    // Find user in our profiles table
    const user = await getUserByEmail(validatedData.email);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if this is a legacy user (no Supabase ID) or a Supabase user
    if (user.supabase_user_id) {
      // Supabase user - verify password through Supabase
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password
      });

      if (signInError) {
        console.error("Supabase password verification failed:", signInError);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log("Supabase login successful for:", validatedData.email);
    } else {
      // Legacy user - check the old users table
      console.log("Legacy user login attempt for:", validatedData.email);
      
      // Query the legacy users table
      const { rows: legacyUsers } = await pool.query(
        'SELECT id, email, password, first_name, last_name, user_type FROM users WHERE email = $1',
        [validatedData.email]
      );
      
      if (legacyUsers.length === 0 || !legacyUsers[0].password) {
        console.error("Legacy user not found or has no password");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const legacyUser = legacyUsers[0];
      // bcrypt is already imported at the top
      const isValidPassword = await bcrypt.compare(validatedData.password, legacyUser.password);
      
      if (!isValidPassword) {
        console.error("Legacy password verification failed");
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log("Legacy login successful for:", validatedData.email);
      
      // Update the user object to use legacy user data
      user.id = user.id; // Keep the profiles table ID
      user.email = legacyUser.email;
      user.first_name = legacyUser.first_name;
      user.last_name = legacyUser.last_name;
      user.user_type = legacyUser.user_type;
    }

    console.log("Login successful for:", validatedData.email);

    // Generate JWT token for our app
    const token = generateToken({
      id: user.id,
      email: user.email,
      userType: user.user_type
    });

    // Set secure cookie
    const maxAge = validatedData.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const cookieOptions = withCustomAge(authCookieConfig, maxAge);
    setAuthCookie(res, 'auth_token', token, cookieOptions);

    return res.status(200).json({
      message: "Login successful",
      userId: user.id,
      userType: user.user_type
    });

  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error",
        errors: error.errors
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Import upload middleware for business registration
import { getUploadMiddleware } from '../uploadMiddleware.supabase';

/**
 * Register authentication routes with Supabase integration
 */
export function authRoutes(app: any) {
  // Individual registration endpoint
  app.post('/api/v1/auth/register/individual', registerIndividual);
  
  // Business registration endpoint with file upload support
  app.post('/api/v1/auth/register/business', 
    getUploadMiddleware().fields([
      { name: 'governmentId', maxCount: 1 },
      { name: 'proofOfAddress', maxCount: 1 },
      { name: 'proofOfBusiness', maxCount: 1 }
    ]),
    registerBusiness
  );
  
  // Login endpoint
  app.post('/api/v1/auth/login', login);
}