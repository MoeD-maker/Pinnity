import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../shared/schema';

// Use environment variables for JWT configuration with proper typing
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'default-secret-key-for-development-only-do-not-use-in-production';
// Convert string to Buffer for JWT compatibility
const JWT_SECRET = Buffer.from(JWT_SECRET_STRING, 'utf-8'); 
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

// Add validation on startup for production environments
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET_STRING || JWT_SECRET_STRING.length < 32)) {
  console.error('ERROR: JWT_SECRET not set or too short. Set a strong secret in .env');
  process.exit(1);
}

export interface JwtPayload {
  userId: number;
  userType: string;
  email: string;
}

/**
 * Generate a JWT token for authenticated user
 */
export function generateToken(user: User): string {
  const payload: JwtPayload = {
    userId: user.id,
    userType: user.userType,
    email: user.email
  };
  
  // Using Buffer as secret should resolve typing issues
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
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
 * Extract and verify token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): JwtPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split('Bearer ')[1];
  return verifyToken(token);
}