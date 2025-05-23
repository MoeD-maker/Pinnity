import type { Express } from "express";
import { createServer, type Server } from "http";
import { adminRoutes } from './admin.routes.fixed';
import { authRoutes } from './auth.routes.fixed';
import { userRoutes } from './user.routes.fixed';
import { dealRoutes } from './deal.routes.fixed';
import { businessRoutes } from './business.routes.fixed';
import { bypassRouter } from '../admin-api-bypass';
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
  
  // Register direct bypass router for admin deal creation
  // This route bypasses Vite middleware by using a custom path
  app.use('/api/direct/admin', bypassRouter);

  // Create and return HTTP server
  const server = createServer(app);
  return server;
}