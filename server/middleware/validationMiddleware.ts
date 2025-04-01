import { Request, Response, NextFunction } from "express";
import { AnyZodObject, z } from "zod";

/**
 * Configuration options for validation middleware
 */
export interface ValidationOptions {
  /**
   * Whether to trim string values before validation
   * Default: true
   */
  trimStrings?: boolean;

  /**
   * Whether to sanitize inputs to prevent injection attacks
   * Default: true
   */
  sanitizeInputs?: boolean;

  /**
   * Maximum allowed size (in characters) for string inputs
   * Used to prevent DoS attacks with large inputs
   * Default: 10000
   */
  maxInputSize?: number;

  /**
   * Whether to log validation errors
   * Default: true
   */
  logErrors?: boolean;
}

const defaultOptions: ValidationOptions = {
  trimStrings: true,
  sanitizeInputs: true,
  maxInputSize: 5000000, // Increased to 5MB to accommodate base64 encoded images
  logErrors: true
};

/**
 * Basic sanitization to prevent common injection attacks
 * @param value The value to sanitize
 * @returns Sanitized value
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Simple sanitization for demonstration purposes
    // In a production environment, use a more comprehensive sanitization library
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&quot;')
      .replace(/\${/g, '&#36;{') // Template string injection
      .replace(/\(\)/g, '&#40;&#41;'); // Function execution
  } else if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  } else if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = sanitizeValue(value[key]);
      }
    }
    return result;
  }
  return value;
}

/**
 * Check if a value exceeds the maximum allowed size
 * @param value The value to check
 * @param maxSize Maximum allowed size in characters
 * @returns True if the value is too large
 */
function isValueTooLarge(value: any, maxSize: number): boolean {
  if (typeof value === 'string') {
    return value.length > maxSize;
  } else if (Array.isArray(value)) {
    return value.some(item => isValueTooLarge(item, maxSize));
  } else if (value && typeof value === 'object') {
    return Object.values(value).some(v => isValueTooLarge(v, maxSize));
  }
  return false;
}

/**
 * Trim string values in an object recursively
 * @param value The value to process
 * @returns Processed value with trimmed strings
 */
function trimStringValues(value: any): any {
  if (typeof value === 'string') {
    return value.trim();
  } else if (Array.isArray(value)) {
    return value.map(trimStringValues);
  } else if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = trimStringValues(value[key]);
      }
    }
    return result;
  }
  return value;
}

/**
 * Middleware factory that validates request data against a Zod schema
 * Includes enhanced security features like sanitization and size limits
 * 
 * @param schema The Zod schema to validate against
 * @param options Configuration options for validation
 * @returns Express middleware function
 */
export const validate = (schema: AnyZodObject, options: ValidationOptions = {}) => 
  async (req: Request, res: Response, next: NextFunction) => {
    // Merge with default options
    const config = { ...defaultOptions, ...options };
    
    try {
      // Ensure req.body exists, otherwise create an empty object
      // This handles cases where body-parser might not have run or failed
      if (req.body === undefined) {
        req.body = {};
        console.warn('Request body is undefined. Creating empty object.');
      }
      
      // Apply pre-validation processing
      let data = req.body;
      
      // Log for debugging
      console.log(`Validating request for ${req.method} ${req.path}:`, 
        typeof data === 'object' ? (JSON.stringify(data, null, 2).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : '')) : `${typeof data}`);
      
      // Check for excessively large input
      if (config.maxInputSize && isValueTooLarge(data, config.maxInputSize)) {
        throw new Error(`Request payload too large (exceeds ${config.maxInputSize} characters)`);
      }
      
      // Trim string values if enabled
      if (config.trimStrings) {
        data = trimStringValues(data);
      }
      
      // Sanitize input if enabled
      if (config.sanitizeInputs) {
        data = sanitizeValue(data);
      }
      
      // Prepare validation object
      const toValidate: Record<string, any> = {};
      // Allow schema to validate different parts of the request
      if (req.body) toValidate['body'] = data;
      if (req.query) toValidate['query'] = req.query;
      if (req.params) toValidate['params'] = req.params;
      
      // Validate against schema
      const validatedData = await schema.parseAsync(toValidate);
      
      // Replace request parts with validated data
      // Type assertion for validatedData since we know the schema structure
      const validatedResult = validatedData as {
        body?: any;
        query?: any;
        params?: any;
      };
      
      if (validatedResult.body) req.body = validatedResult.body;
      if (validatedResult.query) req.query = validatedResult.query;
      if (validatedResult.params) req.params = validatedResult.params;
      
      next();
    } catch (error) {
      if (config.logErrors) {
        console.error("Validation error:", error);
      }
      
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Validation failed",
          errors,
        });
      }
      
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Validation failed"
      });
    }
  };