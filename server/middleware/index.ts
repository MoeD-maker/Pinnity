/**
 * Centralized exports for all middleware functions
 * This allows for cleaner imports in route files
 */

// Export CSRF protection middleware
export { verifyCsrf } from './csrfMiddleware';

// Export validation middleware
export { validate } from './validationMiddleware';

// Export rate limiting middleware
export { 
  authRateLimiter, 
  securityRateLimiter 
} from './rateLimit';

// Export password validation middleware
export { validatePasswordStrength } from './passwordValidationMiddleware';

// Export any other middleware that might be needed
// export { someOtherMiddleware } from './someOtherMiddlewareFile';