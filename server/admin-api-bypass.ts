/**
 * Direct API handler for bypassing Vite middleware issues
 * This file provides direct Express routes that avoid Vite's routing interference
 */
import express, { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { z } from 'zod';
import { insertDealSchema } from '@shared/schema';
import { authenticate, authorize } from './middleware';

// Create a simple Express router
const bypassRouter = express.Router();

// Handle CORS preflight requests
bypassRouter.options('*', (req, res) => {
  // Set CORS headers for preflight requests
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 
    'Content-Type, Authorization, CSRF-Token, X-Requested-With, X-Bypass-Vite, X-Programming-Access, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(204).end();
});

/**
 * Special middleware for API access that bypasses CSRF
 * This is ONLY for programmatic access, not for browser-based requests
 * It requires specific headers that browsers wouldn't normally send
 */
function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  const bypassHeader = req.headers['x-bypass-vite'];
  const programmingAccess = req.headers['x-programming-access'];
  
  console.log('API KEY ACCESS CHECK:', { 
    hasApiKey: !!apiKey, 
    hasBypassHeader: bypassHeader === 'true',
    hasProgrammingHeader: programmingAccess === 'true'
  });
  
  if (
    apiKey === 'admin-test-bypass-key-2025' && 
    bypassHeader === 'true' && 
    programmingAccess === 'true'
  ) {
    console.log('API key authentication successful, bypassing CSRF');
    return next();
  }
  
  console.warn('API key access attempt failed');
  return res.status(403).json({
    message: 'Access denied: Invalid API credentials',
    timestamp: new Date().toISOString()
  });
}

// Admin deal creation endpoint with API key access instead of CSRF
bypassRouter.post(
  "/deals", 
  authenticate, 
  authorize(["admin"]), 
  apiKeyMiddleware, 
  async (req: Request, res: Response) => {
    // Set CORS and cache headers to prevent browser/Vite issues
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 
      'Content-Type, CSRF-Token, X-Requested-With, X-Bypass-Vite, X-Programming-Access, X-API-Key');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('X-Direct-API', 'true');
    
    console.log("=========== DIRECT ADMIN DEAL CREATION REQUEST ===========");
    console.log("Request query:", req.query);
    console.log("Request headers:", req.headers);
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    
    try {
      console.log("Direct admin deal creation endpoint called");
      // Authentication and CSRF protection are handled by middleware
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      console.log("Admin user authenticated:", req.user.userId);
      const dealData = req.body;
      console.log("Received deal data:", JSON.stringify(dealData, null, 2));
      
      // Handle manual business creation if businessId is -1 (special indicator for manual entry)
      if (dealData.businessId === -1 && dealData.otherBusinessName) {
        console.log(`Admin creating deal with manual business: ${dealData.otherBusinessName}`);
        
        try {
          // Create a temporary business entry
          const tempBusiness = await storage.createTempBusiness(dealData.otherBusinessName);
          if (!tempBusiness) {
            console.error("Failed to create temporary business");
            return res.status(500).json({ message: "Failed to create temporary business" });
          }
          
          // Update the businessId with the newly created temp business
          dealData.businessId = tempBusiness.id;
          console.log(`Created temporary business with ID: ${tempBusiness.id}`);
        } catch (error) {
          console.error("Error creating temporary business:", error);
          return res.status(500).json({ message: "Failed to create temporary business" });
        }
      } else {
        console.log(`Using existing business with ID: ${dealData.businessId}`);
      }
      
      // Admin can set status directly or default to pending
      dealData.status = dealData.status || 'pending';
      console.log(`Deal status set to: ${dealData.status}`);
      
      // Validate the deal data
      try {
        console.log("Validating deal data...");
        // Create a modified schema without the required ID field
        const createDealSchema = insertDealSchema.omit({ id: true, createdAt: true });
        createDealSchema.parse(dealData);
        console.log("Deal data validation successful");
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.error("Validation failed:", validationError.errors);
          return res.status(400).json({ message: "Validation error", errors: validationError.errors });
        }
        console.error("Unknown validation error:", validationError);
        throw validationError;
      }
      
      // Create the deal
      console.log("Attempting to create deal in storage...");
      const deal = await storage.createDeal(dealData);
      console.log(`Admin created deal: ${deal.id}`, JSON.stringify(deal, null, 2));
      
      // ALWAYS create an approval record for ANY deal
      // This ensures deals show up correctly in admin and vendor dashboards
      console.log(`Creating approval record for deal ${deal.id} with status ${dealData.status}`);
      await storage.createDealApproval({
        dealId: deal.id,
        submitterId: req.user.userId, // req.user is already verified above
        status: dealData.status === 'active' ? 'approved' : dealData.status
      });
      console.log("Deal approval record created successfully");
      
      // Ensure we send a properly formatted JSON response
      return res.status(201).json({
        success: true,
        deal,
        message: "Deal created successfully"
      });
    } catch (error) {
      console.error("Error in admin deal creation:", error);
      return res.status(500).json({ message: "Failed to create deal" });
    }
  }
);

// Export the router for use in the main server
export { bypassRouter };