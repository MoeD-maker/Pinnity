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

/**
 * Authentication routes for login and registration
 */
export function authRoutes(app: Express): void {
  // Create versioned and legacy routes for logout
  const [versionedLogoutPath, legacyLogoutPath] = createVersionedRoutes('/auth/logout');
  
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
    authRateLimiter, // Apply rate limiting to login endpoint
    securityRateLimiter, // Apply security rate limiting to detect brute force attacks
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
        
        try {
          const user = await storage.verifyLogin(normalizedEmail, password);
          console.timeEnd('verifyLogin');
          console.log(`[${timestamp}] 📤 storage.verifyLogin returned:`, !!user);
          
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
        
        // Additional check for account status (if implemented)
        if (user.status === 'inactive') {
          console.warn(`[${timestamp}] Login attempt for inactive account: ${normalizedEmail}`);
          return res.status(403).json({ 
            message: "Account inactive",
            detail: "This account has been deactivated",
            errorCode: "ACCOUNT_INACTIVE"
          });
        }
        
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
        // Request is already validated by middleware
        // Remove fields not needed for user creation
        const { confirmPassword, termsAccepted, ...userData } = req.body;
        
        // After validation middleware, these fields are guaranteed to exist
        const userToCreate = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          address: userData.address
        };
        
        // Create the user
        const user = await storage.createIndividualUser(userToCreate);
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
        // In development, we need to ensure sameSite is not 'strict' for testing across subdomains
        if (process.env.NODE_ENV === 'development') {
          cookieOptions.sameSite = 'lax';
          cookieOptions.secure = false; // Allow HTTP in development
        }
        
        console.log('Setting auth cookie with options:', cookieOptions);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        // Return success with user info (token is in HTTP-only cookie)
        return res.status(201).json({ 
          message: "User registered successfully",
          userId: user.id,
          userType: user.userType
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
  
  // Legacy route (for backward compatibility)
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
        
        // After validation middleware, these fields are guaranteed to exist
        const userToCreate = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          address: userData.address
        };
        
        // Create the user
        const user = await storage.createIndividualUser(userToCreate);
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
        // In development, we need to ensure sameSite is not 'strict' for testing across subdomains
        if (process.env.NODE_ENV === 'development') {
          cookieOptions.sameSite = 'lax';
          cookieOptions.secure = false; // Allow HTTP in development
        }
        
        console.log('Setting auth cookie with options (legacy route):', cookieOptions);
        setAuthCookie(res, 'auth_token', token, cookieOptions);
        
        // Return success with user info (token is in HTTP-only cookie)
        return res.status(201).json({ 
          message: "User registered successfully",
          userId: user.id,
          userType: user.userType
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
            message: "Password is too weak. It must be at least 8 characters long and contain both letters and numbers." 
          });
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
        
        // Create user with business
        const user = await storage.createBusinessUser(
          {
            firstName,
            lastName,
            email,
            password,
            phone,
            address
          },
          {
            businessName,
            businessCategory,
            governmentId: governmentIdPath,
            proofOfAddress: proofOfAddressPath,
            proofOfBusiness: proofOfBusinessPath,
            verificationStatus: "pending"
          }
        );
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
        // In development, we need to ensure sameSite is not 'strict' for testing across subdomains
        if (process.env.NODE_ENV === 'development') {
          cookieOptions.sameSite = 'lax';
          cookieOptions.secure = false; // Allow HTTP in development
        }
        
        console.log('Setting auth cookie with options:', cookieOptions);
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
            message: "Password is too weak. It must be at least 8 characters long and contain both letters and numbers." 
          });
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
        const user = await storage.createBusinessUser(
          {
            firstName,
            lastName,
            email,
            password,
            phone,
            address
          },
          {
            businessName,
            businessCategory,
            governmentId: governmentIdPath,
            proofOfAddress: proofOfAddressPath,
            proofOfBusiness: proofOfBusinessPath,
            verificationStatus: "pending"
          }
        );
        
        // Generate JWT token
        const token = generateToken(user);
        
        // Set secure HTTP-only cookie with the token
        const cookieOptions = { maxAge: 24 * 60 * 60 * 1000 }; // 1 day
        
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
      const refreshToken = await storage.getRefreshToken(refreshTokenPayload.jti);
      
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
      await storage.rotateRefreshToken(refreshTokenPayload.jti, jti, expiresAt);
      
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
        await storage.getRefreshToken(refreshTokenPayload.jti);
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
      const refreshToken = await storage.getRefreshToken(refreshTokenPayload.jti);
      
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
      await storage.rotateRefreshToken(refreshTokenPayload.jti, jti, expiresAt);
      
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
        await storage.getRefreshToken(refreshTokenPayload.jti);
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
}