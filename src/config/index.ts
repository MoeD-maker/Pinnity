/**
 * Configuration System Index
 * 
 * This is the main entry point for the configuration system. 
 * It re-exports everything from the various configuration modules for easy access.
 */

// Import functions for local use
import { logAppConfig as _logAppConfig } from './appConfig';

// Export the main configuration API
export { 
  default as config,
  getConfig,
  getPublicConfig,
  logAppConfig
} from './appConfig';

// Export configuration utilities
export {
  getConfigValue,
  redactIfSecret,
  isSecretPath,
  getRedactedConfigValue
} from './configUtils';

// Export backwards compatibility functions
export {
  getRequiredEnv,
  getOptionalEnv,
  shouldRedactEnvVar
} from './integration';

// Export secret generation utilities
export {
  generateSecureSecret,
  calculateEntropy,
  generateApplicationSecrets,
  formatForEnvFile
} from './generateSecrets';

// Export configuration test function
export { testConfigurationSystem } from './configTest';

/**
 * Initialize the configuration system
 * This should be called early in the application startup
 */
export function initializeConfig(): void {
  // Log that config is loaded (with redacted secrets)
  _logAppConfig();
}

// Import these functions directly to use in the default export
import { getConfig, getPublicConfig } from './appConfig';

// Default export for easy importing
export default {
  initializeConfig,
  getConfig,
  getPublicConfig,
};