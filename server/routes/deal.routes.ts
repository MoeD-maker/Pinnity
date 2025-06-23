import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, authorize, verifyCsrf } from "../middleware";
import { insertDealSchema } from "@shared/schema";
import { z } from "zod";
import { createVersionedRoutes, versionHeadersMiddleware, deprecationMiddleware } from "../../src/utils/routeVersioning";
import { ensureArray, sanitizeDeals, forceDealArray } from "../utils";

/**
 * Deal routes for listing, creating, and managing deals
 */
export function dealRoutes(app: Express): void {
  // Get all deals
  app.get("/api/deals", async (req: Request, res: Response) => {
    try {
      const deals = await storage.getDeals();
      // Ensure we're returning an array of deals
      if (!Array.isArray(deals)) {
        console.error("Warning: Deals is not an array");
        return res.status(200).json([]);
      }
      return res.status(200).json(deals);
    } catch (error) {
      console.error("Get deals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get featured deals
  app.get("/api/deals/featured", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const featuredDeals = await storage.getFeaturedDeals(limit);
      return res.status(200).json(featuredDeals);
    } catch (error) {
      console.error("Get featured deals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get deals by status (versioned and legacy routes)
  const [vDealsByStatusPath, lDealsByStatusPath] = createVersionedRoutes('/deals/status/:status');
  
  // Versioned deals by status route
  app.get(vDealsByStatusPath, 
    versionHeadersMiddleware(),
    authenticate,
    async (req: Request, res: Response) => {
    try {
      console.log(`DEBUG: Getting deals with status "${req.params.status}" (versioned route)`);
      const status = req.params.status;
      
      // Get user role for logging
      const userRole = req.user?.userType || "unauthenticated";
      const userId = req.user?.userId;
      console.log(`STORAGE: Getting deals for user role: ${userRole}, userId: ${userId || "none"}`);
      
      // Get deals with requested status
      const rawDeals = await storage.getDealsByStatus(status);
      
      // Use our robust array conversion function
      const dealsArray = forceDealArray(rawDeals);
      console.log(`DEBUG: Query returned ${dealsArray.length} deals with status "${status}"`);
      
      // Apply sanitization to ensure clean data
      const sanitizedDeals = sanitizeDeals(dealsArray);
      console.log(`DEBUG: Returning ${sanitizedDeals.length} deals with status "${status}"`);
      
      // Force JSON to use array format by manually converting
      const jsonStr = JSON.stringify(sanitizedDeals);
      
      // Send direct array as JSON.stringify enforcement
      return res.setHeader('Content-Type', 'application/json')
        .send(jsonStr);
    } catch (error) {
      console.error(`Error fetching deals by status ${req.params.status}:`, error);
      return res.status(500).json({ message: "Error fetching deals by status" });
    }
  });
  
  // Legacy deals by status route
  app.get(lDealsByStatusPath, 
    authenticate,
    async (req: Request, res: Response) => {
    try {
      console.log(`DEBUG: Getting deals with status "${req.params.status}" (legacy route)`);
      const status = req.params.status;
      
      // Get user role for logging
      const userRole = req.user?.userType || "unauthenticated";
      const userId = req.user?.userId;
      console.log(`STORAGE: Getting deals for user role: ${userRole}, userId: ${userId || "none"}`);
      
      // Get deals with requested status
      const rawDeals = await storage.getDealsByStatus(status);
      
      // Use our robust array conversion function
      const dealsArray = forceDealArray(rawDeals);
      console.log(`DEBUG: Query returned ${dealsArray.length} deals with status "${status}"`);
      
      // Apply sanitization to ensure clean data
      const sanitizedDeals = sanitizeDeals(dealsArray);
      console.log(`DEBUG: Returning ${sanitizedDeals.length} deals with status "${status}"`);
      
      // Force JSON to use array format by manually converting
      const jsonStr = JSON.stringify(sanitizedDeals);
      
      // Send direct array as JSON.stringify enforcement
      return res.setHeader('Content-Type', 'application/json')
        .send(jsonStr);
    } catch (error) {
      console.error(`Error fetching deals by status ${req.params.status}:`, error);
      return res.status(500).json({ message: "Error fetching deals by status" });
    }
  });

  // Get a single deal
  app.get("/api/deals/:id", async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      return res.status(200).json(deal);
    } catch (error) {
      console.error("Get deal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Special workaround endpoint with query param to bypass Vite processing
  app.post("/api/v1/admin/deals", 
    authenticate, 
    authorize(["admin"]), 
    verifyCsrf, 
    async (req: Request, res: Response) => {
    // Force direct content type check using HTTP method
    if (req.method === 'POST') {
      // Ensure we're sending JSON - use direct HTTP header
      res.setHeader('Content-Type', 'application/json');
      // Add cache prevention headers
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      // Add API response headers to identify our response type
      res.setHeader('X-API-Response', 'true');
      
      // Check if we have the bypass flag for Vite
      if (req.query._bypass_vite || req.headers['x-bypass-vite']) {
        console.log("Using direct bypass for Vite middleware");
        // Additional headers that help bypass Vite
        res.setHeader('X-Direct-API', 'true');
      }
    }
    
    console.log("=========== ADMIN DEAL CREATION REQUEST START ===========");
    console.log("Request query:", req.query);
    console.log("Request headers:", req.headers);
    console.log("Request method:", req.method);
    console.log("Request URL:", req.url);
    console.log("Request cookies:", req.cookies);
    console.log("Request signed cookies:", req.signedCookies);
    
    try {
      console.log("Admin deal creation endpoint called");
      // Authentication and CSRF protection are now handled by middleware
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
        const createDealSchema = insertDealSchema.omit(['id', 'createdAt']);
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
  });

  // Create a deal (vendor route)
  app.post("/api/deals", authenticate, verifyCsrf, async (req: Request, res: Response) => {
    try {
      // Verify that the authenticated user is a business owner
      if (!req.user || req.user.userType !== 'business') {
        return res.status(403).json({ message: "Only business accounts can create deals" });
      }
      
      const dealData = req.body;
      
      // Ensure the business exists
      const business = await storage.getBusinessByUserId(req.user.userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // Set the business ID from the verified user's business
      dealData.businessId = business.id;
      
      // Set initial status to pending
      dealData.status = 'pending';
      
      // Validate the deal data
      try {
        // Create a modified schema without the required ID field
        const createDealSchema = insertDealSchema.omit(['id', 'createdAt']);
        createDealSchema.parse(dealData);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: validationError.errors });
        }
        throw validationError;
      }
      
      // Create the deal
      const deal = await storage.createDeal(dealData);
      
      // Create initial approval record
      await storage.createDealApproval({
        dealId: deal.id,
        submitterId: req.user.userId,
        status: 'pending'
      });
      
      return res.status(201).json(deal);
    } catch (error) {
      console.error("Create deal error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update a deal
  app.put("/api/deals/:id", authenticate, verifyCsrf, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Get the deal to check ownership
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Check if the authenticated user owns the business that created the deal
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== deal.business.id) {
          return res.status(403).json({ message: "You can only update deals for your own business" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can update deals" });
      }
      
      const dealData = req.body;
      
      // Prevent changing the business ID
      delete dealData.businessId;
      
      // If status is being changed, check permissions
      if (dealData.status && req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only admins can change deal status" });
      }
      
      // Update the deal
      const updatedDeal = await storage.updateDeal(dealId, dealData);
      
      // If this is a revision, create a new approval record
      if (deal.status === 'pending_revision' && req.user?.userType === 'business') {
        await storage.createDealApproval({
          dealId: dealId,
          submitterId: req.user.userId,
          status: 'pending'
        });
        
        // Update the deal status to pending
        await storage.updateDealStatus(dealId, 'pending');
      }
      
      return res.status(200).json(updatedDeal);
    } catch (error) {
      console.error("Update deal error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create deal approval
  app.post("/api/deals/:dealId/approval", authenticate, verifyCsrf, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Check if the deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Only the business that owns the deal or an admin can submit an approval request
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== deal.business.id) {
          return res.status(403).json({ message: "You can only submit approval requests for your own deals" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can submit approval requests" });
      }
      
      // Create the approval record
      const approval = await storage.createDealApproval({
        dealId,
        submitterId: req.user!.userId,
        status: 'pending'
      });
      
      return res.status(201).json(approval);
    } catch (error) {
      console.error("Create approval error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get deal approval
  app.get("/api/deals/:dealId/approval", authenticate, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Check if the deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Check permissions
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== deal.business.id) {
          return res.status(403).json({ message: "You can only view approval status for your own deals" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can view approval status" });
      }
      
      const approval = await storage.getDealApproval(dealId);
      if (!approval) {
        return res.status(404).json({ message: "Approval record not found" });
      }
      
      return res.status(200).json(approval);
    } catch (error) {
      console.error("Get approval error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get deal approval history
  app.get("/api/deals/:dealId/approval/history", authenticate, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Check if the deal exists
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Check permissions
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== deal.business.id) {
          return res.status(403).json({ message: "You can only view approval history for your own deals" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can view approval history" });
      }
      
      const approvals = await storage.getDealApprovalHistory(dealId);
      return res.status(200).json(approvals);
    } catch (error) {
      console.error("Get approval history error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Duplicate a deal
  app.post("/api/deals/:id/duplicate", authenticate, verifyCsrf, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Get the original deal
      const originalDeal = await storage.getDeal(dealId);
      if (!originalDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Check permissions
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== originalDeal.business.id) {
          return res.status(403).json({ message: "You can only duplicate your own deals" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can duplicate deals" });
      }
      
      // Duplicate the deal
      const newDeal = await storage.duplicateDeal(dealId);
      
      // Create initial approval record for the new deal
      await storage.createDealApproval({
        dealId: newDeal.id,
        submitterId: req.user!.userId,
        status: 'pending'
      });
      
      return res.status(201).json(newDeal);
    } catch (error) {
      console.error("Duplicate deal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Increment deal views
  app.post("/api/deals/:id/views", async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Increment view count
      const deal = await storage.incrementDealViews(dealId);
      return res.status(200).json({ message: "View count incremented", views: deal.viewCount });
    } catch (error) {
      console.error("Increment views error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get deal redemptions
  app.get("/api/deals/:dealId/redemptions", authenticate, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Check permissions
      const deal = await storage.getDeal(dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== deal.business.id) {
          return res.status(403).json({ message: "You can only view redemptions for your own deals" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can view deal redemptions" });
      }
      
      const redemptions = await storage.getDealRedemptions(dealId);
      return res.status(200).json(redemptions);
    } catch (error) {
      console.error("Get deal redemptions error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Verify redemption code
  app.post("/api/deals/:dealId/verify-code", authenticate, verifyCsrf, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Redemption code is required" });
      }
      
      // Check permissions
      if (req.user?.userType !== 'individual') {
        return res.status(403).json({ message: "Only individual users can verify redemption codes" });
      }
      
      // Verify the code
      const isValid = await storage.verifyRedemptionCode(dealId, code);
      
      if (!isValid) {
        return res.status(200).json({ valid: false, message: "Invalid redemption code" });
      }
      
      // Create a redemption record
      const redemption = await storage.createRedemption(req.user.userId, dealId);
      
      // Increment deal redemptions count
      await storage.incrementDealRedemptions(dealId);
      
      return res.status(200).json({ 
        valid: true,
        message: "Redemption code verified successfully",
        redemption 
      });
    } catch (error) {
      console.error("Verify redemption code error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
}