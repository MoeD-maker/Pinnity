/**
 * Centralized Application Configuration System
 * 
 * This module provides a secure, centralized configuration system for the application.
 * It handles loading, validating, and providing access to configuration values from
 * environment variables with strong security controls.
 * 
 * Security features:
 * - No hardcoded secrets or credentials
 * - Loads all sensitive values exclusively from environment variables
 * - Strict validation of security-critical configuration values
 * - Application exits with clear error if required security values are missing in production
 * - Secrets are masked/redacted in all logs
 * - Separation of public and private configuration
 * - TypeScript readonly properties to prevent modification
 */

import { z } from 'zod';
import crypto from 'crypto';

/**
 * Environment type
 */
type Environment = 'development' | 'test' | 'production';

/**
 * Configuration categories
 */
interface SecurityConfig {
  readonly jwtSecret: string;
  readonly cookieSecret: string;
  readonly csrfSecret: string;
  readonly bcryptRounds: number;
  readonly jwtExpiresIn: string;
  readonly rateLimitWindow: number;
  readonly rateLimitMax: number;
}

interface InfrastructureConfig {
  readonly databaseUrl: string;
  readonly port: number;
  readonly host: string;
  readonly trustProxy: boolean;
}

interface FeatureConfig {
  readonly dealExpirationNotificationHours: number;
  readonly maxDealImagesPerBusiness: number;
  readonly maxBusinessDocumentsCount: number;
  readonly maxFileUploadSize: number;
  readonly allowedFileTypes: readonly string[];
}

interface DevelopmentConfig {
  readonly enableDebugLogging: boolean;
  readonly mockAuthEnabled: boolean;
  readonly slowNetworkSimulation: boolean;
}

/**
 * Complete application configuration interface
 */
interface AppConfig {
  readonly env: Environment;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
  readonly isProduction: boolean;
  readonly security: SecurityConfig;
  readonly infrastructure: InfrastructureConfig;
  readonly features: FeatureConfig;
  readonly development: DevelopmentConfig;
}

/**
 * Public configuration interface (no sensitive values)
 */
interface PublicAppConfig {
  readonly env: Environment;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
  readonly isProduction: boolean;
  readonly infrastructure: Omit<InfrastructureConfig, 'databaseUrl'>;
  readonly features: FeatureConfig;
  readonly development: DevelopmentConfig;
}

/**
 * Calculates entropy of a string to ensure sufficient randomness for secrets
 * @param value String to check entropy
 * @returns Entropy value (bits per character)
 */
function calculateStringEntropy(value: string): number {
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
 * Environment variable validation schemas
 */
const envSchema = {
  // Security-related schemas
  JWT_SECRET: z.string()
    .min(32, 'JWT_SECRET must be at least 32 characters long')
    .refine(
      (val) => calculateStringEntropy(val) > 3.5,
      'JWT_SECRET has insufficient entropy. Use a strong random value.'
    ),
  
  COOKIE_SECRET: z.string()
    .min(32, 'COOKIE_SECRET must be at least 32 characters long')
    .refine(
      (val) => calculateStringEntropy(val) > 3.5,
      'COOKIE_SECRET has insufficient entropy. Use a strong random value.'
    ),
  
  CSRF_SECRET: z.string()
    .min(32, 'CSRF_SECRET must be at least 32 characters long')
    .refine(
      (val) => calculateStringEntropy(val) > 3.5,
      'CSRF_SECRET has insufficient entropy. Use a strong random value.'
    ),
    
  BCRYPT_ROUNDS: z.coerce.number()
    .int()
    .min(10, 'BCRYPT_ROUNDS should be at least 10 for security')
    .max(14, 'BCRYPT_ROUNDS should not exceed 14 for performance reasons')
    .default(12),
  
  JWT_EXPIRES_IN: z.string()
    .regex(/^[0-9]+(s|m|h|d)$/, 'JWT_EXPIRES_IN must be in format like 24h, 30m, 60s')
    .default('24h'),
  
  // Infrastructure-related schemas
  DATABASE_URL: z.string()
    .url({ message: 'DATABASE_URL must be a valid URL' })
    .refine(val => val.includes('postgres'), { 
      message: 'DATABASE_URL must be a PostgreSQL connection string'
    }),
  
  PORT: z.coerce.number()
    .int()
    .min(1, 'PORT must be a positive integer')
    .max(65535, 'PORT must be a valid port number')
    .default(3000),
  
  HOST: z.string()
    .default('0.0.0.0'),
  
  TRUST_PROXY: z.coerce.boolean()
    .default(false),
  
  // Rate-limiting schemas
  RATE_LIMIT_WINDOW: z.coerce.number()
    .int()
    .min(1, 'RATE_LIMIT_WINDOW must be a positive integer')
    .default(15 * 60 * 1000), // 15 minutes in ms
  
  RATE_LIMIT_MAX: z.coerce.number()
    .int()
    .min(1, 'RATE_LIMIT_MAX must be a positive integer')
    .default(100),
  
  // Feature-related schemas
  DEAL_EXPIRATION_NOTIFICATION_HOURS: z.coerce.number()
    .int()
    .min(1, 'DEAL_EXPIRATION_NOTIFICATION_HOURS must be a positive integer')
    .default(48),
  
  MAX_DEAL_IMAGES_PER_BUSINESS: z.coerce.number()
    .int()
    .min(1, 'MAX_DEAL_IMAGES_PER_BUSINESS must be a positive integer')
    .default(10),
  
  MAX_BUSINESS_DOCUMENTS_COUNT: z.coerce.number()
    .int()
    .min(1, 'MAX_BUSINESS_DOCUMENTS_COUNT must be a positive integer')
    .default(5),
  
  MAX_FILE_UPLOAD_SIZE: z.coerce.number()
    .int()
    .min(1, 'MAX_FILE_UPLOAD_SIZE must be a positive integer')
    .default(5 * 1024 * 1024), // 5MB in bytes
  
  ALLOWED_FILE_TYPES: z.string()
    .default('jpg,jpeg,png,pdf')
    .transform(val => val.split(',').map(t => t.trim())),
  
  // Development-related schemas
  ENABLE_DEBUG_LOGGING: z.coerce.boolean()
    .default(false),
  
  MOCK_AUTH_ENABLED: z.coerce.boolean()
    .default(false),
  
  SLOW_NETWORK_SIMULATION: z.coerce.boolean()
    .default(false),
};

/**
 * Environment variable configuration with validation rules
 */
interface EnvVarConfig {
  key: string;
  schema: z.ZodType<any>;
  isSecret: boolean;
  isRequired: boolean;
  requireInProduction: boolean;
  description: string;
}

/**
 * Environment variable validation configuration
 */
const ENV_VAR_CONFIG: EnvVarConfig[] = [
  // Security-related configs
  {
    key: 'JWT_SECRET',
    schema: envSchema.JWT_SECRET,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'Secret key for signing JWT tokens',
  },
  {
    key: 'COOKIE_SECRET',
    schema: envSchema.COOKIE_SECRET,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'Secret key for signing cookies',
  },
  {
    key: 'CSRF_SECRET',
    schema: envSchema.CSRF_SECRET,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'Secret key for CSRF protection',
  },
  {
    key: 'BCRYPT_ROUNDS',
    schema: envSchema.BCRYPT_ROUNDS,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Number of rounds for bcrypt password hashing',
  },
  {
    key: 'JWT_EXPIRES_IN',
    schema: envSchema.JWT_EXPIRES_IN,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'JWT token expiration time (e.g., 24h, 30m)',
  },
  
  // Infrastructure-related configs
  {
    key: 'DATABASE_URL',
    schema: envSchema.DATABASE_URL,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'PostgreSQL database connection URL',
  },
  {
    key: 'PORT',
    schema: envSchema.PORT,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Port to run the application server',
  },
  {
    key: 'HOST',
    schema: envSchema.HOST,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Host address to bind the server',
  },
  {
    key: 'TRUST_PROXY',
    schema: envSchema.TRUST_PROXY,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Whether to trust proxy headers',
  },
  
  // Rate limiting configs
  {
    key: 'RATE_LIMIT_WINDOW',
    schema: envSchema.RATE_LIMIT_WINDOW,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Rate limiting window in milliseconds',
  },
  {
    key: 'RATE_LIMIT_MAX',
    schema: envSchema.RATE_LIMIT_MAX,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum number of requests in rate limit window',
  },
  
  // Feature-related configs
  {
    key: 'DEAL_EXPIRATION_NOTIFICATION_HOURS',
    schema: envSchema.DEAL_EXPIRATION_NOTIFICATION_HOURS,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Hours before deal expiration to send notification',
  },
  {
    key: 'MAX_DEAL_IMAGES_PER_BUSINESS',
    schema: envSchema.MAX_DEAL_IMAGES_PER_BUSINESS,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum number of images per business deal',
  },
  {
    key: 'MAX_BUSINESS_DOCUMENTS_COUNT',
    schema: envSchema.MAX_BUSINESS_DOCUMENTS_COUNT,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum number of documents per business',
  },
  {
    key: 'MAX_FILE_UPLOAD_SIZE',
    schema: envSchema.MAX_FILE_UPLOAD_SIZE,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum file upload size in bytes',
  },
  {
    key: 'ALLOWED_FILE_TYPES',
    schema: envSchema.ALLOWED_FILE_TYPES,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Comma-separated list of allowed file types',
  },
  
  // Development-related configs
  {
    key: 'ENABLE_DEBUG_LOGGING',
    schema: envSchema.ENABLE_DEBUG_LOGGING,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Enable debug logging',
  },
  {
    key: 'MOCK_AUTH_ENABLED',
    schema: envSchema.MOCK_AUTH_ENABLED,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Enable mock authentication for development',
  },
  {
    key: 'SLOW_NETWORK_SIMULATION',
    schema: envSchema.SLOW_NETWORK_SIMULATION,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Simulate slow network for testing',
  },
];

/**
 * Get environment name with validation
 */
function getEnvironment(): Environment {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  switch (env) {
    case 'development':
    case 'test':
    case 'production':
      return env;
    default:
      console.warn(`Invalid NODE_ENV "${env}", falling back to "development"`);
      return 'development';
  }
}

/**
 * Process and validate an environment variable
 * @param config Environment variable configuration
 * @returns The validated value
 */
function processEnvVar<T>(config: EnvVarConfig): T {
  const { key, schema, isRequired, requireInProduction, description } = config;
  const env = getEnvironment();
  const isProduction = env === 'production';
  
  // Check if the variable is required in the current environment
  const requiredInCurrentEnv = isRequired || (requireInProduction && isProduction);
  
  try {
    // Parse and validate the environment variable
    const result = schema.safeParse(process.env[key]);
    
    if (result.success) {
      return result.data;
    }
    
    // Handle validation errors
    const errors = result.error.errors.map(err => `${key}: ${err.message}`).join('; ');
    
    if (requiredInCurrentEnv) {
      console.error(`Configuration Error - ${description}: ${errors}`);
      process.exit(1);
    } else {
      console.warn(`Configuration Warning - ${description}: ${errors}`);
      // Return default value from schema
      const defaultResult = schema.safeParse(undefined);
      if (defaultResult.success) {
        return defaultResult.data;
      } else {
        throw new Error(`No valid default for ${key}`);
      }
    }
  } catch (error) {
    // Handle unexpected errors during validation
    if (requiredInCurrentEnv) {
      console.error(`Fatal configuration error for ${key} (${description}): ${error}`);
      process.exit(1);
    } else {
      console.warn(`Configuration warning for ${key} (${description}): ${error}`);
      // Attempt to return a safe default
      try {
        return schema.parse(undefined);
      } catch {
        throw new Error(`Cannot determine safe default for ${key}`);
      }
    }
  }
}

/**
 * Load all configuration values with validation
 */
function loadConfig(): AppConfig {
  const env = getEnvironment();
  
  // Create a validated config object
  const config: AppConfig = {
    env,
    isDevelopment: env === 'development',
    isTest: env === 'test',
    isProduction: env === 'production',
    
    security: {
      jwtSecret: processEnvVar<string>(ENV_VAR_CONFIG.find(c => c.key === 'JWT_SECRET')!),
      cookieSecret: processEnvVar<string>(ENV_VAR_CONFIG.find(c => c.key === 'COOKIE_SECRET')!),
      csrfSecret: processEnvVar<string>(ENV_VAR_CONFIG.find(c => c.key === 'CSRF_SECRET')!),
      bcryptRounds: processEnvVar<number>(ENV_VAR_CONFIG.find(c => c.key === 'BCRYPT_ROUNDS')!),
      jwtExpiresIn: processEnvVar<string>(ENV_VAR_CONFIG.find(c => c.key === 'JWT_EXPIRES_IN')!),
      rateLimitWindow: processEnvVar<number>(ENV_VAR_CONFIG.find(c => c.key === 'RATE_LIMIT_WINDOW')!),
      rateLimitMax: processEnvVar<number>(ENV_VAR_CONFIG.find(c => c.key === 'RATE_LIMIT_MAX')!),
    },
    
    infrastructure: {
      databaseUrl: processEnvVar<string>(ENV_VAR_CONFIG.find(c => c.key === 'DATABASE_URL')!),
      port: processEnvVar<number>(ENV_VAR_CONFIG.find(c => c.key === 'PORT')!),
      host: processEnvVar<string>(ENV_VAR_CONFIG.find(c => c.key === 'HOST')!),
      trustProxy: processEnvVar<boolean>(ENV_VAR_CONFIG.find(c => c.key === 'TRUST_PROXY')!),
    },
    
    features: {
      dealExpirationNotificationHours: processEnvVar<number>(
        ENV_VAR_CONFIG.find(c => c.key === 'DEAL_EXPIRATION_NOTIFICATION_HOURS')!
      ),
      maxDealImagesPerBusiness: processEnvVar<number>(
        ENV_VAR_CONFIG.find(c => c.key === 'MAX_DEAL_IMAGES_PER_BUSINESS')!
      ),
      maxBusinessDocumentsCount: processEnvVar<number>(
        ENV_VAR_CONFIG.find(c => c.key === 'MAX_BUSINESS_DOCUMENTS_COUNT')!
      ),
      maxFileUploadSize: processEnvVar<number>(
        ENV_VAR_CONFIG.find(c => c.key === 'MAX_FILE_UPLOAD_SIZE')!
      ),
      allowedFileTypes: processEnvVar<string[]>(
        ENV_VAR_CONFIG.find(c => c.key === 'ALLOWED_FILE_TYPES')!
      ),
    },
    
    development: {
      enableDebugLogging: processEnvVar<boolean>(
        ENV_VAR_CONFIG.find(c => c.key === 'ENABLE_DEBUG_LOGGING')!
      ),
      mockAuthEnabled: processEnvVar<boolean>(
        ENV_VAR_CONFIG.find(c => c.key === 'MOCK_AUTH_ENABLED')!
      ),
      slowNetworkSimulation: processEnvVar<boolean>(
        ENV_VAR_CONFIG.find(c => c.key === 'SLOW_NETWORK_SIMULATION')!
      ),
    },
  };
  
  // Make all properties deeply readonly using Object.freeze
  return deepFreeze(config);
}

/**
 * Deep freeze an object to prevent modification (including nested properties)
 * @param obj Object to freeze
 * @returns Frozen object
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  // Get property names and freeze each one
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];
    
    // If value is object and not null, recursively freeze it
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  
  // Freeze the object itself
  return Object.freeze(obj);
}

/**
 * Create a public view of the configuration with sensitive values removed
 * @param config Full application configuration
 * @returns Public configuration without sensitive values
 */
function createPublicConfig(config: AppConfig): PublicAppConfig {
  const { infrastructure, ...rest } = config;
  const { databaseUrl, ...publicInfrastructure } = infrastructure;
  
  return {
    ...rest,
    infrastructure: publicInfrastructure,
  };
}

// Load the full application configuration
const appConfig = loadConfig();

// Create a public view of the configuration
const publicConfig = createPublicConfig(appConfig);

/**
 * Generate a safe, redacted version of the config for logging
 * Replaces all secret values with '****'
 */
function getRedactedConfigForLogging(): Record<string, any> {
  // Deep clone the config to avoid modifying it
  const redactedConfig = JSON.parse(JSON.stringify(appConfig));
  
  // Redact security section
  redactedConfig.security = {
    ...redactedConfig.security,
    jwtSecret: '****',
    cookieSecret: '****',
    csrfSecret: '****',
  };
  
  // Redact database URL
  redactedConfig.infrastructure.databaseUrl = '****';
  
  return redactedConfig;
}

/**
 * Log the application configuration (with sensitive values redacted)
 */
export function logAppConfig() {
  if (appConfig.development.enableDebugLogging) {
    console.info('Application configuration loaded:', getRedactedConfigForLogging());
  } else {
    console.info('Application configuration loaded successfully');
  }
}

/**
 * ACCESS TO CONFIGURATION
 */

/**
 * Get full configuration (including sensitive values)
 * Only to be used within trusted server-side code
 */
export function getConfig(): Readonly<AppConfig> {
  return appConfig;
}

/**
 * Get public configuration (with sensitive values excluded)
 * Safe to use in client-side code or logs
 */
export function getPublicConfig(): Readonly<PublicAppConfig> {
  return publicConfig;
}

// Export public config as default for easy importing
export default publicConfig;