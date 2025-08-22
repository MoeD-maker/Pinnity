import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, checkOwnership } from "../middleware";
import { validate } from "../middleware/validationMiddleware";
import { businessSchemas } from "../schemas";
import { apiRateLimiter, adminRateLimiter } from "../middleware/rateLimit";
import { validateBusinessProfile, validateBusinessHours, validateBusinessVerification } from "../middleware/businessValidation";
import { 
  createVersionedRoutes, 
  versionHeadersMiddleware,
  deprecationMiddleware
} from "../../src/utils/routeVersioning";

/**
 * Business routes for business management and related operations
 */
export function businessRoutes(app: Express): void {
  // Get business deals
  const [vBusinessDealsPath, lBusinessDealsPath] = createVersionedRoutes('/business/:businessId/deals');
  
  app.get(vBusinessDealsPath, 
    versionHeadersMiddleware(),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.businessId);
        
        const deals = await storage.getDealsByBusiness(businessId);
        
        return res.status(200).json(deals);
      } catch (error) {
        console.error("Get business deals error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.get(lBusinessDealsPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.businessId);
        
        const deals = await storage.getDealsByBusiness(businessId);
        
        return res.status(200).json(deals);
      } catch (error) {
        console.error("Get business deals error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get business for user
  const [vBusinessForUserPath, lBusinessForUserPath] = createVersionedRoutes('/business/user/:userId');
  
  app.get(vBusinessForUserPath, 
    versionHeadersMiddleware(),
    authenticate, 
    checkOwnership('userId'), 
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        
        const business = await storage.getBusinessByUserId(userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        return res.status(200).json(business);
      } catch (error) {
        console.error("Get business for user error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.get(lBusinessForUserPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    checkOwnership('userId'), 
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        
        const business = await storage.getBusinessByUserId(userId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found for this user" });
        }
        
        return res.status(200).json(business);
      } catch (error) {
        console.error("Get business for user error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get business by ID
  const [vBusinessPath, lBusinessPath] = createVersionedRoutes('/business/:id');
  
  app.get(vBusinessPath,
    versionHeadersMiddleware(),
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        
        const business = await storage.getBusiness(businessId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        return res.status(200).json(business);
      } catch (error) {
        console.error("Get business error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.get(lBusinessPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        
        const business = await storage.getBusiness(businessId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        return res.status(200).json(business);
      } catch (error) {
        console.error("Get business error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update business
  app.put(vBusinessPath, 
    versionHeadersMiddleware(),
    authenticate, 
    apiRateLimiter, 
    validateBusinessProfile, 
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        const businessData = req.body;
        
        const business = await storage.getBusiness(businessId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        // Verify ownership by checking if the authenticated user is the owner
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        if (!userBusiness || userBusiness.id !== businessId) {
          return res.status(403).json({ message: "You can only update your own business" });
        }
        
        const updatedBusiness = await storage.updateBusiness(businessId, businessData);
        
        return res.status(200).json(updatedBusiness);
      } catch (error) {
        console.error("Update business error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.put(lBusinessPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    apiRateLimiter,
    validateBusinessProfile, 
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        const businessData = req.body;
        
        const business = await storage.getBusiness(businessId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        // Verify ownership by checking if the authenticated user is the owner
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        if (!userBusiness || userBusiness.id !== businessId) {
          return res.status(403).json({ message: "You can only update your own business" });
        }
        
        const updatedBusiness = await storage.updateBusiness(businessId, businessData);
        
        return res.status(200).json(updatedBusiness);
      } catch (error) {
        console.error("Update business error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update business verification status
  const [vBusinessVerificationPath, lBusinessVerificationPath] = createVersionedRoutes('/business/:id/verification');
  
  app.put(vBusinessVerificationPath, 
    versionHeadersMiddleware(),
    authenticate, 
    adminRateLimiter, 
    validateBusinessVerification, 
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        const { status, feedback } = req.body;
        
        // Only admins can update verification status
        if (req.user!.userType !== 'admin') {
          return res.status(403).json({ message: "Only admins can update business verification status" });
        }
        
        const business = await storage.getBusiness(businessId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        const updatedBusiness = await storage.updateBusinessVerificationStatus(businessId, status, feedback);

        return res.status(200).json({
          ...updatedBusiness,
          verificationFeedback: updatedBusiness.verificationFeedback,
        });
      } catch (error) {
        console.error("Update business verification error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.put(lBusinessVerificationPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    adminRateLimiter, 
    validateBusinessVerification, 
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.id);
        const { status, feedback } = req.body;
        
        // Only admins can update verification status
        if (req.user!.userType !== 'admin') {
          return res.status(403).json({ message: "Only admins can update business verification status" });
        }
        
        const business = await storage.getBusiness(businessId);
        
        if (!business) {
          return res.status(404).json({ message: "Business not found" });
        }
        
        const updatedBusiness = await storage.updateBusinessVerificationStatus(businessId, status, feedback);

        return res.status(200).json({
          ...updatedBusiness,
          verificationFeedback: updatedBusiness.verificationFeedback,
        });
      } catch (error) {
        console.error("Update business verification error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Get business hours
  const [vBusinessHoursPath, lBusinessHoursPath] = createVersionedRoutes('/business/:businessId/hours');
  
  app.get(vBusinessHoursPath, 
    versionHeadersMiddleware(),
    authenticate, 
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.businessId);
        
        const hours = await storage.getBusinessHours(businessId);
        
        return res.status(200).json(hours);
      } catch (error) {
        console.error("Get business hours error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.get(lBusinessHoursPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    async (req: Request, res: Response) => {
      try {
        const businessId = parseInt(req.params.businessId);
        
        const hours = await storage.getBusinessHours(businessId);
        
        return res.status(200).json(hours);
      } catch (error) {
        console.error("Get business hours error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Add business hours
  const [vAddBusinessHoursPath, lAddBusinessHoursPath] = createVersionedRoutes('/business/hours');
  
  app.post(vAddBusinessHoursPath, 
    versionHeadersMiddleware(),
    authenticate, 
    apiRateLimiter, 
    validateBusinessHours, 
    async (req: Request, res: Response) => {
      try {
        const hourData = req.body;
        
        // Verify ownership - get the business ID from the request and check if user owns it
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        if (!userBusiness || userBusiness.id !== hourData.businessId) {
          return res.status(403).json({ message: "You can only add hours to your own business" });
        }
        
        const businessHours = await storage.addBusinessHours(hourData);
        
        return res.status(201).json(businessHours);
      } catch (error) {
        console.error("Add business hours error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.post(lAddBusinessHoursPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    apiRateLimiter, 
    validateBusinessHours, 
    async (req: Request, res: Response) => {
      try {
        const hourData = req.body;
        
        // Verify ownership - get the business ID from the request and check if user owns it
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        if (!userBusiness || userBusiness.id !== hourData.businessId) {
          return res.status(403).json({ message: "You can only add hours to your own business" });
        }
        
        const businessHours = await storage.addBusinessHours(hourData);
        
        return res.status(201).json(businessHours);
      } catch (error) {
        console.error("Add business hours error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update business hours
  const [vUpdateBusinessHoursPath, lUpdateBusinessHoursPath] = createVersionedRoutes('/business/hours/:id');
  
  app.put(vUpdateBusinessHoursPath, 
    versionHeadersMiddleware(),
    authenticate, 
    apiRateLimiter, 
    validateBusinessHours, 
    async (req: Request, res: Response) => {
      try {
        const hoursId = parseInt(req.params.id);
        const hourData = req.body;
        
        // Get the hours record to verify ownership
        const businessHours = await storage.getBusinessHours(hourData.businessId);
        const targetHours = businessHours.find(h => h.id === hoursId);
        
        if (!targetHours) {
          return res.status(404).json({ message: "Business hours not found" });
        }
        
        // Verify ownership - check if the authenticated user owns the business
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        if (!userBusiness || userBusiness.id !== targetHours.businessId) {
          return res.status(403).json({ message: "You can only update hours for your own business" });
        }
        
        const updatedHours = await storage.updateBusinessHours(hoursId, hourData);
        
        return res.status(200).json(updatedHours);
      } catch (error) {
        console.error("Update business hours error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.put(lUpdateBusinessHoursPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    apiRateLimiter, 
    validateBusinessHours, 
    async (req: Request, res: Response) => {
      try {
        const hoursId = parseInt(req.params.id);
        const hourData = req.body;
        
        // Get the hours record to verify ownership
        const businessHours = await storage.getBusinessHours(hourData.businessId);
        const targetHours = businessHours.find(h => h.id === hoursId);
        
        if (!targetHours) {
          return res.status(404).json({ message: "Business hours not found" });
        }
        
        // Verify ownership - check if the authenticated user owns the business
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        if (!userBusiness || userBusiness.id !== targetHours.businessId) {
          return res.status(403).json({ message: "You can only update hours for your own business" });
        }
        
        const updatedHours = await storage.updateBusinessHours(hoursId, hourData);
        
        return res.status(200).json(updatedHours);
      } catch (error) {
        console.error("Update business hours error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Delete business hours
  const [vDeleteBusinessHoursPath, lDeleteBusinessHoursPath] = createVersionedRoutes('/business/hours/:id');
  
  app.delete(vDeleteBusinessHoursPath, 
    versionHeadersMiddleware(),
    authenticate, 
    apiRateLimiter, 
    async (req: Request, res: Response) => {
      try {
        const hoursId = parseInt(req.params.id);
        
        // Get all business hours to find the one we want to delete
        // This is just to verify ownership
        const allBusinessHours = [];
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!userBusiness) {
          return res.status(403).json({ message: "You need a business account to perform this action" });
        }
        
        const businessHours = await storage.getBusinessHours(userBusiness.id);
        const targetHours = businessHours.find(h => h.id === hoursId);
        
        if (!targetHours) {
          return res.status(404).json({ message: "Business hours not found" });
        }
        
        // Verify ownership
        if (targetHours.businessId !== userBusiness.id) {
          return res.status(403).json({ message: "You can only delete hours for your own business" });
        }
        
        await storage.deleteBusinessHours(hoursId);
        
        return res.status(200).json({ message: "Business hours deleted successfully" });
      } catch (error) {
        console.error("Delete business hours error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.delete(lDeleteBusinessHoursPath, 
    [versionHeadersMiddleware(), deprecationMiddleware],
    authenticate, 
    apiRateLimiter, 
    async (req: Request, res: Response) => {
      try {
        const hoursId = parseInt(req.params.id);
        
        // Get all business hours to find the one we want to delete
        // This is just to verify ownership
        const allBusinessHours = [];
        const userBusiness = await storage.getBusinessByUserId(req.user!.userId);
        
        if (!userBusiness) {
          return res.status(403).json({ message: "You need a business account to perform this action" });
        }
        
        const businessHours = await storage.getBusinessHours(userBusiness.id);
        const targetHours = businessHours.find(h => h.id === hoursId);
        
        if (!targetHours) {
          return res.status(404).json({ message: "Business hours not found" });
        }
        
        // Verify ownership
        if (targetHours.businessId !== userBusiness.id) {
          return res.status(403).json({ message: "You can only delete hours for your own business" });
        }
        
        await storage.deleteBusinessHours(hoursId);
        
        return res.status(200).json({ message: "Business hours deleted successfully" });
      } catch (error) {
        console.error("Delete business hours error (legacy):", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}