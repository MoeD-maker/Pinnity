import jsonwebtoken from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../shared/schema';

// Get the JWT secret from environment variables with a fallback
const JWT_SECRET = process.env.JWT_SECRET || 'pinnity-app-secret-key-should-be-in-env';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1d';

// Validate the secret in production environments
if (process.env.NODE_ENV === 'production' && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  console.error('ERROR: JWT_SECRET not set or too short for production. Set a strong secret in .env');
  process.exit(1);
} else if (JWT_SECRET === 'pinnity-app-secret-key-should-be-in-env') {
  console.warn('WARNING: Using default JWT secret key. Set JWT_SECRET in .env for production.');
}

// Define the JWT payload structure
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
  
  // @ts-ignore - TypeScript has issues with the jsonwebtoken types
  return jsonwebtoken.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    // @ts-ignore - TypeScript has issues with the jsonwebtoken types
    const payload = jsonwebtoken.verify(token, JWT_SECRET);
    return payload as JwtPayload;
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