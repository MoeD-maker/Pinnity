import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../shared/schema';
import crypto from 'crypto';
import { getRequiredEnv, getOptionalEnv } from './utils/environmentValidator';

// Use the environment validator to get required values
// These will throw errors if not available in production
// In development, they can use defaults but will log warnings
const JWT_SECRET = getRequiredEnv('JWT_SECRET');
const JWT_EXPIRY = getOptionalEnv('JWT_EXPIRY', '1d');
const REFRESH_TOKEN_EXPIRY = getOptionalEnv('REFRESH_TOKEN_EXPIRY', '30d'); // Default 30 days
const ACCESS_TOKEN_EXPIRY = getOptionalEnv('ACCESS_TOKEN_EXPIRY', '15m'); // Default 15 minutes for short-lived access tokens

// Define the JWT payload structure
export interface JwtPayload {
  userId: number;
  userType: string;
  email: string;
  // Standard JWT claims that may be present
  exp?: number;    // Expiration time
  iat?: number;    // Issued at time
  sub?: string;    // Subject (user ID)
  iss?: string;    // Issuer
  aud?: string;    // Audience
  jti?: string;    // JWT ID
}

/**
 * Generate a JWT token for authenticated user
 * Includes additional security measures and claims
 */
export function generateToken(user: User): string {
  // Current timestamp for token generation time
  const issuedAt = Math.floor(Date.now() / 1000);
  
  // Create a secure payload with standard JWT claims
  const payload: JwtPayload & {
    iat: number;      // Issued at
    sub: string;      // Subject (user ID)
    iss: string;      // Issuer (our application)
    aud: string;      // Audience (intended recipient)
    jti: string;      // JWT ID (unique identifier for this token)
  } = {
    // Custom application claims
    userId: user.id,
    userType: user.userType,
    email: user.email,
    
    // Standard JWT claims
    iat: issuedAt,                               // Issued at time
    sub: user.id.toString(),                     // Subject (user ID)
    iss: 'pinnity-app',                          // Issuer (our application name)
    aud: 'pinnity-client',                       // Audience (client application)
    jti: `${user.id}-${issuedAt}-${crypto.randomBytes(8).toString('hex')}` // Unique token ID
  };
  
  // Set security options for the token
  const options = {
    expiresIn: JWT_EXPIRY,                       // Token expiration time
    algorithm: 'HS256'                           // HMAC with SHA-256 algorithm
  };
  
  // @ts-ignore - TypeScript has issues with the jsonwebtoken types
  return jsonwebtoken.sign(payload, JWT_SECRET, options);
}

/**
 * Verify and decode a JWT token with enhanced security checks
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    // Verify options to enhance security
    const options = {
      algorithms: ['HS256'],                     // Only accept HMAC SHA-256 algorithm
      issuer: 'pinnity-app',                     // Verify issuer claim
      audience: 'pinnity-client',                // Verify audience claim
      complete: true                             // Return the decoded header and payload
    };
    
    // @ts-ignore - TypeScript has issues with the jsonwebtoken types
    const decoded = jsonwebtoken.verify(token, JWT_SECRET, options);
    
    // Extract and return just our custom payload data
    const payload = decoded.payload as JwtPayload;
    
    // Add additional security checks here if needed
    // For example, check if the user still exists in the database
    
    return payload;
  } catch (error) {
    // Categorize and log different types of token errors
    if (error instanceof jsonwebtoken.TokenExpiredError) {
      console.warn('Token expired:', error.message, error.expiredAt);
    } else if (error instanceof jsonwebtoken.JsonWebTokenError) {
      console.warn('JWT verification failed:', error.message);
    } else {
      console.error('Unknown JWT error:', error);
    }
    return null;
  }
}

/**
 * Hash a password using bcrypt
 */
export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 */
export function comparePassword(password: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(password, hashedPassword);
}

/**
 * Extract and verify token from cookies
 * Provides a secure method to extract the token from HTTP-only cookies
 */
export function extractTokenFromCookies(cookies: Record<string, string> = {}, signedCookies: Record<string, string> = {}): JwtPayload | null {
  console.log('Extracting token from cookies:', Object.keys(cookies));
  console.log('Extracting token from signedCookies:', Object.keys(signedCookies));
  
  // Check if the auth cookie exists in signedCookies (preferred) or regular cookies
  const token = signedCookies['auth_token'] || cookies['auth_token'];
  if (!token) {
    console.log('No auth_token cookie found in request');
    return null;
  }
  
  try {
    // Sanitize the token - ensure it only contains valid JWT characters
    // JWT tokens are Base64Url encoded and should only contain these characters
    const jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/;
    
    if (!jwtRegex.test(token)) {
      console.warn('Invalid JWT token format detected in cookie');
      return null;
    }
    
    // Check token length to prevent DoS attacks with extremely long tokens
    if (token.length > 800) { // Typical JWTs are 500-700 chars
      console.warn('JWT token in cookie exceeds maximum allowed length');
      return null;
    }
    
    // Verify the token
    const payload = verifyToken(token);
    if (payload) {
      console.log('Successfully verified token from cookie, user:', payload.userId);
    } else {
      console.log('Token verification failed');
    }
    return payload;
  } catch (error) {
    console.error('Error processing auth cookie:', error);
    return null;
  }
}

/**
 * Generate a short-lived access token for authenticated user
 * Used with refresh token system for enhanced security
 */
export function generateAccessToken(user: User): string {
  // Current timestamp for token generation time
  const issuedAt = Math.floor(Date.now() / 1000);
  
  // Create a secure payload with standard JWT claims
  const payload: JwtPayload & {
    iat: number;      // Issued at
    sub: string;      // Subject (user ID)
    iss: string;      // Issuer (our application)
    aud: string;      // Audience (intended recipient)
    jti: string;      // JWT ID (unique identifier for this token)
    tokenType: string; // Token type (access)
  } = {
    // Custom application claims
    userId: user.id,
    userType: user.userType,
    email: user.email,
    
    // Standard JWT claims
    iat: issuedAt,                               // Issued at time
    sub: user.id.toString(),                     // Subject (user ID)
    iss: 'pinnity-app',                          // Issuer (our application name)
    aud: 'pinnity-client',                       // Audience (client application)
    jti: `${user.id}-${issuedAt}-${crypto.randomBytes(8).toString('hex')}`, // Unique token ID
    tokenType: 'access'                          // Token type identifier
  };
  
  // Set security options for the token
  const options = {
    expiresIn: ACCESS_TOKEN_EXPIRY,              // Short-lived token
    algorithm: 'HS256'                           // HMAC with SHA-256 algorithm
  };
  
  // @ts-ignore - TypeScript has issues with the jsonwebtoken types
  return jsonwebtoken.sign(payload, JWT_SECRET, options);
}

/**
 * Generate a refresh token for authenticated user
 * This is used to obtain new access tokens without re-authentication
 */
export function generateRefreshToken(user: User): string {
  // Current timestamp for token generation time
  const issuedAt = Math.floor(Date.now() / 1000);
  
  // Create a secure payload with standard JWT claims
  const payload = {
    // Only include minimal user data in refresh token
    userId: user.id,
    
    // Standard JWT claims
    iat: issuedAt,                               // Issued at time
    sub: user.id.toString(),                     // Subject (user ID)
    iss: 'pinnity-app',                          // Issuer (our application name)
    aud: 'pinnity-client',                       // Audience (client application)
    jti: `refresh-${user.id}-${issuedAt}-${crypto.randomBytes(16).toString('hex')}`, // Unique token ID
    tokenType: 'refresh'                         // Token type identifier
  };
  
  // Set security options for the token
  const options = {
    expiresIn: REFRESH_TOKEN_EXPIRY,             // Longer-lived token
    algorithm: 'HS256'                           // HMAC with SHA-256 algorithm
  };
  
  // @ts-ignore - TypeScript has issues with the jsonwebtoken types
  return jsonwebtoken.sign(payload, JWT_SECRET, options);
}

/**
 * Check if a token is about to expire and needs refreshing
 * @param token JWT token to check
 * @param thresholdMinutes Minutes before expiration to trigger refresh (default: 5)
 * @returns True if token is about to expire and should be refreshed
 */
export function isTokenAboutToExpire(token: string, thresholdMinutes: number = 5): boolean {
  try {
    const decoded = jsonwebtoken.decode(token) as { exp?: number } | null;
    if (!decoded || !decoded.exp) return true;
    
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
    
    // Convert threshold to milliseconds
    const thresholdMillis = thresholdMinutes * 60 * 1000;
    
    return timeUntilExpiration < thresholdMillis;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // If there's an error, assume token needs refreshing
  }
}

/**
 * Create a token pair (access + refresh) for authenticated user
 * This provides a secure token rotation system
 */
export function createTokenPair(user: User): { accessToken: string, refreshToken: string } {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  };
}

/**
 * Verify a refresh token with enhanced security checks
 * More strict validation than regular tokens
 */
export function verifyRefreshToken(token: string): { userId: number } | null {
  try {
    // Verify options to enhance security
    const options = {
      algorithms: ['HS256'],                     // Only accept HMAC SHA-256 algorithm
      issuer: 'pinnity-app',                     // Verify issuer claim
      audience: 'pinnity-client',                // Verify audience claim
      complete: true                             // Return the decoded header and payload
    };
    
    // @ts-ignore - TypeScript has issues with the jsonwebtoken types
    const decoded = jsonwebtoken.verify(token, JWT_SECRET, options);
    
    // Extract and validate payload
    const payload = decoded.payload as { userId: number, tokenType?: string };
    
    // Ensure this is actually a refresh token
    if (payload.tokenType !== 'refresh') {
      console.warn('Token is not a refresh token');
      return null;
    }
    
    return { userId: payload.userId };
  } catch (error) {
    // Categorize and log different types of token errors
    if (error instanceof jsonwebtoken.TokenExpiredError) {
      console.warn('Refresh token expired:', error.message, error.expiredAt);
    } else if (error instanceof jsonwebtoken.JsonWebTokenError) {
      console.warn('Refresh token verification failed:', error.message);
    } else {
      console.error('Unknown refresh token error:', error);
    }
    return null;
  }
}

/**
 * Extract and verify refresh token from cookies
 */
export function extractRefreshTokenFromCookies(cookies: Record<string, string> = {}, signedCookies: Record<string, string> = {}): { userId: number } | null {
  console.log('Extracting refresh token from cookies');
  
  // Check if the refresh cookie exists in signedCookies (preferred) or regular cookies
  const token = signedCookies['refresh_token'] || cookies['refresh_token'];
  if (!token) {
    console.log('No refresh_token cookie found in request');
    return null;
  }
  
  try {
    // Sanitize the token - ensure it only contains valid JWT characters
    const jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/;
    
    if (!jwtRegex.test(token)) {
      console.warn('Invalid JWT format detected in refresh token cookie');
      return null;
    }
    
    // Check token length to prevent DoS attacks with extremely long tokens
    if (token.length > 800) {
      console.warn('Refresh token in cookie exceeds maximum allowed length');
      return null;
    }
    
    // Verify the refresh token
    return verifyRefreshToken(token);
  } catch (error) {
    console.error('Error processing refresh token cookie:', error);
    return null;
  }
}

/**
 * Extract and verify token from Authorization header
 * Includes additional security checks and sanitization
 * @deprecated Use extractTokenFromCookies instead for improved security
 */
export function extractTokenFromHeader(authHeader: string | undefined): JwtPayload | null {
  // Check if header exists and has the correct format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    // Extract token with proper format validation
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.warn('Malformed authorization header detected');
      return null;
    }
    
    // Sanitize the token - ensure it only contains valid JWT characters
    // JWT tokens are Base64Url encoded and should only contain these characters
    const token = parts[1].trim();
    const jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$/;
    
    if (!jwtRegex.test(token)) {
      console.warn('Invalid JWT token format detected');
      return null;
    }
    
    // Check token length to prevent DoS attacks with extremely long tokens
    if (token.length > 800) { // Typical JWTs are 500-700 chars
      console.warn('JWT token exceeds maximum allowed length');
      return null;
    }
    
    // Verify the token
    return verifyToken(token);
  } catch (error) {
    console.error('Error processing authorization header:', error);
    return null;
  }
}