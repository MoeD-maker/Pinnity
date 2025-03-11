import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginUserSchema, insertUserSchema, insertDealSchema, ratingSchema } from "@shared/schema";
import { z } from "zod";
import { generateToken } from "./auth";
import { authenticate, authorize, checkOwnership } from "./middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  // Diagnostic endpoint for environment information
  app.get("/api/environment", (_req: Request, res: Response) => {
    const safeEnv = {
      NODE_ENV: process.env.NODE_ENV || 'development',
      REPL_ID: process.env.REPL_ID || null,
      REPL_OWNER: process.env.REPL_OWNER || null,
      REPLIT_DEV_DOMAIN: process.env.REPLIT_DEV_DOMAIN || null,
      APP_URL: process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'
    };
    
    res.json(safeEnv);
  });
  
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginUserSchema.parse(req.body);
      
      // Verify credentials
      const user = await storage.verifyLogin(validatedData.email, validatedData.password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return success with token
      return res.status(200).json({ 
        message: "Login successful",
        userId: user.id,
        userType: user.userType,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Individual user registration
  app.post("/api/auth/register/individual", async (req: Request, res: Response) => {
    try {
      // Create validation schema for individual registration
      const individualSchema = insertUserSchema.omit({ id: true, username: true, userType: true, created_at: true })
        .extend({
          confirmPassword: z.string(),
          termsAccepted: z.literal(true)
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        });
      
      // Validate request body
      const validatedData = individualSchema.parse(req.body);
      
      // Remove fields not needed for user creation
      const { confirmPassword, termsAccepted, ...userData } = validatedData;
      
      // Create the user
      const user = await storage.createIndividualUser(userData);
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return success with token
      return res.status(201).json({ 
        message: "User registered successfully",
        userId: user.id,
        userType: user.userType,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business user registration
  app.post("/api/auth/register/business", async (req: Request, res: Response) => {
    try {
      // Handle file uploads and form data
      const businessName = req.body.businessName;
      const businessCategory = req.body.businessCategory;
      const firstName = req.body.firstName;
      const lastName = req.body.lastName;
      const email = req.body.email;
      const password = req.body.password;
      const phone = req.body.phone;
      const address = req.body.address;
      const termsAccepted = req.body.termsAccepted === 'true';
      
      // Validate core user data
      if (!businessName || !businessCategory || !firstName || !lastName || 
          !email || !password || !phone || !address || !termsAccepted) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check for file uploads (would normally process files here)
      const governmentIdFile = req.body.governmentId || (req.files ? req.files['governmentId'] : null);
      const proofOfAddressFile = req.body.proofOfAddress || (req.files ? req.files['proofOfAddress'] : null);
      const proofOfBusinessFile = req.body.proofOfBusiness || (req.files ? req.files['proofOfBusiness'] : null);
      
      if (!governmentIdFile || !proofOfAddressFile || !proofOfBusinessFile) {
        return res.status(400).json({ message: "Missing required document uploads" });
      }
      
      // Create user with business
      const user = await storage.createBusinessUser(
        {
          firstName,
          lastName,
          email,
          password,
          phone,
          address
        },
        {
          businessName,
          businessCategory,
          governmentId: "path/to/governmentId.pdf", // In a real app, store actual file paths
          proofOfAddress: "path/to/proofOfAddress.pdf",
          proofOfBusiness: "path/to/proofOfBusiness.pdf",
          verificationStatus: "pending"
        }
      );
      
      // Generate JWT token
      const token = generateToken(user);
      
      // Return success with token
      return res.status(201).json({ 
        message: "Business registered successfully",
        userId: user.id,
        userType: user.userType,
        token
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Business registration error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Profile routes
  app.get("/api/user/:id", authenticate, checkOwnership('id'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return the password
      const { password, ...userData } = user;
      
      return res.status(200).json(userData);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/user/:id", authenticate, checkOwnership('id'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // In a real app, verify that the authenticated user is updating their own profile
      
      const userData = req.body;
      // Prevent updating sensitive fields
      delete userData.password;
      delete userData.userType;
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Don't return the password
      const { password, ...sanitizedUser } = updatedUser;
      
      return res.status(200).json(sanitizedUser);
    } catch (error) {
      console.error("Update user error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Change password endpoint
  app.post("/api/user/:id/change-password", authenticate, checkOwnership('id'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Basic validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "All password fields are required" });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New password and confirm password do not match" });
      }
      
      // Password strength validation (like length, contains special chars, etc.) should be added here
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }
      
      // In a real app, add more complex password validation rules
      
      const success = await storage.changePassword(userId, currentPassword, newPassword);
      
      if (!success) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      return res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Change password error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Deal routes
  app.get("/api/deals", async (req: Request, res: Response) => {
    try {
      const deals = await storage.getDeals();
      return res.status(200).json(deals);
    } catch (error) {
      console.error("Get deals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

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

  app.get("/api/business/:businessId/deals", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.businessId);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      const deals = await storage.getDealsByBusiness(businessId);
      return res.status(200).json(deals);
    } catch (error) {
      console.error("Get business deals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/deals", async (req: Request, res: Response) => {
    try {
      // In a real app, verify that the authenticated user is a business owner
      
      const dealData = req.body;
      const deal = await storage.createDeal(dealData);
      
      return res.status(201).json(deal);
    } catch (error) {
      console.error("Create deal error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User favorites routes
  app.get("/api/user/:userId/favorites", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const favorites = await storage.getUserFavorites(userId);
      return res.status(200).json(favorites);
    } catch (error) {
      console.error("Get user favorites error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/:userId/favorites", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { dealId } = req.body;
      if (!dealId) {
        return res.status(400).json({ message: "Deal ID is required" });
      }
      
      const favorite = await storage.addUserFavorite(userId, dealId);
      return res.status(201).json(favorite);
    } catch (error) {
      console.error("Add user favorite error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/user/:userId/favorites/:dealId", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const dealId = parseInt(req.params.dealId);
      
      if (isNaN(userId) || isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid user ID or deal ID" });
      }
      
      await storage.removeUserFavorite(userId, dealId);
      return res.status(204).send();
    } catch (error) {
      console.error("Remove user favorite error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Deal redemption routes
  app.get("/api/user/:userId/redemptions", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const redemptions = await storage.getUserRedemptions(userId);
      return res.status(200).json(redemptions);
    } catch (error) {
      console.error("Get user redemptions error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/:userId/redemptions", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { dealId } = req.body;
      if (!dealId) {
        return res.status(400).json({ message: "Deal ID is required" });
      }
      
      const redemption = await storage.createRedemption(userId, dealId);
      return res.status(201).json(redemption);
    } catch (error) {
      console.error("Create redemption error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User notification preferences routes
  app.get("/api/user/:userId/notification-preferences", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const preferences = await storage.getUserNotificationPreferences(userId);
      if (!preferences) {
        return res.status(404).json({ message: "Notification preferences not found" });
      }
      
      return res.status(200).json(preferences);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/user/:userId/notification-preferences", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const preferences = req.body;
      const updatedPreferences = await storage.updateUserNotificationPreferences(userId, preferences);
      
      return res.status(200).json(updatedPreferences);
    } catch (error) {
      console.error("Update notification preferences error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // -------------------------------------------------------------------------
  // Vendor-side API routes
  // -------------------------------------------------------------------------
  
  // Business management
  
  // Get business by user ID (must come before the general /:id route)
  app.get("/api/business/user/:userId", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found for this user" });
      }
      
      return res.status(200).json(business);
    } catch (error) {
      console.error("Get business by user ID error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get business by ID route (must come after more specific routes)
  app.get("/api/business/:id", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.id);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      return res.status(200).json(business);
    } catch (error) {
      console.error("Get business error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/business/:id", authenticate, async (req: Request, res: Response) => {
    // For business operations, we need to verify that the user is the business owner
    try {
      const businessId = parseInt(req.params.id);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      // Get the business to check ownership
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // Verify ownership - user must be the business owner or an admin
      if (req.user && (req.user.userId === business.userId || req.user.userType === 'admin')) {
        const businessData = req.body;
        const updatedBusiness = await storage.updateBusiness(businessId, businessData);
        
        return res.status(200).json(updatedBusiness);
      } else {
        return res.status(403).json({ message: "Unauthorized: You do not have permission to update this business" });
      }
    } catch (error) {
      console.error("Update business error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Business verification
  app.put("/api/business/:id/verification", authenticate, async (req: Request, res: Response) => {
    // Only admin users should be able to update verification status
    if (!req.user || req.user.userType !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: Only administrators can update verification status" });
    }
    try {
      const businessId = parseInt(req.params.id);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      const { status, feedback } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedBusiness = await storage.updateBusinessVerificationStatus(businessId, status, feedback);
      
      return res.status(200).json(updatedBusiness);
    } catch (error) {
      console.error("Update business verification error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Business hours
  app.get("/api/business/:businessId/hours", authenticate, async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.businessId);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      const hours = await storage.getBusinessHours(businessId);
      
      return res.status(200).json(hours);
    } catch (error) {
      console.error("Get business hours error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/business/hours", authenticate, async (req: Request, res: Response) => {
    // Verify business ownership
    try {
      const { businessId } = req.body;
      if (!businessId) {
        return res.status(400).json({ message: "Business ID is required" });
      }
      
      // Get the business to check ownership
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // Verify ownership - user must be the business owner or an admin
      if (req.user && (req.user.userId === business.userId || req.user.userType === 'admin')) {
        const hoursData = req.body;
        const newHours = await storage.addBusinessHours(hoursData);
        
        return res.status(201).json(newHours);
      } else {
        return res.status(403).json({ message: "Unauthorized: You do not have permission to add hours for this business" });
      }
    } catch (error) {
      console.error("Add business hours error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/business/hours/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const hoursId = parseInt(req.params.id);
      if (isNaN(hoursId)) {
        return res.status(400).json({ message: "Invalid hours ID" });
      }
      
      const hoursData = req.body;
      const updatedHours = await storage.updateBusinessHours(hoursId, hoursData);
      
      return res.status(200).json(updatedHours);
    } catch (error) {
      console.error("Update business hours error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/business/hours/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const hoursId = parseInt(req.params.id);
      if (isNaN(hoursId)) {
        return res.status(400).json({ message: "Invalid hours ID" });
      }
      
      await storage.deleteBusinessHours(hoursId);
      
      return res.status(204).end();
    } catch (error) {
      console.error("Delete business hours error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Deal approval API routes
  app.post("/api/deals/:dealId/approval", authenticate, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const approvalData = {
        ...req.body,
        dealId
      };
      
      const approval = await storage.createDealApproval(approvalData);
      
      return res.status(201).json(approval);
    } catch (error) {
      console.error("Create deal approval error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/deals/:dealId/approval", authenticate, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const approval = await storage.getDealApproval(dealId);
      if (!approval) {
        return res.status(404).json({ message: "Deal approval not found" });
      }
      
      return res.status(200).json(approval);
    } catch (error) {
      console.error("Get deal approval error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/deals/:dealId/approval/history", authenticate, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const approvals = await storage.getDealApprovalHistory(dealId);
      
      return res.status(200).json(approvals);
    } catch (error) {
      console.error("Get deal approval history error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/deal-approvals/:id", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const approvalId = parseInt(req.params.id);
      if (isNaN(approvalId)) {
        return res.status(400).json({ message: "Invalid approval ID" });
      }
      
      const { status, reviewerId, feedback } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedApproval = await storage.updateDealApproval(approvalId, status, reviewerId, feedback);
      
      return res.status(200).json(updatedApproval);
    } catch (error) {
      console.error("Update deal approval error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Additional deal management routes
  app.get("/api/deals/status/:status", authenticate, authorize(['admin', 'business']), async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      
      const deals = await storage.getDealsByStatus(status);
      
      return res.status(200).json(deals);
    } catch (error) {
      console.error("Get deals by status error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/deals/:id/status", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const updatedDeal = await storage.updateDealStatus(dealId, status);
      
      return res.status(200).json(updatedDeal);
    } catch (error) {
      console.error("Update deal status error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/deals/:id/duplicate", authenticate, async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const duplicatedDeal = await storage.duplicateDeal(dealId);
      
      return res.status(201).json(duplicatedDeal);
    } catch (error) {
      console.error("Duplicate deal error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Deal analytics tracking
  app.post("/api/deals/:id/views", async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const updatedDeal = await storage.incrementDealViews(dealId);
      
      // Use viewCount property from the schema instead of views
      return res.status(200).json({ viewCount: updatedDeal.viewCount });
    } catch (error) {
      console.error("Increment deal views error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/deals/:dealId/redemptions", authenticate, authorize(['admin', 'business']), async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const redemptions = await storage.getDealRedemptions(dealId);
      
      return res.status(200).json(redemptions);
    } catch (error) {
      console.error("Get deal redemptions error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/deals/:dealId/verify-code", authenticate, authorize(['business']), async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      const { redemptionId } = req.body;
      
      if (!redemptionId) {
        return res.status(400).json({ message: "Redemption ID is required" });
      }
      
      try {
        // Get the redemption by ID
        const redemptionIdNum = parseInt(redemptionId);
        
        // Update the redemption status to verified
        await storage.updateRedemptionStatus(
          redemptionIdNum,
          "verified"
        );
        
        // Return successful verification response
        return res.status(200).json({ valid: true });
      } catch (innerError) {
        console.error("Verify redemption error:", innerError);
        return res.status(400).json({ valid: false, message: "Invalid redemption ID" });
      }
    } catch (error) {
      console.error("Verify redemption code error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // This endpoint is deprecated as we've moved to redemptionId-based verification
  // Keeping it for backward compatibility
  app.post("/api/deals/:dealId/generate-code", authenticate, authorize(['business']), async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.dealId);
      if (isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid deal ID" });
      }
      
      // Return a dummy code since we're not using PIN verification anymore
      return res.status(200).json({ code: "DEPRECATED" });
    } catch (error) {
      console.error("Generate verification code error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Redemption Rating routes
  app.post("/api/redemptions/:redemptionId/ratings", authenticate, async (req: Request, res: Response) => {
    try {
      const redemptionId = parseInt(req.params.redemptionId);
      if (isNaN(redemptionId)) {
        return res.status(400).json({ message: "Invalid redemption ID" });
      }
      
      // Validate request body
      const validatedData = ratingSchema.parse(req.body);
      
      // Find the redemption to get user, deal, and business IDs
      const redemption = await storage.getDealRedemptions(redemptionId);
      if (!redemption || redemption.length === 0) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      const userRedemption = redemption[0];
      
      // Ensure the authenticated user owns this redemption
      if (req.user && req.user.userId !== userRedemption.userId) {
        return res.status(403).json({ message: "You can only rate your own redemptions" });
      }
      
      // Get the deal to find the business ID
      const deal = await storage.getDeal(userRedemption.dealId);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Create the rating
      const rating = await storage.createRedemptionRating(
        redemptionId, 
        userRedemption.userId, 
        userRedemption.dealId, 
        deal.businessId, 
        validatedData
      );
      
      return res.status(201).json(rating);
    } catch (error) {
      console.error("Create rating error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get ratings for a business
  app.get("/api/business/:businessId/ratings", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.businessId);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      const ratings = await storage.getBusinessRatings(businessId);
      return res.status(200).json(ratings);
    } catch (error) {
      console.error("Get business ratings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get rating summary for a business
  app.get("/api/business/:businessId/ratings/summary", async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.businessId);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      const summary = await storage.getBusinessRatingSummary(businessId);
      return res.status(200).json(summary);
    } catch (error) {
      console.error("Get business rating summary error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get user's ratings
  app.get("/api/user/:userId/ratings", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const ratings = await storage.getUserRatings(userId);
      return res.status(200).json(ratings);
    } catch (error) {
      console.error("Get user ratings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
