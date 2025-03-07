import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, JwtPayload } from './auth';

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
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Attach user info to request
    req.user = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Role-based authorization middleware
 * Ensures the authenticated user has the required role
 */
export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    
    next();
  };
}

/**
 * Resource ownership middleware
 * Ensures the authenticated user owns the requested resource
 */
export function checkOwnership(idParam: string = 'id', userIdField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admin users bypass ownership check
    if (req.user.userType === 'admin') {
      return next();
    }
    
    // If the resource belongs to the user, or if it's the user's own profile
    const resourceId = req.params[idParam];
    if (resourceId && (String(req.user.userId) === resourceId || req.body[userIdField] === req.user.userId)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied: You do not own this resource' });
  };
}