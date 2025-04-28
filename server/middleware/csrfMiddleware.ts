import { Request, Response, NextFunction } from 'express';
import { csrfProtection } from '../index';

/**
 * CSRF protection middleware for sensitive operations
 * Validates CSRF tokens on request to prevent cross-site request forgery attacks
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  // Apply the CSRF protection middleware
  csrfProtection(req, res, (err: any) => {
    if (err) {
      // Handle CSRF errors with detailed error message
      console.error(`CSRF token validation failed: ${err.message}`);
      return res.status(403).json({ 
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
      });
    }
    
    // If CSRF validation passes, continue to the next middleware
    next();
  });
}