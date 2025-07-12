import { Request, Response, NextFunction } from 'express';
import { isStrongPassword } from '../utils/passwordValidation';

/**
 * Middleware to validate password strength on the server side
 * This provides an additional security layer beyond client-side validation
 * 
 * @param passwordField The field name containing the password in the request body
 * @returns Middleware function that validates password strength
 */
export function validatePasswordStrength(passwordField: string = 'password') {
  return (req: Request, res: Response, next: NextFunction) => {
    const password = req.body[passwordField];
    
    // Skip if no password is present in this request
    if (!password) {
      return next();
    }
    
    // Validate password strength using the utility function
    if (!isStrongPassword(password)) {
      return res.status(400).json({ 
        message: "Password is too weak. It must be at least 8 characters long and contain at least one letter and one number." 
      });
    }
    
    // Password meets strength requirements, proceed
    next();
  };
}