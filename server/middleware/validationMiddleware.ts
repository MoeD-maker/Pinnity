import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Middleware factory that validates request data against a Zod schema
 * 
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract and validate different parts of the request according to the schema
      const dataToValidate: Record<string, any> = {};
      
      if (schema.shape.body) {
        dataToValidate.body = req.body;
      }
      
      if (schema.shape.params) {
        dataToValidate.params = req.params;
      }
      
      if (schema.shape.query) {
        dataToValidate.query = req.query;
      }
      
      // Validate all parts of the request
      await schema.parseAsync(dataToValidate);
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        // Generate a well-formatted error response
        const validationError = fromZodError(error);
        
        // Return a 400 Bad Request with detailed validation errors
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: validationError.details.map(detail => ({
            path: detail.path,
            message: detail.message
          })),
          requestId: req.id // Include request ID for correlation
        });
      }
      
      // For non-validation errors, pass to the next error handler
      next(error);
    }
  };