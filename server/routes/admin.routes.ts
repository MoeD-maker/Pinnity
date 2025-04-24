import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, authorize } from "../middleware";
import { createVersionedRoutes } from "../../src/utils/routeVersioning";

/**
 * Admin routes for user and business management
 */
export function adminRoutes(app: Express): void {
  // Get dashboard stats
  app.get("/api/admin/dashboard", authenticate, authorize(['admin']), async (_req: Request, res: Response) => {
    try {
      // Get counts for different entities
      const pendingDeals = (await storage.getDealsByStatus('pending')).length;
      const activeDeals = (await storage.getDealsByStatus('active')).length;
      const rejectedDeals = (await storage.getDealsByStatus('rejected')).length;
      const expiredDeals = (await storage.getDealsByStatus('expired')).length;
      
      // Get businesses with pending verification
      const businesses = await storage.getAllBusinesses();
      const pendingVendors = businesses.filter(b => b.verificationStatus === 'pending').length;
      
      // Get total user count
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      
      // Get recent activity (newest first, limit 5)
      // We'll combine different types of activity (deal submissions, vendor applications, etc.)
      const recentActivity = [];
      
      // Get recent deal submissions (5 newest)
      const deals = await storage.getDeals();
      const recentDeals = deals
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(deal => ({
          id: deal.id,
          type: "deal_submission",
          status: deal.status,
          title: "New Deal Submitted",
          description: `${deal.business?.businessName || 'A business'} submitted '${deal.title}'`,
          timestamp: new Date(deal.createdAt).toISOString()
        }));
      
      recentActivity.push(...recentDeals);
      
      // Return the stats
      return res.status(200).json({
        stats: {
          pendingDeals,
          activeDeals,
          rejectedDeals,
          expiredDeals,
          pendingVendors,
          totalUsers,
          alertCount: pendingDeals + pendingVendors // Simple alert count as sum of pending items
        },
        recentActivity: recentActivity
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5)
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return res.status(500).json({ message: "Error fetching dashboard stats" });
    }
  });
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
  
  // Create versioned route paths for businesses
  const [vBusinessesPath, lBusinessesPath] = createVersionedRoutes('/admin/businesses');
  
  // Get all businesses or filter by status - versioned route
  app.get(vBusinessesPath, authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      // Check if status is provided as a query parameter
      const status = req.query.status as string;
      
      if (status) {
        console.log(`Fetching businesses with status: ${status} (versioned route)`);
        const businesses = await storage.getBusinessesByStatus(status);
        return res.status(200).json(businesses);
      } else {
        console.log('Fetching all businesses (versioned route)');
        const businesses = await storage.getAllBusinesses();
        return res.status(200).json(businesses);
      }
    } catch (error) {
      console.error("Error fetching businesses:", error);
      return res.status(500).json({ message: "Error fetching businesses" });
    }
  });
  
  // Get all businesses or filter by status - legacy route (for backward compatibility)
  app.get("/api/admin/businesses", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      // Check if status is provided as a query parameter
      const status = req.query.status as string;
      
      if (status) {
        console.log(`Fetching businesses with status: ${status} (legacy route)`);
        const businesses = await storage.getBusinessesByStatus(status);
        return res.status(200).json(businesses);
      } else {
        console.log('Fetching all businesses (legacy route)');
        const businesses = await storage.getAllBusinesses();
        return res.status(200).json(businesses);
      }
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

  // Toggle featured status for a deal (admin only)
  app.put("/api/deals/:id/featured", authenticate, authorize(['admin']), async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      const { featured } = req.body;
      
      if (typeof featured !== 'boolean') {
        return res.status(400).json({ message: "Featured status must be a boolean value" });
      }
      
      const deal = await storage.updateDeal(dealId, { featured });
      return res.status(200).json(deal);
    } catch (error) {
      console.error("Error updating deal featured status:", error);
      return res.status(500).json({ message: "Error updating deal featured status" });
    }
  });
}