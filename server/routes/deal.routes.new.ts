import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, authorize, checkOwnership } from "../middleware";
import { validate } from "../middleware/validationMiddleware";
import { dealSchemas } from "../schemas";
import { apiRateLimiter } from "../middleware/rateLimit";
import { 
  createVersionedRoutes, 
  versionHeadersMiddleware,
  deprecationMiddleware
} from "../../src/utils/routeVersioning";

/**
 * Ensure dates from request body are properly converted to Date objects
 * This prevents "value.toISOString is not a function" errors
 */
function ensureDatesAreConverted(body: any) {
  // Extract date fields and rest of body
  const { startDate, endDate, ...restBody } = body;
  
  // Convert ISO strings to Date objects if they aren't already
  const convertedStartDate = startDate && typeof startDate === 'string' 
    ? new Date(startDate) 
    : startDate;
  
  const convertedEndDate = endDate && typeof endDate === 'string' 
    ? new Date(endDate) 
    : endDate;
  
  // Return body with fixed dates
  return {
    ...restBody,
    startDate: convertedStartDate,
    endDate: convertedEndDate
  };
}

/**
 * Deal routes for listing, creating, and managing deals
 */
export function dealRoutes(app: Express): void {
  // Get all deals
  const [vDealsPath, lDealsPath] = createVersionedRoutes('/deals');
  
  app.get(vDealsPath, versionHeadersMiddleware(), async (req: Request, res: Response) => {
    try {
      // Get query params for filtering
      const category = req.query.category as string | undefined;
      const discountType = req.query.discountType as string | undefined;
      const searchTerm = req.query.search as string | undefined;
      const availableToday = req.query.availableToday === 'true';
      const dayOfWeek = req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string) : undefined;
      
      // Get user role and ID for status filtering
      const userRole = req.user?.userType || 'individual';
      const userId = req.user?.userId;
      
      console.log(`API: Getting deals for user role: ${userRole}, userId: ${userId || 'none'}`);
      
      // Get all deals from storage with role-based filtering
      const deals = await storage.getDeals(userRole, userId);
      
      // Apply filters if provided
      let filteredDeals = deals;
      
      // Get current day of week (0 = Sunday, 1 = Monday, etc.)
      const currentDayOfWeek = new Date().getDay();
      
      // Filter by recurring day availability
      if (availableToday) {
        filteredDeals = filteredDeals.filter(deal => {
          // Regular deals are always available within their date range
          if (!deal.isRecurring) return true;
          
          // For recurring deals, check if today is in the recurringDays array
          const recurringDays = Array.isArray(deal.recurringDays) ? deal.recurringDays : [];
          return recurringDays.includes(currentDayOfWeek);
        });
      }
      
      // Filter by specific day of week if provided
      if (dayOfWeek !== undefined) {
        filteredDeals = filteredDeals.filter(deal => {
          // Regular deals are available any day within their date range
          if (!deal.isRecurring) return true;
          
          // For recurring deals, check if requested day is in the recurringDays array
          const recurringDays = Array.isArray(deal.recurringDays) ? deal.recurringDays : [];
          return recurringDays.includes(dayOfWeek);
        });
      }
      
      if (category) {
        filteredDeals = filteredDeals.filter(deal => 
          deal.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      if (discountType) {
        filteredDeals = filteredDeals.filter(deal => 
          deal.dealType === discountType
        );
      }
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredDeals = filteredDeals.filter(deal => 
          deal.title.toLowerCase().includes(search) || 
          deal.description.toLowerCase().includes(search)
        );
      }
      
      // Add additional availability data to each deal for frontend
      const dealsWithAvailability = filteredDeals.map(deal => {
        // Skip if not a recurring deal
        if (!deal.isRecurring) return deal;
        
        const recurringDays = Array.isArray(deal.recurringDays) ? deal.recurringDays : [];
        const isAvailableToday = recurringDays.includes(currentDayOfWeek);
        
        // Find next available day
        let nextAvailableDay = null;
        if (!isAvailableToday && recurringDays.length > 0) {
          // Sort days to find next upcoming day
          const sortedDays = [...recurringDays].sort((a, b) => {
            // If day is less than current day, it will be in the next week
            // So we add 7 to it for sorting purposes
            const adjustedA = a < currentDayOfWeek ? a + 7 : a;
            const adjustedB = b < currentDayOfWeek ? b + 7 : b;
            return adjustedA - adjustedB;
          });
          
          // First day after adjusting is the next available
          const nextDay = sortedDays[0];
          nextAvailableDay = nextDay >= 7 ? nextDay - 7 : nextDay;
        }
        
        // Using type assertion to add availability property
        return {
          ...deal,
          availability: {
            isAvailableToday,
            nextAvailableDay
          }
        } as any;
      });
      
      return res.status(200).json(dealsWithAvailability);
    } catch (error) {
      console.error("Get deals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get(lDealsPath, [versionHeadersMiddleware(), deprecationMiddleware], async (req: Request, res: Response) => {
    try {
      // Get query params for filtering
      const category = req.query.category as string | undefined;
      const discountType = req.query.discountType as string | undefined;
      const searchTerm = req.query.search as string | undefined;
      
      // Get all deals from storage
      const deals = await storage.getDeals();
      
      // Apply filters if provided
      let filteredDeals = deals;
      
      if (category) {
        filteredDeals = filteredDeals.filter(deal => 
          deal.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      if (discountType) {
        filteredDeals = filteredDeals.filter(deal => 
          deal.dealType === discountType
        );
      }
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filteredDeals = filteredDeals.filter(deal => 
          deal.title.toLowerCase().includes(search) || 
          deal.description.toLowerCase().includes(search)
        );
      }
      
      return res.status(200).json(filteredDeals);
    } catch (error) {
      console.error("Get deals error (legacy):", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get featured deals
  const [vFeaturedDealsPath, lFeaturedDealsPath] = createVersionedRoutes('/deals/featured');
  
  app.get(vFeaturedDealsPath, versionHeadersMiddleware(), async (req: Request, res: Response) => {
    try {
      // Get limit from query params or use default
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Get user role and ID for status filtering
      const userRole = req.user?.userType || 'individual';
      const userId = req.user?.userId;
      
      console.log(`API: Getting featured deals for user role: ${userRole}, userId: ${userId || 'none'}`);
      
      // Get featured deals from storage with role-based filtering
      const featuredDeals = await storage.getFeaturedDeals(limit, userRole, userId);
      
      // Add availability information for recurring deals
      const currentDayOfWeek = new Date().getDay();
      const dealsWithAvailability = featuredDeals.map(deal => {
        // Skip if not a recurring deal
        if (!deal.isRecurring) return deal;
        
        const recurringDays = Array.isArray(deal.recurringDays) ? deal.recurringDays : [];
        const isAvailableToday = recurringDays.includes(currentDayOfWeek);
        
        // Find next available day
        let nextAvailableDay = null;
        if (!isAvailableToday && recurringDays.length > 0) {
          // Sort days to find next upcoming day
          const sortedDays = [...recurringDays].sort((a, b) => {
            // If day is less than current day, it will be in the next week
            // So we add 7 to it for sorting purposes
            const adjustedA = a < currentDayOfWeek ? a + 7 : a;
            const adjustedB = b < currentDayOfWeek ? b + 7 : b;
            return adjustedA - adjustedB;
          });
          
          // First day after adjusting is the next available
          const nextDay = sortedDays[0];
          nextAvailableDay = nextDay >= 7 ? nextDay - 7 : nextDay;
        }
        
        // Get day names
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const availableDayNames = recurringDays.map(day => dayNames[day]);
        
        // Using type assertion to add availability property
        return {
          ...deal,
          availability: {
            isAvailableToday,
            nextAvailableDay,
            nextAvailableDayName: nextAvailableDay !== null ? dayNames[nextAvailableDay] : null,
            availableDays: recurringDays,
            availableDayNames: availableDayNames
          }
        } as any;
      });
      
      return res.status(200).json(dealsWithAvailability);
    } catch (error) {
      console.error("Get featured deals error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get(lFeaturedDealsPath, [versionHeadersMiddleware(), deprecationMiddleware], async (req: Request, res: Response) => {
    try {
      // Get limit from query params or use default
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      // Get featured deals from storage
      const featuredDeals = await storage.getFeaturedDeals(limit);
      
      return res.status(200).json(featuredDeals);
    } catch (error) {
      console.error("Get featured deals error (legacy):", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get specific deal
  const [vDealPath, lDealPath] = createVersionedRoutes('/deals/:id');
  
  app.get(vDealPath, versionHeadersMiddleware(), async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      
      // Get deal from storage
      const deal = await storage.getDeal(dealId);
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Add availability information for recurring deals
      if (deal.isRecurring) {
        const currentDayOfWeek = new Date().getDay();
        const recurringDays = Array.isArray(deal.recurringDays) ? deal.recurringDays : [];
        const isAvailableToday = recurringDays.includes(currentDayOfWeek);
        
        // Find next available day
        let nextAvailableDay = null;
        if (!isAvailableToday && recurringDays.length > 0) {
          // Sort days to find next upcoming day
          const sortedDays = [...recurringDays].sort((a, b) => {
            // If day is less than current day, it will be in the next week
            // So we add 7 to it for sorting purposes
            const adjustedA = a < currentDayOfWeek ? a + 7 : a;
            const adjustedB = b < currentDayOfWeek ? b + 7 : b;
            return adjustedA - adjustedB;
          });
          
          // First day after adjusting is the next available
          const nextDay = sortedDays[0];
          nextAvailableDay = nextDay >= 7 ? nextDay - 7 : nextDay;
        }
        
        // Get day names
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const availableDayNames = recurringDays.map(day => dayNames[day]);
        
        // Add availability info to the deal
        (deal as any).availability = {
          isAvailableToday,
          nextAvailableDay,
          nextAvailableDayName: nextAvailableDay !== null ? dayNames[nextAvailableDay] : null,
          availableDays: recurringDays,
          availableDayNames: availableDayNames
        };
      }
      
      return res.status(200).json(deal);
    } catch (error) {
      console.error("Get deal error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get(lDealPath, [versionHeadersMiddleware(), deprecationMiddleware], async (req: Request, res: Response) => {
    try {
      const dealId = parseInt(req.params.id);
      
      // Get deal from storage
      const deal = await storage.getDeal(dealId);
      
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      return res.status(200).json(deal);
    } catch (error) {
      console.error("Get deal error (legacy):", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create deal
  app.post(vDealsPath, 
    versionHeadersMiddleware(),
    authenticate, 
    apiRateLimiter,
    validate(dealSchemas.createDeal), 
    async (req: Request, res: Response) => {
      try {
        // Ensure the user is a business user
        if (req.user!.userType !== "business") {
          return res.status(403).json({ message: "Only business users can create deals" });
        }
        
        // Get the user's business
        const business = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        // Ensure the business is verified
        if (business.verificationStatus !== "verified" && business.verificationStatus !== "approved") {
          return res.status(403).json({ 
            message: "Your business must be verified before creating deals",
            verificationStatus: business.verificationStatus 
          });
        }
        
        // Process body to ensure dates are properly converted to Date objects
        const processedBody = ensureDatesAreConverted(req.body);
        
        // Create the deal with properly formatted dates
        const dealData = {
          ...processedBody,
          businessId: business.id,
          status: "pending" // All deals start as pending until approved
        };
        
        const deal = await storage.createDeal(dealData);
        
        return res.status(201).json(deal);
      } catch (error) {
        console.error("Create deal error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.post(lDealsPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    apiRateLimiter,
    validate(dealSchemas.createDeal), 
    async (req: Request, res: Response) => {
      try {
        // Ensure the user is a business user
        if (req.user!.userType !== "business") {
          return res.status(403).json({ message: "Only business users can create deals" });
        }
        
        // Get the user's business
        const business = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        // Ensure the business is verified (accept both "verified" and "approved" status)
        if (business.verificationStatus !== "verified" && business.verificationStatus !== "approved") {
          return res.status(403).json({ 
            message: "Your business must be verified before creating deals",
            verificationStatus: business.verificationStatus 
          });
        }
        
        // Process body to ensure dates are properly converted to Date objects
        const processedBody = ensureDatesAreConverted(req.body);
        
        // Create the deal with properly formatted dates
        const dealData = {
          ...processedBody,
          businessId: business.id,
          status: "pending" // All deals start as pending until approved
        };
        
        const deal = await storage.createDeal(dealData);
        
        return res.status(201).json(deal);
      } catch (error) {
        console.error("Create deal error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update deal
  app.put(vDealPath, 
    versionHeadersMiddleware(),
    authenticate, 
    apiRateLimiter,
    validate(dealSchemas.updateDeal), 
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        
        // Get the deal
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Get the user's business
        const business = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        // Ensure the user owns this deal through their business
        if (deal.businessId !== business.id) {
          return res.status(403).json({ message: "You do not have permission to update this deal" });
        }
        
        // Process body to ensure dates are properly converted to Date objects
        const processedBody = ensureDatesAreConverted(req.body);
        
        // Update the deal
        const updatedDeal = await storage.updateDeal(dealId, processedBody);
        
        return res.status(200).json(updatedDeal);
      } catch (error) {
        console.error("Update deal error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.put(lDealPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    apiRateLimiter,
    validate(dealSchemas.updateDeal), 
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        
        // Get the deal
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Get the user's business
        const business = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        // Ensure the user owns this deal through their business
        if (deal.businessId !== business.id) {
          return res.status(403).json({ message: "You do not have permission to update this deal" });
        }
        
        // Process body to ensure dates are properly converted to Date objects
        const processedBody = ensureDatesAreConverted(req.body);
        
        // Update the deal
        const updatedDeal = await storage.updateDeal(dealId, processedBody);
        
        return res.status(200).json(updatedDeal);
      } catch (error) {
        console.error("Update deal error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Delete deal
  app.delete(vDealPath, 
    versionHeadersMiddleware(),
    authenticate, 
    apiRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        
        // Get the deal
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Get the user's business
        const business = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        // Ensure the user owns this deal through their business
        if (deal.businessId !== business.id) {
          return res.status(403).json({ message: "You do not have permission to delete this deal" });
        }
        
        // Delete the deal
        await storage.deleteDeal(dealId);
        
        return res.status(204).send(); // 204 No Content
      } catch (error) {
        console.error("Delete deal error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.delete(lDealPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    apiRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        
        // Get the deal
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Get the user's business
        const business = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        // Ensure the user owns this deal through their business
        if (deal.businessId !== business.id) {
          return res.status(403).json({ message: "You do not have permission to delete this deal" });
        }
        
        // Delete the deal
        await storage.deleteDeal(dealId);
        
        return res.status(204).send(); // 204 No Content
      } catch (error) {
        console.error("Delete deal error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Admin routes for approving/rejecting deals
  app.patch('/api/v1/admin/deals/:id/approve', 
    authenticate, 
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        
        // Get the deal
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Update the deal status to approved
        const updatedDeal = await storage.updateDeal(dealId, { status: "approved" });
        
        return res.status(200).json(updatedDeal);
      } catch (error) {
        console.error("Approve deal error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.patch('/api/v1/admin/deals/:id/reject', 
    authenticate, 
    authorize(["admin"]),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.id);
        const { reason } = req.body;
        
        // Get the deal
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Update the deal status to rejected and add rejection reason
        const updatedDeal = await storage.updateDeal(dealId, { 
          status: "rejected",
          rejectionReason: reason || "Did not meet platform guidelines"
        });
        
        return res.status(200).json(updatedDeal);
      } catch (error) {
        console.error("Reject deal error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}