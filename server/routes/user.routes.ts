import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, checkOwnership } from "../middleware";
import { validate } from "../middleware/validationMiddleware";
import { userSchemas, authSchemas, ratingSchemas } from "../schemas";
import { accountSecurityRateLimiter, apiRateLimiter } from "../middleware/rateLimit";

/**
 * User routes for profile, favorites, redemptions, and preferences
 */
export function userRoutes(app: Express): void {
  // Get user profile
  app.get(
    "/api/user/:id",
    authenticate,
    checkOwnership('id'),
    validate(userSchemas.getUserById),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // Don't return the password
        const { password, ...userData } = user;
        
        return res.status(200).json(userData);
      } catch (error) {
        console.error("Get user error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update user profile
  app.put(
    "/api/user/:id", 
    authenticate, 
    checkOwnership('id'),
    validate(userSchemas.updateUser),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const userData = req.body;
        
        const updatedUser = await storage.updateUser(userId, userData);
        
        // Don't return the password
        const { password, ...sanitizedUser } = updatedUser;
        
        return res.status(200).json(sanitizedUser);
      } catch (error) {
        console.error("Update user error:", error);
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Change password endpoint
  app.post(
    "/api/user/:id/change-password", 
    authenticate, 
    checkOwnership('id'),
    accountSecurityRateLimiter, // Apply account security rate limiting for password change
    validate(authSchemas.passwordChange),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.id);
        const { currentPassword, newPassword } = req.body;
        
        const success = await storage.changePassword(userId, currentPassword, newPassword);
        
        if (!success) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        
        return res.status(200).json({ message: "Password changed successfully" });
      } catch (error) {
        if (error instanceof Error) {
          return res.status(400).json({ message: error.message });
        }
        console.error("Change password error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // User favorites routes
  app.get(
    "/api/user/:userId/favorites", 
    authenticate, 
    checkOwnership('userId'),
    validate(userSchemas.getUserFavorites),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        
        const favorites = await storage.getUserFavorites(userId);
        return res.status(200).json(favorites);
      } catch (error) {
        console.error("Get user favorites error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.post(
    "/api/user/:userId/favorites", 
    authenticate, 
    checkOwnership('userId'),
    validate(userSchemas.addUserFavorite),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const { dealId } = req.body;
        
        const favorite = await storage.addUserFavorite(userId, dealId);
        
        // Increment deal saves count
        await storage.incrementDealSaves(dealId);
        
        return res.status(201).json(favorite);
      } catch (error) {
        console.error("Add user favorite error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.delete(
    "/api/user/:userId/favorites/:dealId", 
    authenticate, 
    checkOwnership('userId'),
    validate(userSchemas.removeUserFavorite),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const dealId = parseInt(req.params.dealId);
        
        await storage.removeUserFavorite(userId, dealId);
        return res.status(200).json({ message: "Favorite removed successfully" });
      } catch (error) {
        console.error("Remove user favorite error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // User redemptions routes
  app.get(
    "/api/user/:userId/redemptions", 
    authenticate, 
    checkOwnership('userId'),
    validate(userSchemas.getUserRedemptions),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        
        const redemptions = await storage.getUserRedemptions(userId);
        return res.status(200).json(redemptions);
      } catch (error) {
        console.error("Get user redemptions error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.post(
    "/api/user/:userId/redemptions", 
    authenticate, 
    checkOwnership('userId'),
    validate(userSchemas.createRedemption),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const { dealId } = req.body;
        
        const redemption = await storage.createRedemption(userId, dealId);
        
        // Increment deal redemptions count
        await storage.incrementDealRedemptions(dealId);
        
        return res.status(201).json(redemption);
      } catch (error) {
        console.error("Add user redemption error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // User notification preferences routes
  app.get(
    "/api/user/:userId/notification-preferences", 
    authenticate, 
    checkOwnership('userId'),
    validate(userSchemas.getNotificationPreferences),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        
        const preferences = await storage.getUserNotificationPreferences(userId);
        if (!preferences) {
          return res.status(404).json({ message: "Notification preferences not found" });
        }
        
        return res.status(200).json(preferences);
      } catch (error) {
        console.error("Get notification preferences error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  app.put(
    "/api/user/:userId/notification-preferences", 
    authenticate, 
    checkOwnership('userId'),
    validate(userSchemas.updateNotificationPreferences),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        const preferencesData = req.body;
        
        const preferences = await storage.updateUserNotificationPreferences(userId, preferencesData);
        
        return res.status(200).json(preferences);
      } catch (error) {
        console.error("Update notification preferences error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // User ratings routes
  app.get(
    "/api/user/:userId/ratings", 
    authenticate, 
    checkOwnership('userId'),
    validate(ratingSchemas.getUserRatings),
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(req.params.userId);
        
        const ratings = await storage.getUserRatings(userId);
        return res.status(200).json(ratings);
      } catch (error) {
        console.error("Get user ratings error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
  
  // Rating for a redemption
  app.post(
    "/api/redemptions/:redemptionId/ratings", 
    authenticate,
    validate(ratingSchemas.createRating),
    async (req: Request, res: Response) => {
      try {
        const redemptionId = parseInt(req.params.redemptionId);
        
        // Verify the redemption exists
        const redemptions = await storage.getDealRedemptions(0); // We'll filter it below
        const redemption = redemptions.find(r => r.id === redemptionId);
        
        if (!redemption) {
          return res.status(404).json({ message: "Redemption not found" });
        }
        
        // Verify the authenticated user is the one who made the redemption
        if (redemption.userId !== req.user?.userId) {
          return res.status(403).json({ message: "You can only rate your own redemptions" });
        }
        
        // Verify the rating doesn't already exist
        const existingRating = await storage.getRedemptionRating(redemptionId);
        if (existingRating) {
          return res.status(400).json({ message: "Redemption already rated" });
        }
        
        // Rating data is already validated by Zod schema
        const { rating, comment, anonymous = false } = req.body;
        
        // Create the rating
        const ratingData = { 
          rating, 
          comment: comment || null,
          anonymous
        };
        
        const createdRating = await storage.createRedemptionRating(
          redemptionId,
          redemption.userId,
          redemption.dealId,
          req.body.businessId, // This should come from the request or be looked up
          ratingData
        );
        
        return res.status(201).json(createdRating);
      } catch (error) {
        console.error("Create rating error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );
}