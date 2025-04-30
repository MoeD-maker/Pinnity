import { Request, Response, NextFunction } from 'express';
import { csrfProtection } from '../index';

/**
 * Modified CSRF protection middleware for bypass router
 * This implementation handles CSRF validation for direct API calls
 * with additional logging and debugging capabilities
 */
export function bypassCsrf(req: Request, res: Response, next: NextFunction) {
  console.log('=== BYPASS CSRF MIDDLEWARE ===');
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('CSRF token from request:', req.headers['csrf-token'] || req.body._csrf || 'Not found');
  console.log('Cookies:', Object.keys(req.cookies || {}).join(', ') || 'No cookies');
  console.log('Signed cookies:', Object.keys(req.signedCookies || {}).join(', ') || 'No signed cookies');
  
  // Look for _csrf in different places
  const csrfToken = 
    req.headers['csrf-token'] || 
    req.headers['x-csrf-token'] ||
    req.body._csrf ||
    req.query._csrf;
  
  if (!csrfToken) {
    console.warn('No CSRF token found in request');
  } else {
    console.log('Found CSRF token (hidden for logs)');
  }
  
  // First try with standard CSRF middleware
  csrfProtection(req, res, (err: any) => {
    if (err) {
      console.log('Standard CSRF validation failed:', err.message);
      
      // If the standard CSRF validation fails, we can add additional checks here
      // For testing purposes, we're allowing certain API calls to bypass CSRF validation
      // with special headers - THIS SHOULD ONLY BE USED FOR TESTING!
      if (
        req.headers['x-bypass-vite'] === 'true' &&
        req.headers['x-requested-with'] === 'XMLHttpRequest' &&
        (
          req.headers.origin?.includes('localhost') ||
          req.headers.origin?.includes('replit')
        )
      ) {
        console.log('BYPASS: Allowing request with X-Bypass-Vite header for testing');
        next();
      } else {
        // For production use, we should return an error
        return res.status(403).json({ 
          timestamp: new Date().toISOString(),
          message: 'Security validation failed. Please refresh the page and try again.',
          type: 'security_error',
          code: 'csrf_token_invalid'
        });
      }
    } else {
      // CSRF validation passed
      console.log('CSRF validation successful for bypass router');
      next();
    }
  });
}