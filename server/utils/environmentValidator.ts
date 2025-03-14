/**
 * Environment Validator
 * Validates required environment variables at application startup
 */

import crypto from 'crypto';

// Represents a required environment variable
interface EnvVarValidation {
  key: string;            // Environment variable name
  isRequired: boolean;    // Whether it's required or optional
  minLength?: number;     // Minimum length validation
  isSecret?: boolean;     // Whether it contains sensitive data
  defaultValue?: string;  // Default value (for development only)
  description: string;    // Description for error messages
}

/**
 * Environment validation configuration
 * Centralized definition of all required environment variables
 * with validation rules and descriptive messages
 */
const ENV_VARS: EnvVarValidation[] = [
  {
    key: 'JWT_SECRET',
    isRequired: true,
    minLength: 32,
    isSecret: true,
    description: 'Secret key for JWT token signing'
  },
  {
    key: 'JWT_EXPIRY',
    isRequired: false,
    description: 'JWT token expiration time (e.g. "1d", "4h")',
    defaultValue: '1d'
  },
  {
    key: 'COOKIE_SECRET',
    isRequired: true,
    minLength: 32,
    isSecret: true,
    description: 'Secret key for cookie signing'
  },
  {
    key: 'NODE_ENV',
    isRequired: false,
    description: 'Environment mode (development, production, test)',
    defaultValue: 'development'
  },
  {
    key: 'DATABASE_URL',
    isRequired: true,
    isSecret: true,
    description: 'PostgreSQL database connection string'
  },
  {
    key: 'LOG_VERBOSITY',
    isRequired: false,
    description: 'Log verbosity level (0-3)',
    defaultValue: '1'
  }
];

/**
 * Evaluates the security strength of a secret
 * @param secret The secret value to evaluate
 * @returns An object containing the evaluation and guidance
 */
function evaluateSecretStrength(secret: string): { 
  isStrong: boolean; 
  uniqueChars: number;
  hasNumbers: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecial: boolean;
  guidance: string;
} {
  const uniqueChars = new Set(secret).size;
  const hasNumbers = /[0-9]/.test(secret);
  const hasUppercase = /[A-Z]/.test(secret);
  const hasLowercase = /[a-z]/.test(secret);
  const hasSpecial = /[^A-Za-z0-9]/.test(secret);
  
  const isStrong = 
    uniqueChars >= 16 && 
    hasNumbers && 
    hasUppercase && 
    hasLowercase && 
    hasSpecial;
  
  let guidance = '';
  
  if (!isStrong) {
    guidance = 'Consider improving by ';
    if (uniqueChars < 16) {
      guidance += 'using more unique characters; ';
    }
    if (!hasNumbers) {
      guidance += 'adding numbers; ';
    }
    if (!hasUppercase) {
      guidance += 'adding uppercase letters; ';
    }
    if (!hasLowercase) {
      guidance += 'adding lowercase letters; ';
    }
    if (!hasSpecial) {
      guidance += 'adding special characters; ';
    }
  }
  
  return {
    isStrong,
    uniqueChars,
    hasNumbers,
    hasUppercase,
    hasLowercase,
    hasSpecial,
    guidance
  };
}

/**
 * Validates a single environment variable
 * @param env The validation configuration
 * @returns An object with validation result and error message
 */
function validateEnvVar(env: EnvVarValidation): { 
  isValid: boolean;
  value: string | null;
  errorMessage: string | null;
  warningMessage: string | null;
} {
  const value = process.env[env.key];
  const isDev = process.env.NODE_ENV !== 'production';
  
  // If it's required and missing
  if (env.isRequired && !value) {
    return {
      isValid: false,
      value: null,
      errorMessage: `Environment variable ${env.key} is required: ${env.description}`,
      warningMessage: null
    };
  }
  
  // If it has a value and minimum length requirement
  if (value && env.minLength && value.length < env.minLength) {
    return {
      isValid: false,
      value,
      errorMessage: `Environment variable ${env.key} is too short, must be at least ${env.minLength} characters`,
      warningMessage: null
    };
  }
  
  // If it's a secret, evaluate its strength (only in production)
  let warningMessage = null;
  if (value && env.isSecret && !isDev) {
    const strength = evaluateSecretStrength(value);
    if (!strength.isStrong) {
      warningMessage = `${env.key} may be insecure. ${strength.guidance}`;
    }
  }
  
  // If it's missing but has a default (only allow in dev)
  if (!value && env.defaultValue !== undefined) {
    if (isDev) {
      // Set the default value for development
      process.env[env.key] = env.defaultValue;
      
      // Only warn about defaults for sensitive values
      if (env.isSecret) {
        warningMessage = `WARNING: Using default ${env.key} in development. This would be an error in production.`;
      }
      
      return {
        isValid: true,
        value: env.defaultValue,
        errorMessage: null,
        warningMessage
      };
    } else {
      // In production, don't allow defaults for required variables
      if (env.isRequired) {
        return {
          isValid: false,
          value: null,
          errorMessage: `Environment variable ${env.key} is required in production: ${env.description}`,
          warningMessage: null
        };
      }
    }
  }
  
  return {
    isValid: true,
    value: value || null,
    errorMessage: null,
    warningMessage
  };
}

/**
 * Validates all required environment variables
 * @param exitOnFailure Whether to exit the process on validation failure
 * @returns Object with validation results
 */
export function validateEnvironment(exitOnFailure: boolean = true): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  for (const env of ENV_VARS) {
    const result = validateEnvVar(env);
    
    if (!result.isValid) {
      errors.push(result.errorMessage!);
    }
    
    if (result.warningMessage) {
      warnings.push(result.warningMessage);
    }
  }
  
  // Log warnings but don't fail
  warnings.forEach(warning => console.warn(warning));
  
  // Log errors and potentially exit
  if (errors.length > 0) {
    console.error('ENVIRONMENT VALIDATION ERRORS:');
    errors.forEach(error => console.error(`- ${error}`));
    
    if (exitOnFailure) {
      console.error('Application startup aborted due to missing required environment variables.');
      process.exit(1);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Gets a required environment variable, failing if it's not set
 * @param key The environment variable name
 * @param defaultValue Optional default value for non-production
 * @returns The environment variable value
 */
export function getRequiredEnv(key: string, defaultValue?: string): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const value = process.env[key];
  
  if (!value) {
    if (isDev) {
      // In development, we'll use defaults for required variables
      // For JWT_SECRET, we'll use a specific secure but temporary default
      if (key === 'JWT_SECRET' && defaultValue === undefined) {
        const tempSecret = 'dev-environment-jwt-secret-do-not-use-in-production-2025';
        console.warn(`WARNING: Using temporary ${key} for development mode. This would be an error in production.`);
        return tempSecret;
      }
      
      // For COOKIE_SECRET, similar approach
      if (key === 'COOKIE_SECRET' && defaultValue === undefined) {
        const tempSecret = 'dev-environment-cookie-secret-do-not-use-in-production-2025';
        console.warn(`WARNING: Using temporary ${key} for development mode. This would be an error in production.`);
        return tempSecret;
      }
      
      // For other variables with explicit defaults
      if (defaultValue !== undefined) {
        console.warn(`WARNING: Using default value for ${key} in development mode.`);
        return defaultValue;
      }
      
      // For variables without defaults in dev, we'll still need to warn
      console.warn(`WARNING: Required environment variable ${key} is not set. This would be an error in production.`);
      return '';
    }
    
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value;
}

/**
 * Gets an optional environment variable with a fallback value
 * @param key The environment variable name
 * @param defaultValue The default value to use if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Checks if a sensitive value in logs should be redacted
 * @param key The environment variable name
 * @returns True if the value should be redacted in logs
 */
export function shouldRedactEnvVar(key: string): boolean {
  return ENV_VARS.some(env => env.key === key && env.isSecret);
}

/**
 * Generate a diagnostic report of environment configuration
 * Safely masks sensitive values
 * @returns A formatted string with environment status
 */
export function getEnvironmentDiagnostics(): string {
  const diagnostics: string[] = [];
  const maskChar = '●';
  
  diagnostics.push('Environment Configuration:');
  diagnostics.push(`- NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  
  for (const env of ENV_VARS) {
    if (env.key === 'NODE_ENV') continue; // Already logged
    
    const value = process.env[env.key];
    let displayValue = 'not set';
    
    if (value) {
      if (env.isSecret) {
        // Mask sensitive values, but show length
        displayValue = `${maskChar.repeat(4)} (length: ${value.length})`;
      } else {
        displayValue = value;
      }
    } else if (env.defaultValue && process.env.NODE_ENV !== 'production') {
      if (env.isSecret) {
        displayValue = `${maskChar.repeat(4)} (default, length: ${env.defaultValue.length})`;
      } else {
        displayValue = `${env.defaultValue} (default)`;
      }
    }
    
    diagnostics.push(`- ${env.key}: ${displayValue}`);
  }
  
  return diagnostics.join('\n');
}