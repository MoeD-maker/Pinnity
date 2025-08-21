import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, extractTokenFromCookies, JwtPayload } from './auth';
import { securityRateLimiter, authRateLimiter, apiRateLimiter } from './middleware/rateLimit';
import { validate } from './middleware/validationMiddleware';
import { validatePasswordStrength } from './middleware/passwordValidationMiddleware';
import { applyCookieSecurityHeaders } from './utils/cookieUtils';
import { verifyCsrf } from './middleware/csrfMiddleware';
import { bypassCsrf } from './middleware/bypassCsrfMiddleware';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to the request
 * Includes enhanced security with rate limiting for failed attempts
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    console.log(`AUTH: Processing request ${req.method} ${req.path}`);
    
    // First try to get token from cookies (preferred, more secure method)
    let token = extractTokenFromCookies(req.cookies, req.signedCookies);
    
    if (token) {
      console.log(`AUTH: Valid token found in cookies for user ${token.userId}`);
    } else {
      console.log(`AUTH: No valid token in cookies`);
    }
    
    // Fall back to Authorization header for backward compatibility
    if (!token && req.headers.authorization) {
      console.warn('Using deprecated Authorization header for authentication');
      token = extractTokenFromHeader(req.headers.authorization);
      
      if (token) {
        console.log(`AUTH: Valid token found in Authorization header for user ${token.userId}`);
      }
    }
    
    if (!token) {
      console.log(`AUTH: No valid token found for ${req.method} ${req.path}`);
      // Track failed auth attempts for security monitoring
      return securityRateLimiter(req, res, () => {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'auth_required'
        });
      });
    }
    
    // Check token expiration if available in payload
    if (token.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      if (token.exp < currentTime) {
        console.log(`AUTH: Token expired at ${new Date(token.exp * 1000).toISOString()}`);
        return res.status(401).json({ 
          error: 'Token expired', 
          code: 'token_expired',
          expiredAt: new Date(token.exp * 1000).toISOString()
        });
      }
    }
    
    // Attach user info to request
    console.log(`AUTH: Successfully authenticated user ${token.userId} (${token.userType}) for ${req.method} ${req.path}`);
    req.user = token;
    next();
  } catch (error) {
    // Use security rate limiter to protect against brute force attacks
    return securityRateLimiter(req, res, () => {
      console.error('Authentication error:', error);
      return res.status(401).json({ 
        error: 'Authentication failed',
        code: 'auth_failed'
      });
    });
  }
}

/**
 * Role-based authorization middleware
 * Ensures the authenticated user has the required role
 * Provides detailed error responses and security logging
 */
export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'auth_required'
      });
    }
    
    if (!roles.includes(req.user.userType)) {
      // Log potential privilege escalation attempts
      console.warn(`Access violation: User ${req.user.userId} (${req.user.userType}) tried to access resource requiring roles: ${roles.join(', ')}`);
      
      return res.status(403).json({ 
        error: 'Access denied: Insufficient permissions',
        code: 'insufficient_permissions', 
        requiredRoles: roles,
        userRole: req.user.userType
      });
    }
    
    next();
  };
}

/**
 * Resource ownership middleware
 * Ensures the authenticated user owns the requested resource
 * Enhanced with detailed security logging and validation
 */
export function checkOwnership(idParam: string = 'id', userIdField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'auth_required'
      });
    }
    
    // Admin users bypass ownership check
    if (req.user.userType === 'admin') {
      return next();
    }
    
    // If the resource belongs to the user, or if it's the user's own profile
    const resourceId = req.params[idParam];
    if (!resourceId) {
      return res.status(400).json({ 
        error: 'Missing resource identifier',
        code: 'missing_resource_id',
        param: idParam
      });
    }
    
    if (String(req.user.userId) === resourceId || req.body[userIdField] === req.user.userId) {
      return next();
    }
    
    // Log potential unauthorized access attempts
    console.warn(`Ownership violation: User ${req.user.userId} tried to access resource ${idParam}=${resourceId}`);
    
    return res.status(403).json({ 
      error: 'Access denied: You do not own this resource',
      code: 'ownership_violation'
    });
  };
}

/**
 * Security headers middleware
 * Adds security-related HTTP headers to all responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy - Updated to allow Firebase reCAPTCHA
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https://www.google.com https://recaptcha.google.com;"
  );
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // XSS protection (some browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'same-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  
  next();
}

/**
 * API rate limiting middleware
 * Protects API endpoints from abuse and DoS attacks
 */
export function rateLimitAPI(req: Request, res: Response, next: NextFunction) {
  return apiRateLimiter(req, res, next);
}

/**
 * Export the CSRF protection middleware
 * This middleware ensures that only requests with valid CSRF tokens are processed
 * It protects against Cross-Site Request Forgery attacks
 */
export {
  authRateLimiter,
  securityRateLimiter,
  validate,
  validatePasswordStrength,
  verifyCsrf,
  bypassCsrf
};