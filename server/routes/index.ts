import type { Express } from "express";
import { createServer, type Server } from "http";
import { adminRoutes } from './admin.routes.fixed';
import { authRoutes } from './auth.routes.fixed';
import { userRoutes } from './user.routes.fixed';
import { dealRoutes } from './deal.routes.fixed';
import { businessRoutes } from './business.routes.fixed';
import { bypassRouter } from '../admin-api-bypass';
import { addTestRoutes } from '../test-terms';
import { Request, Response, NextFunction } from "express";
import { 
  deprecationMiddleware, 
  versionHeadersMiddleware, 
  getVersionAndEnvInfo,
  createVersionedRoutes
} from '../../src/utils/routeVersioning';

/**
 * Register all API routes
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Apply API versioning middleware
  app.use(deprecationMiddleware);
  app.use(versionHeadersMiddleware());

  // Health check route with version information
  // Support both /api/health and /api/v1/health
  const [versionedHealthPath, legacyHealthPath] = createVersionedRoutes('/health');
  
  app.get(versionedHealthPath, (_req: Request, res: Response) => {
    // Return status with version information
    const environmentInfo = {
      status: "ok",
      ...getVersionAndEnvInfo()
    };
    
    res.json(environmentInfo);
  });
  
  // Legacy health check route (for backward compatibility)
  app.get(legacyHealthPath, (_req: Request, res: Response) => {
    // Return status with version information
    const environmentInfo = {
      status: "ok",
      ...getVersionAndEnvInfo()
    };
    
    res.json(environmentInfo);
  });

  // Register all route modules
  adminRoutes(app);
  authRoutes(app);
  userRoutes(app);
  dealRoutes(app);
  businessRoutes(app);
  
  // Add test routes for debugging Terms of Service validation
  addTestRoutes(app);
  
  // Add CSRF token generation endpoint
  app.get('/api/csrf-token', (req, res) => {
    // This will generate a new token using the csurf middleware
    try {
      const token = req.csrfToken();
      console.log('Generated new CSRF token for client');
      return res.json({ csrfToken: token });
    } catch (error) {
      console.error('Error generating CSRF token:', error);
      return res.status(500).json({ 
        error: 'Failed to generate CSRF token',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Simplified test route without CSRF protection
  app.post('/api/bypass-test', (req, res) => {
    console.log('BYPASS TEST ROUTE - NO CSRF PROTECTION');
    console.log('Body:', req.body);
    return res.json({
      message: 'Test successful - CSRF bypassed',
      receivedData: req.body,
      success: true
    });
  });
  
  // Register direct bypass router for admin deal creation
  // This route bypasses Vite middleware by using a custom path
  app.use('/api/direct/admin', bypassRouter);

  // Create and return HTTP server
  const server = createServer(app);
  return server;
}