/**
 * Secret Generator Utility (JavaScript version)
 * 
 * This utility generates cryptographically strong secrets for use in environment variables.
 * It should be used to generate values for JWT_SECRET, COOKIE_SECRET, and CSRF_SECRET.
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string
 * @param {number} length Length of the generated string
 * @param {string} encoding Encoding to use (hex, base64, etc.)
 * @returns {string} Secure random string
 */
function generateSecureSecret(length = 64, encoding = 'base64') {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(Math.ceil(length * 0.75)); // Account for base64 expansion
  
  // Convert to the specified encoding
  const randomString = randomBytes.toString(encoding);
  
  // Trim to the desired length
  return randomString.slice(0, length);
}

/**
 * Calculate the entropy of a string
 * @param {string} value String to analyze
 * @returns {number} Entropy value in bits per character
 */
function calculateEntropy(value) {
  if (!value) return 0;
  
  const len = value.length;
  const charCounts = {};
  
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
 * @returns {Object} Object containing generated secrets
 */
function generateApplicationSecrets() {
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
 * @param {Object} secrets Object containing secrets
 * @returns {string} Formatted string for .env file
 */
function formatForEnvFile(secrets) {
  const lines = Object.entries(secrets).map(([key, value]) => {
    // Convert camelCase to UPPER_SNAKE_CASE for environment variables
    const envVarName = key
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase();
    
    return `${envVarName}=${value}`;
  });
  
  return lines.join('\n');
}

// Generate the secrets
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