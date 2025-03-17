#!/usr/bin/env node

/**
 * Secret Generator Utility
 * 
 * This utility generates cryptographically strong secrets for use in environment variables.
 * Run this script to generate secure random secrets for your application.
 * 
 * Usage:
 *   node ./scripts/generate-secrets.js
 * 
 * The script will generate:
 *   - JWT_SECRET
 *   - COOKIE_SECRET
 *   - CSRF_SECRET
 * 
 * Copy the generated values to your .env file and NEVER commit them to version control.
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string
 * @param {number} length Length of the generated string
 * @param {BufferEncoding} encoding Encoding to use (hex, base64, etc.)
 * @returns {string} Secure random string
 */
function generateSecureSecret(length = 64, encoding = 'base64') {
  // Calculate number of bytes needed, accounting for encoding expansion
  const bytesNeeded = Math.ceil(
    encoding === 'base64' 
      ? length * 0.75  // Base64 expands by ~4/3
      : length * 0.5   // Hex expands by 2
  );
  
  // Generate random bytes
  const randomBytes = crypto.randomBytes(bytesNeeded);
  
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
  if (!value || value.length === 0) return 0;
  
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
  // Generate secrets with sufficient length and entropy
  const jwtSecret = generateSecureSecret(64, 'base64');
  const cookieSecret = generateSecureSecret(64, 'base64');
  const csrfSecret = generateSecureSecret(64, 'base64');

  return {
    JWT_SECRET: jwtSecret,
    COOKIE_SECRET: cookieSecret,
    CSRF_SECRET: csrfSecret,
  };
}

/**
 * Run the secrets generator
 */
function run() {
  console.log('\n=== Pinnity Secure Secret Generator ===\n');
  
  const secrets = generateApplicationSecrets();
  
  console.log('Generated secure secrets for your application:\n');
  
  // Display secrets with entropy information
  Object.entries(secrets).forEach(([name, value]) => {
    const entropy = calculateEntropy(value);
    
    console.log(`${name}:`);
    console.log(`  Value: ${value}`);
    console.log(`  Length: ${value.length} characters`);
    console.log(`  Entropy: ${entropy.toFixed(2)} bits per character`);
    console.log('');
  });
  
  // Show formatted .env file contents
  console.log('=== Add these to your .env file ===\n');
  
  Object.entries(secrets).forEach(([name, value]) => {
    console.log(`${name}=${value}`);
  });
  
  console.log('\nIMPORTANT SECURITY NOTES:');
  console.log('- Keep these secrets secure and never commit them to version control');
  console.log('- Store them in a secure password manager or secret management system');
  console.log('- Rotate these secrets periodically (e.g., every 90-180 days)');
  console.log('- Use different secrets for different environments (dev/staging/production)');
}

// Run the script
run();

// Export functions for use in other modules
export {
  generateSecureSecret,
  calculateEntropy,
  generateApplicationSecrets
};