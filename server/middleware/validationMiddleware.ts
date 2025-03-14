import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

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

// Default validation options
const defaultOptions: ValidationOptions = {
  trimStrings: true,
  sanitizeInputs: true,
  maxInputSize: 10000,
  logErrors: true
};

/**
 * Basic sanitization to prevent common injection attacks
 * @param value The value to sanitize
 * @returns Sanitized value
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Replace potential HTML/script tags
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\$/g, '&#36;')
      .replace(/'/g, '&#39;')
      .replace(/"/g, '&quot;');
  } else if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  } else if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key in value) {
      result[key] = sanitizeValue(value[key]);
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
  } else if (value !== null && typeof value === 'object') {
    return Object.values(value).some(item => isValueTooLarge(item, maxSize));
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
    return value.map(item => trimStringValues(item));
  } else if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const key in value) {
      result[key] = trimStringValues(value[key]);
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
    // Merge provided options with defaults
    const config = { ...defaultOptions, ...options };
    
    try {
      // Check for oversized inputs to prevent DoS attacks
      if (config.maxInputSize && (
          isValueTooLarge(req.body, config.maxInputSize) ||
          isValueTooLarge(req.params, config.maxInputSize) ||
          isValueTooLarge(req.query, config.maxInputSize)
      )) {
        return res.status(413).json({
          success: false,
          message: 'Request entity too large',
          requestId: req.id,
          type: 'validation_error',
          code: 'input_too_large'
        });
      }
      
      // Extract and validate different parts of the request according to the schema
      const dataToValidate: Record<string, any> = {};
      
      if (schema.shape.body) {
        let body = req.body;
        
        // Pre-process body data
        if (config.trimStrings) {
          body = trimStringValues(body);
        }
        
        if (config.sanitizeInputs) {
          body = sanitizeValue(body);
        }
        
        dataToValidate.body = body;
        // Update the request body with sanitized values
        req.body = body;
      }
      
      if (schema.shape.params) {
        let params = req.params;
        
        if (config.trimStrings) {
          params = trimStringValues(params);
        }
        
        if (config.sanitizeInputs) {
          params = sanitizeValue(params);
        }
        
        dataToValidate.params = params;
        // Update the request params with sanitized values
        req.params = params;
      }
      
      if (schema.shape.query) {
        let query = req.query;
        
        if (config.sanitizeInputs) {
          query = sanitizeValue(query as Record<string, any>) as typeof query;
        }
        
        dataToValidate.query = query;
        // Update the request query with sanitized values
        req.query = query;
      }
      
      // Validate all parts of the request
      await schema.parseAsync(dataToValidate);
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        // Generate a well-formatted error response
        const validationError = fromZodError(error);
        
        // Log validation errors if configured
        if (config.logErrors) {
          console.warn(`[VALIDATION] [${req.id}] ${req.method} ${req.path}:`, {
            errors: validationError.details,
            ip: req.ip,
            // Include the body size instead of the actual body which might contain sensitive data
            bodySize: req.body ? JSON.stringify(req.body).length : 0
          });
        }
        
        // Return a 400 Bad Request with detailed validation errors
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationError.details.map(detail => ({
            path: detail.path,
            message: detail.message
          })),
          requestId: req.id, // Include request ID for correlation
          type: 'validation_error'
        });
      }
      
      // For non-validation errors, pass to the next error handler
      next(error);
    }
  };