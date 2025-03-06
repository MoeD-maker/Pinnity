import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
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
});

// Create Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);

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
export type LoginUser = z.infer<typeof loginUserSchema>;
