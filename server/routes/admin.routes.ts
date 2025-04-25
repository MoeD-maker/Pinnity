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

  // Versioned dashboard route
  app.get(
    vDashboardPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(["admin"]),
    async (_req: Request, res: Response) => {
      try {
        // Deals
        const pendingDealsResult = await storage.getDealsByStatus("pending");
        const pendingDealsCount = pendingDealsResult.length;

        const activeDealsCount = (await storage.getDealsByStatus("active"))
          .length;
        const rejectedDealsCount = (await storage.getDealsByStatus("rejected"))
          .length;
        const expiredDealsCount = (await storage.getDealsByStatus("expired"))
          .length;

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

        // Ensure arrays and proper sanitization
        const sanitizedPendingDeals = sanitizeDeals(Array.isArray(pendingDealsResult) ? pendingDealsResult : []);
        const sanitizedPendingVendors = sanitizeBusinesses(Array.isArray(pendingBusinesses) ? pendingBusinesses : []);

        console.log(`Processed ${sanitizedPendingDeals.length} pending deals and ${sanitizedPendingVendors.length} pending vendors`);

        const recentActivity = sanitizedPendingDeals
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        // Prepare Response with proper array formatting and ensure arrays are never null
        return res.status(200).json({
          stats: {
            pendingDeals: pendingDealsCount || 0,
            activeDeals: activeDealsCount || 0,
            rejectedDeals: rejectedDealsCount || 0,
            expiredDeals: expiredDealsCount || 0,
            pendingVendors: pendingVendorsCount || 0,
            totalUsers: totalUsers || 0,
            alertCount: (pendingDealsCount || 0) + (pendingVendorsCount || 0),
          },
          recentActivity: recentActivity || [],
          pendingDeals: sanitizedPendingDeals || [],
          pendingVendors: sanitizedPendingVendors || [],
        });
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

        // Ensure proper sanitization and array format
        const sanitizedBusinesses = Array.isArray(pendingBusinesses) ? sanitizeBusinesses(pendingBusinesses) : [];
        console.log(
          `Admin (v1): Found ${sanitizedBusinesses.length} pending businesses`,
        );
        return res.status(200).json({
          businesses: sanitizedBusinesses,
          total: businesses.length,
          pending: sanitizedBusinesses.length
        });
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

        // Ensure proper sanitization and array format
        const sanitizedBusinesses = Array.isArray(pending) ? sanitizeBusinesses(pending) : [];
        console.log(
          `Admin (legacy): Found ${sanitizedBusinesses.length} pending businesses`,
        );
        return res.status(200).json({
          businesses: sanitizedBusinesses,
          total: all.length,
          pending: sanitizedBusinesses.length
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
          status,
          reviewerId,
          feedback,
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

  // Update deal status
  app.put(
    "/api/deals/:id/status",
    authenticate,
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        const { status } = req.body;

        if (
          !status ||
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

        const deal = await storage.updateDealStatus(dealId, status);
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