import express, { Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';

// Extend Express Request type to include request ID and CSRF token
declare global {
  namespace Express {
    interface Request {
      id?: string;
      csrfToken(): string;
    }
  }
}

// Define our Request type
type Request = express.Request;

// Load environment variables from .env file
dotenv.config();

const app = express();
// Secure parsing of JSON payloads with size limits
app.use(express.json({ 
  limit: '1mb',  // Prevent large payload attacks
  strict: true   // Reject payloads that are not valid JSON
}));

// Process form data with appropriate limits
app.use(express.urlencoded({ 
  extended: false,
  limit: '1mb'   // Prevent large payload attacks
}));

// Enable secure cookie parsing with a secret
// Using a strong secret helps prevent cookie tampering
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'pinnity-secure-cookie-aee723bf-d5b5-4fe9-8fe2-91979de0c7-dev';

// Validate cookie secret in production
if (process.env.NODE_ENV === 'production' && (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET.length < 32)) {
  console.error('ERROR: COOKIE_SECRET not set or too short in production environment. Set a strong secret in .env');
  process.exit(1);
}

app.use(cookieParser(COOKIE_SECRET));

// Set secure headers globally
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME type sniffing
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Protect against clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block'); // Enable browser XSS filtering
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains'); // Force HTTPS 
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private'); // Prevent caching of sensitive data
  res.setHeader('Pragma', 'no-cache'); // Legacy cache control
  
  // No informative server identity
  res.removeHeader('X-Powered-By');
  
  next();
});

// CSRF protection for non-GET requests
const csrfProtection = csurf({ 
  cookie: {
    httpOnly: true,        // Prevent JavaScript access to cookie
    sameSite: 'strict',    // Prevents the cookie from being sent in cross-site requests
    secure: process.env.NODE_ENV === 'production',  // Send cookie only over HTTPS in production
    maxAge: 3600,          // Session expiration in seconds (1 hour)
    path: '/',             // Ensure cookie is available for all paths
    signed: true           // Sign the cookie to detect tampering
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Only protect state-changing methods
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Apply CSRF protection to all state-changing routes
// Auth routes - user registration, login
app.use('/api/auth/*', csrfProtection);

// User profile routes - personal data, settings
app.use('/api/user/*', csrfProtection);

// Business routes - business management, update
app.use('/api/business/*', csrfProtection);

// Admin routes - user management, approval workflows
app.use('/api/admin/*', csrfProtection);

// Deal routes - create, update, approval
app.use('/api/deals', csrfProtection);
app.use('/api/deals/*', csrfProtection);

// Additional protection for sensitive operations
app.post('/api/*', csrfProtection); // All POST operations
app.put('/api/*', csrfProtection);  // All PUT operations
app.delete('/api/*', csrfProtection); // All DELETE operations

// Generate a unique request ID for error correlation
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// Add a route to get a CSRF token
app.get('/api/csrf-token', csrfProtection, (req: Request, res: Response) => {
  res.json({ csrfToken: req.csrfToken() });
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler with enhanced security error responses
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Check if response has already been sent
    if (res.headersSent) {
      console.error(`[ERROR] [${req.id}] Headers already sent, cannot send error response`);
      return;
    }
    
    // Determine status code
    const status = err.status || err.statusCode || 500;
    
    // Create response object with request ID for correlation
    const errorResponse: any = {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    };

    // Set traceId for operational monitoring (could be integrated with APM tools)
    const traceId = `t-${req.id || Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Special handling for security-related errors
    if (err.code === 'EBADCSRFTOKEN') {
      // CSRF token validation failed
      errorResponse.message = "Security validation failed. Please refresh the page and try again.";
      errorResponse.type = "security_error";
      errorResponse.code = "csrf_token_invalid";
      
      // Log potential CSRF attack attempts with IP information for investigation
      console.warn(`[SECURITY] [${req.id}] [${traceId}] CSRF validation failed:`, {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        referer: req.headers.referer,
        // Don't log the full headers or body as they may contain sensitive information
        bodySize: req.body ? JSON.stringify(req.body).length : 0
      });
      
      return res.status(403).json(errorResponse);
    } 
    // Handle JWT/authentication errors
    else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
      errorResponse.message = "Your session has expired. Please log in again.";
      errorResponse.type = "auth_error";
      errorResponse.code = err.name === 'TokenExpiredError' ? "token_expired" : "token_invalid";
      
      // Log auth errors with medium severity
      console.warn(`[AUTH] [${req.id}] [${traceId}] Token validation error:`, {
        errorType: err.name,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(401).json(errorResponse);
    }
    // Rate limiting errors
    else if (err.type === 'too-many-requests') {
      errorResponse.message = "Too many requests. Please try again later.";
      errorResponse.type = "rate_limit_error";
      errorResponse.retryAfter = err.retryAfter || 60; // Seconds until retry is allowed
      
      console.warn(`[RATE_LIMIT] [${req.id}] [${traceId}] Rate limit exceeded:`, {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      
      // Set standard retry-after header if available
      if (err.retryAfter) {
        res.setHeader('Retry-After', String(err.retryAfter));
      }
      
      return res.status(429).json(errorResponse);
    }
    // Validation errors - safe to return details
    else if (err.name === 'ValidationError' || err.name === 'ZodError') {
      errorResponse.message = err.message || "Validation failed";
      errorResponse.type = "validation_error";
      
      // Sanitize validation errors to ensure no sensitive data is exposed
      const safeErrors = (err.errors || err.issues || []).map((e: any) => ({
        path: e.path,
        message: e.message,
        // Don't include the actual invalid value as it might contain PII or sensitive data
        type: e.type || e.code
      }));
      
      errorResponse.details = safeErrors;
      
      console.info(`[VALIDATION] [${req.id}] [${traceId}] Validation error:`, {
        path: req.path,
        method: req.method,
        errorCount: safeErrors.length
      });
      
      return res.status(400).json(errorResponse);
    }
    // Database-related errors
    else if (err.code && (
      // PostgreSQL error codes
      (typeof err.code === 'string' && err.code.startsWith('23')) || 
      // SQLite error codes
      (typeof err.code === 'string' && err.code.startsWith('SQLITE_')) ||
      // Constraint violations and other DB errors
      err.name === 'SequelizeError' || 
      err.name === 'DBError' ||
      err.name === 'PrismaClientKnownRequestError'
    )) {
      // Map database errors to appropriate responses without leaking schema details
      errorResponse.message = "Data operation failed";
      errorResponse.type = "data_error";
      
      // For unique constraint violations, give a more specific message
      if (err.code === '23505' || 
          (typeof err.code === 'string' && err.code.includes('unique'))) {
        errorResponse.message = "This record already exists";
        errorResponse.code = "duplicate_record";
      }
      
      console.error(`[DATABASE] [${req.id}] [${traceId}] Database error:`, {
        code: err.code,
        errorName: err.name,
        // Don't log the full error message as it might contain table names or other schema info
        severity: err.severity || 'ERROR',
        constraint: err.constraint ? '[REDACTED]' : undefined
      });
      
      return res.status(400).json(errorResponse);
    }
    // Regular error categorization
    else if (status >= 400 && status < 500) {
      // For 4xx client errors, include a sanitized version of the error message
      // Strip any potential stack traces or sensitive info from error messages
      const safeMessage = err.message ? 
        err.message.split('\n')[0].substring(0, 200) : "Client Error";
      
      errorResponse.message = safeMessage;
      errorResponse.type = "client_error";
      // Optionally include an error code if available
      if (err.code) {
        errorResponse.code = typeof err.code === 'string' ? 
          err.code.replace(/[^a-z0-9_]/gi, '_').toLowerCase() : 'unknown_error';
      }
    } else {
      // For 5xx server errors, use a generic message for security
      errorResponse.message = "Internal Server Error";
      errorResponse.type = "server_error";
      
      // In production, include a support reference ID
      if (process.env.NODE_ENV === 'production') {
        errorResponse.supportReference = traceId;
      }
    }

    // Log detailed error information for debugging
    // In production, avoid logging sensitive data
    const isProd = process.env.NODE_ENV === 'production';
    const errorLog = {
      requestId: req.id,
      traceId,
      statusCode: status,
      url: req.originalUrl || req.url,
      method: req.method,
      errorName: err.name,
      errorCode: err.code,
      errorMessage: err.message,
      // Only include stack traces in development
      errorStack: isProd ? undefined : err.stack,
      // Safely capture query parameters without logging sensitive values
      query: isProd ? '[REDACTED IN PRODUCTION]' : safelyRedactQueryParams(req.query),
      // Avoid logging full body in production to prevent sensitive data exposure
      body: isProd ? '[REDACTED IN PRODUCTION]' : safelyRedactRequestBody(req.body),
      // Include user ID if authenticated (helps with debugging user-specific issues)
      userId: req.user?.userId
    };
    
    // Use error severity levels appropriately
    if (status >= 500) {
      console.error(`[ERROR] [${req.id}] [${traceId}] Server error:`, errorLog);
    } else {
      console.warn(`[WARN] [${req.id}] [${traceId}] Client error:`, errorLog);
    }

    // Send appropriate response to client
    res.status(status).json(errorResponse);
  });
  
  /**
   * Safely redact sensitive information from query parameters
   * @param query Request query object
   * @returns Redacted query object safe for logging
   */
  function safelyRedactQueryParams(query: any): any {
    if (!query) return {};
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential', 'pwd'];
    const redactedQuery: Record<string, any> = {};
    
    for (const key in query) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        redactedQuery[key] = '[REDACTED]';
      } else {
        redactedQuery[key] = query[key];
      }
    }
    
    return redactedQuery;
  }
  
  /**
   * Safely redact sensitive information from request body
   * @param body Request body object
   * @returns Redacted body object safe for logging
   */
  function safelyRedactRequestBody(body: any): any {
    if (!body) return {};
    if (typeof body !== 'object') return body;
    
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential', 'pwd', 'credit', 'card'];
    const redactedBody: Record<string, any> = {};
    
    for (const key in body) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        redactedBody[key] = '[REDACTED]';
      } else if (typeof body[key] === 'object' && body[key] !== null) {
        redactedBody[key] = safelyRedactRequestBody(body[key]);
      } else {
        redactedBody[key] = body[key];
      }
    }
    
    return redactedBody;
  }

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    const replitSlug = process.env.REPL_SLUG || '';
    const replitOwner = process.env.REPL_OWNER || '';
    const replitId = process.env.REPL_ID || '';
    
    if (app.get('env') === 'development' && replitId) {
      const replitDevDomain = process.env.REPLIT_DEV_DOMAIN || '';
      log(`Dev server running! Access via:`);
      log(`→ Replit webview: https://${replitDevDomain}`);
      log(`→ This terminal's port forwarding: http://localhost:${port}`);
    }
  });
})();
