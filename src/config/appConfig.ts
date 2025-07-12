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
import { calculateEntropy } from './generateSecrets';

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
  // Defer to the implementation in generateSecrets.ts
  return calculateEntropy(value);
}

/**
 * Environment variable validation schemas
 */
const schemas = {
  // Core environment
  env: z.enum(['development', 'test', 'production']).default('development'),
  
  // Security settings
  jwtSecret: z.string()
    .min(32, { message: 'JWT_SECRET must be at least 32 characters long' })
    .refine(val => calculateStringEntropy(val) > 5, { 
      message: 'JWT_SECRET has insufficient entropy (needs > 5 bits/char)' 
    }),
  
  cookieSecret: z.string()
    .min(32, { message: 'COOKIE_SECRET must be at least 32 characters long' })
    .refine(val => calculateStringEntropy(val) > 5, { 
      message: 'COOKIE_SECRET has insufficient entropy (needs > 5 bits/char)' 
    }),
  
  csrfSecret: z.string()
    .min(32, { message: 'CSRF_SECRET must be at least 32 characters long' })
    .refine(val => calculateStringEntropy(val) > 5, { 
      message: 'CSRF_SECRET has insufficient entropy (needs > 5 bits/char)' 
    }),
  
  bcryptRounds: z.coerce.number()
    .int()
    .min(8, { message: 'BCRYPT_ROUNDS should be at least 8 for security' })
    .max(14, { message: 'BCRYPT_ROUNDS should not exceed 14 to avoid performance issues' })
    .default(10),
  
  jwtExpiresIn: z.string()
    .regex(/^[0-9]+[smhdy]$/, { 
      message: 'JWT_EXPIRES_IN must be in format like 15m, 24h, 7d, 30d' 
    })
    .default('1d'),
  
  // Infrastructure settings
  databaseUrl: z.string()
    .url({ message: 'DATABASE_URL must be a valid URL' })
    .refine(url => url.startsWith('postgres://') || url.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a PostgreSQL connection string'
    }),
  
  port: z.coerce.number()
    .int()
    .min(1)
    .max(65535)
    .default(5000),
  
  host: z.string().default('0.0.0.0'),
  
  trustProxy: z.coerce.boolean().default(false),
  
  // Rate limiting settings
  rateLimitWindow: z.coerce.number()
    .int()
    .min(1000) // At least 1 second
    .default(900000), // 15 minutes
  
  rateLimitMax: z.coerce.number()
    .int()
    .min(10)
    .default(100),
  
  // Feature settings
  dealExpirationNotificationHours: z.coerce.number()
    .int()
    .min(1)
    .default(48),
  
  maxDealImagesPerBusiness: z.coerce.number()
    .int()
    .min(1)
    .default(10),
  
  maxBusinessDocumentsCount: z.coerce.number()
    .int()
    .min(1)
    .default(5),
  
  maxFileUploadSize: z.coerce.number()
    .int()
    .min(1024) // At least 1KB
    .default(5 * 1024 * 1024), // 5MB
  
  allowedFileTypes: z.string()
    .transform(val => val.split(',').map(t => t.trim()))
    .default('jpg,jpeg,png,pdf'),
  
  // Supabase settings
  supabaseUrl: z.string()
    .url({ message: 'VITE_SUPABASE_URL must be a valid URL' })
    .optional(),
  
  supabaseAnonKey: z.string()
    .min(32, { message: 'VITE_SUPABASE_ANON_KEY must be at least 32 characters long' })
    .optional(),
  
  // Development settings
  enableDebugLogging: z.coerce.boolean().default(false),
  mockAuthEnabled: z.coerce.boolean().default(false),
  slowNetworkSimulation: z.coerce.boolean().default(false),
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
const ENV_CONFIG: EnvVarConfig[] = [
  // Core environment
  {
    key: 'NODE_ENV',
    schema: schemas.env,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Application environment (development, test, production)'
  },
  
  // Security settings
  {
    key: 'JWT_SECRET',
    schema: schemas.jwtSecret,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'Secret key for JWT token signing'
  },
  {
    key: 'COOKIE_SECRET',
    schema: schemas.cookieSecret,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'Secret key for cookie signing'
  },
  {
    key: 'CSRF_SECRET',
    schema: schemas.csrfSecret,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'Secret key for CSRF token generation'
  },
  {
    key: 'BCRYPT_ROUNDS',
    schema: schemas.bcryptRounds,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Number of bcrypt hashing rounds'
  },
  {
    key: 'JWT_EXPIRES_IN',
    schema: schemas.jwtExpiresIn,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'JWT token expiration time'
  },
  {
    key: 'RATE_LIMIT_WINDOW',
    schema: schemas.rateLimitWindow,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Rate limiting time window in milliseconds'
  },
  {
    key: 'RATE_LIMIT_MAX',
    schema: schemas.rateLimitMax,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum requests per rate limit window'
  },
  
  // Infrastructure settings
  {
    key: 'DATABASE_URL',
    schema: schemas.databaseUrl,
    isSecret: true,
    isRequired: true,
    requireInProduction: true,
    description: 'PostgreSQL database connection URL'
  },
  {
    key: 'PORT',
    schema: schemas.port,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'HTTP server port'
  },
  {
    key: 'HOST',
    schema: schemas.host,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'HTTP server host'
  },
  {
    key: 'TRUST_PROXY',
    schema: schemas.trustProxy,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Whether to trust proxy headers'
  },
  
  // Feature settings
  {
    key: 'DEAL_EXPIRATION_NOTIFICATION_HOURS',
    schema: schemas.dealExpirationNotificationHours,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Hours before deal expiration to send notification'
  },
  {
    key: 'MAX_DEAL_IMAGES_PER_BUSINESS',
    schema: schemas.maxDealImagesPerBusiness,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum number of images per business'
  },
  {
    key: 'MAX_BUSINESS_DOCUMENTS_COUNT',
    schema: schemas.maxBusinessDocumentsCount,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum number of documents per business'
  },
  {
    key: 'MAX_FILE_UPLOAD_SIZE',
    schema: schemas.maxFileUploadSize,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Maximum file upload size in bytes'
  },
  {
    key: 'ALLOWED_FILE_TYPES',
    schema: schemas.allowedFileTypes,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Comma-separated list of allowed file extensions'
  },
  
  // Supabase settings
  {
    key: 'VITE_SUPABASE_URL',
    schema: schemas.supabaseUrl,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Supabase project URL for frontend client'
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    schema: schemas.supabaseAnonKey,
    isSecret: true,
    isRequired: false,
    requireInProduction: false,
    description: 'Supabase anonymous key for frontend client'
  },
  
  // Development settings
  {
    key: 'ENABLE_DEBUG_LOGGING',
    schema: schemas.enableDebugLogging,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Enable debug logging'
  },
  {
    key: 'MOCK_AUTH_ENABLED',
    schema: schemas.mockAuthEnabled,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Enable mock authentication (for development only)'
  },
  {
    key: 'SLOW_NETWORK_SIMULATION',
    schema: schemas.slowNetworkSimulation,
    isSecret: false,
    isRequired: false,
    requireInProduction: false,
    description: 'Simulate slow network conditions (for development only)'
  },
];

/**
 * Get environment name with validation
 */
function getEnvironment(): Environment {
  const envName = process.env.NODE_ENV || 'development';
  
  if (envName !== 'development' && envName !== 'test' && envName !== 'production') {
    console.warn(`Invalid NODE_ENV "${envName}", defaulting to "development"`);
    return 'development';
  }
  
  return envName as Environment;
}

/**
 * Process and validate an environment variable
 * @param config Environment variable configuration
 * @returns The validated value
 */
function processEnvVar<T>(config: EnvVarConfig): T {
  const { key, schema, isRequired, requireInProduction, description } = config;
  const isDevelopment = getEnvironment() !== 'production';
  const value = process.env[key];
  
  if (!value) {
    // Handle missing required values
    if (isRequired && (requireInProduction || isDevelopment)) {
      console.error(`Required environment variable ${key} is not set.`);
      console.error(`Description: ${description}`);
      
      if (requireInProduction && !isDevelopment) {
        console.error('This value is required in production. Exiting.');
        process.exit(1);
      }
      
      if (key === 'JWT_SECRET' && isDevelopment) {
        // Generate a temporary JWT secret for development
        console.warn(`WARNING: Using temporary JWT_SECRET for development mode. This would be an error in production.`);
        process.env[key] = Buffer.from(Math.random().toString(36)).toString('base64').repeat(3);
      }
    }
  }
  
  try {
    // Attempt to parse and validate the value
    return schema.parse(value) as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      console.error(`Invalid configuration for ${key}:\n${errorMessages}`);
      
      if (requireInProduction && !isDevelopment) {
        console.error('This value must be valid in production. Exiting.');
        process.exit(1);
      }
    } else {
      console.error(`Error processing configuration for ${key}:`, error);
    }
    
    // Return default value from schema as fallback
    return schema.parse(undefined) as T;
  }
}

/**
 * Load all configuration values with validation
 */
function loadConfig(): AppConfig {
  console.log('🔒 Validating environment configuration...');
  
  // Determine environment first
  const env = getEnvironment();
  const isDevelopment = env === 'development';
  const isTest = env === 'test';
  const isProduction = env === 'production';
  
  // Process each environment variable
  const envValues = new Map<string, any>();
  
  for (const config of ENV_CONFIG) {
    const value = processEnvVar(config);
    envValues.set(config.key, value);
  }
  
  // Build configuration object
  const config: AppConfig = {
    env,
    isDevelopment,
    isTest,
    isProduction,
    security: {
      jwtSecret: envValues.get('JWT_SECRET'),
      cookieSecret: envValues.get('COOKIE_SECRET'),
      csrfSecret: envValues.get('CSRF_SECRET'),
      bcryptRounds: envValues.get('BCRYPT_ROUNDS'),
      jwtExpiresIn: envValues.get('JWT_EXPIRES_IN'),
      rateLimitWindow: envValues.get('RATE_LIMIT_WINDOW'),
      rateLimitMax: envValues.get('RATE_LIMIT_MAX'),
    },
    infrastructure: {
      databaseUrl: envValues.get('DATABASE_URL'),
      port: envValues.get('PORT'),
      host: envValues.get('HOST'),
      trustProxy: envValues.get('TRUST_PROXY'),
    },
    features: {
      dealExpirationNotificationHours: envValues.get('DEAL_EXPIRATION_NOTIFICATION_HOURS'),
      maxDealImagesPerBusiness: envValues.get('MAX_DEAL_IMAGES_PER_BUSINESS'),
      maxBusinessDocumentsCount: envValues.get('MAX_BUSINESS_DOCUMENTS_COUNT'),
      maxFileUploadSize: envValues.get('MAX_FILE_UPLOAD_SIZE'),
      allowedFileTypes: envValues.get('ALLOWED_FILE_TYPES'),
    },
    development: {
      enableDebugLogging: envValues.get('ENABLE_DEBUG_LOGGING'),
      mockAuthEnabled: isDevelopment && envValues.get('MOCK_AUTH_ENABLED'),
      slowNetworkSimulation: isDevelopment && envValues.get('SLOW_NETWORK_SIMULATION'),
    },
  };
  
  // Return the immutable configuration
  return deepFreeze(config);
}

/**
 * Deep freeze an object to prevent modification (including nested properties)
 * @param obj Object to freeze
 * @returns Frozen object
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  // Freeze properties
  Object.freeze(obj);
  
  // Freeze nested objects recursively
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop];
    if (value !== null && 
        (typeof value === 'object' || typeof value === 'function') &&
        !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });
  
  return obj;
}

/**
 * Create a public view of the configuration with sensitive values removed
 * @param config Full application configuration
 * @returns Public configuration without sensitive values
 */
function createPublicConfig(config: AppConfig): PublicAppConfig {
  const { infrastructure, ...restConfig } = config;
  
  // Create a new infrastructure object without databaseUrl
  const { databaseUrl, ...publicInfrastructure } = infrastructure;
  
  // Return public configuration
  return {
    ...restConfig,
    infrastructure: publicInfrastructure,
  };
}

/**
 * Generate a safe, redacted version of the config for logging
 * Replaces all secret values with '****'
 */
function getRedactedConfigForLogging(): Record<string, any> {
  const config = getConfig();
  const redacted: Record<string, any> = {};
  
  // Helper function to redact secrets recursively
  function redactSecrets(obj: any, path: string[] = []): any {
    const result: Record<string, any> = {};
    
    for (const key in obj) {
      const newPath = [...path, key];
      const fullPath = newPath.join('.');
      
      // Check if this is a secret field
      const isSecret = ENV_CONFIG.some(
        cfg => cfg.isSecret && fullPath.endsWith(cfg.key.toLowerCase())
      );
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively handle objects
        result[key] = redactSecrets(obj[key], newPath);
      } else if (isSecret && typeof obj[key] === 'string') {
        // Redact secret values
        const value = obj[key] as string;
        if (value.length <= 4) {
          result[key] = '●●●●';
        } else {
          result[key] = `●●●● (length: ${value.length})`;
        }
      } else {
        // Pass through non-secret values
        result[key] = obj[key];
      }
    }
    
    return result;
  }
  
  return redactSecrets(config);
}

/**
 * Log the application configuration (with sensitive values redacted)
 */
export function logAppConfig() {
  const redactedConfig = getRedactedConfigForLogging();
  
  console.log('Environment Configuration:');
  
  // Log core environment
  console.log(`- NODE_ENV: ${redactedConfig.env}`);
  
  // Log security settings with redaction
  for (const config of ENV_CONFIG) {
    if (config.key !== 'NODE_ENV') {
      const value = process.env[config.key];
      
      if (value) {
        const displayValue = config.isSecret
          ? value.length <= 4
            ? '●●●●'
            : `●●●● (length: ${value.length})`
          : value;
          
        console.log(`- ${config.key}: ${displayValue}`);
      }
    }
  }
}

// Create and cache the configuration on module load
const config = loadConfig();
const publicConfig = createPublicConfig(config);

/**
 * Get full configuration (including sensitive values)
 * Only to be used within trusted server-side code
 */
export function getConfig(): Readonly<AppConfig> {
  return config;
}

/**
 * Get public configuration (with sensitive values excluded)
 * Safe to use in client-side code or logs
 */
export function getPublicConfig(): Readonly<PublicAppConfig> {
  return publicConfig;
}

// Default export for convenient importing
export default { getConfig, getPublicConfig, logAppConfig };