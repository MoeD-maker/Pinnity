/**
 * Secret Generator Utility
 * 
 * This utility generates cryptographically strong secrets for use in environment variables.
 * It should be used to generate values for JWT_SECRET, COOKIE_SECRET, and CSRF_SECRET.
 * 
 * Usage:
 * - Run this script directly to generate secure random secrets
 * - Copy the generated secrets to your .env file or environment variables
 * - NEVER commit the generated secrets to version control
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string
 * @param length Length of the generated string
 * @param encoding Encoding to use (hex, base64, etc.)
 * @returns Secure random string
 */
function generateSecureSecret(length: number = 64, encoding: BufferEncoding = 'base64'): string {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(Math.ceil(length * 0.75)); // Account for base64 expansion
  
  // Convert to the specified encoding
  const randomString = randomBytes.toString(encoding);
  
  // Trim to the desired length
  return randomString.slice(0, length);
}

/**
 * Calculate the entropy of a string
 * @param value String to analyze
 * @returns Entropy value in bits per character
 */
function calculateEntropy(value: string): number {
  if (!value) return 0;
  
  const len = value.length;
  const charCounts: Record<string, number> = {};
  
  // Count occurrences of each character
  for (let i = 0; i < len; i++) {
    const char = value[i];
    charCounts[char] = (charCounts[char] || 0) + 1;
  }
  
  // Calculate entropy using Shannon's entropy formula
  let entropy = 0;
  for (const char in charCounts) {
    const probability = charCounts[char] / len;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Generate a set of secrets for the application
 * @returns Object containing generated secrets
 */
function generateApplicationSecrets(): {
  jwtSecret: string;
  cookieSecret: string;
  csrfSecret: string;
} {
  // Generate secrets with different lengths for security
  const jwtSecret = generateSecureSecret(64);
  const cookieSecret = generateSecureSecret(64);
  const csrfSecret = generateSecureSecret(64);

  return {
    jwtSecret,
    cookieSecret,
    csrfSecret,
  };
}

/**
 * Format secrets for use in a .env file
 * @param secrets Object containing secrets
 * @returns Formatted string for .env file
 */
function formatForEnvFile(secrets: Record<string, string>): string {
  const lines = Object.entries(secrets).map(([key, value]) => {
    // Convert camelCase to UPPER_SNAKE_CASE for environment variables
    const envVarName = key
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase();
    
    return `${envVarName}=${value}`;
  });
  
  return lines.join('\n');
}

// Script execution
if (require.main === module) {
  const secrets = generateApplicationSecrets();
  
  console.log('\n=== Generated Secure Secrets ===\n');
  
  Object.entries(secrets).forEach(([name, value]) => {
    const entropy = calculateEntropy(value);
    const envVarName = name
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase();
    
    console.log(`${envVarName}:`);
    console.log(`  Value: ${value}`);
    console.log(`  Length: ${value.length} characters`);
    console.log(`  Entropy: ${entropy.toFixed(2)} bits per character`);
    console.log('');
  });
  
  console.log('=== For .env File ===\n');
  console.log(formatForEnvFile(secrets));
  console.log('\nIMPORTANT: Keep these secrets secure and never commit them to version control!');
}

// Export the functions for use in other scripts
export {
  generateSecureSecret,
  calculateEntropy,
  generateApplicationSecrets,
  formatForEnvFile,
};