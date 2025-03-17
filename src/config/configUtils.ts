/**
 * Configuration Utilities
 * 
 * Helper functions for integrating the configuration system with the rest of the application.
 * This provides compatibility functions for existing code that uses environment variables directly.
 */

import { getConfig } from './appConfig';

/**
 * Secret paths that should be redacted in logs
 */
const SECRET_PATHS = [
  'security.jwtSecret',
  'security.cookieSecret', 
  'security.csrfSecret',
  'infrastructure.databaseUrl'
];

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
    // First try to get from configuration
    const config = getConfig();
    const pathParts = path.split('.');
    
    let value: any = config;
    for (const part of pathParts) {
      if (value === undefined || value === null) {
        break;
      }
      value = value[part as keyof typeof value];
    }
    
    if (value !== undefined && value !== null) {
      return value as T;
    }
    
    // If not found in config, try environment variable
    if (envVarName && process.env[envVarName] !== undefined) {
      return process.env[envVarName] as unknown as T;
    }
    
    // Fall back to default value
    return defaultValue as T;
  } catch (error) {
    // If any error occurs, return the default value
    console.warn(`Error getting config value for ${path}: ${error}`);
    return defaultValue as T;
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
    // For longer values, show the first and last characters with asterisks in between
    return `${value.charAt(0)}****${value.charAt(value.length - 1)} (length: ${value.length})`;
  }
  
  return value;
}

/**
 * Check if a given path in the configuration represents a secret value
 * @param path Dot-notation path to check
 * @returns Whether the path leads to a sensitive value
 */
export function isSecretPath(path: string): boolean {
  return SECRET_PATHS.includes(path);
}

/**
 * Get a redacted version of a configuration value for logging
 * @param path Dot-notation path to the configuration value
 * @returns Redacted or safe value for logging
 */
export function getRedactedConfigValue(path: string): string {
  const value = getConfigValue<string>(path);
  return redactIfSecret(value, isSecretPath(path));
}