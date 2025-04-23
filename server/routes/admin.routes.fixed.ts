import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, authorize } from "../middleware";
import { validate } from "../middleware/validationMiddleware";
import { adminSchemas } from "../schemas";
import { 
  createVersionedRoutes,
  versionHeadersMiddleware,
  deprecationMiddleware
} from "../../src/utils/routeVersioning";

/**
 * Admin routes for user and business management
 */
export function adminRoutes(app: Express): void {
  // Debug endpoints
  const [vDebugDealsPath, lDebugDealsPath] = createVersionedRoutes('/admin/debug/deals');
  
  // Versioned debug deals endpoint
  app.get(vDebugDealsPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
    try {
      console.log("DEBUG ENDPOINT: Accessing /admin/debug/deals");
      // Get all deals
      const allDeals = await storage.getDeals();
      
      // Group them by status
      const dealsByStatus: Record<string, any[]> = {};
      
      // Initialize with empty arrays for common statuses
      dealsByStatus.pending = [];
      dealsByStatus.active = [];
      dealsByStatus.rejected = [];
      dealsByStatus.expired = [];
      dealsByStatus.pending_revision = [];
      
      // Categorize deals by status
      allDeals.forEach(deal => {
        const status = deal.status || 'unknown';
        if (!dealsByStatus[status]) {
          dealsByStatus[status] = [];
        }
        dealsByStatus[status].push(deal);
      });
      
      // Get statuses distribution
      const statusCounts: Record<string, number> = {};
      Object.keys(dealsByStatus).forEach(status => {
        statusCounts[status] = dealsByStatus[status].length;
      });
      
      return res.status(200).json({
        totalDeals: allDeals.length,
        statusCounts,
        dealsByStatus
      });
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      return res.status(500).json({ message: "Error in debug endpoint", error: String(error) });
    }
  });
  
  // Legacy debug deals endpoint
  app.get(lDebugDealsPath,
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
    try {
      // Same implementation as versioned endpoint
      const allDeals = await storage.getDeals();
      
      const dealsByStatus: Record<string, any[]> = {};
      
      dealsByStatus.pending = [];
      dealsByStatus.active = [];
      dealsByStatus.rejected = [];
      dealsByStatus.expired = [];
      dealsByStatus.pending_revision = [];
      
      allDeals.forEach(deal => {
        const status = deal.status || 'unknown';
        if (!dealsByStatus[status]) {
          dealsByStatus[status] = [];
        }
        dealsByStatus[status].push(deal);
      });
      
      const statusCounts: Record<string, number> = {};
      Object.keys(dealsByStatus).forEach(status => {
        statusCounts[status] = dealsByStatus[status].length;
      });
      
      return res.status(200).json({
        totalDeals: allDeals.length,
        statusCounts,
        dealsByStatus
      });
    } catch (error) {
      console.error("Error in debug endpoint:", error);
      return res.status(500).json({ message: "Error in debug endpoint", error: String(error) });
    }
  });
  
  // Get dashboard stats
  const [vDashboardPath, lDashboardPath] = createVersionedRoutes('/admin/dashboard');
  
  // Versioned dashboard route
  app.get(vDashboardPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']), 
    async (_req: Request, res: Response) => {
    try {
      // Get counts for different entities
      // For pending, we need to include both 'pending' and 'pending_revision' statuses
      const pendingDealsResult = await storage.getDealsByStatus('pending');
      // Already includes pending_revision deals now with our fix
      const pendingDeals = pendingDealsResult.length;
      
      const activeDeals = (await storage.getDealsByStatus('active')).length;
      const rejectedDeals = (await storage.getDealsByStatus('rejected')).length;
      const expiredDeals = (await storage.getDealsByStatus('expired')).length;
      
      console.log(`DASHBOARD: Found ${pendingDeals} pending deals, ${activeDeals} active deals`);
      
      // Get businesses with pending verification
      const businesses = await storage.getAllBusinesses();
      // Check for variations in verification status values
      const verificationStatuses = new Set(businesses.map(b => b.verificationStatus));
      console.log(`DASHBOARD: Business verification statuses in system: ${Array.from(verificationStatuses).join(', ')}`);
      
      const pendingVendors = businesses.filter(b => 
        b.verificationStatus === 'pending' || 
        b.verificationStatus === 'pending_verification'
      ).length;
      
      console.log(`DASHBOARD: Found ${pendingVendors} pending vendors out of ${businesses.length} total`);
      
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
  
  // Legacy dashboard route
  app.get(lDashboardPath, 
    authenticate, 
    authorize(['admin']), 
    async (_req: Request, res: Response) => {
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

  // Get all users (versioned and legacy routes)
  const [vUsersPath, lUsersPath] = createVersionedRoutes('/admin/users');
  
  app.get(vUsersPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']), 
    async (_req: Request, res: Response) => {
      try {
        const users = await storage.getAllUsers();
        
        // Filter out sensitive data
        const sanitizedUsers = users.map(user => {
          const { password, ...sanitizedUser } = user;
          return sanitizedUser;
        });
        
        return res.status(200).json(sanitizedUsers);
      } catch (error) {
        console.error("Get all users error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(lUsersPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']), 
    async (_req: Request, res: Response) => {
      try {
        const users = await storage.getAllUsers();
        
        // Filter out sensitive data
        const sanitizedUsers = users.map(user => {
          const { password, ...sanitizedUser } = user;
          return sanitizedUser;
        });
        
        return res.status(200).json(sanitizedUsers);
      } catch (error) {
        console.error("Get all users error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Create user (versioned and legacy routes)
  const [vCreateUserPath, lCreateUserPath] = createVersionedRoutes('/admin/users');
  
  app.post(vCreateUserPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.createUser),
    async (req: Request, res: Response) => {
      try {
        const { password, ...userData } = req.body;
        
        const user = await storage.adminCreateUser(userData, password);
        
        // Filter out sensitive data
        const { password: _, ...sanitizedUser } = user;
        
        return res.status(201).json(sanitizedUser);
      } catch (error) {
        console.error("Create user error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(lCreateUserPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.createUser),
    async (req: Request, res: Response) => {
      try {
        const { password, ...userData } = req.body;
        
        const user = await storage.adminCreateUser(userData, password);
        
        // Filter out sensitive data
        const { password: _, ...sanitizedUser } = user;
        
        return res.status(201).json(sanitizedUser);
      } catch (error) {
        console.error("Create user error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update user (versioned and legacy routes)
  const [vUpdateUserPath, lUpdateUserPath] = createVersionedRoutes('/admin/users/:id');
  
  app.put(vUpdateUserPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.updateUser),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const userData = req.body;
        
        const user = await storage.adminUpdateUser(userId, userData);
        
        // Filter out sensitive data
        const { password, ...sanitizedUser } = user;
        
        return res.status(200).json(sanitizedUser);
      } catch (error) {
        console.error("Update user error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(lUpdateUserPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.updateUser),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const userData = req.body;
        
        const user = await storage.adminUpdateUser(userId, userData);
        
        // Filter out sensitive data
        const { password, ...sanitizedUser } = user;
        
        return res.status(200).json(sanitizedUser);
      } catch (error) {
        console.error("Update user error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Delete user (versioned and legacy routes)
  const [vDeleteUserPath, lDeleteUserPath] = createVersionedRoutes('/admin/users/:id');
  
  app.delete(vDeleteUserPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']), 
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        
        await storage.adminDeleteUser(userId);
        
        return res.status(200).json({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(lDeleteUserPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']), 
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        
        await storage.adminDeleteUser(userId);
        
        return res.status(200).json({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Delete user error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Create business user (versioned and legacy routes)
  const [vCreateBusinessPath, lCreateBusinessPath] = createVersionedRoutes('/admin/business-users');
  
  app.post(vCreateBusinessPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.createBusinessUser),
    async (req: Request, res: Response) => {
      try {
        const { userData, businessData } = req.body;
        
        const user = await storage.adminCreateBusinessUser(userData, businessData);
        
        // Filter out sensitive data
        const { password, ...sanitizedUser } = user;
        
        return res.status(201).json(sanitizedUser);
      } catch (error) {
        console.error("Create business user error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(lCreateBusinessPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.createBusinessUser),
    async (req: Request, res: Response) => {
      try {
        const { userData, businessData } = req.body;
        
        const user = await storage.adminCreateBusinessUser(userData, businessData);
        
        // Filter out sensitive data
        const { password, ...sanitizedUser } = user;
        
        return res.status(201).json(sanitizedUser);
      } catch (error) {
        console.error("Create business user error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get all businesses (versioned and legacy routes)
  const [vBusinessesPath, lBusinessesPath] = createVersionedRoutes('/admin/businesses');
  
  app.get(vBusinessesPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']), 
    async (_req: Request, res: Response) => {
      try {
        const businesses = await storage.getAllBusinesses();
        
        // Filter out sensitive data
        const sanitizedBusinesses = businesses.map(business => {
          const { user, ...businessData } = business;
          const { password, ...userData } = user;
          
          return {
            ...businessData,
            user: userData
          };
        });
        
        return res.status(200).json(sanitizedBusinesses);
      } catch (error) {
        console.error("Get all businesses error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(lBusinessesPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']), 
    async (_req: Request, res: Response) => {
      try {
        const businesses = await storage.getAllBusinesses();
        
        // Filter out sensitive data
        const sanitizedBusinesses = businesses.map(business => {
          const { user, ...businessData } = business;
          const { password, ...userData } = user;
          
          return {
            ...businessData,
            user: userData
          };
        });
        
        return res.status(200).json(sanitizedBusinesses);
      } catch (error) {
        console.error("Get all businesses error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update deal approval (versioned and legacy routes)
  const [vUpdateDealApprovalPath, lUpdateDealApprovalPath] = createVersionedRoutes('/deal-approvals/:id');
  
  app.put(vUpdateDealApprovalPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.updateDealApproval),
    async (req: Request, res: Response) => {
      try {
        const approvalId = parseInt(req.params.id);
        const { status, feedback } = req.body;
        const reviewerId = req.user!.userId;
        
        const approval = await storage.updateDealApproval(approvalId, status, reviewerId, feedback);
        
        return res.status(200).json(approval);
      } catch (error) {
        console.error("Update deal approval error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(lUpdateDealApprovalPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.updateDealApproval),
    async (req: Request, res: Response) => {
      try {
        const approvalId = parseInt(req.params.id);
        const { status, feedback } = req.body;
        const reviewerId = req.user!.userId;
        
        const approval = await storage.updateDealApproval(approvalId, status, reviewerId, feedback);
        
        return res.status(200).json(approval);
      } catch (error) {
        console.error("Update deal approval error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get deals by status (versioned and legacy routes)
  const [vDealsByStatusPath, lDealsByStatusPath] = createVersionedRoutes('/deals/status/:status');
  
  // Add debug route to see all deals in the database with their statuses
  app.get('/api/v1/admin/debug/deals', 
    authenticate, 
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      try {
        const allDeals = await storage.getDeals();
        
        // Log detailed info about each deal and its status
        console.log("All deals in database:");
        allDeals.forEach(deal => {
          console.log(`Deal ID: ${deal.id}, Title: ${deal.title}, Status: ${deal.status}, Business: ${deal.business?.businessName || 'Unknown'}`);
        });
        
        // Group deals by status for easier analysis
        const dealsByStatus = {
          pending: allDeals.filter(d => d.status === 'pending'),
          active: allDeals.filter(d => d.status === 'active'),
          rejected: allDeals.filter(d => d.status === 'rejected'),
          expired: allDeals.filter(d => d.status === 'expired'),
          pending_revision: allDeals.filter(d => d.status === 'pending_revision'),
          other: allDeals.filter(d => !['pending', 'active', 'rejected', 'expired', 'pending_revision'].includes(d.status))
        };
        
        // Log counts by status
        Object.entries(dealsByStatus).forEach(([status, deals]) => {
          console.log(`Status "${status}": ${deals.length} deals`);
        });
        
        return res.status(200).json({
          totalDeals: allDeals.length,
          dealCounts: {
            pending: dealsByStatus.pending.length,
            active: dealsByStatus.active.length,
            rejected: dealsByStatus.rejected.length,
            expired: dealsByStatus.expired.length,
            pending_revision: dealsByStatus.pending_revision.length,
            other: dealsByStatus.other.length
          },
          dealsByStatus
        });
      } catch (error) {
        console.error("Debug route error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.get(vDealsByStatusPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin', 'business']),
    async (req: Request, res: Response) => {
      try {
        const status = req.params.status;
        console.log(`DEBUG: Getting deals with status "${status}" (versioned route)`);
        
        // Debug: Get all deals directly for comparison
        const debug = await storage.getDeals();
        const pendingCount = debug.filter(d => d.status === "pending").length;
        const activeCount = debug.filter(d => d.status === "active").length;
        console.log(`DEBUG: All deals: ${debug.length}, Pending: ${pendingCount}, Active: ${activeCount}`);
        
        const deals = await storage.getDealsByStatus(status);
        console.log(`DEBUG: Returned deals with status "${status}": ${deals.length}`);
        
        if (deals.length === 0) {
          // Try querying storage directly to check case sensitivity or whitespace issues
          const allDeals = await storage.getDeals();
          const matchingDeals = allDeals.filter(d => d.status.toLowerCase().trim() === status.toLowerCase().trim());
          console.log(`DEBUG: Direct filter found ${matchingDeals.length} deals with status "${status}" (case insensitive)`);
          
          if (matchingDeals.length > 0) {
            console.log(`DEBUG: Status values in database: ${matchingDeals.map(d => `"${d.status}"`).join(', ')}`);
            return res.status(200).json(matchingDeals);
          }
        }
        
        return res.status(200).json(deals);
      } catch (error) {
        console.error("Get deals by status error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(lDealsByStatusPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin', 'business']),
    async (req: Request, res: Response) => {
      try {
        const status = req.params.status;
        console.log(`DEBUG: Getting deals with status "${status}" (legacy route)`);
        
        // Debug: Get all deals directly for comparison
        const debug = await storage.getDeals();
        const pendingCount = debug.filter(d => d.status === "pending").length;
        const activeCount = debug.filter(d => d.status === "active").length;
        console.log(`DEBUG: All deals: ${debug.length}, Pending: ${pendingCount}, Active: ${activeCount}`);
        
        const deals = await storage.getDealsByStatus(status);
        console.log(`DEBUG: Returned deals with status "${status}": ${deals.length}`);
        
        return res.status(200).json(deals);
      } catch (error) {
        console.error("Get deals by status error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update deal status (versioned and legacy routes)
  const [vUpdateDealStatusPath, lUpdateDealStatusPath] = createVersionedRoutes('/deals/:id/status');
  
  app.put(vUpdateDealStatusPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.updateDealStatus),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        const { status } = req.body;
        
        const deal = await storage.updateDealStatus(dealId, status);
        
        return res.status(200).json(deal);
      } catch (error) {
        console.error("Update deal status error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(lUpdateDealStatusPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']),
    validate(adminSchemas.updateDealStatus),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        const { status } = req.body;
        
        const deal = await storage.updateDealStatus(dealId, status);
        
        return res.status(200).json(deal);
      } catch (error) {
        console.error("Update deal status error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}