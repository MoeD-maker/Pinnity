import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../shared/schema';

// Secret key for JWT signing - in a real app, this would be in environment variables
const JWT_SECRET = 'pinnity-app-secret-key-should-be-in-env';
const JWT_EXPIRY = '7d'; // Token expires in 7 days

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
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
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