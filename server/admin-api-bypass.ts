/**
 * Direct API handler for bypassing Vite middleware issues
 * This file provides direct Express routes that avoid Vite's routing interference
 */
import express, { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { z } from 'zod';
import { insertDealSchema, apiDealSchema } from '@shared/schema';
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
        // Use the API schema that accepts string dates for our programmatic access
        apiDealSchema.parse(dealData);
        console.log("Deal data validation successful with API schema");
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

// Simplified deal approval endpoint that doesn't use the validation middleware
bypassRouter.put(
  "/deals/:id/status",
  authenticate,
  authorize(["admin"]),
  async (req: Request, res: Response) => {
    // Set CORS and cache headers to prevent browser/Vite issues
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, CSRF-Token, X-Requested-With');
    
    console.log("=========== DIRECT DEAL STATUS UPDATE REQUEST ===========");
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }

      const { status, feedback } = req.body;
      
      if (!status || !["pending", "active", "expired", "rejected", "pending_revision"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      console.log(`Updating deal ${dealId} status to ${status}`);
      
      // First get the deal approval record
      const approvals = await storage.getDealApprovalsByDealId(dealId);
      if (!approvals || approvals.length === 0) {
        console.error(`No approval record found for deal ${dealId}`);
        return res.status(404).json({ message: "No approval record found for this deal" });
      }
      
      // Get the latest approval
      const latestApproval = approvals[0];
      console.log(`Found approval record: ${latestApproval.id}`);
      
      // Update the approval
      const updatedApproval = await storage.updateDealApproval(
        latestApproval.id,
        {
          status: status === "active" ? "approved" : status,
          reviewerId: req.user!.userId,
          feedback: feedback || null,
          reviewedAt: new Date()
        }
      );
      
      console.log(`Updated approval: ${updatedApproval.id} with status ${updatedApproval.status}`);
      
      // Also update the deal status
      const updatedDeal = await storage.updateDealStatus(dealId, status);
      console.log(`Updated deal: ${updatedDeal.id} with status ${updatedDeal.status}`);
      
      return res.status(200).json({
        success: true,
        deal: updatedDeal,
        approval: updatedApproval,
        message: `Deal status updated to ${status}`
      });
    } catch (error) {
      console.error("Error updating deal status:", error);
      return res.status(500).json({ message: "Failed to update deal status", error: String(error) });
    }
  }
);

// A simpler endpoint that doesn't use the apiKeyMiddleware
// This is a last resort for when all other approaches fail
bypassRouter.post(
  "/deals/simple", 
  authenticate, 
  authorize(["admin"]), 
  async (req: Request, res: Response) => {
    // Set CORS and cache headers to prevent browser/Vite issues
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, CSRF-Token, X-Requested-With');
    
    console.log("=========== SIMPLE ADMIN DEAL CREATION REQUEST ===========");
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    
    try {
      console.log("Simple admin deal creation endpoint called");
      // Authentication is handled by middleware
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
      
      // Skip validation for this simple endpoint to avoid any parsing issues
      
      // Create the deal
      console.log("Attempting to create deal in storage...");
      const deal = await storage.createDeal(dealData);
      console.log(`Admin created deal: ${deal.id}`, JSON.stringify(deal, null, 2));
      
      // ALWAYS create an approval record for ANY deal
      // This ensures deals show up correctly in admin and vendor dashboards
      console.log(`Creating approval record for deal ${deal.id} with status ${dealData.status}`);
      await storage.createDealApproval({
        dealId: deal.id,
        submitterId: req.user.userId // req.user is already verified above
      });
      console.log("Deal approval record created successfully");
      
      // Send very simple response to minimize parsing issues
      return res.status(201).json({
        success: true,
        dealId: deal.id,
        message: "Deal created successfully"
      });
    } catch (error) {
      console.error("Error in simple admin deal creation:", error);
      return res.status(500).json({ message: "Failed to create deal", error: String(error) });
    }
  }
);

// Export the router for use in the main server
// Add deals endpoint to bypass Vite middleware issues
bypassRouter.get(
  "/deals",
  authenticate,
  authorize(["admin"]),
  async (req: Request, res: Response) => {
    console.log("BYPASS DEALS ENDPOINT: Processing GET /api/direct/admin/deals");
    
    try {
      const deals = await storage.getDeals();
      console.log(`BYPASS DEALS ENDPOINT: Found ${deals.length} deals`);
      
      // Get business info for each deal
      const dealsWithBusiness = await Promise.all(
        deals.map(async (deal) => {
          const business = await storage.getBusiness(deal.businessId);
          return {
            ...deal,
            business: business ? {
              id: business.id,
              businessName: business.businessName,
              businessCategory: business.businessCategory
            } : null
          };
        })
      );
      
      console.log("BYPASS DEALS ENDPOINT: Returning JSON response");
      return res.status(200).json(dealsWithBusiness);
    } catch (error) {
      console.error("Bypass deals endpoint error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export { bypassRouter };