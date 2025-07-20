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
import { type Deal, type Business, type User } from "@shared/schema";

/**
 * Sanitize deals for frontend consumption by removing sensitive data
 * and ensuring consistent object structure
 */
function sanitizeDeals(deals: (Deal & { business?: Business })[]): any[] {
  return deals.map(deal => {
    const sanitizedDeal = {
      id: deal.id,
      title: deal.title || 'Untitled Deal',
      description: deal.description || '',
      category: deal.category || '',
      imageUrl: deal.imageUrl || '',
      startDate: deal.startDate || new Date(),
      endDate: deal.endDate || new Date(),
      status: deal.status || 'pending',
      businessId: deal.businessId,
      businessName: deal.business?.businessName,
      dealType: deal.dealType || '',
      discount: deal.discount || '',
      terms: deal.terms || '',
      featured: deal.featured || false,
      createdAt: deal.createdAt || new Date()
    };
    
    return sanitizedDeal;
  });
}

/**
 * Sanitize businesses for frontend consumption by removing sensitive data
 * and ensuring consistent object structure
 */
function sanitizeBusinesses(businesses: (Business & { user: User })[]): any[] {
  return businesses.map(business => {
    const { user, ...businessData } = business;
    const { password, ...userData } = user;
    
    return {
      ...businessData,
      businessName: business.businessName || 'Unnamed Business',
      businessCategory: business.businessCategory || 'Other',
      verificationStatus: business.verificationStatus || 'pending',
      description: business.description || '',
      address: business.address || '',
      phone: business.phone || '',
      user: userData
    };
  });
}

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
      
      // Filter pending vendors (businesses awaiting verification)
      const pendingVendorsBusiness = businesses.filter(b => 
        b.verificationStatus === 'pending' || 
        b.verificationStatus === 'pending_verification'
      );
      
      const pendingVendors = pendingVendorsBusiness.length;
      
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
      
      console.log(`DASHBOARD: Including ${pendingDealsResult.length} full pending deals and ${pendingVendorsBusiness.length} full pending vendors in response`);
      
      // Return the stats along with full pending deals and vendors data
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
          .slice(0, 5),
        // Include the full sanitized deals and vendors    
        pendingDeals: sanitizeDeals(pendingDealsResult),
        pendingVendors: sanitizeBusinesses(pendingVendorsBusiness)
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
      const pendingDealsResult = await storage.getDealsByStatus('pending');
      const pendingDeals = pendingDealsResult.length;
      const activeDeals = (await storage.getDealsByStatus('active')).length;
      const rejectedDeals = (await storage.getDealsByStatus('rejected')).length;
      const expiredDeals = (await storage.getDealsByStatus('expired')).length;
      
      // Get businesses with pending verification
      const businesses = await storage.getAllBusinesses();
      // Filter pending vendors (businesses awaiting verification)
      const pendingVendorsBusiness = businesses.filter(b => 
        b.verificationStatus === 'pending' || 
        b.verificationStatus === 'pending_verification'
      );
      
      const pendingVendors = pendingVendorsBusiness.length;
      
      console.log(`DASHBOARD (legacy): Found ${pendingDeals} pending deals, ${activeDeals} active deals`);
      console.log(`DASHBOARD (legacy): Found ${pendingVendors} pending vendors out of ${businesses.length} total`);
      
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
      
      console.log(`DASHBOARD (legacy): Including ${pendingDealsResult.length} full pending deals and ${pendingVendorsBusiness.length} full pending vendors in response`);
      
      // Return the stats along with full pending deals and vendors data
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
          .slice(0, 5),
        // Include the full sanitized deals and vendors
        pendingDeals: sanitizeDeals(pendingDealsResult),
        pendingVendors: sanitizeBusinesses(pendingVendorsBusiness)
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
        console.log("Admin users endpoint: Using unified Supabase system");
        
        // Import and use the new unified system
        const { getAllUsersWithBusinesses } = await import('../supabaseQueries');
        const users = await getAllUsersWithBusinesses();
        
        console.log(`Admin users endpoint: Found ${users.length} users`);
        
        // Map to admin dashboard format
        const sanitizedUsers = users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          userType: user.user_type,
          phoneVerified: user.phone_verified,
          marketingConsent: user.marketing_consent || false,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          supabaseUserId: user.supabase_user_id,
          // Include business info if available
          businessName: user.business?.business_name || null,
          businessCategory: user.business?.business_category || null,
          verificationStatus: user.business?.verification_status || null
        }));
        
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
        console.log("Admin users endpoint (legacy): Using unified Supabase system");
        
        // Import and use the new unified system
        const { getAllUsersWithBusinesses } = await import('../supabaseQueries');
        const users = await getAllUsersWithBusinesses();
        
        console.log(`Admin users endpoint (legacy): Found ${users.length} users`);
        
        // Map to admin dashboard format
        const sanitizedUsers = users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          userType: user.user_type,
          phoneVerified: user.phone_verified,
          marketingConsent: user.marketing_consent || false,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          supabaseUserId: user.supabase_user_id,
          // Include business info if available
          businessName: user.business?.business_name || null,
          businessCategory: user.business?.business_category || null,
          verificationStatus: user.business?.verification_status || null
        }));
        
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

  // Get individual user (versioned and legacy routes)
  const [vGetUserPath, lGetUserPath] = createVersionedRoutes('/admin/users/:id');
  
  app.get(vGetUserPath, 
    versionHeadersMiddleware(),
    authenticate, 
    authorize(['admin']), 
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Filter out sensitive data
        const { password, ...sanitizedUser } = user;
        
        return res.status(200).json(sanitizedUser);
      } catch (error) {
        console.error("Get user error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(lGetUserPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    authorize(['admin']), 
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Filter out sensitive data
        const { password, ...sanitizedUser } = user;
        
        return res.status(200).json(sanitizedUser);
      } catch (error) {
        console.error("Get user error (legacy):", error);
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
  
  // Add routes to fetch pending businesses (vendors)
  const [vPendingBusinessesPath, lPendingBusinessesPath] = createVersionedRoutes('/admin/businesses/pending');
  
  // Versioned pending businesses endpoint
  app.get(vPendingBusinessesPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      try {
        console.log("Admin: Fetching pending businesses");
        const pendingBusinesses = await storage.getBusinessesByStatus("pending");
        
        // Filter out sensitive data
        const sanitizedBusinesses = pendingBusinesses.map(business => {
          const { user, ...businessData } = business;
          const { password, ...userData } = user;
          
          return {
            ...businessData,
            user: userData
          };
        });
        
        console.log(`Admin: Found ${sanitizedBusinesses.length} pending businesses`);
        return res.status(200).json(sanitizedBusinesses);
      } catch (error) {
        console.error("Get pending businesses error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Legacy pending businesses endpoint
  app.get(lPendingBusinessesPath,
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      try {
        console.log("Admin (legacy): Fetching pending businesses");
        const pendingBusinesses = await storage.getBusinessesByStatus("pending");
        
        // Filter out sensitive data
        const sanitizedBusinesses = pendingBusinesses.map(business => {
          const { user, ...businessData } = business;
          const { password, ...userData } = user;
          
          return {
            ...businessData,
            user: userData
          };
        });
        
        console.log(`Admin (legacy): Found ${sanitizedBusinesses.length} pending businesses`);
        return res.status(200).json(sanitizedBusinesses);
      } catch (error) {
        console.error("Get pending businesses error (legacy):", error);
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

  // Get individual business (versioned and legacy routes)
  const [vGetBusinessPath, lGetBusinessPath] = createVersionedRoutes('/admin/businesses/:id');
  
  app.get(vGetBusinessPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({ error: "Invalid business ID" });
        }

        const business = await storage.getBusiness(businessId);
        if (!business) {
          return res.status(404).json({ error: "Business not found" });
        }

        // Get user data for the business
        const user = await storage.getUser(business.userId);
        if (!user) {
          return res.status(404).json({ error: "Business owner not found" });
        }

        // Filter out sensitive data
        const { password, ...userData } = user;
        
        return res.status(200).json({
          ...business,
          user: userData
        });
      } catch (err) {
        console.error("Admin Business Fetch Error:", err);
        return res.status(500).json({ error: "Unable to fetch business." });
      }
    }
  );

  app.get(lGetBusinessPath,
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({ error: "Invalid business ID" });
        }

        const business = await storage.getBusiness(businessId);
        if (!business) {
          return res.status(404).json({ error: "Business not found" });
        }

        // Get user data for the business
        const user = await storage.getUser(business.userId);
        if (!user) {
          return res.status(404).json({ error: "Business owner not found" });
        }

        // Filter out sensitive data
        const { password, ...userData } = user;
        
        return res.status(200).json({
          ...business,
          user: userData
        });
      } catch (err) {
        console.error("Admin Business Fetch Error (legacy):", err);
        return res.status(500).json({ error: "Unable to fetch business." });
      }
    }
  );

  // Update individual business (versioned and legacy routes)
  const [vUpdateBusinessPath, lUpdateBusinessPath] = createVersionedRoutes('/admin/businesses/:id');
  
  app.put(vUpdateBusinessPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({ error: "Invalid business ID" });
        }

        const updateData = req.body.data || req.body;
        
        // Validate required fields
        if (!updateData.businessName || !updateData.businessCategory) {
          return res.status(400).json({ error: "Business name and category are required" });
        }

        const updatedBusiness = await storage.updateBusiness(businessId, updateData);
        if (!updatedBusiness) {
          return res.status(404).json({ error: "Business not found" });
        }

        // Get user data for the business
        const user = await storage.getUser(updatedBusiness.userId);
        if (!user) {
          return res.status(404).json({ error: "Business owner not found" });
        }

        // Filter out sensitive data
        const { password, ...userData } = user;

        return res.status(200).json({
          ...updatedBusiness,
          user: userData
        });
      } catch (err) {
        console.error("Admin Business Update Error:", err);
        return res.status(500).json({ error: "Unable to update business." });
      }
    }
  );

  app.put(lUpdateBusinessPath,
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({ error: "Invalid business ID" });
        }

        const updateData = req.body.data || req.body;
        
        // Validate required fields
        if (!updateData.businessName || !updateData.businessCategory) {
          return res.status(400).json({ error: "Business name and category are required" });
        }

        const updatedBusiness = await storage.updateBusiness(businessId, updateData);
        if (!updatedBusiness) {
          return res.status(404).json({ error: "Business not found" });
        }

        // Get user data for the business
        const user = await storage.getUser(updatedBusiness.userId);
        if (!user) {
          return res.status(404).json({ error: "Business owner not found" });
        }

        // Filter out sensitive data
        const { password, ...userData } = user;

        return res.status(200).json({
          ...updatedBusiness,
          user: userData
        });
      } catch (err) {
        console.error("Admin Business Update Error (legacy):", err);
        return res.status(500).json({ error: "Unable to update business." });
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
        
        const approval = await storage.updateDealApproval(approvalId, status);
        
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
        
        const approval = await storage.updateDealApproval(approvalId, status);
        
        return res.status(200).json(approval);
      } catch (error) {
        console.error("Update deal approval error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Test endpoint to verify route registration
  app.get('/api/v1/admin/test-deals',
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      console.log("TEST DEALS ENDPOINT: Successfully reached");
      return res.status(200).json({ message: "Test endpoint working", deals: [] });
    }
  );

  // Get all deals (versioned and legacy routes)
  const [vDealsPath, lDealsPath] = createVersionedRoutes('/admin/deals');
  
  app.get(vDealsPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      try {
        console.log("ADMIN DEALS ENDPOINT: Processing GET /api/v1/admin/deals");
        const deals = await storage.getDeals();
        console.log(`ADMIN DEALS ENDPOINT: Found ${deals.length} deals`);
        
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
        
        console.log("ADMIN DEALS ENDPOINT: Returning JSON response");
        return res.status(200).json(dealsWithBusiness);
      } catch (error) {
        console.error("Get admin deals error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(lDealsPath,
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      try {
        const deals = await storage.getDeals();
        
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
        
        return res.status(200).json(dealsWithBusiness);
      } catch (error) {
        console.error("Get admin deals error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get all transactions/redemptions (versioned and legacy routes)
  const [vTransactionsPath, lTransactionsPath] = createVersionedRoutes('/admin/transactions');
  
  app.get(vTransactionsPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      try {
        const redemptions = await storage.getAllRedemptions();
        
        // Map redemptions to transaction format for dashboard
        const transactions = redemptions.map((redemption: any) => ({
          id: redemption.id,
          userId: redemption.userId,
          dealId: redemption.dealId,
          status: redemption.status,
          redeemedAt: redemption.redeemedAt,
          type: 'redemption'
        }));
        
        return res.status(200).json(transactions);
      } catch (error) {
        console.error("Get transactions error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(lTransactionsPath,
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate,
    authorize(['admin']),
    async (_req: Request, res: Response) => {
      try {
        const redemptions = await storage.getAllRedemptions();
        
        // Map redemptions to transaction format for dashboard
        const transactions = redemptions.map((redemption: any) => ({
          id: redemption.id,
          userId: redemption.userId,
          dealId: redemption.dealId,
          status: redemption.status,
          redeemedAt: redemption.redeemedAt,
          type: 'redemption'
        }));
        
        return res.status(200).json(transactions);
      } catch (error) {
        console.error("Get transactions error (legacy):", error);
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

  // Delete business (versioned and legacy routes)
  const [vDeleteBusinessPath, lDeleteBusinessPath] = createVersionedRoutes('/admin/businesses/:id');
  
  app.delete(vDeleteBusinessPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({ error: "Invalid business ID" });
        }

        // Check if business exists first
        const business = await storage.getBusiness(businessId);
        if (!business) {
          return res.status(404).json({ error: "Business not found" });
        }

        // Delete the business (this should cascade and delete all related data)
        const success = await storage.deleteBusiness(businessId);
        if (!success) {
          return res.status(500).json({ error: "Failed to delete business" });
        }

        return res.status(200).json({ 
          message: "Business deleted successfully",
          deletedBusinessId: businessId,
          deletedBusinessName: business.businessName
        });
      } catch (err) {
        console.error("Admin Business Delete Error:", err);
        return res.status(500).json({ error: "Unable to delete business." });
      }
    }
  );

  app.delete(lDeleteBusinessPath,
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        if (isNaN(businessId)) {
          return res.status(400).json({ error: "Invalid business ID" });
        }

        // Check if business exists first
        const business = await storage.getBusiness(businessId);
        if (!business) {
          return res.status(404).json({ error: "Business not found" });
        }

        // Delete the business (this should cascade and delete all related data)
        const success = await storage.deleteBusiness(businessId);
        if (!success) {
          return res.status(500).json({ error: "Failed to delete business" });
        }

        return res.status(200).json({ 
          message: "Business deleted successfully",
          deletedBusinessId: businessId,
          deletedBusinessName: business.businessName
        });
      } catch (err) {
        console.error("Admin Business Delete Error (legacy):", err);
        return res.status(500).json({ error: "Unable to delete business." });
      }
    }
  );
}