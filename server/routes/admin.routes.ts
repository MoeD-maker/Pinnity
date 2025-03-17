import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, authorize } from "../middleware";
import { createVersionedRoutes } from "../../src/utils/routeVersioning";

/**
 * Admin routes for user and business management
 */
export function adminRoutes(app: Express): void {
  // Create versioned route paths
  const [vUsersPath, lUsersPath] = createVersionedRoutes('/admin/users');
  
  // Get all users - versioned route
  app.get(vUsersPath, authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      return res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Get all users - legacy route
  app.get(lUsersPath, authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      return res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      return res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Create versioned route paths for POST users
  const [vCreateUserPath, lCreateUserPath] = createVersionedRoutes('/admin/users');
  
  // Create a user - versioned route
  app.post(vCreateUserPath, authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const userData = req.body;
      
      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      const password = userData.password;
      delete userData.password;
      
      const user = await storage.adminCreateUser(userData, password);
      return res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Error creating user" });
    }
  });
  
  // Create a user - legacy route
  app.post(lCreateUserPath, authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const userData = req.body;
      
      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      const password = userData.password;
      delete userData.password;
      
      const user = await storage.adminCreateUser(userData, password);
      return res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Error creating user" });
    }
  });
  
  // Update a user
  app.put("/api/admin/users/:id", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      const user = await storage.adminUpdateUser(userId, userData);
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Error updating user" });
    }
  });
  
  // Delete a user
  app.delete("/api/admin/users/:id", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      const success = await storage.adminDeleteUser(userId);
      if (success) {
        return res.status(200).json({ message: "User deleted successfully" });
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ message: "Error deleting user" });
    }
  });
  
  // Create a business user
  app.post("/api/admin/business-users", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const { userData, businessData } = req.body;
      
      if (!userData.password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      // Create the business user
      const user = await storage.adminCreateBusinessUser(userData, businessData);
      return res.status(201).json(user);
    } catch (error) {
      console.error("Error creating business user:", error);
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Error creating business user" });
    }
  });
  
  // Get all businesses
  app.get("/api/admin/businesses", authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
    try {
      const businesses = await storage.getAllBusinesses();
      return res.status(200).json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      return res.status(500).json({ message: "Error fetching businesses" });
    }
  });

  // Deal approval routes
  app.put("/api/deal-approvals/:id", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const approvalId = parseInt(req.params.id);
      const { status, feedback } = req.body;
      
      if (!status || !['approved', 'rejected', 'pending_revision'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Add reviewer ID from authenticated user
      const reviewerId = req.user?.userId;
      
      const approval = await storage.updateDealApproval(approvalId, status, reviewerId, feedback);
      
      // If deal is approved, update the deal status as well
      if (status === 'approved') {
        await storage.updateDealStatus(approval.dealId, 'active');
      } else if (status === 'rejected') {
        await storage.updateDealStatus(approval.dealId, 'rejected');
      } else if (status === 'pending_revision') {
        await storage.updateDealStatus(approval.dealId, 'pending_revision');
      }
      
      return res.status(200).json(approval);
    } catch (error) {
      console.error("Error updating approval:", error);
      return res.status(500).json({ message: "Error updating approval" });
    }
  });
  
  // Get deals by status
  app.get("/api/deals/status/:status", authenticate, authorize(['admin', 'business']), async (req: Request, res: Response) => {
    try {
      const status = req.params.status;
      
      if (!['pending', 'active', 'expired', 'rejected', 'pending_revision'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const deals = await storage.getDealsByStatus(status);
      
      // If business user, filter deals to only show their own
      if (req.user?.userType === 'business') {
        const business = await storage.getBusinessByUserId(req.user.userId);
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        const filteredDeals = deals.filter(deal => deal.business.id === business.id);
        return res.status(200).json(filteredDeals);
      }
      
      return res.status(200).json(deals);
    } catch (error) {
      console.error("Error fetching deals by status:", error);
      return res.status(500).json({ message: "Error fetching deals" });
    }
  });
  
  // Update deal status
  app.put("/api/deals/:id/status", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['pending', 'active', 'expired', 'rejected', 'pending_revision'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const deal = await storage.updateDealStatus(dealId, status);
      return res.status(200).json(deal);
    } catch (error) {
      console.error("Error updating deal status:", error);
      return res.status(500).json({ message: "Error updating deal status" });
    }
  });
}