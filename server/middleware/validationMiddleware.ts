import { AnyZodObject, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory that validates request data against a Zod schema
 * 
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate request data against the schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      // If validation passes, continue to the next middleware/route handler
      return next();
    } catch (error) {
      // Format ZodError for better client response
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: 'Validation error',
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      // Handle any other errors
      console.error('Validation middleware error:', error);
      return res.status(400).json({ 
        message: 'Invalid request data',
        error: error instanceof Error ? error.message : 'Unknown validation error'
      });
    }
  };