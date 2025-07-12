import { z } from 'zod';
import crypto from 'crypto';

/**
 * Simple password strength validator checking for minimum requirements
 * This is used for server-side validation to prevent weak passwords
 * even if frontend validation is bypassed
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one letter (A-Z or a-z)
 * - At least one number (0-9)
 * - Can include special characters (!@#$%^&*)
 * 
 * @param password The password to check
 * @returns boolean indicating if the password meets minimum strength requirements
 */
export function isStrongPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * Extended list of common/weak passwords
 * Based on research of frequently used passwords from breaches
 */
const COMMON_PASSWORDS = [
  // Top passwords from breaches
  'password', 'password123', '123456', '12345678', 'qwerty', 
  'letmein', 'welcome', 'admin', 'abc123', 'monkey',
  'iloveyou', 'sunshine', 'princess', '1234567', 
  'football', 'baseball', 'superman', 'passw0rd',
  
  // Common number sequences
  '123456789', '1234567890', '987654321',
  
  // Simple keyboard patterns
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  
  // Common words with simple replacements
  'p@ssw0rd', 'passw0rd', 'welcome1', 'admin123',
  
  // Common names with numbers
  'michael1', 'jennifer1', 'thomas123', 'robert123',
  
  // Simple words
  'summer', 'winter', 'spring', 'autumn',
  'monday', 'friday', 'january', 'december',
  
  // Company-related patterns (based on our app)
  'pinnity', 'pinnity123', 'pinnity2025', 'deal', 'deals',
  'admin2025', 'vendor123', 'business'
];

/**
 * Patterns that indicate weak passwords
 * Each pattern represents a common insecure practice in password creation
 */
const WEAK_PATTERNS = [
  // Sequences
  /^12345/, // Starts with 12345
  /^54321/, // Starts with 54321
  /abcdef/i, // Contains alphabetical sequence
  
  // Keyboard patterns
  /asdf/i,  // Contains 'asdf'
  /qwerty/i, // Contains 'qwerty'
  /zxcvb/i, // Contains 'zxcvb'
  
  // Common words
  /password/i, // Contains 'password'
  /welcome/i, // Contains 'welcome'
  /admin/i, // Contains 'admin'
  
  // Repeating characters
  /^0000/, // Starts with multiple zeros
  /^9999/, // Starts with multiple nines
  /^1111/, // Repeating 1s
  /(.)\1{3,}/, // Any character repeated more than 3 times
  
  // Year patterns (common for passwords)
  /19\d\d$/, // Ends with a year in the 1900s
  /20\d\d$/, // Ends with a year in the 2000s
  
  // Simple character substitutions
  /p[a@]ssw[o0]rd/i, // Password with common substitutions
  
  // Personal information patterns (these would be checked against user data separately)
  /pinnity/i, // Application name
];

/**
 * Enhanced security checks for preventing password reuse across sites
 * Helps protect against credential stuffing attacks
 */
function calculatePasswordHash(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * This would ideally connect to an API like HaveIBeenPwned or a local
 * database of breached password hashes. This is a simplified example.
 * 
 * In a production environment, this would use the k-anonymity model
 * to check if a password has been exposed in known data breaches without
 * sending the full password or hash.
 */
function hasPasswordBeenExposed(password: string): boolean {
  // This is a mockup of how you would check against breach databases
  // In reality, you would use a proper API or database
  
  // For now, we'll just check against our list of common passwords
  return COMMON_PASSWORDS.includes(password.toLowerCase());
}

/**
 * Type representing a validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Password validation options with enhanced security controls
 */
export interface PasswordValidationOptions {
  /**
   * Minimum password length
   * NIST SP 800-63B recommends at least 8 characters
   */
  minLength?: number;
  
  /**
   * Recommended maximum password length
   * To prevent DoS attacks via very long passwords
   * Default: 128
   */
  maxLength?: number;
  
  /**
   * Require at least one uppercase letter
   */
  requireUppercase?: boolean;
  
  /**
   * Require at least one lowercase letter 
   */
  requireLowercase?: boolean;
  
  /**
   * Require at least one number
   */
  requireNumber?: boolean;
  
  /**
   * Require at least one special character
   */
  requireSpecial?: boolean;
  
  /**
   * Check against common password list
   */
  checkCommonPasswords?: boolean;
  
  /**
   * Check against weak patterns
   */
  checkPatterns?: boolean;
  
  /**
   * Minimum number of character classes required
   * (uppercase, lowercase, number, special)
   * Default: 3
   */
  minCharacterClasses?: number;
  
  /**
   * Check against previously breached passwords
   * Requires an external API call (disabled by default)
   */
  checkBreachDatabases?: boolean;
  
  /**
   * Check if password contains the username (case insensitive)
   * Requires username to be provided when validating
   */
  preventUsernameInPassword?: boolean;
  
  /**
   * Check if password contains email address (case insensitive)
   * Requires email to be provided when validating
   */
  preventEmailInPassword?: boolean;
  
  /**
   * Prevent use of sequential characters (like "abc", "123")
   */
  preventSequential?: boolean;
  
  /**
   * Maximum allowed character repetition (e.g., "aaa")
   * Default: 3 (more than 3 repeated characters is invalid)
   */
  maxRepetition?: number;
}

/**
 * Default password validation options
 * Compliant with NIST SP 800-63B recommendations
 */
const DEFAULT_OPTIONS: PasswordValidationOptions = {
  minLength: 8,               // NIST recommends minimum 8 characters
  maxLength: 128,             // Reasonable upper limit for storage
  requireUppercase: true,     // Require mixed case
  requireLowercase: true,
  requireNumber: true,        // Require digits
  requireSpecial: true,       // Require special characters
  checkCommonPasswords: true, // Check against common passwords
  checkPatterns: true,        // Check for weak patterns
  minCharacterClasses: 3,     // At least 3 of 4 character classes
  checkBreachDatabases: false, // Disabled by default (would need API)
  preventUsernameInPassword: true,
  preventEmailInPassword: true,
  preventSequential: true,
  maxRepetition: 3            // Prevent more than 3 repeated characters
};

/**
 * Validate a password against security requirements
 * @param password The password to validate
 * @param options Password validation options
 * @returns Validation result with valid status and array of error messages
 */
export function validatePassword(
  password: string,
  options: PasswordValidationOptions = DEFAULT_OPTIONS,
  userData?: { username?: string; email?: string }
): PasswordValidationResult {
  const errors: string[] = [];
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check minimum length
  if (opts.minLength && password.length < opts.minLength) {
    errors.push(`Password must be at least ${opts.minLength} characters long`);
  }
  
  // Check maximum length
  if (opts.maxLength && password.length > opts.maxLength) {
    errors.push(`Password must not exceed ${opts.maxLength} characters`);
  }

  // Track character classes for minCharacterClasses check
  let charClassCount = 0;
  
  // Check for uppercase letters
  const hasUppercase = /[A-Z]/.test(password);
  if (hasUppercase) charClassCount++;
  if (opts.requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letters
  const hasLowercase = /[a-z]/.test(password);
  if (hasLowercase) charClassCount++;
  if (opts.requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for numbers
  const hasNumbers = /[0-9]/.test(password);
  if (hasNumbers) charClassCount++;
  if (opts.requireNumber && !hasNumbers) {
    errors.push('Password must contain at least one number');
  }

  // Check for special characters
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (hasSpecial) charClassCount++;
  if (opts.requireSpecial && !hasSpecial) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check minimum character classes
  if (opts.minCharacterClasses && charClassCount < opts.minCharacterClasses) {
    errors.push(`Password must contain at least ${opts.minCharacterClasses} of the following: uppercase letters, lowercase letters, numbers, and special characters`);
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
  
  // Check for sequential characters
  if (opts.preventSequential) {
    // Check common sequences
    const sequences = [
      "abcdefghijklmnopqrstuvwxyz",
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "0123456789",
      "qwertyuiop",
      "asdfghjkl",
      "zxcvbnm"
    ];
    
    for (const seq of sequences) {
      for (let i = 0; i < seq.length - 2; i++) {
        const fragment = seq.substring(i, i + 3);
        if (password.toLowerCase().includes(fragment.toLowerCase())) {
          errors.push('Password contains sequential characters (e.g. "abc", "123")');
          break;
        }
      }
      
      // If an error was already added, no need to check more sequences
      if (errors.includes('Password contains sequential characters (e.g. "abc", "123")')) {
        break;
      }
    }
  }
  
  // Check for repeated characters
  if (opts.maxRepetition) {
    const repetitionRegex = new RegExp(`(.)\\1{${opts.maxRepetition},}`);
    if (repetitionRegex.test(password)) {
      errors.push(`Password contains too many repeated characters`);
    }
  }
  
  // Check if password contains username
  if (opts.preventUsernameInPassword && userData?.username) {
    const lowerPassword = password.toLowerCase();
    const lowerUsername = userData.username.toLowerCase();
    
    if (lowerUsername.length > 2 && lowerPassword.includes(lowerUsername)) {
      errors.push('Password should not contain your username');
    }
  }
  
  // Check if password contains email
  if (opts.preventEmailInPassword && userData?.email) {
    const lowerPassword = password.toLowerCase();
    const lowerEmail = userData.email.toLowerCase();
    const emailParts = lowerEmail.split('@');
    
    // Check if username part of email is in password
    if (emailParts[0].length > 2 && lowerPassword.includes(emailParts[0])) {
      errors.push('Password should not contain parts of your email address');
    }
    
    // Check if domain part of email is in password
    if (emailParts[1] && emailParts[1].length > 3) {
      const domainParts = emailParts[1].split('.');
      if (domainParts[0].length > 2 && lowerPassword.includes(domainParts[0])) {
        errors.push('Password should not contain parts of your email address');
      }
    }
  }
  
  // Check if password has been exposed in data breaches
  if (opts.checkBreachDatabases) {
    if (hasPasswordBeenExposed(password)) {
      errors.push('This password has appeared in a data breach and should not be used');
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
 * Enhanced password strength estimator with more comprehensive scoring
 * @param password Password to check
 * @returns A score from 0-100 estimating password strength
 */
export function estimatePasswordStrength(password: string): number {
  if (!password) return 0;
  if (password.length < 4) return 5; // Minimal score for very short passwords
  
  let score = 0;
  
  // --- Length scoring (up to 30 points) ---
  // Progressive scaling to reward longer passwords
  if (password.length <= 6) {
    score += password.length * 2; // Up to 12 points
  } else if (password.length <= 10) {
    score += 12 + (password.length - 6) * 2.5; // Up to 22 points
  } else {
    score += 22 + Math.min(8, (password.length - 10)); // Up to 30 points
  }
  
  // --- Character variety (up to 40 points) ---
  // Calculate counts for each character class
  const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
  const lowercaseCount = (password.match(/[a-z]/g) || []).length;
  const numberCount = (password.match(/[0-9]/g) || []).length;
  const symbolCount = (password.match(/[^A-Za-z0-9]/g) || []).length;
  
  // Award points for each character class (non-binary scoring)
  if (uppercaseCount) {
    score += Math.min(10, 3 + uppercaseCount * 0.7); // Up to 10 points
  }
  
  if (lowercaseCount) {
    score += Math.min(10, 3 + lowercaseCount * 0.7); // Up to 10 points
  }
  
  if (numberCount) {
    // More points for multiple numbers
    score += Math.min(10, 3 + numberCount * 1.2); // Up to 10 points
  }
  
  if (symbolCount) {
    // Symbols are valuable for security
    score += Math.min(10, 3 + symbolCount * 1.5); // Up to 10 points
  }
  
  // --- Penalize predictable patterns (up to -50 points) ---
  
  // Check for common passwords (severe penalty)
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score -= 35;
  }
  
  // Check for weak patterns
  if (WEAK_PATTERNS.some(pattern => pattern.test(password))) {
    score -= 25;
  }
  
  // Check for sequential characters
  const sequences = [
    "abcdefghijklmnopqrstuvwxyz",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "0123456789",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
  ];
  
  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 2; i++) {
      const fragment = seq.substring(i, i + 3);
      if (password.toLowerCase().includes(fragment.toLowerCase())) {
        score -= 15;
        break;
      }
    }
  }
  
  // Check for repeated characters (like "aaa")
  const repetitionRegex = new RegExp(`(.)\\1{2,}`);
  if (repetitionRegex.test(password)) {
    score -= 15;
  }
  
  // --- Bonus for complexity (up to 30 points) ---
  
  // Reward diverse character usage (entropy)
  const uniqueChars = new Set(password.split('')).size;
  const uniqueCharRatio = uniqueChars / password.length;
  score += Math.round(uniqueCharRatio * 10); // Up to 10 points for character diversity
  
  // Reward using multiple character classes together
  let classesUsed = 0;
  if (uppercaseCount > 0) classesUsed++;
  if (lowercaseCount > 0) classesUsed++;
  if (numberCount > 0) classesUsed++;
  if (symbolCount > 0) classesUsed++;
  
  // Special bonus for using all character classes in a longer password
  if (classesUsed >= 3 && password.length >= 10) {
    score += 15;
  } else if (classesUsed >= 4 && password.length >= 12) {
    score += 20;
  }
  
  // --- Final adjustments ---
  
  // Ensure score stays within 0-100 range
  score = Math.max(0, Math.min(100, score));
  
  // Guarantee minimum scores based on absolute minimum requirements
  // (This ensures even weak passwords that meet basic requirements get a minimum score)
  if (password.length >= 8 && classesUsed >= 3) {
    score = Math.max(score, 30); // At least "Weak"
  }
  
  if (password.length >= 10 && classesUsed >= 3 && 
      !COMMON_PASSWORDS.includes(password.toLowerCase())) {
    score = Math.max(score, 50); // At least "Moderate"
  }
  
  return score;
}

/**
 * Get a detailed description of password strength with guidance
 * @param score Password strength score (0-100)
 * @returns String description of password strength with next steps
 */
export function getPasswordStrengthLabel(score: number): string {
  if (score < 20) return "Very Weak";
  if (score < 40) return "Weak";
  if (score < 60) return "Moderate";
  if (score < 80) return "Strong";
  return "Very Strong";
}

/**
 * Get password improvement suggestions based on the password
 * @param password The password to analyze
 * @returns Array of specific improvement suggestions
 */
export function getPasswordImprovement(password: string): string[] {
  const suggestions: string[] = [];
  
  // Check password length
  if (password.length < 8) {
    suggestions.push("Make your password longer (at least 8 characters)");
  } else if (password.length < 12) {
    suggestions.push("Consider using a longer password (12+ characters)");
  }
  
  // Check character classes
  if (!/[A-Z]/.test(password)) {
    suggestions.push("Add uppercase letters (A-Z)");
  }
  
  if (!/[a-z]/.test(password)) {
    suggestions.push("Add lowercase letters (a-z)");
  }
  
  if (!/[0-9]/.test(password)) {
    suggestions.push("Add numbers (0-9)");
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    suggestions.push("Add special characters (!@#$%^&*...)");
  }
  
  // Check for patterns
  if (WEAK_PATTERNS.some(pattern => pattern.test(password))) {
    suggestions.push("Avoid predictable patterns and sequences");
  }
  
  // Check for repetition
  if (/(.)(\1{2,})/.test(password)) {
    suggestions.push("Avoid repeating characters");
  }
  
  // Check against common passwords
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    suggestions.push("Avoid commonly used passwords");
  }
  
  // If password is already strong enough, provide positive feedback
  if (suggestions.length === 0) {
    suggestions.push("Good password! Remember to use unique passwords for each site.");
  }
  
  return suggestions;
}