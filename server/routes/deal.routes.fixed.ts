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
      
      // Get all deals from storage
      const deals = await storage.getDeals();
      
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
        
        return {
          ...deal,
          availability: {
            isAvailableToday,
            nextAvailableDay
          }
        };
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
      
      // Get featured deals from storage
      const featuredDeals = await storage.getFeaturedDeals(limit);
      
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
        
        return {
          ...deal,
          availability: {
            isAvailableToday,
            nextAvailableDay,
            nextAvailableDayName: nextAvailableDay !== null ? dayNames[nextAvailableDay] : null,
            availableDays: recurringDays,
            availableDayNames: availableDayNames
          }
        };
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
        deal.availability = {
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
        
        // Create the deal
        const dealData = {
          ...req.body,
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
        
        // Ensure the business is verified
        if (business.verificationStatus !== "approved") {
          return res.status(403).json({ 
            message: "Your business must be verified before creating deals",
            verificationStatus: business.verificationStatus 
          });
        }
        
        // Create the deal
        const dealData = {
          ...req.body,
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
        
        // Get the deal to check ownership
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Check if the user is an admin or the owner of the deal
        if (req.user!.userType !== "admin") {
          // Get the user's business
          const business = await storage.getBusinessByUserId(req.user!.userId);
          
          if (!business || business.id !== deal.businessId) {
            return res.status(403).json({ message: "You can only update your own deals" });
          }
        }
        
        // Update the deal
        const updatedDeal = await storage.updateDeal(dealId, req.body);
        
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
        
        // Get the deal to check ownership
        const deal = await storage.getDeal(dealId);
        
        if (!deal) {
          return res.status(404).json({ message: "Deal not found" });
        }
        
        // Check if the user is an admin or the owner of the deal
        if (req.user!.userType !== "admin") {
          // Get the user's business
          const business = await storage.getBusinessByUserId(req.user!.userId);
          
          if (!business || business.id !== deal.businessId) {
            return res.status(403).json({ message: "You can only update your own deals" });
          }
        }
        
        // Update the deal
        const updatedDeal = await storage.updateDeal(dealId, req.body);
        
        return res.status(200).json(updatedDeal);
      } catch (error) {
        console.error("Update deal error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

    // Verify redemption code
  const [vVerifyCodePath, lVerifyCodePath] = createVersionedRoutes('/deals/:dealId/verify-code');
  
  // Versioned route (primary)
  app.post(
    vVerifyCodePath,
    versionHeadersMiddleware(),
    authenticate,
    async (req: Request, res: Response) => {
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
        
        try {
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
          console.error("Redemption error:", error);
          
          // Return a 400 Bad Request with the specific error message
          const redemptionError = error as Error;
          return res.status(400).json({ 
            valid: false, 
            message: redemptionError.message || "Failed to redeem. You may have already redeemed this deal or reached the maximum limit." 
          });
        }
      } catch (error) {
        console.error("Verify redemption code error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Legacy route (for backward compatibility)
  app.post(
    lVerifyCodePath,
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate,
    async (req: Request, res: Response) => {
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
        
        try {
          // Create a redemption record
          const redemption = await storage.createRedemption(req.user.userId, dealId);
          
          // Increment deal redemptions count
          await storage.incrementDealRedemptions(dealId);
          
          return res.status(200).json({ 
            valid: true,
            message: "Redemption code verified successfully (legacy route)",
            redemption 
          });
        } catch (error) {
          console.error("Redemption error (legacy):", error);
          
          // Return a 400 Bad Request with the specific error message
          const redemptionError = error as Error;
          return res.status(400).json({ 
            valid: false, 
            message: redemptionError.message || "Failed to redeem. You may have already redeemed this deal or reached the maximum limit." 
          });
        }
      } catch (error) {
        console.error("Verify redemption code error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Get deal redemptions
  const [vDealRedemptionsPath, lDealRedemptionsPath] = createVersionedRoutes('/deals/:dealId/redemptions');
  
  // Versioned route (primary)
  app.get(
    vDealRedemptionsPath,
    versionHeadersMiddleware(),
    authenticate,
    authorize(['admin', 'business']),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.dealId);
        if (isNaN(dealId)) {
          return res.status(400).json({ message: "Invalid deal ID" });
        }
        
        const redemptions = await storage.getDealRedemptions(dealId);
        
        return res.status(200).json(redemptions);
      } catch (error) {
        console.error("Get deal redemptions error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Legacy route (for backward compatibility)
  app.get(
    lDealRedemptionsPath,
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate,
    authorize(['admin', 'business']),
    async (req: Request, res: Response) => {
      try {
        const dealId = parseInt(req.params.dealId);
        if (isNaN(dealId)) {
          return res.status(400).json({ message: "Invalid deal ID" });
        }
        
        const redemptions = await storage.getDealRedemptions(dealId);
        
        return res.status(200).json(redemptions);
      } catch (error) {
        console.error("Get deal redemptions error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}