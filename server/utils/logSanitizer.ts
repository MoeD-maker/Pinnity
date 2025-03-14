/**
 * Log Sanitization Utility
 * Provides functions to sanitize sensitive data before logging
 */

// Configuration for log sanitization
export interface LogSanitizerConfig {
  // Maximum depth to sanitize in nested objects
  maxDepth: number;
  
  // Maximum length of array items to log before truncating
  maxArrayLength: number;
  
  // Maximum length of string values to log before truncating
  maxStringLength: number;
  
  // Fields that should be completely redacted (passwords, tokens, etc.)
  sensitiveFields: string[];
  
  // Fields that contain PII and should be masked (emails, phones, etc.)
  piiFields: string[];
  
  // Log verbosity level: 0=minimal, 1=basic, 2=detailed, 3=debug
  verbosityLevel: number;
  
  // Paths that should never have their responses logged
  noLogPaths: string[];
}

// Default sanitization configuration
export const defaultSanitizerConfig: LogSanitizerConfig = {
  maxDepth: 3,
  maxArrayLength: 5,
  maxStringLength: 100,
  sensitiveFields: [
    'password', 'pwd', 'pass', 
    'token', 'auth', 'jwt', 'key', 
    'secret', 'credential', 'accessToken', 
    'refreshToken', 'apiKey', 'privateKey',
    'csrfToken', 'authorization'
  ],
  piiFields: [
    'email', 'phone', 'phoneNumber', 'mobile',
    'address', 'location', 'zip', 'zipCode', 
    'postalCode', 'ssn', 'socialSecurity',
    'dob', 'dateOfBirth', 'birthDate',
    'firstName', 'lastName', 'fullName'
  ],
  verbosityLevel: 1,
  noLogPaths: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/register/individual',
    '/api/auth/register/business',
    '/api/user/*/change-password',
    '/api/auth/reset-password'
  ]
};

/**
 * Check if a given API path should have its response logged
 * @param path API path to check
 * @param config Sanitizer configuration
 * @returns True if the path should be logged, false otherwise
 */
export function shouldLogPath(path: string, config: LogSanitizerConfig = defaultSanitizerConfig): boolean {
  // Check if path exactly matches any in the noLogPaths array
  if (config.noLogPaths.includes(path)) {
    return false;
  }
  
  // Check if path matches any patterns with wildcards
  for (const noLogPath of config.noLogPaths) {
    if (noLogPath.includes('*')) {
      // Convert the wildcard pattern to a regex
      const regexPattern = new RegExp(
        '^' + noLogPath.replace(/\*/g, '[^/]*') + '$'
      );
      if (regexPattern.test(path)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Mask an email address for logging
 * Format: first character + *** + @ + domain
 * @param email The email to mask
 * @returns Masked email (e.g., "j***@example.com")
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return email;
  
  try {
    const atIndex = email.indexOf('@');
    if (atIndex <= 0) return email; // Not a valid email format
    
    const username = email.substring(0, atIndex);
    const domain = email.substring(atIndex);
    
    return `${username.charAt(0)}***${domain}`;
  } catch (error) {
    return '[INVALID_EMAIL]';
  }
}

/**
 * Mask a phone number for logging
 * Format: --last 4 digits (if available)
 * @param phone The phone number to mask
 * @returns Masked phone number (e.g., "--1234")
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;
  
  try {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If we have at least 4 digits, show only last 4
    if (digits.length >= 4) {
      return `--${digits.slice(-4)}`;
    }
    
    // Otherwise, just return placeholder
    return '--****';
  } catch (error) {
    return '[INVALID_PHONE]';
  }
}

/**
 * Mask a physical address for logging
 * @param address The address to mask
 * @returns Masked address with only city/state/country visible
 */
export function maskAddress(address: string): string {
  if (!address || typeof address !== 'string') return address;
  
  // A simplistic approach - in a real application, you might want
  // to use an address parser to keep only city, state, country
  return '[ADDRESS_REDACTED]';
}

/**
 * Mask personally identifiable information based on field name
 * @param fieldName Name of the field
 * @param value Value to potentially mask
 * @param config Sanitizer configuration
 * @returns Masked value if needed, original otherwise
 */
export function maskPiiByFieldName(fieldName: string, value: any, config: LogSanitizerConfig = defaultSanitizerConfig): any {
  if (value === null || value === undefined) return value;
  
  const lowerFieldName = fieldName.toLowerCase();
  
  // Check if this is a PII field that needs masking
  if (config.piiFields.some(pii => lowerFieldName.includes(pii))) {
    if (lowerFieldName.includes('email')) {
      return maskEmail(String(value));
    } else if (lowerFieldName.includes('phone') || lowerFieldName.includes('mobile')) {
      return maskPhone(String(value));
    } else if (lowerFieldName.includes('address') || lowerFieldName.includes('location')) {
      return maskAddress(String(value));
    } else {
      // For other PII, redact with field type indicator
      const piiType = config.piiFields.find(pii => lowerFieldName.includes(pii));
      return `[${piiType?.toUpperCase()}_REDACTED]`;
    }
  }
  
  return value;
}

/**
 * Check if a field should be completely redacted
 * @param fieldName Name of the field to check
 * @param config Sanitizer configuration
 * @returns True if the field should be redacted
 */
export function shouldRedactField(fieldName: string, config: LogSanitizerConfig = defaultSanitizerConfig): boolean {
  const lowerFieldName = fieldName.toLowerCase();
  return config.sensitiveFields.some(sensitive => lowerFieldName.includes(sensitive));
}

/**
 * Recursively sanitize an object for safe logging
 * @param obj Object to sanitize
 * @param config Sanitizer configuration
 * @param currentDepth Current recursion depth
 * @returns Sanitized object safe for logging
 */
export function sanitizeObject(
  obj: any, 
  config: LogSanitizerConfig = defaultSanitizerConfig,
  currentDepth: number = 0
): any {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle primitive types
  if (typeof obj !== 'object') {
    // Truncate long strings
    if (typeof obj === 'string' && obj.length > config.maxStringLength) {
      return `${obj.substring(0, config.maxStringLength)}... (${obj.length} chars)`;
    }
    return obj;
  }
  
  // Stop at max depth and return placeholder
  if (currentDepth >= config.maxDepth) {
    if (Array.isArray(obj)) {
      return `[Array with ${obj.length} items]`;
    }
    return '[Object]';
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    // If array is too large, truncate it
    if (obj.length > config.maxArrayLength) {
      return [
        ...obj.slice(0, config.maxArrayLength).map(item => 
          sanitizeObject(item, config, currentDepth + 1)
        ),
        `... (${obj.length - config.maxArrayLength} more items)`
      ];
    }
    
    // Otherwise sanitize each item
    return obj.map(item => sanitizeObject(item, config, currentDepth + 1));
  }
  
  // Handle objects
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if this field should be completely redacted
    if (shouldRedactField(key, config)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Mask PII fields
    const maskedValue = maskPiiByFieldName(key, value, config);
    if (maskedValue !== value) {
      sanitized[key] = maskedValue;
      continue;
    }
    
    // Recursively sanitize object properties
    sanitized[key] = sanitizeObject(value, config, currentDepth + 1);
  }
  
  return sanitized;
}

/**
 * Main sanitization function for log data
 * @param data Data to sanitize for logging
 * @param config Optional sanitizer configuration
 * @returns Sanitized data safe for logging
 */
export function sanitizeLogData(
  data: any,
  config: LogSanitizerConfig = defaultSanitizerConfig
): any {
  return sanitizeObject(data, config);
}

/**
 * Truncate a log line to a maximum length
 * @param logLine Log line to potentially truncate
 * @param maxLength Maximum allowed length
 * @returns Truncated log line if needed
 */
export function truncateLogLine(logLine: string, maxLength: number = 1000): string {
  if (logLine.length <= maxLength) {
    return logLine;
  }
  
  return `${logLine.substring(0, maxLength)}... (${logLine.length - maxLength} more chars)`;
}

/**
 * Determine if a response should be logged based on verbosity level
 * @param statusCode HTTP status code of the response
 * @param verbosityLevel Current verbosity level configuration
 * @returns True if the response should be logged
 */
export function shouldLogResponseByVerbosity(statusCode: number, verbosityLevel: number): boolean {
  // At minimal verbosity (0), only log errors
  if (verbosityLevel === 0) {
    return statusCode >= 400;
  }
  
  // At basic verbosity (1), log all non-2xx responses and a sample of 2xx
  if (verbosityLevel === 1) {
    if (statusCode < 200 || statusCode >= 300) {
      return true;
    }
    // Log ~10% of successful responses for sampling
    return Math.random() < 0.1;
  }
  
  // At detailed verbosity (2) or debug (3), log everything
  return true;
}