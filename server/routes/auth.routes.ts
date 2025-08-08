import type { Express, Request, Response, CookieOptions } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { 
  generateToken, 
  comparePassword, 
  hashPassword, 
  verifyRefreshToken, 
  extractRefreshTokenFromCookies,
  createTokenPair,
  isTokenAboutToExpire
} from "../auth";
import { getUploadMiddleware } from "../uploadMiddleware";
import fs from 'fs';
import { validate } from "../middleware/validationMiddleware";
import { authSchemas } from "../schemas";
import { authRateLimiter, securityRateLimiter } from "../middleware/rateLimit";
import { setAuthCookie, clearCookie } from "../utils/cookieUtils";
import { withCustomAge, authCookieConfig } from "../utils/cookieConfig";
import { 
  createVersionedRoutes, 
  versionHeadersMiddleware
} from "../../src/utils/routeVersioning";
import { verifyCsrf } from "../middleware";
import { validatePasswordStrength } from "../middleware/passwordValidationMiddleware";
import { isStrongPassword } from "../utils/passwordValidation";
import { supabaseAdmin } from "../supabaseAdmin";
import { verifySMSCode } from "../smsService";

// Email allowlist for phone verification bypass
const PHONE_VERIFICATION_ALLOWLIST = [
  'mohamad.diab+v1@outlook.com'
];

/**
 * Check if a phone number has been verified via SMS
 */
function isPhoneVerifiedInBackend(phoneNumber: string): boolean {
  // In a real production system, this would check a database or cache
  // For now, we check if the phone was recently verified via SMS
  // This is a simple implementation - you might want to store verification
  // status in your database for persistence across server restarts
  
  // For development, we'll accept any phone that has a valid format
  // In production, you'd check against your verification storage
  return !!(phoneNumber && phoneNumber.length >= 10);
}

/**
 * Normalize phone number to E.164 format for Canada
 */
function normalizeToE164(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle Canadian numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  return null;
}

/**
 * Authentication routes for login and registration
 */
export function authRoutes(app: Express): void {
  // Create versioned and legacy routes for logout
  const [versionedLogoutPath, legacyLogoutPath] = createVersionedRoutes('/auth/logout');
  
  // Phone verification route
  app.post('/auth/verify-phone', async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ message: "Missing phone number" });
      }

      const user = await storage.getUserByPhone(phoneNumber);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.updateUser(user.id, {  });
      console.log(`✅ Phone verified for user ${user.id} (${user.phone})`);

      return res.status(200).json({ message: "Phone verified successfully" });
    } catch (error) {
      console.error("Error verifying phone:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Versioned route (primary)
  app.post(versionedLogoutPath, versionHeadersMiddleware(), (req: Request, res: Response) => {
    try {
      console.log('Processing logout request');
      // Use the helper function to clear the auth cookie
      clearCookie(res, 'auth_token');
      
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Legacy route (for backward compatibility)
  app.post(legacyLogoutPath, versionHeadersMiddleware(), (req: Request, res: Response) => {
    try {
      console.log('Processing logout request (legacy route)');
      // Use the helper function to clear the auth cookie
      clearCookie(res, 'auth_token');
      
      return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  // Create versioned and legacy routes for login
  const [versionedLoginPath, legacyLoginPath] = createVersionedRoutes('/auth/login');
  
  // Versioned route (primary)
  app.post(
    versionedLoginPath, 
    versionHeadersMiddleware(),
    verifyCsrf, // CSRF protection for login
    // authRateLimiter, // Apply rate limiting to login endpoint (temporarily disabled)
    // securityRateLimiter, // Apply security rate limiting to detect brute force attacks (temporarily disabled)
    validate(authSchemas.login),
    async (req: Request, res: Response) => {
      try {
        // Get timestamp for consistent logging
        const timestamp = new Date().toISOString();
        
        // Log the validated request body with sanitized password
        const sanitizedBody = { ...req.body, password: '******' };
        console.log(`[${timestamp}] Login attempt with validated data:`, JSON.stringify(sanitizedBody, null, 2));
        
        // Request is already validated by middleware
        const { email, password, rememberMe } = req.body;
        
        // Normalize email to lowercase for consistency
        const normalizedEmail = email.toLowerCase().trim();
        console.log(`[${timestamp}] Normalized email for login: ${normalizedEmail}`);
        
        // Verify credentials
        console.log(`[${timestamp}] 🚀 About to call storage.verifyLogin with email: ${normalizedEmail}`);
        console.time('verifyLogin');
        
        let user;
        try {
          console.log(`[${timestamp}] 🔍 Calling storage.verifyLogin now...`);
          user = await storage.verifyLogin(normalizedEmail, password);
          console.timeEnd('verifyLogin');
          console.log(`[${timestamp}] 📤 storage.verifyLogin completed and returned:`, !!user);
          console.log(`[${timestamp}] 📊 User object type:`, typeof user);
          
          if (!user) {
            console.warn(`[${timestamp}] Failed login attempt for email: ${normalizedEmail}`);
            // Return a detailed error for debugging but generic message to the user
            return res.status(401).json({ 
              message: "Invalid email or password",
              detail: "The credentials provided do not match our records",
              errorCode: "INVALID_CREDENTIALS"
            });
          }
        } catch (error) {
          console.error(`[${timestamp}] Error during verifyLogin:`, error);
          return res.status(500).json({ message: "Internal server error" });
        }
        
        // User authenticated successfully
        
        // Generate JWT token with enhanced security
        console.time('generateToken');
        const token = generateToken(user);
        console.timeEnd('generateToken');
        
        // Set secure HTTP-only cookie with the token using withCustomAge helper
        // If rememberMe is true, set a longer expiration
        const maxAge = rememberMe
          ? 30 * 24 * 60 * 60 * 1000 // 30 days
          : 24 * 60 * 60 * 1000;    // 1 day
          
        // Use the withCustomAge helper which properly sets all properties
        const cookieOptions = withCustomAge({}, maxAge);
        
        console.log(`[${timestamp}] Setting auth cookie with expiration: ${new Date(Date.now() + maxAge).toISOString()}`);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        console.log(`[${timestamp}] Successful login for user ID: ${user.id}, Type: ${user.userType}`);
        
        // Return success with user info (token is in HTTP-only cookie)
        return res.status(200).json({ 
          message: "Login successful",
          userId: user.id,
          userType: user.userType
        });
      } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Legacy route (for backward compatibility)
  app.post(
    legacyLoginPath, 
    versionHeadersMiddleware(),
    authRateLimiter, 
    securityRateLimiter, 
    validate(authSchemas.login),
    async (req: Request, res: Response) => {
      try {
        // Log the validated request body
        console.log("Login attempt with validated data (legacy route):", JSON.stringify(req.body, null, 2));
        
        // Request is already validated by middleware
        const { email, password, rememberMe } = req.body;
        
        // Normalize email to lowercase for consistency
        const normalizedEmail = email.toLowerCase().trim();
        console.log(`🚀 LEGACY: About to call storage.verifyLogin with email: ${normalizedEmail}`);
        
        // Verify credentials
        const user = await storage.verifyLogin(normalizedEmail, password);
        console.log(`📤 LEGACY: storage.verifyLogin returned:`, !!user);
        
        if (!user) {
          console.warn(`Failed login attempt for email: ${normalizedEmail}`);
          return res.status(401).json({ message: "Invalid email or password" });
        }
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token using withCustomAge helper
        // If rememberMe is true, set a longer expiration
        const maxAge = rememberMe
          ? 30 * 24 * 60 * 60 * 1000 // 30 days
          : 24 * 60 * 60 * 1000;    // 1 day
          
        // Use the withCustomAge helper which properly sets all properties
        const cookieOptions = withCustomAge({}, maxAge);
        
        console.log('Setting auth cookie with options:', cookieOptions);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        console.log(`Successful login for user ID: ${user.id}, Type: ${user.userType}`);
        
        // Return success with user info (token is in HTTP-only cookie)
        return res.status(200).json({ 
          message: "Login successful",
          userId: user.id,
          userType: user.userType
        });
      } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Create versioned and legacy routes for individual registration
  const [versionedIndividualRegPath, legacyIndividualRegPath] = createVersionedRoutes('/auth/register/individual');
  console.log("🎯 Generated routes:", { versionedIndividualRegPath, legacyIndividualRegPath });
  
  // Versioned route (primary)
  app.post(
    versionedIndividualRegPath,
    versionHeadersMiddleware(),
    verifyCsrf, // CSRF protection for individual registration
    authRateLimiter, // Apply rate limiting to registration endpoint
    validate(authSchemas.individualRegistration),
    validatePasswordStrength('password'), // Server-side password strength validation
    async (req: Request, res: Response) => {
      try {
        console.log("🚨 VERSIONED ROUTE ENTERED: ", versionedIndividualRegPath);
        // Request is already validated by middleware
        // Remove fields not needed for user creation
        const { confirmPassword, termsAccepted, ...userData } = req.body;
        console.log("🔍 userData extracted:", Object.keys(userData));
        
        // Create user with Supabase Admin SDK
        console.log("🔥 About to create Supabase user with email:", userData.email);
        const { data: supabaseUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          user_metadata: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            address: userData.address,
            postalCode: userData.postalCode,
            city: userData.city,
            province: userData.province,
            lat: userData.lat,
            lng: userData.lng,
            userType: 'individual',
            phoneVerified: userData.phoneVerified || false
          }
        });

        console.log("🔥 Supabase response - data:", supabaseUser, "error:", error);

        if (error) {
          console.error("❌ Supabase user creation error:", error);
          throw new Error(error.message);
        }

        if (!supabaseUser?.user) {
          console.error("❌ No user returned from Supabase");
          throw new Error("Failed to create user");
        }

        console.log("✅ Supabase user created successfully with ID:", supabaseUser.user.id);

        // Create user record in our database for compatibility
        const userToCreate = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password, // Will be hashed by storage
          phone: userData.phone,
          address: userData.address
        };
        
        const user = await storage.createIndividualUser(userToCreate);
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions: any = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
        // In development, we need to ensure sameSite is not 'strict' for testing across subdomains
        if (process.env.NODE_ENV === 'development') {
          cookieOptions.sameSite = 'lax';
          cookieOptions.secure = false; // Allow HTTP in development
        }
        
        console.log('Setting auth cookie with options:', cookieOptions);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        // Return success with Supabase user info
        return res.status(201).json({ 
          message: "User registered successfully",
          userId: supabaseUser.user.id,
          userType: 'individual',
          supabaseUserId: supabaseUser.user.id
        });
      } catch (error) {
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        console.error("Registration error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Legacy route (for backward compatibility) - also uses Supabase
  app.post(
    legacyIndividualRegPath,
    versionHeadersMiddleware(),
    authRateLimiter,
    validate(authSchemas.individualRegistration),
    validatePasswordStrength('password'), // Server-side password strength validation
    async (req: Request, res: Response) => {
      try {
        // Request is already validated by middleware
        // Remove fields not needed for user creation
        const { confirmPassword, termsAccepted, ...userData } = req.body;
        
        // Create user with Supabase Admin SDK (same as versioned route)
        console.log("🔥 [LEGACY] About to create Supabase user with email:", userData.email);
        const { data: supabaseUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          user_metadata: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone,
            address: userData.address,
            postalCode: userData.postalCode,
            city: userData.city,
            province: userData.province,
            lat: userData.lat,
            lng: userData.lng,
            userType: 'individual',
            phoneVerified: userData.phoneVerified || false
          }
        });

        console.log("🔥 [LEGACY] Supabase response - data:", supabaseUser, "error:", error);

        if (error) {
          console.error("❌ [LEGACY] Supabase user creation error:", error);
          throw new Error(error.message);
        }

        if (!supabaseUser?.user) {
          console.error("❌ [LEGACY] No user returned from Supabase");
          throw new Error("Failed to create user");
        }

        console.log("✅ [LEGACY] Supabase user created successfully with ID:", supabaseUser.user.id);
        
        // Create user record in our database for compatibility
        const userToCreate = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password, // Will be hashed by storage
          phone: userData.phone,
          address: userData.address
        };
        
        const user = await storage.createIndividualUser(userToCreate);
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions: any = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
        // In development, we need to ensure sameSite is not 'strict' for testing across subdomains
        if (process.env.NODE_ENV === 'development') {
          cookieOptions.sameSite = 'lax';
          cookieOptions.secure = false; // Allow HTTP in development
        }
        
        console.log('Setting auth cookie with options (legacy route):', cookieOptions);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        // Return success with Supabase user info
        return res.status(201).json({ 
          message: "User registered successfully",
          userId: supabaseUser.user.id,
          userType: 'individual',
          supabaseUserId: supabaseUser.user.id
        });
      } catch (error) {
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        console.error("Registration error (legacy route):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Create versioned and legacy routes for business registration
  const [versionedBusinessRegPath, legacyBusinessRegPath] = createVersionedRoutes('/auth/register/business');
  
  // Business user registration (versioned) - using a different pattern due to file uploads
  // We cannot use the standard validation middleware here because of the file uploads
  app.post(
    versionedBusinessRegPath,
    versionHeadersMiddleware(),
    verifyCsrf, // CSRF protection for business registration
    authRateLimiter, // Apply rate limiting to business registration endpoint
    // Note: We can't use validatePasswordStrength middleware here due to file uploads
    // Password validation is done manually inside the route handler
    getUploadMiddleware().fields([
      { name: 'governmentId', maxCount: 1 },
      { name: 'proofOfAddress', maxCount: 1 },
      { name: 'proofOfBusiness', maxCount: 1 }
    ]),
    async (req: Request, res: Response) => {
      try {
        // Handle form data
        const businessName = req.body.businessName;
        const businessCategory = req.body.businessCategory;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const email = req.body.email;
        const password = req.body.password;
        const phone = req.body.phone;
        const address = req.body.address;
        const termsAccepted = req.body.termsAccepted === true || req.body.termsAccepted === 'true';
        
        // Manual validation - can't use standard middleware due to file uploads
        // In a production app, we might create a custom middleware for file uploads + validation
        if (!businessName || !businessCategory || !firstName || !lastName || 
            !email || !password || !phone || !address || termsAccepted !== true) {
          return res.status(400).json({ 
            message: "Validation error",
            errors: [{
              path: "body",
              message: "Missing required fields"
            }]
          });
        }
        
        // Server-side password strength validation
        if (!isStrongPassword(password)) {
          return res.status(400).json({ 
            message: "Password is too weak. It must be at least 8 characters long and contain at least one letter and one number." 
          });
        }

        // Phone verification logic with email allowlist
        const normalizedEmail = email?.trim().toLowerCase();
        const inAllowlist = PHONE_VERIFICATION_ALLOWLIST.includes(normalizedEmail);

        console.info(`[Phone Verification] Email: ${normalizedEmail} | Allowlist match: ${inAllowlist}`);

        const requirePhone =
          process.env.REQUIRE_PHONE_VERIFICATION !== 'false' &&
          !inAllowlist;

        if (requirePhone) {
          const normalizedPhone = normalizeToE164(phone);
          if (!normalizedPhone) {
            console.warn(`[Phone Verification] Blocked - Invalid phone format for ${normalizedEmail}`);
            return res.status(400).json({ error: 'Invalid phone number format' });
          }
          const verified = await isPhoneVerifiedInBackend(normalizedPhone);
          if (!verified) {
            console.warn(`[Phone Verification] Blocked - Phone not verified for ${normalizedEmail}`);
            return res.status(400).json({ error: 'Phone not verified' });
          }
        } else {
          console.info(`[Phone Verification] Skipped for ${normalizedEmail}`);
        }

        // Type assertion for multer files
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        // Check for all required file uploads
        if (!files.governmentId?.[0] || !files.proofOfAddress?.[0] || !files.proofOfBusiness?.[0]) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: [{
              path: "files",
              message: "Missing required document uploads"
            }]
          });
        }

        // Get file paths/URLs (uploaded to Cloudinary)
        const governmentIdPath = files.governmentId[0].path;
        const proofOfAddressPath = files.proofOfAddress[0].path;
        const proofOfBusinessPath = files.proofOfBusiness[0].path;
        
        // Create user with Supabase Admin SDK
        const { data: supabaseUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          phone: phone,
          user_metadata: {
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            address: address,
            userType: 'business',
            businessName: businessName,
            businessCategory: businessCategory,
            governmentId: governmentIdPath,
            proofOfAddress: proofOfAddressPath,
            proofOfBusiness: proofOfBusinessPath
          }
        });

        if (error) {
          console.error("Supabase user creation error:", error);
          // Clean up uploaded files on error
          [governmentIdPath, proofOfAddressPath, proofOfBusinessPath].forEach(filePath => {
            if (filePath && fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
          throw new Error(error.message);
        }

        if (!supabaseUser?.user) {
          throw new Error("Failed to create user");
        }

        // Create user profile in the profiles table for gated login compatibility
        // Use normalized email for consistency with login
        const normalizedEmail = email.trim().toLowerCase();
        
        // Import the profile creation functions
        const { createProfile } = await import('../supabaseQueries.js');
        
        // Create profile in our PostgreSQL database with correct parameters
        const profile = await createProfile(supabaseUser.user.id, {
          email: normalizedEmail,
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          address: address,
          userType: 'business',
          role: 'vendor', // Business users are vendors
          isLive: true, // Business users should not be gated
          phoneVerified: true, // Since they passed phone verification or are allowlisted
          marketingConsent: true, // Default for business users
        });

        console.log("Profile created for business user:", profile.id);

        // Also create business record linked to the profile 
        // Note: businesses table still references legacy users table, but this maintains compatibility
        const user = await storage.createBusinessUser(
          {
            firstName,
            lastName,
            email: normalizedEmail,
            password,
            phone,
            address,
            phoneVerified: true,
          },
          {
            businessName,
            businessCategory,
            governmentId: governmentIdPath,
            proofOfAddress: proofOfAddressPath,
            proofOfBusiness: proofOfBusinessPath,
          }
        );
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions: any = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
        // In development, we need to ensure sameSite is not 'strict' for testing across subdomains
        if (process.env.NODE_ENV === 'development') {
          cookieOptions.sameSite = 'lax';
          cookieOptions.secure = false; // Allow HTTP in development
        }
        
        console.log('Setting auth cookie with options:', cookieOptions);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        // Return success with Supabase user info
        return res.status(201).json({ 
          message: "Business registered successfully",
          userId: supabaseUser.user.id,
          userType: 'business',
          supabaseUserId: supabaseUser.user.id
        });
      } catch (error) {
        // Clean up any uploaded files in case of error
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files) {
          Object.values(files).forEach(fileArray => {
            fileArray.forEach(file => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          });
        }

        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        console.error("Business registration error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Legacy route for business registration (for backward compatibility)
  app.post(
    legacyBusinessRegPath,
    versionHeadersMiddleware(),
    authRateLimiter,
    // Note: We can't use validatePasswordStrength middleware here due to file uploads
    // Password validation is done manually inside the route handler
    getUploadMiddleware().fields([
      { name: 'governmentId', maxCount: 1 },
      { name: 'proofOfAddress', maxCount: 1 },
      { name: 'proofOfBusiness', maxCount: 1 }
    ]),
    async (req: Request, res: Response) => {
      try {
        // Handle form data
        const businessName = req.body.businessName;
        const businessCategory = req.body.businessCategory;
        const firstName = req.body.firstName;
        const lastName = req.body.lastName;
        const email = req.body.email;
        const password = req.body.password;
        const phone = req.body.phone;
        const address = req.body.address;
        const termsAccepted = req.body.termsAccepted === true || req.body.termsAccepted === 'true';
        
        // Manual validation - can't use standard middleware due to file uploads
        if (!businessName || !businessCategory || !firstName || !lastName || 
            !email || !password || !phone || !address || termsAccepted !== true) {
          return res.status(400).json({ 
            message: "Validation error",
            errors: [{
              path: "body",
              message: "Missing required fields"
            }]
          });
        }
        
        // Server-side password strength validation
        if (!isStrongPassword(password)) {
          return res.status(400).json({ 
            message: "Password is too weak. It must be at least 8 characters long and contain at least one letter and one number." 
          });
        }

        // Phone verification logic with email allowlist
        const normalizedEmail = email?.trim().toLowerCase();
        const inAllowlist = PHONE_VERIFICATION_ALLOWLIST.includes(normalizedEmail);

        console.info(`[Phone Verification] Email: ${normalizedEmail} | Allowlist match: ${inAllowlist}`);

        const requirePhone =
          process.env.REQUIRE_PHONE_VERIFICATION !== 'false' &&
          !inAllowlist;

        if (requirePhone) {
          const normalizedPhone = normalizeToE164(phone);
          if (!normalizedPhone) {
            console.warn(`[Phone Verification] Blocked - Invalid phone format for ${normalizedEmail}`);
            return res.status(400).json({ error: 'Invalid phone number format' });
          }
          const verified = await isPhoneVerifiedInBackend(normalizedPhone);
          if (!verified) {
            console.warn(`[Phone Verification] Blocked - Phone not verified for ${normalizedEmail}`);
            return res.status(400).json({ error: 'Phone not verified' });
          }
        } else {
          console.info(`[Phone Verification] Skipped for ${normalizedEmail}`);
        }

        // Type assertion for multer files
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        // Check for all required file uploads
        if (!files.governmentId?.[0] || !files.proofOfAddress?.[0] || !files.proofOfBusiness?.[0]) {
          return res.status(400).json({ 
            message: "Validation error", 
            errors: [{
              path: "files",
              message: "Missing required document uploads"
            }]
          });
        }

        // Get file paths/URLs
        const governmentIdPath = files.governmentId[0].path;
        const proofOfAddressPath = files.proofOfAddress[0].path;
        const proofOfBusinessPath = files.proofOfBusiness[0].path;
        
        // Create user with business (via legacy route)
        // Use the same normalized email for consistency  
        const user = await storage.createBusinessUser(
          {
            firstName,
            lastName,
            email: normalizedEmail, // Use the already normalized email from phone verification
            password,
            phone,
            address,
            phoneVerified: true, // Since they passed phone verification or are allowlisted
          },
          {
            businessName,
            businessCategory,
            governmentId: governmentIdPath,
            proofOfAddress: proofOfAddressPath,
            proofOfBusiness: proofOfBusinessPath,
            
          }
        );
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions: any = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
        // In development, we need to ensure sameSite is not 'strict' for testing across subdomains
        if (process.env.NODE_ENV === 'development') {
          cookieOptions.sameSite = 'lax';
          cookieOptions.secure = false; // Allow HTTP in development
        }
        
        console.log('Setting auth cookie with options (legacy route):', cookieOptions);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        // Return success with user info (token is in HTTP-only cookie)
        return res.status(201).json({ 
          message: "Business registered successfully",
          userId: user.id,
          userType: user.userType
        });
      } catch (error) {
        // Clean up any uploaded files in case of error
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files) {
          Object.values(files).forEach(fileArray => {
            fileArray.forEach(file => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          });
        }

        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        console.error("Business registration error (legacy route):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Create versioned and legacy routes for password reset request
  const [versionedPasswordResetRequestPath, legacyPasswordResetRequestPath] = createVersionedRoutes('/auth/password-reset/request');
  
  // Versioned route for password reset request
  app.post(
    versionedPasswordResetRequestPath,
    versionHeadersMiddleware(),
    verifyCsrf, // CSRF protection for password reset request
    authRateLimiter, // Apply rate limiting to prevent abuse
    securityRateLimiter, // Apply security rate limiting
    validate(authSchemas.passwordResetRequest),
    async (req: Request, res: Response) => {
      try {
        // Extract the client info for security tracking
        const clientInfo = {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        };
        
        // Generate password reset token
        const { email } = req.body;
        const result = await storage.createPasswordResetToken(email, clientInfo);
        
        if (!result) {
          // For security reasons, always return success even if email doesn't exist
          // This prevents user enumeration attacks
          return res.status(200).json({ 
            message: "If your email is registered, you will receive a password reset link shortly." 
          });
        }
        
        const { token, user } = result;
        
        // In a real application, here we would send an email with the reset link
        // For now, just return the token in development (in production, we would not expose this)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Password reset token for ${email}: ${token}`);
          
          return res.status(200).json({
            message: "Password reset link generated successfully.",
            // Only in development, include the token in the response
            resetToken: token,
            userId: user.id
          });
        }
        
        return res.status(200).json({ 
          message: "If your email is registered, you will receive a password reset link shortly." 
        });
      } catch (error) {
        console.error("Password reset request error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Legacy route for password reset request
  app.post(
    legacyPasswordResetRequestPath,
    versionHeadersMiddleware(),
    authRateLimiter,
    securityRateLimiter,
    validate(authSchemas.passwordResetRequest),
    async (req: Request, res: Response) => {
      try {
        // Extract the client info for security tracking
        const clientInfo = {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'] || 'unknown'
        };
        
        // Generate password reset token
        const { email } = req.body;
        const result = await storage.createPasswordResetToken(email, clientInfo);
        
        if (!result) {
          // For security reasons, always return success even if email doesn't exist
          // This prevents user enumeration attacks
          return res.status(200).json({ 
            message: "If your email is registered, you will receive a password reset link shortly." 
          });
        }
        
        const { token, user } = result;
        
        // In a real application, here we would send an email with the reset link
        // For now, just return the token in development (in production, we would not expose this)
        if (process.env.NODE_ENV === 'development') {
          console.log(`Password reset token for ${email}: ${token}`);
          
          return res.status(200).json({
            message: "Password reset link generated successfully.",
            // Only in development, include the token in the response
            resetToken: token,
            userId: user.id
          });
        }
        
        return res.status(200).json({ 
          message: "If your email is registered, you will receive a password reset link shortly." 
        });
      } catch (error) {
        console.error("Password reset request error (legacy route):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Create versioned and legacy routes for password reset verification and setting new password
  const [versionedPasswordResetVerifyPath, legacyPasswordResetVerifyPath] = createVersionedRoutes('/auth/password-reset/verify');
  
  // Versioned route for password reset verification and setting new password
  app.post(
    versionedPasswordResetVerifyPath,
    versionHeadersMiddleware(),
    verifyCsrf, // CSRF protection for password reset verification
    authRateLimiter,
    securityRateLimiter,
    validate(authSchemas.passwordResetVerify),
    validatePasswordStrength('newPassword'), // Server-side password strength validation
    async (req: Request, res: Response) => {
      try {
        const { token, newPassword } = req.body;
        
        // Validate the token and set the new password
        const success = await storage.resetPasswordWithToken(token, newPassword);
        
        if (!success) {
          return res.status(400).json({ 
            message: "Invalid or expired password reset token." 
          });
        }
        
        return res.status(200).json({ 
          message: "Password has been reset successfully. You can now log in with your new password." 
        });
      } catch (error) {
        console.error("Password reset verification error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Legacy route for password reset verification and setting new password
  app.post(
    legacyPasswordResetVerifyPath,
    versionHeadersMiddleware(),
    authRateLimiter,
    securityRateLimiter,
    validate(authSchemas.passwordResetVerify),
    validatePasswordStrength('newPassword'), // Server-side password strength validation
    async (req: Request, res: Response) => {
      try {
        const { token, newPassword } = req.body;
        
        // Validate the token and set the new password
        const success = await storage.resetPasswordWithToken(token, newPassword);
        
        if (!success) {
          return res.status(400).json({ 
            message: "Invalid or expired password reset token." 
          });
        }
        
        return res.status(200).json({ 
          message: "Password has been reset successfully. You can now log in with your new password." 
        });
      } catch (error) {
        console.error("Password reset verification error (legacy route):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Create versioned and legacy routes for token refresh
  const [versionedRefreshPath, legacyRefreshPath] = createVersionedRoutes('/auth/refresh-token');
  
  // Versioned route (primary) - token refresh
  app.post(versionedRefreshPath, versionHeadersMiddleware(), verifyCsrf, async (req: Request, res: Response) => {
    try {
      console.log('Processing token refresh request');
      
      // Extract refresh token from cookies
      const refreshTokenPayload = extractRefreshTokenFromCookies(req.cookies, req.signedCookies);
      
      if (!refreshTokenPayload) {
        console.warn('Token refresh failed: No valid refresh token found');
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get user ID from refresh token
      const userId = refreshTokenPayload.userId;
      
      // Get the associated refresh token from storage
      const refreshToken = await storage.getRefreshToken((refreshTokenPayload as any).jti);
      
      // Verify token hasn't been revoked
      if (!refreshToken || refreshToken.isRevoked) {
        console.warn(`Token refresh failed: Token ${refreshToken ? 'revoked' : 'not found'}`);
        
        // Clear existing cookies
        clearCookie(res, 'auth_token');
        clearCookie(res, 'refresh_token');
        
        return res.status(401).json({ message: 'Invalid or expired session' });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.warn(`Token refresh failed: User ${userId} not found`);
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Generate a new token pair
      const crypto = require('crypto');
      const jti = `refresh-${user.id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Rotate the refresh token (revoke the old one, create a new one)
      await storage.rotateRefreshToken((refreshTokenPayload as any).jti, jti, expiresAt);
      
      // Create new token pair
      const { accessToken, refreshToken: newRefreshToken } = createTokenPair(user);
      
      // Set new tokens in cookies
      setAuthCookie(res, 'auth_token', accessToken, {
        maxAge: 24 * 60 * 60 * 1000 // 1 day for access token
      });
      
      setAuthCookie(res, 'refresh_token', newRefreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days for refresh token
      });
      
      // Update the last used timestamp
      if (refreshToken.id) {
        await storage.getRefreshToken((refreshTokenPayload as any).jti);
      }
      
      // Return minimal user info for UI updates
      return res.status(200).json({
        message: 'Token refreshed successfully',
        userId: user.id,
        userType: user.userType
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Legacy route (for backward compatibility) - token refresh
  app.post(legacyRefreshPath, versionHeadersMiddleware(), async (req: Request, res: Response) => {
    try {
      console.log('Processing token refresh request (legacy route)');
      
      // Extract refresh token from cookies
      const refreshTokenPayload = extractRefreshTokenFromCookies(req.cookies, req.signedCookies);
      
      if (!refreshTokenPayload) {
        console.warn('Token refresh failed: No valid refresh token found');
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Get user ID from refresh token
      const userId = refreshTokenPayload.userId;
      
      // Get the associated refresh token from storage
      const refreshToken = await storage.getRefreshToken((refreshTokenPayload as any).jti);
      
      // Verify token hasn't been revoked
      if (!refreshToken || refreshToken.isRevoked) {
        console.warn(`Token refresh failed: Token ${refreshToken ? 'revoked' : 'not found'}`);
        
        // Clear existing cookies
        clearCookie(res, 'auth_token');
        clearCookie(res, 'refresh_token');
        
        return res.status(401).json({ message: 'Invalid or expired session' });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.warn(`Token refresh failed: User ${userId} not found`);
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Generate a new token pair
      const crypto = require('crypto');
      const jti = `refresh-${user.id}-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Rotate the refresh token (revoke the old one, create a new one)
      await storage.rotateRefreshToken((refreshTokenPayload as any).jti, jti, expiresAt);
      
      // Create new token pair
      const { accessToken, refreshToken: newRefreshToken } = createTokenPair(user);
      
      // Set new tokens in cookies
      setAuthCookie(res, 'auth_token', accessToken, {
        maxAge: 24 * 60 * 60 * 1000 // 1 day for access token
      });
      
      setAuthCookie(res, 'refresh_token', newRefreshToken, {
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days for refresh token
      });
      
      // Update the last used timestamp
      if (refreshToken.id) {
        await storage.getRefreshToken((refreshTokenPayload as any).jti);
      }
      
      // Return minimal user info for UI updates
      return res.status(200).json({
        message: 'Token refreshed successfully',
        userId: user.id,
        userType: user.userType
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Phone verification endpoint
  const [versionedVerifyPhonePath, legacyVerifyPhonePath] = createVersionedRoutes('/auth/verify-phone');
  
  app.post(versionedVerifyPhonePath, versionHeadersMiddleware(), async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required' });
      }
      
      // Find user by phone number and mark as phone verified
      const user = await storage.getUserByPhone(phoneNumber);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user to mark phone as verified
      await storage.updateUser(user.id, {  });
      console.log(`Phone verified for user ${user.id} (${phoneNumber})`);
      
      return res.status(200).json({ message: 'Phone verified successfully' });
    } catch (error) {
      console.error('Error verifying phone:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}