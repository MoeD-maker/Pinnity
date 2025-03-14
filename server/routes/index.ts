import type { Express } from "express";
import { createServer, type Server } from "http";
import { adminRoutes } from './admin.routes';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { dealRoutes } from './deal.routes';
import { businessRoutes } from './business.routes';
import { Request, Response } from "express";

/**
 * Register all API routes
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Health check route
  app.get("/api/health", (_req: Request, res: Response) => {
    // Only return what clients need to know
    const environmentInfo = {
      status: "ok",
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json(environmentInfo);
  });

  // Register all route modules
  adminRoutes(app);
  authRoutes(app);
  userRoutes(app);
  dealRoutes(app);
  businessRoutes(app);

  // Create and return HTTP server
  const server = createServer(app);
  return server;
}