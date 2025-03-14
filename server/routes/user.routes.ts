import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticate, checkOwnership } from "../middleware";

/**
 * User routes for profile, favorites, redemptions, and preferences
 */
export function userRoutes(app: Express): void {
  // Get user profile
  app.get("/api/user/:id", authenticate, checkOwnership('id'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
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
  });

  // Update user profile
  app.put("/api/user/:id", authenticate, checkOwnership('id'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const userData = req.body;
      // Prevent updating sensitive fields
      delete userData.password;
      delete userData.userType;
      
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
  });
  
  // Change password endpoint
  app.post("/api/user/:id/change-password", authenticate, checkOwnership('id'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      // Basic validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: "All password fields are required" });
      }
      
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New password and confirm password do not match" });
      }
      
      // Password strength validation
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters long" });
      }
      
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
  });

  // User favorites routes
  app.get("/api/user/:userId/favorites", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const favorites = await storage.getUserFavorites(userId);
      return res.status(200).json(favorites);
    } catch (error) {
      console.error("Get user favorites error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/user/:userId/favorites", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { dealId } = req.body;
      
      if (isNaN(userId) || isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid user ID or deal ID" });
      }
      
      const favorite = await storage.addUserFavorite(userId, dealId);
      
      // Increment deal saves count
      await storage.incrementDealSaves(dealId);
      
      return res.status(201).json(favorite);
    } catch (error) {
      console.error("Add user favorite error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/user/:userId/favorites/:dealId", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const dealId = parseInt(req.params.dealId);
      
      if (isNaN(userId) || isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid user ID or deal ID" });
      }
      
      await storage.removeUserFavorite(userId, dealId);
      return res.status(200).json({ message: "Favorite removed successfully" });
    } catch (error) {
      console.error("Remove user favorite error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User redemptions routes
  app.get("/api/user/:userId/redemptions", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const redemptions = await storage.getUserRedemptions(userId);
      return res.status(200).json(redemptions);
    } catch (error) {
      console.error("Get user redemptions error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/user/:userId/redemptions", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { dealId } = req.body;
      
      if (isNaN(userId) || isNaN(dealId)) {
        return res.status(400).json({ message: "Invalid user ID or deal ID" });
      }
      
      const redemption = await storage.createRedemption(userId, dealId);
      
      // Increment deal redemptions count
      await storage.incrementDealRedemptions(dealId);
      
      return res.status(201).json(redemption);
    } catch (error) {
      console.error("Add user redemption error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User notification preferences routes
  app.get("/api/user/:userId/notification-preferences", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const preferences = await storage.getUserNotificationPreferences(userId);
      if (!preferences) {
        return res.status(404).json({ message: "Notification preferences not found" });
      }
      
      return res.status(200).json(preferences);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.put("/api/user/:userId/notification-preferences", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const preferencesData = req.body;
      const preferences = await storage.updateUserNotificationPreferences(userId, preferencesData);
      
      return res.status(200).json(preferences);
    } catch (error) {
      console.error("Update notification preferences error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // User ratings routes
  app.get("/api/user/:userId/ratings", authenticate, checkOwnership('userId'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const ratings = await storage.getUserRatings(userId);
      return res.status(200).json(ratings);
    } catch (error) {
      console.error("Get user ratings error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Rating for a redemption
  app.post("/api/redemptions/:redemptionId/ratings", authenticate, async (req: Request, res: Response) => {
    try {
      const redemptionId = parseInt(req.params.redemptionId);
      if (isNaN(redemptionId)) {
        return res.status(400).json({ message: "Invalid redemption ID" });
      }
      
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
      
      // Parse and validate the rating data
      const { rating, comment } = req.body;
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be a number between 1 and 5" });
      }
      
      // Create the rating
      const ratingData = { 
        rating, 
        comment: comment || null,
        anonymous: req.body.anonymous || false
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
  });
}