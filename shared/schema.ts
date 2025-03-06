import { pgTable, text, serial, integer, boolean, json, timestamp, doublePrecision } from "drizzle-orm/pg-core";
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
  weeklyNewsletter: boolean("weekly_newsletter").default(true),
});

// Create Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);
export const insertDealSchema = createInsertSchema(deals);
export const insertUserFavoriteSchema = createInsertSchema(userFavorites);
export const insertDealRedemptionSchema = createInsertSchema(dealRedemptions);
export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences);

// Login schema
export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
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
export type LoginUser = z.infer<typeof loginUserSchema>;
