import { z } from 'zod';

// Base schema for business hours
const businessHoursSchema = z.object({
  open: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Enter time in 24-hour format (HH:MM)")
    .optional()
    .nullable(),
  close: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Enter time in 24-hour format (HH:MM)")
    .optional()
    .nullable(),
  closed: z.boolean().default(false)
});

// Schema for individual preferences
export const individualPreferencesSchema = z.object({
  // Deal categories interests
  categories: z.object({
    food: z.boolean().default(false),
    shopping: z.boolean().default(false),
    entertainment: z.boolean().default(false),
    travel: z.boolean().default(false),
    health: z.boolean().default(false),
    beauty: z.boolean().default(false),
    services: z.boolean().default(false),
    other: z.boolean().default(false)
  }).refine(
    (data) => Object.values(data).some(value => value === true),
    {
      message: "Please select at least one category of interest",
      path: ["categories"]
    }
  ),
  
  // Location preferences
  location: z.object({
    enableLocationServices: z.boolean().default(false),
    radius: z.number()
      .min(1, "Radius must be at least 1 mile")
      .max(100, "Radius must not exceed 100 miles")
      .default(10),
    savedLocations: z.array(z.string()).default([])
  }),
  
  // Notification preferences
  notifications: z.object({
    pushEnabled: z.boolean().default(true),
    emailEnabled: z.boolean().default(true),
    dealAlerts: z.boolean().default(true),
    weeklyDigest: z.boolean().default(false),
    favorites: z.boolean().default(true),
    expiringDeals: z.boolean().default(true)
  })
});

// Schema for business preferences
export const businessPreferencesSchema = z.object({
  // Business hours
  businessHours: z.object({
    monday: businessHoursSchema,
    tuesday: businessHoursSchema,
    wednesday: businessHoursSchema,
    thursday: businessHoursSchema,
    friday: businessHoursSchema,
    saturday: businessHoursSchema,
    sunday: businessHoursSchema
  }).refine(
    (data) => {
      // Ensure there's at least one day where the business is open
      return Object.values(data).some(day => !day.closed);
    },
    {
      message: "Please specify at least one day when your business is open",
      path: ["businessHours"]
    }
  ),
  
  // Special offerings
  offerings: z.object({
    promotions: z.boolean().default(false),
    eventsHosting: z.boolean().default(false),
    loyaltyProgram: z.boolean().default(false),
    specialDiscounts: z.boolean().default(false),
    holidaySpecials: z.boolean().default(false),
    flashSales: z.boolean().default(false)
  }),
  
  // Target demographics
  demographics: z.object({
    ageGroups: z.object({
      under18: z.boolean().default(false),
      age18to24: z.boolean().default(false),
      age25to34: z.boolean().default(true),
      age35to44: z.boolean().default(true),
      age45to54: z.boolean().default(false),
      age55plus: z.boolean().default(false)
    }),
    targetByInterest: z.boolean().default(false),
    localFocus: z.boolean().default(true)
  })
});

// Combined schema for the entire onboarding form
export const onboardingFormSchema = z.object({
  userType: z.enum(['individual', 'business']),
  step: z.number().min(1),
  preferences: z.union([
    individualPreferencesSchema,
    businessPreferencesSchema
  ])
});

// Types derived from the schemas
export type IndividualPreferences = z.infer<typeof individualPreferencesSchema>;
export type BusinessPreferences = z.infer<typeof businessPreferencesSchema>;
export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;

// Helper function to get the appropriate schema based on user type
export function getPreferencesSchema(userType: 'individual' | 'business') {
  return userType === 'individual' ? individualPreferencesSchema : businessPreferencesSchema;
}

// Field validation helper functions
export function validateCategorySelection(categories: Record<string, boolean>): string | null {
  if (!Object.values(categories).some(v => v === true)) {
    return "Please select at least one category";
  }
  return null;
}

export function validateRadius(radius: number): string | null {
  if (radius < 1) {
    return "Radius must be at least 1 mile";
  }
  if (radius > 100) {
    return "Radius must not exceed 100 miles";
  }
  return null;
}

export function validateBusinessHours(hours: Record<string, any>): string | null {
  if (!Object.values(hours).some(day => !day.closed)) {
    return "Please specify at least one day when your business is open";
  }
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  for (const [day, schedule] of Object.entries(hours)) {
    if (!schedule.closed) {
      if (!schedule.open || !timeRegex.test(schedule.open)) {
        return `Invalid opening time for ${day}`;
      }
      if (!schedule.close || !timeRegex.test(schedule.close)) {
        return `Invalid closing time for ${day}`;
      }
    }
  }
  
  return null;
}

export function validateAgeGroups(ageGroups: Record<string, boolean>): string | null {
  if (!Object.values(ageGroups).some(v => v === true)) {
    return "Please select at least one age group";
  }
  return null;
}