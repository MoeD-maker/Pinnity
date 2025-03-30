import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Business profile update validation schema
 */
export const businessProfileSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(100, "Business name cannot exceed 100 characters").optional(),
  businessCategory: z.string().min(2, "Business category must be at least 2 characters").max(50, "Business category cannot exceed 50 characters").optional(),
  description: z.string().max(1000, "Description cannot exceed 1000 characters").optional(),
  phone: z.string().max(20, "Phone number cannot exceed 20 characters").nullable().optional(),
  address: z.string().max(200, "Address cannot exceed 200 characters").nullable().optional(),
  website: z.preprocess(
    (val) => {
      if (!val) return val;
      // If string doesn't have protocol, add https://
      if (typeof val === 'string' && !val.match(/^https?:\/\//)) {
        return `https://${val}`;
      }
      return val;
    },
    z.string().url("Invalid website URL").max(200, "Website URL cannot exceed 200 characters").nullable().optional()
  ),
  imageUrl: z.any().nullable().optional(),
  latitude: z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90").nullable().optional(),
  longitude: z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180").nullable().optional(),
});

/**
 * Business hours validation schema
 */
export const businessHoursSchema = z.object({
  businessId: z.number().positive("Business ID must be a positive number"),
  dayOfWeek: z.number().min(0, "Day of week must be between 0 (Sunday) and 6 (Saturday)").max(6, "Day of week must be between 0 (Sunday) and 6 (Saturday)"),
  openTime: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(),
  isClosed: z.boolean().nullable().optional(),
});

/**
 * Business social media link validation schema
 */
export const businessSocialSchema = z.object({
  businessId: z.number().positive("Business ID must be a positive number"),
  platform: z.string().min(2, "Platform name must be at least 2 characters").max(50, "Platform name cannot exceed 50 characters"),
  url: z.string().url("Invalid social media URL").max(500, "URL cannot exceed 500 characters"),
  username: z.string().max(100, "Username cannot exceed 100 characters").nullable().optional(),
});

/**
 * Business verification status update validation schema
 */
export const businessVerificationSchema = z.object({
  status: z.enum(["pending", "verified", "rejected"], {
    errorMap: () => ({ message: "Status must be one of: pending, verified, rejected" }),
  }),
  feedback: z.string().max(1000, "Feedback cannot exceed 1000 characters").nullable().optional(),
});

/**
 * Validate business profile updates
 */
export function validateBusinessProfile(req: Request, res: Response, next: NextFunction) {
  try {
    businessProfileSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        message: "Invalid business profile data",
        errors,
      });
    }
    return res.status(400).json({ message: "Invalid business profile data" });
  }
}

/**
 * Validate business hours data
 */
export function validateBusinessHours(req: Request, res: Response, next: NextFunction) {
  try {
    businessHoursSchema.parse(req.body);
    
    // Additional validation for time format when provided
    const { openTime, closeTime } = req.body;
    
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (openTime && !timeRegex.test(openTime)) {
      return res.status(400).json({
        message: "Invalid time format",
        errors: [{ field: "openTime", message: "Time must be in HH:MM format" }],
      });
    }
    
    if (closeTime && !timeRegex.test(closeTime)) {
      return res.status(400).json({
        message: "Invalid time format",
        errors: [{ field: "closeTime", message: "Time must be in HH:MM format" }],
      });
    }
    
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        message: "Invalid business hours data",
        errors,
      });
    }
    return res.status(400).json({ message: "Invalid business hours data" });
  }
}

/**
 * Validate business social media link data
 */
export function validateBusinessSocial(req: Request, res: Response, next: NextFunction) {
  try {
    businessSocialSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        message: "Invalid social media link data",
        errors,
      });
    }
    return res.status(400).json({ message: "Invalid social media link data" });
  }
}

/**
 * Validate business verification status update
 */
export function validateBusinessVerification(req: Request, res: Response, next: NextFunction) {
  try {
    businessVerificationSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        message: "Invalid verification status data",
        errors,
      });
    }
    return res.status(400).json({ message: "Invalid verification status data" });
  }
}