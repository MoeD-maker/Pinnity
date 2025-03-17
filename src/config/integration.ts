/**
 * Configuration System Integration
 * 
 * This module helps integrate the new configuration system with the existing codebase.
 * It provides compatibility functions that can be used to transition from directly
 * using environment variables to using the structured configuration system.
 */

import { getConfigValue, isSecretPath } from './configUtils';

/**
 * Secret environment variable names that should be redacted in logs
 */
const SECRET_ENV_VARS = [
  'JWT_SECRET',
  'COOKIE_SECRET',
  'CSRF_SECRET',
  'DATABASE_URL',
  'API_KEY',
  'PASSWORD',
  'TOKEN',
  'SECRET',
  'PRIVATE'
];

/**
 * Compatibility wrapper for environmentValidator.getRequiredEnv
 * 
 * @param key Environment variable name
 * @param defaultValue Optional default value for non-production
 * @returns The configuration value
 */
export function getRequiredEnv(key: string, defaultValue?: string): string {
  // Convert from ENV_VAR to config path format
  // e.g., JWT_SECRET -> security.jwtSecret
  const configPath = convertEnvVarToConfigPath(key);
  
  // Try to get from config first
  const configValue = getConfigValue<string>(configPath, key, defaultValue);
  
  if (!configValue && process.env.NODE_ENV === 'production') {
    console.error(`Required environment variable ${key} is not set in production mode!`);
    process.exit(1);
  }
  
  return configValue || defaultValue || '';
}

/**
 * Compatibility wrapper for environmentValidator.getOptionalEnv
 * 
 * @param key Environment variable name
 * @param defaultValue Default value to use if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  // Convert from ENV_VAR to config path format
  const configPath = convertEnvVarToConfigPath(key);
  
  // Get from configuration system with fallback to env var and default
  return getConfigValue<string>(configPath, key, defaultValue);
}

/**
 * Check if a value is a sensitive value that should be redacted in logs
 * 
 * @param key Environment variable name
 * @returns True if the value should be redacted in logs
 */
export function shouldRedactEnvVar(key: string): boolean {
  // Check if it's in our list of sensitive env vars
  if (SECRET_ENV_VARS.some(secret => key.includes(secret))) {
    return true;
  }
  
  // Check if the equivalent config path is a secret
  const configPath = convertEnvVarToConfigPath(key);
  return isSecretPath(configPath);
}

/**
 * Convert from environment variable format to configuration path
 * @param envVar Environment variable name (e.g., JWT_SECRET)
 * @returns Configuration path (e.g., security.jwtSecret)
 */
function convertEnvVarToConfigPath(envVar: string): string {
  // Map of known environment variables to their configuration paths
  const envToConfigMap: Record<string, string> = {
    'JWT_SECRET': 'security.jwtSecret',
    'COOKIE_SECRET': 'security.cookieSecret',
    'CSRF_SECRET': 'security.csrfSecret',
    'BCRYPT_ROUNDS': 'security.bcryptRounds',
    'JWT_EXPIRES_IN': 'security.jwtExpiresIn',
    'DATABASE_URL': 'infrastructure.databaseUrl',
    'PORT': 'infrastructure.port',
    'HOST': 'infrastructure.host',
    'TRUST_PROXY': 'infrastructure.trustProxy',
    'RATE_LIMIT_WINDOW': 'security.rateLimitWindow',
    'RATE_LIMIT_MAX': 'security.rateLimitMax',
    'DEAL_EXPIRATION_NOTIFICATION_HOURS': 'features.dealExpirationNotificationHours',
    'MAX_DEAL_IMAGES_PER_BUSINESS': 'features.maxDealImagesPerBusiness',
    'MAX_BUSINESS_DOCUMENTS_COUNT': 'features.maxBusinessDocumentsCount',
    'MAX_FILE_UPLOAD_SIZE': 'features.maxFileUploadSize',
    'ALLOWED_FILE_TYPES': 'features.allowedFileTypes',
    'ENABLE_DEBUG_LOGGING': 'development.enableDebugLogging',
    'MOCK_AUTH_ENABLED': 'development.mockAuthEnabled',
    'SLOW_NETWORK_SIMULATION': 'development.slowNetworkSimulation',
  };
  
  // Return mapped path if it exists, otherwise use best guess
  if (envToConfigMap[envVar]) {
    return envToConfigMap[envVar];
  }
  
  // For unknown variables, make a best guess at the configuration path
  // Convert from SNAKE_CASE to camelCase and guess at the category
  const camelCased = envVar.toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  
  // Try to determine the appropriate config section
  if (envVar.includes('SECRET') || envVar.includes('KEY') || envVar.includes('TOKEN') || 
      envVar.includes('PASSWORD') || envVar.includes('AUTH') || envVar.includes('HASH')) {
    return `security.${camelCased}`;
  } else if (envVar.includes('PORT') || envVar.includes('HOST') || envVar.includes('URL') || 
             envVar.includes('PATH') || envVar.includes('DIR')) {
    return `infrastructure.${camelCased}`;
  } else if (envVar.includes('ENABLE') || envVar.includes('DEBUG') || envVar.includes('LOG') || 
             envVar.includes('MODE')) {
    return `development.${camelCased}`;
  } else {
    return `features.${camelCased}`;
  }
}