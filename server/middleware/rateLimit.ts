import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

/**
 * Rate limiting middleware for protecting against brute force attacks
 * Implements different rate limits for different types of endpoints
 */

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
  const retryAfter = Math.ceil(options.windowMs / 1000);
  
  // Send detailed error response with clear information on limits
  res.status(options.statusCode).json({
    message: "Too many requests, please try again later.",
    error: "rate_limit_exceeded",
    retryAfter: retryAfter,
    limit: options.max,
    windowMs: options.windowMs
  });
  
  // Log rate limit violation for security monitoring
  console.warn(`Rate limit exceeded for IP: ${req.ip}, path: ${req.path}, user-agent: ${req.get('user-agent')}`);
};

/**
 * Rate limiter for authentication endpoints (login, registration, password reset)
 * Implements strict limits to prevent brute force attacks
 * 5 requests per IP per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many authentication attempts from this IP. Please try again in 15 minutes.",
  handler: securityRateLimitHandler,
  statusCode: 429,
  skipSuccessfulRequests: false
});

/**
 * Rate limiter for password change and critical account operations
 * These operations need special protection due to their sensitive nature
 * 10 requests per user account per hour
 */
export const accountSecurityRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many account security operations. Please try again in 1 hour.",
  handler: securityRateLimitHandler,
  statusCode: 429,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string => {
    // Rate limit by user ID if available, or fallback to IP
    return req.user?.userId?.toString() || req.ip;
  }
});

/**
 * Rate limiter for general API endpoints
 * Provides standard protection against excessive use
 * 100 requests per IP per 15 minutes
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP. Please try again in 15 minutes.",
  handler: securityRateLimitHandler,
  statusCode: 429,
  skipSuccessfulRequests: true
});

/**
 * Rate limiter for admin operations
 * More permissive limits for admin operations but still provides protection
 * 200 requests per admin account per 15 minutes
 */
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many admin requests. Please try again in 15 minutes.",
  handler: securityRateLimitHandler,
  statusCode: 429,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string => {
    // Rate limit by admin user ID if available, or fallback to IP
    return req.user?.userId?.toString() || req.ip;
  }
});

/**
 * Rate limiter for public API endpoints with higher limit
 * Used for public-facing endpoints like featured deals
 * 300 requests per IP per 15 minutes
 */
export const publicApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP. Please try again in 15 minutes.",
  handler: securityRateLimitHandler,
  statusCode: 429,
  skipSuccessfulRequests: true
});

/**
 * IP-based aggressive rate limiter for detecting and blocking automated attacks
 * Activates only after multiple consecutive failed requests
 * Blocks IP after 20 failed requests in 5 minutes
 */
export const securityRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 failed requests
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
  statusCode: 429,
  handler: (req: Request, res: Response, _next: NextFunction, options: any) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    
    res.status(options.statusCode).json({
      message: "Security limit exceeded. Your IP has been temporarily blocked due to suspicious activity.",
      error: "security_limit_exceeded",
      retryAfter: retryAfter
    });
    
    // Log potential security breach for investigation
    console.error(`SECURITY ALERT: Possible attack detected from IP: ${req.ip}, path: ${req.path}, user-agent: ${req.get('user-agent')}`);
  }
});