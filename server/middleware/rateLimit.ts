/**
 * Rate limiting middleware for protecting against brute force attacks
 * Implements different rate limits for different types of endpoints
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Type definition for the rate limit options with enhanced security features
interface SecurityRateLimitOptions {
  windowMs: number;
  max: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  message?: string | ((req: Request, res: Response) => string);
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response, next: NextFunction, options: any) => void;
  skipFailedRequests?: boolean;
  requestPropertyName?: string;
  statusCode?: number;
}

/**
 * Custom rate limit handler with enhanced security notifications
 * Provides detailed error messages and increments retry-after headers
 */
const securityRateLimitHandler = (req: Request, res: Response, _next: NextFunction, options: any) => {
  // Get the retry after time in seconds
  const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
  
  // Set proper headers
  res.setHeader('Retry-After', String(retryAfterSeconds));
  
  // Create traceable request ID for security monitoring
  const requestId = req.id || `rate-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  // Log security event with useful metadata for monitoring
  console.warn(`[SECURITY] [${requestId}] Rate limit exceeded:`, {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    retryAfterSeconds,
    windowMs: options.windowMs
  });
  
  // Extract user ID for additional security monitoring if authenticated
  let userId = null;
  if (req.user && 'userId' in req.user) {
    userId = (req.user as any).userId;
  }
  
  // Send response with appropriate status and message
  res.status(options.statusCode || 429).json({
    success: false,
    message: options.message || 'Too many requests, please try again later.',
    type: 'rate_limit_error',
    requestId,
    retryAfter: retryAfterSeconds,
    route: req.path,
    ...(userId ? { userId } : {})
  });
};

/**
 * Rate limiter for authentication endpoints (login, registration, password reset)
 * Implements strict limits to prevent brute force attacks
 * 5 requests per IP per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests (prevents timing attacks)
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  statusCode: 429,
  handler: securityRateLimitHandler
});

/**
 * Rate limiter for password change and critical account operations
 * These operations need special protection due to their sensitive nature
 * 10 requests per user account per hour
 */
export const accountSecurityRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: 'Too many account security operations, please try again after 1 hour',
  statusCode: 429,
  // Use user ID for rate limiting if authenticated, otherwise use IP
  keyGenerator: (req: Request): string => {
    if (req.user && 'userId' in req.user) {
      return `user-${(req.user as any).userId}`;
    }
    return req.ip;
  },
  handler: securityRateLimitHandler
});

/**
 * Rate limiter for general API endpoints
 * Provides standard protection against excessive use
 * 100 requests per IP per 15 minutes
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  statusCode: 429,
  handler: securityRateLimitHandler
});

/**
 * Rate limiter for admin operations
 * More permissive limits for admin operations but still provides protection
 * 200 requests per admin account per 15 minutes
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: 'Rate limit exceeded for admin operations, please try again later',
  statusCode: 429,
  // Use admin ID for rate limiting instead of IP to allow multiple admins on same network
  keyGenerator: (req: Request): string => {
    if (req.user && 'userId' in req.user) {
      return `admin-${(req.user as any).userId}`;
    }
    return req.ip;
  },
  handler: securityRateLimitHandler
});

/**
 * Rate limiter for public API endpoints with higher limit
 * Used for public-facing endpoints like featured deals
 * 300 requests per IP per 15 minutes
 */
export const publicApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Rate limit exceeded for public API, please try again later',
  statusCode: 429,
  handler: securityRateLimitHandler
});

/**
 * IP-based aggressive rate limiter for detecting and blocking automated attacks
 * Activates only after multiple consecutive failed requests
 * Blocks IP after 20 failed requests in 5 minutes
 */
export const securityRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 failed requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: 'Security violation detected. Your IP has been temporarily blocked due to suspicious activity.',
  statusCode: 429,
  handler: (req: Request, res: Response, _next: NextFunction, options: any) => {
    // Get the retry after time in seconds
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    
    // Set proper headers
    res.setHeader('Retry-After', String(retryAfterSeconds));
    
    // Create traceable request ID for security monitoring
    const requestId = req.id || `sec-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Log potential attack with enhanced details for security teams
    console.error(`[SECURITY] [${requestId}] Potential attack detected:`, {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      retryAfterSeconds,
      forwardedFor: req.headers['x-forwarded-for'],
      host: req.headers.host
    });
    
    // Send response with appropriate status and message
    res.status(429).json({
      success: false,
      message: options.message,
      type: 'security_violation',
      requestId,
      retryAfter: retryAfterSeconds
    });
  }
});