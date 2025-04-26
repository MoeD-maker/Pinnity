import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, authorize } from "../middleware";
import {
  createVersionedRoutes,
  versionHeadersMiddleware,
  deprecationMiddleware,
} from "../../src/utils/routeVersioning";
import {
  sanitizeDeal,
  sanitizeDeals,
  sanitizeBusiness,
  sanitizeBusinesses,
  ensureArray,
} from "../utils/sanitize";

/**
 * Admin routes for user and business management
 */
export function adminRoutes(app: Express): void {
  // Get dashboard stats (versioned endpoint)
  const [vDashboardPath, lDashboardPath] =
    createVersionedRoutes("/admin/dashboard");

  // Debugging route to determine exact format issues with deals
  app.get(
    "/api/v1/admin/debug/deal-format",
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        // Get pending deals in their raw format
        const pendingDeals = await storage.getDealsByStatus("pending");
        
        // Return diagnostic information about the deals
        return res.status(200).json({
          pendingDealsType: typeof pendingDeals,
          isArray: Array.isArray(pendingDeals),
          hasLength: !!pendingDeals.length,
          length: pendingDeals.length,
          firstDeal: pendingDeals.length > 0 ? pendingDeals[0] : null,
          keys: Object.keys(pendingDeals),
          rawData: pendingDeals
        });
      } catch (error) {
        console.error("Debug route error:", error);
        return res.status(500).json({ error: "Error in debug route" });
      }
    }
  );

  // Versioned dashboard route
  app.get(
    vDashboardPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        // Deals - ensure we always get arrays back
        const pendingDealsResult = ensureArray(await storage.getDealsByStatus("pending"));
        const pendingDealsCount = pendingDealsResult.length;
        console.log(`Raw pending deals: ${JSON.stringify(pendingDealsResult).substring(0, 100)}...`);

        // Always ensure we get arrays for these counts
        const activeDealsResult = ensureArray(await storage.getDealsByStatus("active"));
        const activeDealsCount = activeDealsResult.length;
        console.log(`Active deals count: ${activeDealsCount}`);
        
        const rejectedDealsResult = ensureArray(await storage.getDealsByStatus("rejected"));
        const rejectedDealsCount = rejectedDealsResult.length;
        console.log(`Rejected deals count: ${rejectedDealsCount}`);
        
        const expiredDealsResult = ensureArray(await storage.getDealsByStatus("expired"));
        const expiredDealsCount = expiredDealsResult.length;
        console.log(`Expired deals count: ${expiredDealsCount}`);

        console.log(`Found ${pendingDealsCount} pending deals.`);

        // Businesses
        const businesses = await storage.getAllBusinesses();
        const pendingBusinesses = businesses.filter(
          (b) =>
            b.verificationStatus === "pending" ||
            b.verificationStatus === "pending_verification",
        );
        const pendingVendorsCount = pendingBusinesses.length;

        console.log(`Found ${pendingVendorsCount} pending vendors.`);

        // Users
        const users = await storage.getAllUsers();
        const totalUsers = users.length;

        const sanitizedPendingDeals = sanitizeDeals(pendingDealsResult);
        const sanitizedPendingVendors = sanitizeBusinesses(pendingBusinesses);

        // Prepare Response
        // Force arrays to be actual arrays (not objects)
        const sanitizedPendingDealsArray = [...sanitizedPendingDeals];
        const recentDealsArray = [...sanitizedPendingDeals]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          )
          .slice(0, 5);
        const sanitizedPendingVendorsArray = [...sanitizedPendingVendors];
        
        // Use JSON.stringify to force array encoding
        const jsonResponse = JSON.stringify({
          stats: {
            pendingDeals: pendingDealsCount,
            activeDeals: activeDealsCount,
            rejectedDeals: rejectedDealsCount,
            expiredDeals: expiredDealsCount,
            pendingVendors: pendingVendorsCount,
            totalUsers,
            alertCount: pendingDealsCount + pendingVendorsCount,
          },
          recentActivity: recentDealsArray,
          pendingDeals: sanitizedPendingDealsArray, // ✅ Real pending deals as proper array
          pendingVendors: sanitizedPendingVendorsArray, // ✅ Real pending vendors as proper array
        });
        
        return res
          .setHeader('Content-Type', 'application/json')
          .send(jsonResponse);
      } catch (error) {
        console.error("Admin Dashboard Error:", error);
        return res
          .status(500)
          .json({ error: "Something went wrong loading the dashboard." });
      }
    },
  );
  // GET /api/v1/admin/vendors
  app.get(
    "/api/v1/admin/vendors",
    versionHeadersMiddleware(),
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        const businesses = await storage.getAllBusinesses();

        // Filter only pending or pending_verification businesses
        const pendingBusinesses = businesses.filter(
          (b) =>
            b.verificationStatus === "pending" ||
            b.verificationStatus === "pending_verification",
        );

        // Return array directly to match frontend expectations
        const sanitizedBusinesses = sanitizeBusinesses(pendingBusinesses);
        console.log(
          `Returning ${sanitizedBusinesses.length} pending vendors directly as array`,
        );
        return res.status(200).json(sanitizedBusinesses);
      } catch (error) {
        console.error("Admin Vendors Fetch Error:", error);
        return res.status(500).json({ error: "Unable to fetch vendors." });
      }
    },
  );

  // Versioned GET /api/v1/admin/businesses
  app.get(
    "/api/v1/admin/businesses",
    versionHeadersMiddleware(),
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        const businesses = await storage.getAllBusinesses();
        return res.status(200).json(sanitizeBusinesses(businesses));
      } catch (err) {
        console.error("Admin Businesses Fetch Error:", err);
        return res.status(500).json({ error: "Unable to fetch businesses." });
      }
    },
  );

  // Legacy GET /api/admin/businesses
  app.get(
    "/api/admin/businesses",
    versionHeadersMiddleware(),
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        const all = await storage.getAllBusinesses();
        const pending = all.filter(
          (b) =>
            b.verificationStatus === "pending" ||
            b.verificationStatus === "pending_verification",
        );
        return res.status(200).json({
          businesses: sanitizeBusinesses(pending),
        });
      } catch (err) {
        console.error("Legacy Admin Businesses Fetch Error:", err);
        return res.status(500).json({ error: "Unable to fetch businesses." });
      }
    },
  );

  // Create versioned route paths
  const [vUsersPath, lUsersPath] = createVersionedRoutes("/admin/users");

  // Get all users - versioned route
  app.get(
    vUsersPath,
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        const users = await storage.getAllUsers();
        return res.status(200).json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Error fetching users" });
      }
    },
  );

  // Get all users - legacy route
  app.get(
    lUsersPath,
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        const users = await storage.getAllUsers();
        return res.status(200).json(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "Error fetching users" });
      }
    },
  );

  // Create versioned route paths for POST users
  const [vCreateUserPath, lCreateUserPath] =
    createVersionedRoutes("/admin/users");

  // Create a user - versioned route
  app.post(
    vCreateUserPath,
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
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
    },
  );

  // Create a user - legacy route
  app.post(
    lCreateUserPath,
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
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
    },
  );

  // Update a user
  app.put(
    "/api/admin/users/:id",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
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
    },
  );

  // Delete a user
  app.delete(
    "/api/admin/users/:id",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
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
    },
  );

  // Create a business user
  app.post(
    "/api/admin/business-users",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const { userData, businessData } = req.body;

        if (!userData.password) {
          return res.status(400).json({ message: "Password is required" });
        }

        // Create the business user
        const user = await storage.adminCreateBusinessUser(
          userData,
          businessData,
        );
        return res.status(201).json(user);
      } catch (error) {
        console.error("Error creating business user:", error);
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        return res
          .status(500)
          .json({ message: "Error creating business user" });
      }
    },
  );

  // Create versioned route paths for businesses
  const [vBusinessesPath, lBusinessesPath] =
    createVersionedRoutes("/admin/businesses");

  // Create versioned route paths for pending businesses specifically
  const [vPendingBusinessesPath, lPendingBusinessesPath] =
    createVersionedRoutes("/admin/businesses/pending");

  // Get all businesses or filter by status - versioned route
  app.get(
    vBusinessesPath,
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        // Check if status is provided as a query parameter
        const status = req.query.status as string;

        if (status) {
          console.log(
            `Fetching businesses with status: ${status} (versioned route)`,
          );
          const businesses = await storage.getBusinessesByStatus(status);
          const sanitizedBusinesses = sanitizeBusinesses(
            ensureArray(businesses),
          );
          // Return array directly to match frontend expectations
          console.log(
            `Returning ${sanitizedBusinesses.length} businesses with status ${status}`,
          );
          return res.status(200).json(sanitizedBusinesses);
        } else {
          console.log("Fetching all businesses (versioned route)");
          const businesses = await storage.getAllBusinesses();
          const sanitizedBusinesses = sanitizeBusinesses(
            ensureArray(businesses),
          );
          // Return array directly to match frontend expectations
          console.log(
            `Returning ${sanitizedBusinesses.length} total businesses`,
          );
          return res.status(200).json(sanitizedBusinesses);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
        return res.status(500).json({ message: "Error fetching businesses" });
      }
    },
  );

  // Get all businesses or filter by status - legacy route (for backward compatibility)
  app.get(
    "/api/admin/businesses",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        // Check if status is provided as a query parameter
        const status = req.query.status as string;

        if (status) {
          console.log(
            `Fetching businesses with status: ${status} (legacy route)`,
          );
          const businesses = await storage.getBusinessesByStatus(status);
          const sanitizedBusinesses = sanitizeBusinesses(
            ensureArray(businesses),
          );
          return res.status(200).json(sanitizedBusinesses);
        } else {
          console.log("Fetching all businesses (legacy route)");
          const businesses = await storage.getAllBusinesses();
          const sanitizedBusinesses = sanitizeBusinesses(
            ensureArray(businesses),
          );
          return res.status(200).json(sanitizedBusinesses);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
        return res.status(500).json({ message: "Error fetching businesses" });
      }
    },
  );

  // Get pending businesses - versioned route (dedicated endpoint)
  app.get(
    vPendingBusinessesPath,
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        console.log("Fetching pending businesses (versioned dedicated route)");
        const businesses = await storage.getBusinessesByStatus("pending");
        console.log(`Found ${businesses.length} pending businesses`);

        // Add more detailed debugging
        if (businesses.length > 0) {
          console.log("First pending business:", {
            id: businesses[0].id,
            name: businesses[0].businessName,
            status: businesses[0].verificationStatus,
          });
        }

        const sanitizedBusinesses = sanitizeBusinesses(ensureArray(businesses));
        // Return array directly to match frontend expectations
        console.log(
          `Returning ${sanitizedBusinesses.length} sanitized pending businesses`,
        );
        return res.status(200).json(sanitizedBusinesses);
      } catch (error) {
        console.error("Error fetching pending businesses:", error);
        return res
          .status(500)
          .json({ message: "Error fetching pending businesses" });
      }
    },
  );

  // Get pending businesses - legacy route (dedicated endpoint)
  app.get(
    lPendingBusinessesPath,
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        console.log("Fetching pending businesses (legacy dedicated route)");
        const businesses = await storage.getBusinessesByStatus("pending");
        console.log(
          `Found ${businesses.length} pending businesses (legacy route)`,
        );

        // Add more detailed debugging
        if (businesses.length > 0) {
          console.log("First pending business (legacy route):", {
            id: businesses[0].id,
            name: businesses[0].businessName,
            status: businesses[0].verificationStatus,
          });
        }

        const sanitizedBusinesses = sanitizeBusinesses(ensureArray(businesses));
        // Return array directly to match frontend expectations
        console.log(
          `Returning ${sanitizedBusinesses.length} sanitized pending businesses (legacy route)`,
        );
        return res.status(200).json(sanitizedBusinesses);
      } catch (error) {
        console.error("Error fetching pending businesses:", error);
        return res
          .status(500)
          .json({ message: "Error fetching pending businesses" });
      }
    },
  );

  // Analytics endpoint for admin dashboard
  const [vAnalyticsPath, lAnalyticsPath] = createVersionedRoutes("/admin/analytics");
  
  // Versioned analytics endpoint
  app.get(
    vAnalyticsPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        console.log("Fetching analytics data for admin dashboard");
        const timeRange = req.query.timeRange as string || "30days";
        console.log(`Time range requested: ${timeRange}`);
        
        // Get deal statistics
        const allDeals = await storage.getDeals();
        const pendingDeals = await storage.getDealsByStatus("pending");
        const activeDeals = await storage.getDealsByStatus("active");
        const rejectedDeals = await storage.getDealsByStatus("rejected");
        const expiredDeals = await storage.getDealsByStatus("expired");
        
        // Get user statistics
        const allUsers = await storage.getAllUsers();
        const individualUsers = allUsers.filter(user => user.userType === "individual");
        const businessUsers = allUsers.filter(user => user.userType === "business");
        const adminUsers = allUsers.filter(user => user.userType === "admin");
        
        // Get business statistics
        const allBusinesses = await storage.getAllBusinesses();
        
        // Calculate total redemptions
        let totalRedemptions = 0;
        for (const deal of allDeals) {
          totalRedemptions += deal.redemptionCount || 0;
        }
        
        // Get deals by category
        const categoryCounts: Record<string, number> = {};
        allDeals.forEach(deal => {
          const category = deal.category || "Uncategorized";
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        const dealsByCategory = Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
        
        // Get deals by status
        const dealsByStatus = [
          { name: "Active", value: activeDeals.length },
          { name: "Pending", value: pendingDeals.length },
          { name: "Rejected", value: rejectedDeals.length },
          { name: "Expired", value: expiredDeals.length }
        ];
        
        // Get users by type
        const usersByType = [
          { name: "Individual", value: individualUsers.length },
          { name: "Business", value: businessUsers.length },
          { name: "Admin", value: adminUsers.length }
        ];
        
        // Get top deals by views
        const topDealsByViews = [...allDeals]
          .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
          .slice(0, 10)
          .map(deal => ({
            id: deal.id,
            title: deal.title,
            category: deal.category,
            startDate: deal.startDate.toISOString(),
            endDate: deal.endDate.toISOString(),
            views: deal.viewCount || 0,
            redemptions: deal.redemptionCount || 0,
            savedCount: deal.saveCount || 0
          }));
        
        // Get recent users
        const recentUsers = [...allUsers]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            userType: user.userType,
            created_at: user.created_at
          }));
        
        // Get popular businesses (using deals count as popularity metric)
        const businessPopularity: Record<number, number> = {};
        allDeals.forEach(deal => {
          const businessId = deal.businessId;
          businessPopularity[businessId] = (businessPopularity[businessId] || 0) + 1;
        });
        
        const popularBusinessesIds = Object.entries(businessPopularity)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 10)
          .map(([id]) => parseInt(id));
        
        const popularBusinesses = allBusinesses
          .filter(business => popularBusinessesIds.includes(business.id))
          .map(business => ({
            id: business.id,
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            status: business.verificationStatus
          }));
        
        // Calculate dummy growth metrics based on available data
        // In a real scenario, we would compare with previous period data
        const usersGrowth = 5; // 5% growth (placeholder)
        const businessesGrowth = 8; // 8% growth (placeholder)
        const dealsGrowth = 12; // 12% growth (placeholder)
        const redemptionsGrowth = 15; // 15% growth (placeholder)
        
        // Build the final response object
        const analyticsData = {
          totalUsers: allUsers.length,
          totalBusinesses: allBusinesses.length,
          totalDeals: allDeals.length,
          totalRedemptions,
          activeDeals: activeDeals.length,
          pendingDeals: pendingDeals.length,
          usersGrowth,
          businessesGrowth,
          dealsGrowth,
          redemptionsGrowth,
          redemptionsOverTime: [], // Would require historical data
          dealsByCategory,
          dealsByStatus,
          topDeals: topDealsByViews,
          recentUsers,
          popularBusinesses,
          usersByType,
          engagementRate: Math.round((totalRedemptions / (allDeals.reduce((sum, deal) => sum + (deal.viewCount || 0), 0) || 1)) * 100), // Redemptions / Views
          redemptionsByDay: [], // Would require historical data
          averageRating: 4.2 // Placeholder until ratings are implemented
        };
        
        console.log("Successfully generated analytics data");
        return res.status(200).json(analyticsData);
      } catch (error) {
        console.error("Error generating analytics data:", error);
        return res.status(500).json({ message: "Error generating analytics data" });
      }
    }
  );
  
  // Legacy analytics endpoint
  app.get(
    lAnalyticsPath,
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        console.log("Fetching analytics data for admin dashboard (legacy route)");
        const timeRange = req.query.timeRange as string || "30days";
        
        // Forward to the versioned implementation
        const versionedUrl = `/api/v1/admin/analytics?timeRange=${timeRange}`;
        console.log(`Forwarding to versioned endpoint: ${versionedUrl}`);
        
        // This implementation reuses the versioned endpoint
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}${versionedUrl}`, {
          headers: {
            'Cookie': req.headers.cookie || '',
            'Authorization': req.headers.authorization || ''
          }
        });
        
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (error) {
        console.error("Error in legacy analytics endpoint:", error);
        return res.status(500).json({ message: "Error generating analytics data" });
      }
    }
  );

  // Debug deals endpoint
  app.get(
    "/api/admin/debug/deals",
    authenticate,
    authorize(["admin"]),
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
        allDeals.forEach((deal) => {
          const status = deal.status || "unknown";
          if (!dealsByStatus[status]) {
            dealsByStatus[status] = [];
          }
          dealsByStatus[status].push(deal);
        });

        // Get statuses distribution
        const statusCounts: Record<string, number> = {};
        Object.keys(dealsByStatus).forEach((status) => {
          statusCounts[status] = dealsByStatus[status].length;
        });

        return res.status(200).json({
          totalDeals: allDeals.length,
          statusCounts,
          dealsByStatus: Object.keys(dealsByStatus).reduce(
            (acc, status) => {
              acc[status] = sanitizeDeals(ensureArray(dealsByStatus[status]));
              return acc;
            },
            {} as Record<string, any[]>,
          ),
        });
      } catch (error) {
        console.error("Error in debug endpoint:", error);
        return res
          .status(500)
          .json({ message: "Error in debug endpoint", error: String(error) });
      }
    },
  );

  // Deal approval routes
  app.put(
    "/api/deal-approvals/:id",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const approvalId = parseInt(req.params.id);
        const { status, feedback } = req.body;

        if (
          !status ||
          !["approved", "rejected", "pending_revision"].includes(status)
        ) {
          return res.status(400).json({ message: "Invalid status" });
        }

        // Add reviewer ID from authenticated user
        const reviewerId = req.user?.userId;

        const approval = await storage.updateDealApproval(
          approvalId,
          {
            status,
            reviewerId,
            feedback,
            reviewedAt: new Date()
          }
        );

        // If deal is approved, update the deal status as well
        if (status === "approved") {
          await storage.updateDealStatus(approval.dealId, "active");
        } else if (status === "rejected") {
          await storage.updateDealStatus(approval.dealId, "rejected");
        } else if (status === "pending_revision") {
          await storage.updateDealStatus(approval.dealId, "pending_revision");
        }

        // Get all deals to find the updated one
        const allDeals = await storage.getDeals();
        const updatedDeal = allDeals.find(
          (deal) => deal.id === approval.dealId,
        );
        const sanitizedDeal = updatedDeal ? sanitizeDeal(updatedDeal) : null;

        return res.status(200).json({
          approval,
          deal: sanitizedDeal,
        });
      } catch (error) {
        console.error("Error updating approval:", error);
        return res.status(500).json({ message: "Error updating approval" });
      }
    },
  );

  // Get deals by status
  app.get(
    "/api/deals/status/:status",
    authenticate,
    authorize(["admin", "business"]),
    async (req: Request, res: Response) => {
      try {
        const status = req.params.status;

        if (
          ![
            "pending",
            "active",
            "expired",
            "rejected",
            "pending_revision",
          ].includes(status)
        ) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const deals = await storage.getDealsByStatus(status);
        console.log(`Found ${deals.length} deals with status "${status}"`);

        let resultDeals;
        // If business user, filter deals to only show their own
        if (req.user?.userType === "business") {
          const business = await storage.getBusinessByUserId(req.user.userId);
          if (!business) {
            return res.status(404).json({ message: "Business not found" });
          }

          const filteredDeals = deals.filter(
            (deal) => deal.business?.id === business.id,
          );
          resultDeals = sanitizeDeals(ensureArray(filteredDeals));
        } else {
          resultDeals = sanitizeDeals(ensureArray(deals));
        }

        return res.status(200).json(resultDeals);
      } catch (error) {
        console.error("Error fetching deals by status:", error);
        return res.status(500).json({ message: "Error fetching deals" });
      }
    },
  );

  // Update deal status with feedback
  app.put(
    "/api/deals/:id/status",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        const { status, feedback } = req.body;

        if (
          !status ||
          ![
            "pending",
            "active",
            "approved", // Allow both "active" and "approved" for consistency
            "expired",
            "rejected",
            "pending_revision",
          ].includes(status)
        ) {
          return res.status(400).json({ message: "Invalid status" });
        }
        
        console.log(`Updating deal ${dealId} status to ${status} with feedback: ${feedback || "none"}`);
        
        // Map "approved" to "active" in the database status
        const dbStatus = status === "approved" ? "active" : status;
        
        // 1. Update the deal status
        const deal = await storage.updateDealStatus(dealId, dbStatus);
        
        // 2. Update the deal approval record with feedback
        if (feedback || status === "rejected" || status === "pending_revision") {
          try {
            // Get the most recent deal approval
            const approval = await storage.getDealApproval(dealId);
            
            if (approval) {
              // Update the approval record
              await storage.updateDealApproval(approval.id, {
                reviewerId: req.user?.userId,
                status: dbStatus,
                feedback: feedback || null,
                reviewedAt: new Date()
              });
              console.log(`Updated deal approval record ${approval.id} with feedback`);
            } else {
              // Create a new approval record if none exists
              await storage.createDealApproval({
                dealId: dealId,
                submitterId: deal.businessId, // Use business ID as submitter
                reviewerId: req.user?.userId,
                status: dbStatus,
                feedback: feedback || null
              });
              console.log(`Created new deal approval record with feedback`);
            }
          } catch (approvalError) {
            console.error("Error updating deal approval:", approvalError);
            // Continue even if approval update fails - the deal status is more important
          }
        }
        
        const sanitizedDeal = sanitizeDeal(deal);
        return res.status(200).json(sanitizedDeal);
      } catch (error) {
        console.error("Error updating deal status:", error);
        return res.status(500).json({ message: "Error updating deal status" });
      }
    },
  );

  // Toggle featured status for a deal (admin only)
  app.put(
    "/api/deals/:id/featured",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        const { featured } = req.body;

        if (typeof featured !== "boolean") {
          return res
            .status(400)
            .json({ message: "Featured status must be a boolean value" });
        }

        const deal = await storage.updateDeal(dealId, { featured });
        const sanitizedDeal = sanitizeDeal(deal);
        return res.status(200).json(sanitizedDeal);
      } catch (error) {
        console.error("Error updating deal featured status:", error);
        return res
          .status(500)
          .json({ message: "Error updating deal featured status" });
      }
    },
  );
}
