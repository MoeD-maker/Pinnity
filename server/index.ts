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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CSRF protection for non-GET requests
const csrfProtection = csurf({ 
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
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

// Apply CSRF protection to state-changing routes
app.use('/api/auth/*', csrfProtection);
app.use('/api/user/*', csrfProtection);
app.use('/api/deals', csrfProtection);

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

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Determine status code
    const status = err.status || err.statusCode || 500;
    
    // Create response object with request ID for correlation
    const errorResponse: any = {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    };

    // For 4xx client errors, include the specific error message
    if (status >= 400 && status < 500) {
      errorResponse.message = err.message || "Client Error";
    } else {
      // For 5xx server errors, use a generic message for security
      errorResponse.message = "Internal Server Error";
      
      // Add additional info for CSRF errors since they're common
      if (err.code === 'EBADCSRFTOKEN') {
        errorResponse.message = "Invalid CSRF token. Please refresh the page and try again.";
      }
    }

    // Log detailed error information for debugging
    console.error(`[ERROR] [${req.id}] ${req.method} ${req.path}:`, {
      statusCode: status,
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
      body: req.body
    });

    // Send appropriate response to client
    res.status(status).json(errorResponse);
  });

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
