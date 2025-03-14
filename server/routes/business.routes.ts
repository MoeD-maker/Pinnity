import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, checkOwnership } from "../middleware";
import { ratingSchema } from "@shared/schema";

/**
 * Business routes for business management and related operations
 */
export function businessRoutes(app: Express): void {
  // Get deals by business
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

  // Get business by user ID
  app.get("/api/business/user/:userId", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const business = await storage.getBusinessByUserId(userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      return res.status(200).json(business);
    } catch (error) {
      console.error("Get business error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get business by ID
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
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update business
  app.put("/api/business/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.id);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      // Get the business to verify ownership
      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      // Verify that the authenticated user owns the business or is an admin
      const userBusiness = req.user?.userType === 'business' ? await storage.getBusinessByUserId(req.user.userId) : null;
      
      if (req.user?.userType !== 'admin' && (!userBusiness || userBusiness.id !== businessId)) {
        return res.status(403).json({ message: "You can only update your own business" });
      }
      
      const businessData = req.body;
      
      // Prevent updating sensitive fields
      delete businessData.userId;
      delete businessData.verificationStatus;
      
      const updatedBusiness = await storage.updateBusiness(businessId, businessData);
      return res.status(200).json(updatedBusiness);
    } catch (error) {
      console.error("Update business error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update business verification status
  app.put("/api/business/:id/verification", authenticate, async (req: Request, res: Response) => {
    try {
      const businessId = parseInt(req.params.id);
      if (isNaN(businessId)) {
        return res.status(400).json({ message: "Invalid business ID" });
      }
      
      // Only admins can update verification status
      if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only admins can update verification status" });
      }
      
      const { status, feedback } = req.body;
      
      if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const business = await storage.updateBusinessVerificationStatus(businessId, status, feedback);
      return res.status(200).json(business);
    } catch (error) {
      console.error("Update verification status error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get business hours
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
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add business hours
  app.post("/api/business/hours", authenticate, async (req: Request, res: Response) => {
    try {
      // Verify the authenticated user is a business owner or admin
      if (req.user?.userType !== 'business' && req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can add business hours" });
      }
      
      const hoursData = req.body;
      
      // If business user, verify they own the business
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== hoursData.businessId) {
          return res.status(403).json({ message: "You can only add hours for your own business" });
        }
      }
      
      const hours = await storage.addBusinessHours(hoursData);
      return res.status(201).json(hours);
    } catch (error) {
      console.error("Add business hours error:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update business hours
  app.put("/api/business/hours/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const hoursId = parseInt(req.params.id);
      if (isNaN(hoursId)) {
        return res.status(400).json({ message: "Invalid hours ID" });
      }
      
      // Get the business hours to verify ownership
      const businessHours = await storage.getBusinessHours(0);
      const hours = businessHours.find(h => h.id === hoursId);
      
      if (!hours) {
        return res.status(404).json({ message: "Business hours not found" });
      }
      
      // If business user, verify they own the business
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== hours.businessId) {
          return res.status(403).json({ message: "You can only update hours for your own business" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can update business hours" });
      }
      
      const hoursData = req.body;
      
      // Prevent changing the business ID
      delete hoursData.businessId;
      
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

  // Delete business hours
  app.delete("/api/business/hours/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const hoursId = parseInt(req.params.id);
      if (isNaN(hoursId)) {
        return res.status(400).json({ message: "Invalid hours ID" });
      }
      
      // Get the business hours to verify ownership
      const businessHours = await storage.getBusinessHours(0);
      const hours = businessHours.find(h => h.id === hoursId);
      
      if (!hours) {
        return res.status(404).json({ message: "Business hours not found" });
      }
      
      // If business user, verify they own the business
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business || business.id !== hours.businessId) {
          return res.status(403).json({ message: "You can only delete hours for your own business" });
        }
      } else if (req.user?.userType !== 'admin') {
        return res.status(403).json({ message: "Only business owners or admins can delete business hours" });
      }
      
      await storage.deleteBusinessHours(hoursId);
      return res.status(200).json({ message: "Business hours deleted successfully" });
    } catch (error) {
      console.error("Delete business hours error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get business ratings
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

  // Get business rating summary
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
}