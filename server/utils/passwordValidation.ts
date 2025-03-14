import { z } from 'zod';

// Common weak passwords list (abbreviated)
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty', 
  'letmein', 'welcome', 'admin', 'abc123', 'monkey',
  'iloveyou', 'sunshine', 'princess', '1234567', 
  'football', 'baseball', 'superman', 'passw0rd'
];

// Patterns that indicate weak passwords
const WEAK_PATTERNS = [
  /^12345/, // Starts with 12345
  /asdf/i,  // Contains 'asdf'
  /qwerty/i, // Contains 'qwerty'
  /password/i, // Contains 'password'
  /^0000/, // Starts with multiple zeros
  /^9999/, // Starts with multiple nines
  /^1111/, // Repeating 1s
  /(.)\1{3,}/ // Any character repeated more than 3 times
];

/**
 * Type representing a validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Password validation options
 */
export interface PasswordValidationOptions {
  minLength?: number; // Minimum password length
  requireUppercase?: boolean; // Require at least one uppercase letter
  requireLowercase?: boolean; // Require at least one lowercase letter
  requireNumber?: boolean; // Require at least one number
  requireSpecial?: boolean; // Require at least one special character
  checkCommonPasswords?: boolean; // Check against common password list
  checkPatterns?: boolean; // Check against weak patterns
}

/**
 * Default password validation options
 */
const DEFAULT_OPTIONS: PasswordValidationOptions = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  checkCommonPasswords: true,
  checkPatterns: true
};

/**
 * Validate a password against security requirements
 * @param password The password to validate
 * @param options Password validation options
 * @returns Validation result with valid status and array of error messages
 */
export function validatePassword(
  password: string,
  options: PasswordValidationOptions = DEFAULT_OPTIONS
): PasswordValidationResult {
  const errors: string[] = [];
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check minimum length
  if (opts.minLength && password.length < opts.minLength) {
    errors.push(`Password must be at least ${opts.minLength} characters long`);
  }

  // Check for uppercase letters
  if (opts.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  if (opts.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  if (opts.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters
  if (opts.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords list
  if (opts.checkCommonPasswords) {
    const passwordLower = password.toLowerCase();
    if (COMMON_PASSWORDS.includes(passwordLower)) {
      errors.push('Password is too common and easily guessable');
    }
  }

  // Check against weak patterns
  if (opts.checkPatterns) {
    for (const pattern of WEAK_PATTERNS) {
      if (pattern.test(password)) {
        errors.push('Password contains a predictable pattern');
        break;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Zod schema for password validation
 * @param options Password validation options
 * @returns Zod schema for password validation
 */
export function createPasswordSchema(options: PasswordValidationOptions = DEFAULT_OPTIONS) {
  return z.string().refine(
    (password) => validatePassword(password, options).valid,
    {
      message: "Password does not meet security requirements",
      params: { options }
    }
  );
}

/**
 * Enhanced password schema with detailed error messages
 */
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
  .refine(
    (password) => !COMMON_PASSWORDS.includes(password.toLowerCase()),
    "Password is too common and easily guessable"
  )
  .refine(
    (password) => !WEAK_PATTERNS.some(pattern => pattern.test(password)),
    "Password contains a predictable pattern"
  );

/**
 * Simplified password strength estimator
 * @param password Password to check
 * @returns A score from 0-100 estimating password strength
 */
export function estimatePasswordStrength(password: string): number {
  if (!password || password.length < 4) return 0;
  
  let score = 0;
  
  // Length contribution (up to 30 points)
  score += Math.min(30, password.length * 3);
  
  // Character variety (up to 40 points)
  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;
  
  // Penalize common passwords and patterns (up to -30 points)
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) score -= 30;
  if (WEAK_PATTERNS.some(pattern => pattern.test(password))) score -= 20;
  
  // Entropy bonus for longer passwords with mixed characters (up to 30 points)
  const hasVariety = (/[A-Z]/.test(password) && /[a-z]/.test(password) && 
                      /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password));
  if (hasVariety && password.length >= 12) score += 30;
  
  // Ensure the score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get a description of password strength
 * @param score Password strength score (0-100)
 * @returns String description of password strength
 */
export function getPasswordStrengthLabel(score: number): string {
  if (score < 20) return "Very Weak";
  if (score < 40) return "Weak";
  if (score < 60) return "Moderate";
  if (score < 80) return "Strong";
  return "Very Strong";
}