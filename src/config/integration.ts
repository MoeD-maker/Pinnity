/**
 * Configuration System Integration
 * 
 * This module helps integrate the new configuration system with the existing codebase.
 * It provides compatibility functions that can be used to transition from directly
 * using environment variables to using the structured configuration system.
 */

import { getConfig } from './appConfig';
import { getConfigValue } from './configUtils';

/**
 * Compatibility wrapper for environmentValidator.getRequiredEnv
 * 
 * @param key Environment variable name
 * @param defaultValue Optional default value for non-production
 * @returns The configuration value
 */
export function getRequiredEnv(key: string, defaultValue?: string): string {
  // Map common environment variables to config paths
  const configPathMap: Record<string, string> = {
    'JWT_SECRET': 'security.jwtSecret',
    'COOKIE_SECRET': 'security.cookieSecret',
    'CSRF_SECRET': 'security.csrfSecret',
    'DATABASE_URL': 'infrastructure.databaseUrl',
    'PORT': 'infrastructure.port',
    'HOST': 'infrastructure.host',
    'BCRYPT_ROUNDS': 'security.bcryptRounds',
    'JWT_EXPIRES_IN': 'security.jwtExpiresIn',
  };
  
  const config = getConfig();
  const isProduction = config.isProduction;
  
  try {
    // Check if this environment variable has a mapping to the config system
    if (configPathMap[key]) {
      const value = getConfigValue<string>(configPathMap[key], key);
      if (value) return value;
    }
    
    // If not found in config, fall back to environment variable
    const value = process.env[key];
    
    if (!value) {
      // In production, required values must be set
      if (isProduction) {
        throw new Error(`Required environment variable ${key} is not set`);
      }
      
      // In development, use default value if provided
      if (defaultValue !== undefined) {
        console.warn(`WARNING: Required environment variable ${key} is not set. Using default value. This would be an error in production.`);
        return defaultValue;
      }
      
      // No default, but not in production
      console.warn(`WARNING: Required environment variable ${key} is not set. This would be an error in production.`);
      return '';
    }
    
    return value;
  } catch (error) {
    // If we're in production and a required value is missing, this is a fatal error
    if (isProduction) {
      console.error(`FATAL: Required environment variable ${key} is not set or is invalid.`);
      process.exit(1);
    }
    
    // In development, use default value if provided
    if (defaultValue !== undefined) {
      console.warn(`WARNING: Error accessing environment variable ${key}: ${error}. Using default value.`);
      return defaultValue;
    }
    
    throw error;
  }
}

/**
 * Compatibility wrapper for environmentValidator.getOptionalEnv
 * 
 * @param key Environment variable name
 * @param defaultValue Default value to use if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  // Map common environment variables to config paths
  const configPathMap: Record<string, string> = {
    'JWT_SECRET': 'security.jwtSecret',
    'COOKIE_SECRET': 'security.cookieSecret',
    'CSRF_SECRET': 'security.csrfSecret',
    'DATABASE_URL': 'infrastructure.databaseUrl',
    'PORT': 'infrastructure.port',
    'HOST': 'infrastructure.host',
    'BCRYPT_ROUNDS': 'security.bcryptRounds',
    'JWT_EXPIRES_IN': 'security.jwtExpiresIn',
  };
  
  try {
    // Check if this environment variable has a mapping to the config system
    if (configPathMap[key]) {
      const value = getConfigValue<string>(configPathMap[key], key, defaultValue);
      return value;
    }
    
    // If not found in config, fall back to environment variable or default
    return process.env[key] || defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Check if a value is a sensitive value that should be redacted in logs
 * 
 * @param key Environment variable name
 * @returns True if the value should be redacted in logs
 */
export function shouldRedactEnvVar(key: string): boolean {
  // Common sensitive environment variables
  const sensitiveKeys = [
    'JWT_SECRET',
    'COOKIE_SECRET',
    'CSRF_SECRET',
    'DATABASE_URL',
    'API_KEY',
    'PASSWORD',
    'SECRET',
    'TOKEN',
    'PRIVATE'
  ];
  
  return sensitiveKeys.some(sensitiveKey => 
    key === sensitiveKey || key.includes(sensitiveKey) || key.includes('PASSWORD')
  );
}