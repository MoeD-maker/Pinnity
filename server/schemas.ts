import { z } from 'zod';
import { 
  insertUserSchema, 
  insertBusinessSchema, 
  insertDealSchema,
  apiDealSchema,
  insertUserFavoriteSchema,
  insertDealRedemptionSchema,
  insertUserNotificationPreferencesSchema,
  insertDealApprovalSchema,
  insertBusinessHoursSchema,
  insertBusinessSocialSchema,
  insertBusinessDocumentSchema,
  insertRedemptionRatingSchema,
  loginUserSchema,
  ratingSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema
} from '../shared/schema';
import { passwordSchema } from './utils/passwordValidation';

// =========== Auth Schemas ===========

export const authSchemas = {
  // Login schema
  login: z.object({
    body: loginUserSchema
  }),

  // Individual registration schema
  individualRegistration: z.object({
    body: z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Please enter a valid email address"),
      password: passwordSchema,
      confirmPassword: z.string().min(1, "Please confirm your password"),
      phone: z.string().min(1, { message: "Phone number is required" }),
      address: z.string().min(1, { message: "Address is required" }),
      termsAccepted: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms and conditions" }),
      })
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })
  }),

  // Password change schema
  passwordChange: z.object({
    body: z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, "Please confirm your new password")
    }).refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })
  }),
  
  // Password reset request schema (forgot password)
  passwordResetRequest: z.object({
    body: passwordResetRequestSchema
  }),
  
  // Password reset verification and new password submission
  passwordResetVerify: z.object({
    body: passwordResetVerifySchema
  })
};

// =========== User Schemas ===========

export const userSchemas = {
  // Get user by ID
  getUserById: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    })
  }),

  // Update user
  updateUser: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    }),
    body: insertUserSchema.partial().omit({ id: true, password: true, userType: true })
  }),

  // User favorites
  getUserFavorites: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    })
  }),

  // Add user favorite
  addUserFavorite: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    }),
    body: z.object({
      dealId: z.number({
        required_error: "Deal ID is required",
        invalid_type_error: "Deal ID must be a number"
      })
    })
  }),

  // Remove user favorite
  removeUserFavorite: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      }),
      dealId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    })
  }),

  // User redemptions
  getUserRedemptions: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    })
  }),

  // Create redemption
  createRedemption: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    }),
    body: z.object({
      dealId: z.number({
        required_error: "Deal ID is required",
        invalid_type_error: "Deal ID must be a number"
      })
    })
  }),

  // Notification preferences
  getNotificationPreferences: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    })
  }),

  // Update notification preferences
  updateNotificationPreferences: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    }),
    body: insertUserNotificationPreferencesSchema.omit({ id: true, userId: true }).partial()
  })
};

// =========== Business Schemas ===========

export const businessSchemas = {
  // Get business by ID
  getBusinessById: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business ID must be a valid number"
      })
    })
  }),

  // Update business
  updateBusiness: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business ID must be a valid number"
      })
    }),
    body: insertBusinessSchema.partial().omit({ id: true, userId: true })
  }),

  // Update business verification
  updateBusinessVerification: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business ID must be a valid number"
      })
    }),
    body: z.object({
      status: z.enum(["pending", "verified", "rejected"], {
        required_error: "Status is required",
        invalid_type_error: "Status must be pending, verified, or rejected"
      }),
      feedback: z.string().optional()
    })
  }),

  // Business hours
  getBusinessHours: z.object({
    params: z.object({
      businessId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business ID must be a valid number"
      })
    })
  }),

  // Create business hours
  createBusinessHours: z.object({
    body: insertBusinessHoursSchema.omit({ id: true })
  }),

  // Update business hours
  updateBusinessHours: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business hours ID must be a valid number"
      })
    }),
    body: insertBusinessHoursSchema.partial().omit({ id: true, businessId: true })
  }),

  // Delete business hours
  deleteBusinessHours: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business hours ID must be a valid number"
      })
    })
  }),

  // Business ratings
  getBusinessRatings: z.object({
    params: z.object({
      businessId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business ID must be a valid number"
      })
    })
  }),

  // Business ratings summary
  getBusinessRatingSummary: z.object({
    params: z.object({
      businessId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Business ID must be a valid number"
      })
    })
  })
};

// =========== Deal Schemas ===========

export const dealSchemas = {
  // Get all deals
  getDeals: z.object({
    query: z.object({
      featured: z.enum(["true", "false"]).optional(),
      limit: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Limit must be a valid number"
      }).optional(),
      category: z.string().optional(),
      search: z.string().optional()
    }).optional()
  }),

  // Get deal by ID
  getDealById: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    })
  }),

  // Create deal
  createDeal: z.object({
    body: apiDealSchema
  }),

  // Update deal
  updateDeal: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    }),
    body: apiDealSchema.partial().omit({ businessId: true })
  }),

  // Deal approval
  createDealApproval: z.object({
    params: z.object({
      dealId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    }),
    body: insertDealApprovalSchema.omit({ id: true, submittedAt: true })
  }),

  // Get deal approval
  getDealApproval: z.object({
    params: z.object({
      dealId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    })
  }),

  // Get deal approval history
  getDealApprovalHistory: z.object({
    params: z.object({
      dealId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    })
  }),

  // Update deal approval
  updateDealApproval: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Approval ID must be a valid number"
      })
    }),
    body: z.object({
      status: z.enum(["pending", "approved", "rejected"], {
        required_error: "Status is required",
        invalid_type_error: "Status must be pending, approved, or rejected"
      }),
      feedback: z.string().optional()
    })
  }),

  // Get deals by status
  getDealsByStatus: z.object({
    params: z.object({
      status: z.enum(["pending", "approved", "active", "expired", "rejected"], {
        invalid_type_error: "Status must be pending, approved, active, expired, or rejected"
      })
    })
  }),

  // Update deal status
  updateDealStatus: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    }),
    body: z.object({
      status: z.enum(["pending", "approved", "active", "expired", "rejected"], {
        required_error: "Status is required",
        invalid_type_error: "Status must be pending, approved, active, expired, or rejected"
      })
    })
  }),

  // Duplicate deal
  duplicateDeal: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    })
  }),

  // Increment deal views
  incrementDealViews: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    })
  }),

  // Get deal redemptions
  getDealRedemptions: z.object({
    params: z.object({
      dealId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    })
  }),

  // Verify redemption code
  verifyRedemptionCode: z.object({
    params: z.object({
      dealId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Deal ID must be a valid number"
      })
    }),
    body: z.object({
      code: z.string().min(1, "Redemption code is required")
    })
  })
};

// =========== Rating Schemas ===========

export const ratingSchemas = {
  // Create rating
  createRating: z.object({
    params: z.object({
      redemptionId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "Redemption ID must be a valid number"
      })
    }),
    body: ratingSchema
  }),

  // Get user ratings
  getUserRatings: z.object({
    params: z.object({
      userId: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    })
  })
};

// =========== Admin Schemas ===========

export const adminSchemas = {
  // Admin user operations
  getAllUsers: z.object({}),
  
  createUser: z.object({
    body: insertUserSchema.omit({ id: true })
  }),
  
  updateUser: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    }),
    body: insertUserSchema.partial().omit({ id: true })
  }),
  
  deleteUser: z.object({
    params: z.object({
      id: z.string().refine(val => !isNaN(parseInt(val, 10)), {
        message: "User ID must be a valid number"
      })
    })
  }),

  // Admin business operations
  createBusinessUser: z.object({
    body: z.object({
      user: insertUserSchema.omit({ id: true }),
      business: insertBusinessSchema.omit({ id: true, userId: true })
    })
  }),
  
  getAllBusinesses: z.object({})
};