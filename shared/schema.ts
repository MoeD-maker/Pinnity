import { pgTable, text, serial, integer, boolean, json, timestamp, doublePrecision, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema - base table for both individuals and businesses
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  userType: text("user_type").notNull(), // "individual" or "business"
  created_at: text("created_at").notNull().default(new Date().toISOString()),
});

// Business schema - extends user for business-specific data
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  businessName: text("business_name").notNull(),
  businessCategory: text("business_category").notNull(),
  governmentId: text("government_id").notNull(), // File path/reference
  proofOfAddress: text("proof_of_address").notNull(), // File path/reference
  proofOfBusiness: text("proof_of_business").notNull(), // File path/reference
  verificationStatus: text("verification_status").notNull().default("pending"), // "pending", "verified", "rejected"
  description: text("description"),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  phone: text("phone"),
  website: text("website"),
  imageUrl: text("image_url"),
});

// Deals schema - offers created by businesses
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  terms: text("terms"),
  discount: text("discount"),
  dealType: text("deal_type").notNull(), // "percent_off", "buy_one_get_one", "fixed_amount", etc.
  featured: boolean("featured").default(false),
  redemptionCode: text("redemption_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "active", "expired", "rejected"
  approvalDate: timestamp("approval_date"),
  maxRedemptionsPerUser: integer("max_redemptions_per_user").default(1),
  totalRedemptionsLimit: integer("total_redemptions_limit"),
  redemptionInstructions: text("redemption_instructions"),
  viewCount: integer("view_count").default(0),
  saveCount: integer("save_count").default(0),
  redemptionCount: integer("redemption_count").default(0),
});

// User favorites - saved deals by users
export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Deal redemptions - track when users redeem deals
export const dealRedemptions = pgTable("deal_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  status: text("status").notNull().default("redeemed"), // "redeemed", "completed", "cancelled"
});

// User notification preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  dealAlerts: boolean("deal_alerts").default(true),
  expiringDealReminders: boolean("expiring_deal_reminders").default(true), // New field for expiring deal reminders
  expiringDealReminderHours: integer("expiring_deal_reminder_hours").default(48), // Hours before expiration to send reminder
  weeklyNewsletter: boolean("weekly_newsletter").default(true),
});

// Deal approval workflow
export const dealApprovals = pgTable("deal_approvals", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  reviewerId: integer("reviewer_id"), // Optional: admin/reviewer user ID 
  feedback: text("feedback"), // Feedback from reviewer, especially for rejections
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  revisionCount: integer("revision_count").default(0), // Count of times the deal was revised and resubmitted
});

// Business hours
export const businessHours = pgTable("business_hours", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 6 = Saturday
  openTime: text("open_time"), // Format: "HH:MM"
  closeTime: text("close_time"), // Format: "HH:MM"
  isClosed: boolean("is_closed").default(false),
});

// Business social media links
export const businessSocial = pgTable("business_social", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id), 
  platform: text("platform").notNull(), // e.g., "facebook", "instagram", "twitter", etc.
  url: text("url").notNull(),
  username: text("username"),
});

// Document submission history for businesses
export const businessDocuments = pgTable("business_documents", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  documentType: text("document_type").notNull(), // e.g., "governmentId", "proofOfAddress", "proofOfBusiness", etc.
  filePath: text("file_path").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Redemption ratings - user feedback after redeeming deals
export const redemptionRatings = pgTable("redemption_ratings", {
  id: serial("id").primaryKey(),
  redemptionId: integer("redemption_id").notNull().references(() => dealRedemptions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  dealId: integer("deal_id").notNull().references(() => deals.id),
  businessId: integer("business_id").notNull().references(() => businesses.id),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  anonymous: boolean("anonymous").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Create Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);
export const insertDealSchema = createInsertSchema(deals);
export const insertUserFavoriteSchema = createInsertSchema(userFavorites);
export const insertDealRedemptionSchema = createInsertSchema(dealRedemptions);
export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences);
export const insertDealApprovalSchema = createInsertSchema(dealApprovals);
export const insertBusinessHoursSchema = createInsertSchema(businessHours);
export const insertBusinessSocialSchema = createInsertSchema(businessSocial);
export const insertBusinessDocumentSchema = createInsertSchema(businessDocuments);
export const insertRedemptionRatingSchema = createInsertSchema(redemptionRatings);

// Login schema
export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

// Rating submission schema
export const ratingSchema = z.object({
  rating: z.number().min(1).max(5).int(),
  comment: z.string().optional(),
  anonymous: z.boolean().optional().default(false),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = typeof userFavorites.$inferInsert;
export type DealRedemption = typeof dealRedemptions.$inferSelect;
export type InsertDealRedemption = typeof dealRedemptions.$inferInsert;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = typeof userNotificationPreferences.$inferInsert;

// New vendor-side types
export type DealApproval = typeof dealApprovals.$inferSelect;
export type InsertDealApproval = typeof dealApprovals.$inferInsert;
export type BusinessHours = typeof businessHours.$inferSelect;
export type InsertBusinessHours = typeof businessHours.$inferInsert;
export type BusinessSocial = typeof businessSocial.$inferSelect;
export type InsertBusinessSocial = typeof businessSocial.$inferInsert;
export type BusinessDocument = typeof businessDocuments.$inferSelect;
export type InsertBusinessDocument = typeof businessDocuments.$inferInsert;

// Rating types
export type RedemptionRating = typeof redemptionRatings.$inferSelect;
export type InsertRedemptionRating = typeof redemptionRatings.$inferInsert;

export type LoginUser = z.infer<typeof loginUserSchema>;
export type RatingData = z.infer<typeof ratingSchema>;
