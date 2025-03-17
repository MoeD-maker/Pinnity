/**
 * Configuration Utilities
 * 
 * Helper functions for integrating the configuration system with the rest of the application.
 * This provides compatibility functions for existing code that uses environment variables directly.
 */

import { getConfig } from './appConfig';

/**
 * Get a configuration value, with fallback to environment variable
 * This provides a backward-compatible way to access configuration
 * 
 * @param path Dot-notation path to the configuration value (e.g., 'security.jwtSecret')
 * @param envVarName Environment variable name for fallback
 * @param defaultValue Default value if neither config nor env var exists
 * @returns The configuration value
 */
export function getConfigValue<T>(path: string, envVarName?: string, defaultValue?: T): T {
  try {
    // Get the full configuration
    const config = getConfig();
    
    // Navigate through the path to get the value
    const value = path.split('.').reduce((obj: any, key: string) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, config);
    
    // If value exists in config, return it
    if (value !== undefined) {
      return value as T;
    }
    
    // Fall back to environment variable if provided
    if (envVarName && process.env[envVarName] !== undefined) {
      // Attempt to convert to appropriate type based on defaultValue
      const envValue = process.env[envVarName];
      
      if (defaultValue === undefined) {
        return envValue as unknown as T;
      }
      
      // Type conversion based on defaultValue
      switch (typeof defaultValue) {
        case 'number':
          return Number(envValue) as unknown as T;
        case 'boolean':
          return (envValue === 'true' || envValue === '1') as unknown as T;
        default:
          return envValue as unknown as T;
      }
    }
    
    // Return default value if provided
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    // If no value found and no default provided, throw error
    throw new Error(`Configuration value not found for path: ${path}`);
    
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Safely redact a potential secret for logging
 * @param value Value to potentially redact
 * @param isSecret Whether the value is a secret
 * @returns Redacted or original value
 */
export function redactIfSecret(value: string | undefined, isSecret: boolean): string {
  if (!value) return '';
  
  if (isSecret) {
    if (value.length <= 4) {
      return '****';
    }
    
    // Show first and last character, mask the rest
    return `${value.substring(0, 1)}${'*'.repeat(value.length - 2)}${value.substring(value.length - 1)}`;
  }
  
  return value;
}

/**
 * Check if a given path in the configuration represents a secret value
 * @param path Dot-notation path to check
 * @returns Whether the path leads to a sensitive value
 */
export function isSecretPath(path: string): boolean {
  const sensitivePathPrefixes = [
    'security.jwtSecret',
    'security.cookieSecret',
    'security.csrfSecret',
    'infrastructure.databaseUrl',
  ];
  
  return sensitivePathPrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}.`));
}

/**
 * Get a redacted version of a configuration value for logging
 * @param path Dot-notation path to the configuration value
 * @returns Redacted or safe value for logging
 */
export function getRedactedConfigValue(path: string): string {
  try {
    const value = getConfigValue<any>(path);
    return redactIfSecret(String(value), isSecretPath(path));
  } catch (error) {
    return '[not set]';
  }
}