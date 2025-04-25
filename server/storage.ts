import { 
  users, businesses, deals, userFavorites, dealRedemptions, userNotificationPreferences,
  dealApprovals, businessHours, businessSocial, businessDocuments, redemptionRatings,
  passwordResetTokens, refreshTokens, notifications,
  type User, type InsertUser, type Business, type InsertBusiness, 
  type Deal, type InsertDeal, type UserFavorite, type InsertUserFavorite,
  type DealRedemption, type InsertDealRedemption, 
  type UserNotificationPreferences, type InsertUserNotificationPreferences,
  type DealApproval, type InsertDealApproval,
  type BusinessHours, type InsertBusinessHours,
  type BusinessSocial, type InsertBusinessSocial,
  type BusinessDocument, type InsertBusinessDocument,
  type RedemptionRating, type InsertRedemptionRating, type RatingData,
  type PasswordResetToken, type InsertPasswordResetToken,
  type RefreshToken, type InsertRefreshToken,
  type Notification, type InsertNotification
} from "@shared/schema";
import bcrypt from 'bcryptjs';
import { db } from './db';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithBusiness(userId: number): Promise<(User & { business?: Business }) | undefined>;
  createIndividualUser(user: Omit<InsertUser, "userType" | "username">): Promise<User>;
  createBusinessUser(user: Omit<InsertUser, "userType" | "username">, business: Omit<InsertBusiness, "userId">): Promise<User & { business: Business }>;
  verifyLogin(email: string, password: string): Promise<User | null>;
  updateUser(userId: number, userData: Partial<Omit<InsertUser, "id" | "password">>): Promise<User>;
  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Password reset methods
  createPasswordResetToken(email: string, clientInfo?: { ipAddress?: string, userAgent?: string }): Promise<{ token: string, user: User } | null>;
  validatePasswordResetToken(token: string): Promise<User | null>;
  resetPasswordWithToken(token: string, newPassword: string): Promise<boolean>;
  
  // Refresh token methods
  createRefreshToken(userId: number, token: string, expiresAt: Date, clientInfo?: { ipAddress?: string, userAgent?: string, deviceInfo?: string }): Promise<RefreshToken>;
  getRefreshToken(token: string): Promise<RefreshToken | undefined>;
  revokeRefreshToken(token: string): Promise<boolean>;
  revokeAllUserRefreshTokens(userId: number): Promise<number>;
  rotateRefreshToken(oldToken: string, newToken: string, expiresAt: Date): Promise<RefreshToken | null>;
  
  // Admin methods
  adminCreateUser(userData: Omit<InsertUser, "id">, password: string): Promise<User>;
  adminUpdateUser(userId: number, userData: Partial<Omit<InsertUser, "id">>): Promise<User>;
  adminDeleteUser(userId: number): Promise<boolean>;
  adminCreateBusinessUser(userData: Omit<InsertUser, "id">, businessData: Omit<InsertBusiness, "id" | "userId">): Promise<User & { business: Business }>;

  // Business methods
  getBusiness(id: number): Promise<Business | undefined>;
  getBusinessByUserId(userId: number): Promise<Business | undefined>;
  updateBusiness(id: number, businessData: Partial<Omit<InsertBusiness, "id" | "userId">>): Promise<Business>;
  updateBusinessVerificationStatus(id: number, status: string, feedback?: string): Promise<Business>;
  getAllBusinesses(): Promise<(Business & { user: User })[]>;
  getBusinessesByStatus(status: string): Promise<(Business & { user: User })[]>;
  
  // Business Hours methods
  getBusinessHours(businessId: number): Promise<BusinessHours[]>;
  addBusinessHours(businessHours: Omit<InsertBusinessHours, "id">): Promise<BusinessHours>;
  updateBusinessHours(id: number, businessHoursData: Partial<Omit<InsertBusinessHours, "id" | "businessId">>): Promise<BusinessHours>;
  deleteBusinessHours(id: number): Promise<void>;
  
  // Business Social Media methods
  getBusinessSocialLinks(businessId: number): Promise<BusinessSocial[]>;
  addBusinessSocialLink(socialLink: Omit<InsertBusinessSocial, "id">): Promise<BusinessSocial>;
  updateBusinessSocialLink(id: number, socialLinkData: Partial<Omit<InsertBusinessSocial, "id" | "businessId">>): Promise<BusinessSocial>;
  deleteBusinessSocialLink(id: number): Promise<void>;
  
  // Business Document methods
  getBusinessDocuments(businessId: number): Promise<BusinessDocument[]>;
  addBusinessDocument(document: Omit<InsertBusinessDocument, "id" | "submittedAt">): Promise<BusinessDocument>;
  updateBusinessDocumentStatus(id: number, status: string, feedback?: string): Promise<BusinessDocument>;

  // Deal methods
  getDeals(): Promise<(Deal & { business: Business })[]>;
  getDeal(id: number): Promise<(Deal & { business: Business }) | undefined>;
  getDealsByBusiness(businessId: number): Promise<Deal[]>;
  getDealsByStatus(status: string): Promise<(Deal & { business: Business })[]>;
  getFeaturedDeals(limit?: number): Promise<(Deal & { business: Business })[]>;
  createDeal(deal: Omit<InsertDeal, "id" | "createdAt">): Promise<Deal>;
  updateDeal(id: number, dealData: Partial<Omit<InsertDeal, "id" | "businessId">>): Promise<Deal>;
  deleteDeal(id: number): Promise<void>;
  updateDealStatus(id: number, status: string): Promise<Deal>;
  duplicateDeal(dealId: number): Promise<Deal>;
  incrementDealViews(dealId: number): Promise<Deal>;
  incrementDealSaves(dealId: number): Promise<Deal>;
  incrementDealRedemptions(dealId: number): Promise<Deal>;
  
  // Deal Approval methods
  createDealApproval(approval: Omit<InsertDealApproval, "id" | "submittedAt">): Promise<DealApproval>;
  getDealApproval(dealId: number): Promise<DealApproval | undefined>;
  getDealApprovalHistory(dealId: number): Promise<DealApproval[]>;
  updateDealApproval(id: number, status: string, reviewerId?: number, feedback?: string): Promise<DealApproval>;
  
  // User favorites methods
  getUserFavorites(userId: number): Promise<(UserFavorite & { deal: Deal & { business: Business } })[]>;
  addUserFavorite(userId: number, dealId: number): Promise<UserFavorite>;
  removeUserFavorite(userId: number, dealId: number): Promise<void>;
  
  // Deal redemption methods
  getUserRedemptions(userId: number): Promise<(DealRedemption & { deal: Deal & { business: Business } })[]>;
  getDealRedemptions(dealId: number): Promise<DealRedemption[]>;
  createRedemption(userId: number, dealId: number): Promise<DealRedemption>;
  updateRedemptionStatus(id: number, status: string): Promise<DealRedemption>;
  verifyRedemptionCode(dealId: number, code: string): Promise<boolean>;
  
  // Notification preferences methods
  getUserNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined>;
  getNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined>; // Alias for getUserNotificationPreferences
  updateUserNotificationPreferences(userId: number, preferences: Partial<Omit<InsertUserNotificationPreferences, "id" | "userId">>): Promise<UserNotificationPreferences>;
  updateNotificationPreferences(userId: number, preferences: Partial<Omit<InsertUserNotificationPreferences, "id" | "userId">>): Promise<UserNotificationPreferences>; // Alias for updateUserNotificationPreferences
  
  // Redemption rating methods
  createRedemptionRating(redemptionId: number, userId: number, dealId: number, businessId: number, ratingData: RatingData): Promise<RedemptionRating>;
  getRedemptionRating(redemptionId: number): Promise<RedemptionRating | undefined>;
  getUserRatings(userId: number): Promise<(RedemptionRating & { deal: Deal, business: Business })[]>;
  getBusinessRatings(businessId: number): Promise<RedemptionRating[]>;
  getBusinessRatingSummary(businessId: number): Promise<{ averageRating: number, totalRatings: number, ratingCounts: Record<number, number> }>;
  
  // Deal approval additional methods
  getPendingApprovalForDeal(dealId: number): Promise<DealApproval | undefined>;
  
  // Notification methods
  createNotification(notification: { userId: number, type: string, title: string, message: string, resourceId?: number, resourceType?: string }): Promise<any>;
  getUserNotifications(userId: number): Promise<any[]>;
  markNotificationAsRead(notificationId: number): Promise<any>;
  markAllUserNotificationsAsRead(userId: number): Promise<number>;
  hasUserRedeemedDeal(userId: number, dealId: number): Promise<boolean>;
  getUserRedemptionCountForDeal(userId: number, dealId: number): Promise<number>;
}

// Hash passwords for storage
function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private businesses: Map<number, Business>;
  private deals: Map<number, Deal>;
  private userFavorites: Map<number, UserFavorite>;
  private dealRedemptions: Map<number, DealRedemption>;
  private userNotificationPreferences: Map<number, UserNotificationPreferences>;
  
  // New vendor-side collections
  private dealApprovals: Map<number, DealApproval>;
  private businessHours: Map<number, BusinessHours>;
  private businessSocial: Map<number, BusinessSocial>;
  private businessDocuments: Map<number, BusinessDocument>;
  
  // Rating collection
  private redemptionRatings: Map<number, RedemptionRating>;
  
  // Password reset tokens
  private passwordResetTokens: Map<string, PasswordResetToken>;
  
  // Refresh tokens
  private refreshTokens: Map<string, RefreshToken>;
  
  // Notifications
  private notifications: Map<number, Notification>;
  
  private currentUserId: number;
  private currentBusinessId: number;
  private currentDealId: number;
  private currentUserFavoriteId: number;
  private currentDealRedemptionId: number;
  private currentUserNotificationPreferencesId: number;
  private currentDealApprovalId: number;
  private currentBusinessHoursId: number;
  private currentBusinessSocialId: number;
  private currentBusinessDocumentId: number;
  private currentRedemptionRatingId: number;
  private currentNotificationId: number;

  constructor() {
    this.users = new Map();
    this.businesses = new Map();
    this.deals = new Map();
    this.userFavorites = new Map();
    this.dealRedemptions = new Map();
    this.userNotificationPreferences = new Map();
    
    // Initialize new vendor-side collections
    this.dealApprovals = new Map();
    this.businessHours = new Map();
    this.businessSocial = new Map();
    this.businessDocuments = new Map();
    
    // Initialize ratings collection
    this.redemptionRatings = new Map();
    
    // Initialize password reset tokens
    this.passwordResetTokens = new Map();
    
    // Initialize refresh tokens
    this.refreshTokens = new Map();
    
    // Initialize notifications
    this.notifications = new Map();
    
    this.currentUserId = 1;
    this.currentBusinessId = 1;
    this.currentDealId = 1;
    this.currentUserFavoriteId = 1;
    this.currentDealRedemptionId = 1;
    this.currentUserNotificationPreferencesId = 1;
    this.currentDealApprovalId = 1;
    this.currentBusinessHoursId = 1;
    this.currentBusinessSocialId = 1;
    this.currentBusinessDocumentId = 1;
    this.currentRedemptionRatingId = 1;
    this.currentNotificationId = 1;
    
    // Populate with sample data
    this.initializeSampleData();
  }

  // Initialize with sample data
  private async initializeSampleData() {
    // Create some sample users, businesses, and deals if no data exists
    if (this.users.size === 0) {
      // Create test accounts for customer, admin, and vendor
      
      // 1. Customer test account
      const customerUser = await this.createIndividualUser({
        firstName: "Customer",
        lastName: "User",
        email: "customer@test.com",
        password: "Customer123!",
        phone: "555-123-4567",
        address: "100 User Ave, Anytown, USA",
      });
      
      // 2. Admin test account
      const adminUser = await this.createIndividualUser({
        firstName: "Admin",
        lastName: "User",
        email: "admin@test.com",
        password: "Admin123!",
        phone: "555-987-6543",
        address: "200 Admin Blvd, Anytown, USA",
      });
      // Update user type to admin
      this.users.set(adminUser.id, {
        ...adminUser,
        userType: "admin"
      });
      
      // 3. Vendor test account
      const vendorUser = await this.createBusinessUser(
        {
          firstName: "Vendor",
          lastName: "User",
          email: "vendor@test.com",
          password: "Vendor123!",
          phone: "555-456-7890",
          address: "300 Business St, Anytown, USA",
        },
        {
          businessName: "Test Vendor Business",
          businessCategory: "retail",
          description: "A test vendor business for demonstration purposes",
          address: "300 Business St, Anytown, USA",
          latitude: 37.7841,
          longitude: -122.4077,
          phone: "555-456-7890",
          website: "www.testvendor.com",
          imageUrl: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
          governmentId: "placeholder",
          proofOfAddress: "placeholder",
          proofOfBusiness: "placeholder",
          verificationStatus: "verified"
        }
      );
      
      // Create a sample individual user
      const user1 = await this.createIndividualUser({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "Password123!",
        phone: "123-456-7890",
        address: "123 Main St, Anytown, USA"
      });
      
      // Create some sample businesses
      const cafeUser = await this.createIndividualUser({
        firstName: "Cafe",
        lastName: "Owner",
        email: "cafe@example.com",
        password: "Password123!",
        phone: "123-456-7891",
        address: "456 Oak St, Anytown, USA"
      });
      
      const cafeBusiness = await this.createBusiness({
        userId: cafeUser.id,
        businessName: "Morning Brew Café",
        businessCategory: "restaurant",
        description: "A cozy café serving fresh coffee and pastries",
        address: "456 Oak St, Anytown, USA",
        latitude: 37.7749,
        longitude: -122.4194,
        phone: "555-123-4567",
        website: "www.morningbrewcafe.com",
        imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8Y2FmZXxlbnwwfHwwfHw%3D&w=1000&q=80",
        governmentId: "placeholder",
        proofOfAddress: "placeholder",
        proofOfBusiness: "placeholder",
        verificationStatus: "verified"
      });
      
      const restaurantUser = await this.createIndividualUser({
        firstName: "Restaurant",
        lastName: "Owner",
        email: "restaurant@example.com",
        password: "Password123!",
        phone: "123-456-7892",
        address: "789 Pine St, Anytown, USA"
      });
      
      const restaurantBusiness = await this.createBusiness({
        userId: restaurantUser.id,
        businessName: "Bistro Delight",
        businessCategory: "restaurant",
        description: "Fine dining with a modern twist",
        address: "789 Pine St, Anytown, USA",
        latitude: 37.7739,
        longitude: -122.4114,
        phone: "555-789-1234",
        website: "www.bistrodelight.com",
        imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8cmVzdGF1cmFudHxlbnwwfHwwfHw%3D&w=1000&q=80",
        governmentId: "placeholder",
        proofOfAddress: "placeholder",
        proofOfBusiness: "placeholder",
        verificationStatus: "verified"
      });
      
      const retailUser = await this.createIndividualUser({
        firstName: "Retail",
        lastName: "Owner",
        email: "retail@example.com",
        password: "Password123!",
        phone: "123-456-7893",
        address: "321 Maple St, Anytown, USA"
      });
      
      const retailBusiness = await this.createBusiness({
        userId: retailUser.id,
        businessName: "Urban Threads",
        businessCategory: "retail",
        description: "Trendy clothing and accessories for all occasions",
        address: "321 Maple St, Anytown, USA",
        latitude: 37.7729,
        longitude: -122.4134,
        phone: "555-456-7890",
        website: "www.urbanthreads.com",
        imageUrl: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cmV0YWlsfGVufDB8fDB8fA%3D%3D&w=1000&q=80",
        governmentId: "placeholder",
        proofOfAddress: "placeholder",
        proofOfBusiness: "placeholder",
        verificationStatus: "verified"
      });
      
      const spaUser = await this.createIndividualUser({
        firstName: "Spa",
        lastName: "Owner",
        email: "spa@example.com",
        password: "Password123!",
        phone: "123-456-7894",
        address: "654 Elm St, Anytown, USA"
      });
      
      const spaBusiness = await this.createBusiness({
        userId: spaUser.id,
        businessName: "Tranquil Retreat Spa",
        businessCategory: "services",
        description: "A peaceful oasis offering massage and skincare services",
        address: "654 Elm St, Anytown, USA",
        latitude: 37.7719,
        longitude: -122.4154,
        phone: "555-987-6543",
        website: "www.tranquilretreat.com",
        imageUrl: "https://images.unsplash.com/photo-1610021684503-6b00aa5f5059?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8c3BhfGVufDB8fDB8fA%3D%3D&w=1000&q=80",
        governmentId: "placeholder",
        proofOfAddress: "placeholder",
        proofOfBusiness: "placeholder",
        verificationStatus: "verified"
      });
      
      // Create sample deals
      // Expired deals
      await this.createDeal({
        businessId: cafeBusiness.id,
        title: "50% Off Your First Coffee",
        description: "New customers get 50% off any coffee drink!",
        category: "Food & Drink",
        imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        terms: "Valid for first-time customers only. Cannot be combined with other offers.",
        discount: "50%",
        dealType: "percent_off",
        featured: true,
        redemptionCode: "COFFEE50"
      });
      
      await this.createDeal({
        businessId: restaurantBusiness.id,
        title: "Free Appetizer with Entrée Purchase",
        description: "Enjoy a complimentary appetizer when you order any entrée!",
        category: "Food & Drink",
        imageUrl: "https://images.unsplash.com/photo-1609167830220-7164aa360951?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8YXBwZXRpemVyfGVufDB8fDB8fA%3D%3D&w=1000&q=80",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        terms: "Valid for dine-in only. One appetizer per table. Max value $12.",
        discount: "Free appetizer",
        dealType: "free_item",
        featured: true,
        redemptionCode: "FREEAPP"
      });
      
      // Future-dated deals
      await this.createDeal({
        businessId: cafeBusiness.id,
        title: "Buy One, Get One Free Coffee",
        description: "Purchase any coffee and get a second one free of equal or lesser value!",
        category: "Food & Drink",
        imageUrl: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days in the future
        terms: "Valid any day from 2pm-5pm. Cannot be combined with other offers.",
        discount: "BOGO",
        dealType: "bogo",
        featured: true,
        redemptionCode: "BOGO2024"
      });
      
      await this.createDeal({
        businessId: restaurantBusiness.id,
        title: "20% Off Weekday Lunch",
        description: "Enjoy 20% off your entire lunch bill Monday through Friday!",
        category: "Food & Drink",
        imageUrl: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45), // 45 days in the future
        terms: "Valid Monday-Friday from 11am-2pm. Not valid on holidays. Maximum discount $25.",
        discount: "20%",
        dealType: "percent_off",
        featured: false,
        redemptionCode: "LUNCH20"
      });
      
      await this.createDeal({
        businessId: retailBusiness.id,
        title: "Summer Sale: 30% Off All Swimwear",
        description: "Get ready for summer with 30% off our entire swimwear collection!",
        category: "Retail",
        imageUrl: "https://images.unsplash.com/photo-1560774358-d727658f457c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), // 14 days in the future
        terms: "Cannot be combined with other promotions. Sale applies to regular-priced items only.",
        discount: "30%",
        dealType: "percent_off",
        featured: true,
        redemptionCode: "SWIM30"
      });
      
      await this.createDeal({
        businessId: spaBusiness.id,
        title: "Spa Day Package: 15% Off",
        description: "Treat yourself to our deluxe spa package including massage, facial, and pedicure!",
        category: "Health & Beauty",
        imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
        startDate: new Date(),
        endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60), // 60 days in the future
        terms: "Appointment required. 24-hour cancellation notice required. Gratuity not included.",
        discount: "15%",
        dealType: "percent_off",
        featured: false,
        redemptionCode: "SPAPKG15"
      });
      
      await this.createDeal({
        businessId: retailBusiness.id,
        title: "Buy One, Get One 50% Off",
        description: "Purchase any full-priced item and get a second item of equal or lesser value at 50% off!",
        category: "Retail",
        imageUrl: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cmV0YWlsfGVufDB8fDB8fA%3D%3D&w=1000&q=80",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        terms: "Excludes sale items and accessories. Cannot be combined with other promotions.",
        discount: "50% off second item",
        dealType: "buy_one_get_one",
        featured: false,
        redemptionCode: "BOGO50"
      });
      
      await this.createDeal({
        businessId: spaBusiness.id,
        title: "$20 Off Massage Services",
        description: "Enjoy $20 off any 60-minute or longer massage therapy session!",
        category: "Health & Beauty",
        imageUrl: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8bWFzc2FnZXxlbnwwfHwwfHw%3D&w=1000&q=80",
        startDate: new Date("2023-01-01"),
        endDate: new Date("2023-12-31"),
        terms: "Appointment required. Not valid with other discounts. Gratuity not included.",
        discount: "$20 off",
        dealType: "fixed_amount",
        featured: true,
        redemptionCode: "RELAX20"
      });
      
      // Create sample notification preferences
      await this.createUserNotificationPreferences({
        userId: user1.id,
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        weeklyNewsletter: false
      });
      
      // Add sample favorites
      await this.addUserFavorite(user1.id, 1);
      await this.addUserFavorite(user1.id, 3);
      
      // Add sample redemption
      await this.createRedemption(user1.id, 2);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Make email lookup case-insensitive to avoid login issues with different case
    const normalizedEmail = email.toLowerCase();
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === normalizedEmail,
    );
  }

  async getUserWithBusiness(userId: number): Promise<(User & { business?: Business }) | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    if (user.userType === "business") {
      const business = Array.from(this.businesses.values()).find(
        (business) => business.userId === userId,
      );
      
      return { ...user, business };
    }
    
    return user;
  }

  async createIndividualUser(userData: Omit<InsertUser, "userType" | "username">): Promise<User> {
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
    
    const id = this.currentUserId++;
    const username = userData.email.split("@")[0] + id; // Generate a simple username
    
    const hashedPassword = hashPassword(userData.password);
    
    const user: User = {
      ...userData,
      id,
      username,
      password: hashedPassword,
      userType: "individual",
      created_at: new Date().toISOString(),
    };
    
    this.users.set(id, user);
    return user;
  }

  async createBusinessUser(userData: Omit<InsertUser, "userType" | "username">, businessData: Omit<InsertBusiness, "userId">): Promise<User & { business: Business }> {
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }
    
    const userId = this.currentUserId++;
    const username = userData.email.split("@")[0] + userId; // Generate a simple username
    
    const hashedPassword = hashPassword(userData.password);
    
    const user: User = {
      ...userData,
      id: userId,
      username,
      password: hashedPassword,
      userType: "business",
      created_at: new Date().toISOString(),
    };
    
    const businessId = this.currentBusinessId++;
    const business: Business = {
      ...businessData,
      id: businessId,
      userId,
      verificationStatus: businessData.verificationStatus || "pending",
    };
    
    this.users.set(userId, user);
    this.businesses.set(businessId, business);
    
    return { ...user, business };
  }

  // Helper method to create a business directly
  private async createBusiness(businessData: Omit<InsertBusiness, "id">): Promise<Business> {
    const id = this.currentBusinessId++;
    const business: Business = {
      ...businessData,
      id,
    };
    this.businesses.set(id, business);
    return business;
  }

  async verifyLogin(email: string, password: string): Promise<User | null> {
    // Enhanced login verification with better error logging
    console.log(`Login attempt for email: ${email}`);
    
    // Get user with case-insensitive email lookup
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      console.log(`Login failed: No user found with email ${email}`);
      return null;
    }
    
    // Use bcrypt to safely compare passwords
    const passwordMatch = bcrypt.compareSync(password, user.password);
    
    if (passwordMatch) {
      console.log(`Login successful for user ID: ${user.id}, email: ${email}`);
      return user;
    } else {
      console.log(`Login failed: Invalid password for email ${email}`);
      return null;
    }
  }

  async updateUser(userId: number, userData: Partial<Omit<InsertUser, "id" | "password">>): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser: User = {
      ...user,
      ...userData,
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Verify current password using bcrypt
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return false;
    }
    
    // Set new password with bcrypt
    const hashedNewPassword = hashPassword(newPassword);
    const updatedUser: User = {
      ...user,
      password: hashedNewPassword,
    };
    
    this.users.set(userId, updatedUser);
    return true;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Password reset methods
  async createPasswordResetToken(email: string, clientInfo?: { ipAddress?: string, userAgent?: string }): Promise<{ token: string, user: User } | null> {
    // Find user by email
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }
    
    // Generate a random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // Store the token (in a real implementation, this would be in a database)
    // For the memory implementation, we'll just use a Map
    if (!this.passwordResetTokens) {
      this.passwordResetTokens = new Map();
    }
    
    this.passwordResetTokens.set(token, {
      id: Math.floor(Math.random() * 10000), // Simple ID for memory implementation
      userId: user.id,
      token: token,
      createdAt: new Date(),
      expiresAt: expiresAt,
      usedAt: null,
      ipAddress: clientInfo?.ipAddress || null,
      userAgent: clientInfo?.userAgent || null
    });
    
    return { token, user };
  }
  
  async validatePasswordResetToken(token: string): Promise<User | null> {
    if (!this.passwordResetTokens) {
      return null;
    }
    
    const resetToken = this.passwordResetTokens.get(token);
    
    // Check if token exists, is not expired, and has not been used
    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      return null;
    }
    
    // Get the associated user
    const user = await this.getUser(resetToken.userId);
    return user || null;
  }
  
  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    if (!this.passwordResetTokens) {
      return false;
    }
    
    const resetToken = this.passwordResetTokens.get(token);
    
    // Check if token exists, is not expired, and has not been used
    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      return false;
    }
    
    // Update the user's password
    const user = await this.getUser(resetToken.userId);
    if (!user) {
      return false;
    }
    
    const updatedUser = {
      ...user,
      password: hashPassword(newPassword)
    };
    
    this.users.set(user.id, updatedUser);
    
    // Mark token as used
    resetToken.usedAt = new Date();
    this.passwordResetTokens.set(token, resetToken);
    
    return true;
  }

  // Refresh token methods
  async createRefreshToken(userId: number, token: string, expiresAt: Date, clientInfo?: { ipAddress?: string, userAgent?: string, deviceInfo?: string }): Promise<RefreshToken> {
    // Create a refresh token record
    const refreshToken: RefreshToken = {
      id: Date.now(), // Using timestamp as ID for simplicity in memory store
      userId: userId,
      token: token,
      expiresAt: expiresAt,
      isRevoked: false,
      createdAt: new Date(),
      lastUsedAt: null,
      ipAddress: clientInfo?.ipAddress || null,
      userAgent: clientInfo?.userAgent || null,
      deviceInfo: clientInfo?.deviceInfo || null
    };
    
    // Store the token
    this.refreshTokens.set(token, refreshToken);
    
    return refreshToken;
  }
  
  async getRefreshToken(token: string): Promise<RefreshToken | undefined> {
    // Retrieve the refresh token from storage
    return this.refreshTokens.get(token);
  }
  
  async revokeRefreshToken(token: string): Promise<boolean> {
    // Get the refresh token
    const refreshToken = this.refreshTokens.get(token);
    if (!refreshToken) return false;
    
    // Mark the token as revoked
    const updatedToken: RefreshToken = {
      ...refreshToken,
      isRevoked: true
    };
    
    // Update storage
    this.refreshTokens.set(token, updatedToken);
    
    return true;
  }
  
  async revokeAllUserRefreshTokens(userId: number): Promise<number> {
    // Find all refresh tokens for this user
    let revokedCount = 0;
    
    // Iterate through all tokens
    for (const [token, refreshToken] of this.refreshTokens.entries()) {
      if (refreshToken.userId === userId && !refreshToken.isRevoked) {
        // Mark as revoked
        this.refreshTokens.set(token, {
          ...refreshToken,
          isRevoked: true
        });
        revokedCount++;
      }
    }
    
    return revokedCount;
  }
  
  async rotateRefreshToken(oldToken: string, newToken: string, expiresAt: Date): Promise<RefreshToken | null> {
    // Get the old token
    const oldRefreshToken = this.refreshTokens.get(oldToken);
    if (!oldRefreshToken) return null;
    
    // Check if the token is valid
    if (oldRefreshToken.expiresAt < new Date() || oldRefreshToken.isRevoked) {
      return null;
    }
    
    // Revoke the old token
    await this.revokeRefreshToken(oldToken);
    
    // Create a new token with the same user and client info
    const newRefreshToken = await this.createRefreshToken(
      oldRefreshToken.userId,
      newToken,
      expiresAt,
      {
        ipAddress: oldRefreshToken.ipAddress || undefined,
        userAgent: oldRefreshToken.userAgent || undefined,
        deviceInfo: oldRefreshToken.deviceInfo || undefined
      }
    );
    
    return newRefreshToken;
  }
  
  // Admin methods
  async adminCreateUser(userData: Omit<InsertUser, "id">, password: string): Promise<User> {
    // Check if email already exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error(`User with email ${userData.email} already exists`);
    }
    
    const userId = this.currentUserId++;
    
    const user: User = {
      id: userId,
      ...userData,
      password: hashPassword(password),
    };
    
    this.users.set(user.id, user);
    return user;
  }
  
  async adminUpdateUser(userId: number, userData: Partial<Omit<InsertUser, "id">>): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // If updating email, check if new email already exists
    if (userData.email && userData.email !== user.email) {
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser && existingUser.id !== userId) {
        throw new Error(`User with email ${userData.email} already exists`);
      }
    }
    
    const updatedUser: User = {
      ...user,
      ...userData,
      // If password is being updated, hash it
      password: userData.password ? hashPassword(userData.password) : user.password
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async adminDeleteUser(userId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }
    
    // Check if it's a business user and delete the business too
    if (user.userType === "business") {
      const business = await this.getBusinessByUserId(userId);
      if (business) {
        // Remove all related data
        this.businesses.delete(business.id);
        
        // Remove related business hours
        for (const [id, hours] of this.businessHours.entries()) {
          if (hours.businessId === business.id) {
            this.businessHours.delete(id);
          }
        }
        
        // Remove related social links
        for (const [id, social] of this.businessSocial.entries()) {
          if (social.businessId === business.id) {
            this.businessSocial.delete(id);
          }
        }
        
        // Remove related documents
        for (const [id, doc] of this.businessDocuments.entries()) {
          if (doc.businessId === business.id) {
            this.businessDocuments.delete(id);
          }
        }
        
        // Remove related deals
        for (const [id, deal] of this.deals.entries()) {
          if (deal.businessId === business.id) {
            this.deals.delete(id);
            
            // Remove related approvals
            for (const [approvalId, approval] of this.dealApprovals.entries()) {
              if (approval.dealId === id) {
                this.dealApprovals.delete(approvalId);
              }
            }
            
            // Remove related redemptions
            for (const [redemptionId, redemption] of this.dealRedemptions.entries()) {
              if (redemption.dealId === id) {
                this.dealRedemptions.delete(redemptionId);
              }
            }
            
            // Remove related favorites
            for (const [favoriteId, favorite] of this.userFavorites.entries()) {
              if (favorite.dealId === id) {
                this.userFavorites.delete(favoriteId);
              }
            }
          }
        }
      }
    }
    
    // Remove user notification preferences
    for (const [id, prefs] of this.userNotificationPreferences.entries()) {
      if (prefs.userId === userId) {
        this.userNotificationPreferences.delete(id);
      }
    }
    
    // Delete the user
    this.users.delete(userId);
    return true;
  }
  
  async adminCreateBusinessUser(userData: Omit<InsertUser, "id">, businessData: Omit<InsertBusiness, "id" | "userId">): Promise<User & { business: Business }> {
    // First create the user account
    const user = await this.adminCreateUser({
      ...userData,
      userType: "business"
    }, userData.password);
    
    // Then create the business
    const business = await this.createBusiness({
      ...businessData,
      userId: user.id
    });
    
    return { ...user, business };
  }
  
  async getAllBusinesses(): Promise<(Business & { user: User })[]> {
    const businesses = Array.from(this.businesses.values());
    const result: (Business & { user: User })[] = [];
    
    for (const business of businesses) {
      const user = await this.getUser(business.userId);
      if (user) {
        result.push({ ...business, user });
      }
    }
    
    return result;
  }
  
  async getBusinessesByStatus(status: string): Promise<(Business & { user: User })[]> {
    console.log(`MemStorage.getBusinessesByStatus("${status}") called`);
    
    // Filter businesses by verification status
    const filteredBusinesses = Array.from(this.businesses.values())
      .filter(business => business.verificationStatus === status);
      
    console.log(`Found ${filteredBusinesses.length} businesses with status "${status}"`);
    
    // Add user data to each business
    const result: (Business & { user: User })[] = [];
    for (const business of filteredBusinesses) {
      const user = await this.getUser(business.userId);
      if (user) {
        result.push({ ...business, user });
      }
    }
    
    return result;
  }
  
  // Business methods
  async getBusiness(id: number): Promise<Business | undefined> {
    return this.businesses.get(id);
  }
  
  async getBusinessByUserId(userId: number): Promise<Business | undefined> {
    return Array.from(this.businesses.values()).find(
      (business) => business.userId === userId
    );
  }
  
  async updateBusiness(id: number, businessData: Partial<Omit<InsertBusiness, "id" | "userId">>): Promise<Business> {
    const business = await this.getBusiness(id);
    if (!business) {
      throw new Error("Business not found");
    }
    
    const updatedBusiness: Business = {
      ...business,
      ...businessData,
    };
    
    this.businesses.set(id, updatedBusiness);
    return updatedBusiness;
  }
  
  async updateBusinessVerificationStatus(id: number, status: string, feedback?: string): Promise<Business> {
    const business = await this.getBusiness(id);
    if (!business) {
      throw new Error("Business not found");
    }
    
    const updatedBusiness: Business = {
      ...business,
      verificationStatus: status,
      verificationFeedback: feedback || business.verificationFeedback,
    };
    
    this.businesses.set(id, updatedBusiness);
    return updatedBusiness;
  }
  
  // Business Hours methods
  async getBusinessHours(businessId: number): Promise<BusinessHours[]> {
    return Array.from(this.businessHours.values()).filter(
      (hours) => hours.businessId === businessId
    );
  }
  
  async addBusinessHours(businessHoursData: Omit<InsertBusinessHours, "id">): Promise<BusinessHours> {
    const business = await this.getBusiness(businessHoursData.businessId);
    if (!business) {
      throw new Error("Business not found");
    }
    
    const id = this.currentBusinessHoursId++;
    const businessHours: BusinessHours = {
      ...businessHoursData,
      id,
    };
    
    this.businessHours.set(id, businessHours);
    return businessHours;
  }
  
  async updateBusinessHours(id: number, businessHoursData: Partial<Omit<InsertBusinessHours, "id" | "businessId">>): Promise<BusinessHours> {
    const businessHours = this.businessHours.get(id);
    if (!businessHours) {
      throw new Error("Business hours not found");
    }
    
    const updatedBusinessHours: BusinessHours = {
      ...businessHours,
      ...businessHoursData,
    };
    
    this.businessHours.set(id, updatedBusinessHours);
    return updatedBusinessHours;
  }
  
  async deleteBusinessHours(id: number): Promise<void> {
    if (!this.businessHours.has(id)) {
      throw new Error("Business hours not found");
    }
    
    this.businessHours.delete(id);
  }
  
  // Business Social Media methods
  async getBusinessSocialLinks(businessId: number): Promise<BusinessSocial[]> {
    return Array.from(this.businessSocial.values()).filter(
      (social) => social.businessId === businessId
    );
  }
  
  async addBusinessSocialLink(socialLinkData: Omit<InsertBusinessSocial, "id">): Promise<BusinessSocial> {
    const business = await this.getBusiness(socialLinkData.businessId);
    if (!business) {
      throw new Error("Business not found");
    }
    
    const id = this.currentBusinessSocialId++;
    const socialLink: BusinessSocial = {
      ...socialLinkData,
      id,
    };
    
    this.businessSocial.set(id, socialLink);
    return socialLink;
  }
  
  async updateBusinessSocialLink(id: number, socialLinkData: Partial<Omit<InsertBusinessSocial, "id" | "businessId">>): Promise<BusinessSocial> {
    const socialLink = this.businessSocial.get(id);
    if (!socialLink) {
      throw new Error("Social link not found");
    }
    
    const updatedSocialLink: BusinessSocial = {
      ...socialLink,
      ...socialLinkData,
    };
    
    this.businessSocial.set(id, updatedSocialLink);
    return updatedSocialLink;
  }
  
  async deleteBusinessSocialLink(id: number): Promise<void> {
    if (!this.businessSocial.has(id)) {
      throw new Error("Social link not found");
    }
    
    this.businessSocial.delete(id);
  }
  
  // Business Document methods
  async getBusinessDocuments(businessId: number): Promise<BusinessDocument[]> {
    return Array.from(this.businessDocuments.values()).filter(
      (document) => document.businessId === businessId
    );
  }
  
  async addBusinessDocument(documentData: Omit<InsertBusinessDocument, "id" | "submittedAt">): Promise<BusinessDocument> {
    const business = await this.getBusiness(documentData.businessId);
    if (!business) {
      throw new Error("Business not found");
    }
    
    const id = this.currentBusinessDocumentId++;
    const document: BusinessDocument = {
      ...documentData,
      id,
      submittedAt: new Date(),
      status: documentData.status || "pending",
    };
    
    this.businessDocuments.set(id, document);
    return document;
  }
  
  async updateBusinessDocumentStatus(id: number, status: string, feedback?: string): Promise<BusinessDocument> {
    const document = this.businessDocuments.get(id);
    if (!document) {
      throw new Error("Document not found");
    }
    
    const updatedDocument: BusinessDocument = {
      ...document,
      status,
      reviewedAt: new Date(),
      feedback: feedback || document.feedback,
    };
    
    this.businessDocuments.set(id, updatedDocument);
    return updatedDocument;
  }

  // Deal methods
  async getDeals(): Promise<(Deal & { business: Business })[]> {
    const deals = Array.from(this.deals.values());
    
    return Promise.all(deals.map(async (deal) => {
      const business = this.businesses.get(deal.businessId);
      if (!business) {
        throw new Error(`Business with ID ${deal.businessId} not found`);
      }
      return { ...deal, business };
    }));
  }

  async getDeal(id: number): Promise<(Deal & { business: Business }) | undefined> {
    const deal = this.deals.get(id);
    if (!deal) return undefined;
    
    const business = this.businesses.get(deal.businessId);
    if (!business) return undefined;
    
    return { ...deal, business };
  }

  async getDealsByBusiness(businessId: number): Promise<Deal[]> {
    return Array.from(this.deals.values()).filter(
      (deal) => deal.businessId === businessId,
    );
  }

  async getFeaturedDeals(limit = 10): Promise<(Deal & { business: Business })[]> {
    const featuredDeals = Array.from(this.deals.values())
      .filter((deal) => deal.featured)
      .slice(0, limit);
    
    return Promise.all(featuredDeals.map(async (deal) => {
      const business = this.businesses.get(deal.businessId);
      if (!business) {
        throw new Error(`Business with ID ${deal.businessId} not found`);
      }
      return { ...deal, business };
    }));
  }

  async createDeal(dealData: Omit<InsertDeal, "id" | "createdAt">): Promise<Deal> {
    const id = this.currentDealId++;
    
    const deal: Deal = {
      ...dealData,
      id,
      createdAt: new Date(),
    };
    
    this.deals.set(id, deal);
    return deal;
  }

  async updateDeal(id: number, dealData: Partial<Omit<InsertDeal, "id" | "businessId">>): Promise<Deal> {
    const deal = this.deals.get(id);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const updatedDeal: Deal = {
      ...deal,
      ...dealData,
    };
    
    this.deals.set(id, updatedDeal);
    return updatedDeal;
  }

  async deleteDeal(id: number): Promise<void> {
    if (!this.deals.has(id)) {
      throw new Error("Deal not found");
    }
    
    this.deals.delete(id);
    
    // Clean up related records
    const favorites = Array.from(this.userFavorites.values())
      .filter(favorite => favorite.dealId === id);
    
    favorites.forEach(favorite => {
      this.userFavorites.delete(favorite.id);
    });
    
    const redemptions = Array.from(this.dealRedemptions.values())
      .filter(redemption => redemption.dealId === id);
    
    redemptions.forEach(redemption => {
      this.dealRedemptions.delete(redemption.id);
    });
    
    // Clean up any approvals
    const approvals = Array.from(this.dealApprovals.values())
      .filter(approval => approval.dealId === id);
      
    approvals.forEach(approval => {
      this.dealApprovals.delete(approval.id);
    });
  }
  
  async updateDealStatus(id: number, status: string): Promise<Deal> {
    const deal = this.deals.get(id);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const updatedDeal: Deal = {
      ...deal,
      status,
      updatedAt: new Date(),
    };
    
    this.deals.set(id, updatedDeal);
    return updatedDeal;
  }
  
  async duplicateDeal(dealId: number): Promise<Deal> {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const id = this.currentDealId++;
    const newDeal: Deal = {
      ...deal,
      id,
      title: `${deal.title} (Copy)`,
      createdAt: new Date(),
      status: 'draft',
      viewCount: 0,
      saveCount: 0,
      redemptionCount: 0,
    };
    
    this.deals.set(id, newDeal);
    return newDeal;
  }
  
  async incrementDealViews(dealId: number): Promise<Deal> {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const updatedDeal: Deal = {
      ...deal,
      viewCount: (deal.viewCount || 0) + 1,
    };
    
    this.deals.set(dealId, updatedDeal);
    return updatedDeal;
  }
  
  async incrementDealSaves(dealId: number): Promise<Deal> {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const updatedDeal: Deal = {
      ...deal,
      saveCount: (deal.saveCount || 0) + 1,
    };
    
    this.deals.set(dealId, updatedDeal);
    return updatedDeal;
  }
  
  async incrementDealRedemptions(dealId: number): Promise<Deal> {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const updatedDeal: Deal = {
      ...deal,
      redemptionCount: (deal.redemptionCount || 0) + 1,
    };
    
    this.deals.set(dealId, updatedDeal);
    return updatedDeal;
  }
  
  async getDealsByStatus(status: string): Promise<(Deal & { business: Business & { logoUrl?: string } })[]> {
    console.log(`STORAGE: Getting deals with status "${status}"`);
    
    // Get all deals and log their statuses for debugging
    const allDeals = Array.from(this.deals.values());
    const statuses = allDeals.map(deal => deal.status);
    const statusCounts = statuses.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`STORAGE: Deal status counts: ${JSON.stringify(statusCounts)}`);
    
    // Filter deals by requested status
    const filteredDeals = allDeals.filter(deal => {
      const matches = deal.status === status;
      if (status === 'pending') {
        console.log(`STORAGE: Deal ID ${deal.id}, status: "${deal.status}", matches pending: ${matches}`);
      }
      return matches;
    });
    
    console.log(`STORAGE: Found ${filteredDeals.length} deals with status "${status}"`);
    
    // Add business data to each deal with logoUrl for frontend compatibility
    return Promise.all(filteredDeals.map(async (deal) => {
      const business = this.businesses.get(deal.businessId);
      if (!business) {
        throw new Error(`Business with ID ${deal.businessId} not found`);
      }
      return { 
        ...deal, 
        business: {
          ...business,
          // Ensure logoUrl exists for front-end compatibility
          logoUrl: business.imageUrl
        }
      };
    }));
  }
  
  // Deal Approval methods
  async createDealApproval(approvalData: Omit<InsertDealApproval, "id" | "submittedAt">): Promise<DealApproval> {
    const deal = this.deals.get(approvalData.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const id = this.currentDealApprovalId++;
    const approval: DealApproval = {
      ...approvalData,
      id,
      submittedAt: new Date(),
      status: approvalData.status || "pending",
    };
    
    this.dealApprovals.set(id, approval);
    return approval;
  }
  
  async getDealApproval(dealId: number): Promise<DealApproval | undefined> {
    return Array.from(this.dealApprovals.values())
      .find(approval => approval.dealId === dealId && approval.status === "pending");
  }
  
  async getDealApprovalHistory(dealId: number): Promise<DealApproval[]> {
    return Array.from(this.dealApprovals.values())
      .filter(approval => approval.dealId === dealId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }
  
  async updateDealApproval(id: number, status: string, reviewerId?: number, feedback?: string): Promise<DealApproval> {
    const approval = this.dealApprovals.get(id);
    if (!approval) {
      throw new Error("Deal approval not found");
    }
    
    const updatedApproval: DealApproval = {
      ...approval,
      status,
      reviewerId,
      reviewedAt: new Date(),
      feedback: feedback || approval.feedback,
    };
    
    this.dealApprovals.set(id, updatedApproval);
    
    // Update the deal status if approval is accepted or rejected
    if (status === "approved" || status === "rejected") {
      const dealStatus = status === "approved" ? "active" : "rejected";
      await this.updateDealStatus(approval.dealId, dealStatus);
    }
    
    return updatedApproval;
  }
  
  // Additional deal redemption methods
  async getDealRedemptions(dealId: number): Promise<DealRedemption[]> {
    return Array.from(this.dealRedemptions.values())
      .filter(redemption => redemption.dealId === dealId);
  }
  
  async verifyRedemptionCode(dealId: number, code: string): Promise<boolean> {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    return deal.redemptionCode === code;
  }
  
  // User favorites methods
  async getUserFavorites(userId: number): Promise<(UserFavorite & { deal: Deal & { business: Business } })[]> {
    const favorites = Array.from(this.userFavorites.values())
      .filter(favorite => favorite.userId === userId);
    
    return Promise.all(favorites.map(async (favorite) => {
      const deal = await this.getDeal(favorite.dealId);
      if (!deal) {
        throw new Error(`Deal with ID ${favorite.dealId} not found`);
      }
      return { ...favorite, deal };
    }));
  }

  async addUserFavorite(userId: number, dealId: number): Promise<UserFavorite> {
    // Check if already favorited
    const existingFavorite = Array.from(this.userFavorites.values())
      .find(fav => fav.userId === userId && fav.dealId === dealId);
    
    if (existingFavorite) {
      return existingFavorite;
    }
    
    // Check if user and deal exist
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const id = this.currentUserFavoriteId++;
    const favorite: UserFavorite = {
      id,
      userId,
      dealId,
      createdAt: new Date(),
    };
    
    this.userFavorites.set(id, favorite);
    return favorite;
  }

  async removeUserFavorite(userId: number, dealId: number): Promise<void> {
    const favorite = Array.from(this.userFavorites.values())
      .find(fav => fav.userId === userId && fav.dealId === dealId);
    
    if (!favorite) {
      throw new Error("Favorite not found");
    }
    
    this.userFavorites.delete(favorite.id);
  }
  
  // Deal redemption methods
  async getUserRedemptions(userId: number): Promise<(DealRedemption & { deal: Deal & { business: Business } })[]> {
    const redemptions = Array.from(this.dealRedemptions.values())
      .filter(redemption => redemption.userId === userId);
    
    return Promise.all(redemptions.map(async (redemption) => {
      const deal = await this.getDeal(redemption.dealId);
      if (!deal) {
        throw new Error(`Deal with ID ${redemption.dealId} not found`);
      }
      return { ...redemption, deal };
    }));
  }

  async createRedemption(userId: number, dealId: number): Promise<DealRedemption> {
    // Check if user and deal exist
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    const id = this.currentDealRedemptionId++;
    const redemption: DealRedemption = {
      id,
      userId,
      dealId,
      redeemedAt: new Date(),
      status: "redeemed",
    };
    
    this.dealRedemptions.set(id, redemption);
    return redemption;
  }

  async updateRedemptionStatus(id: number, status: string): Promise<DealRedemption> {
    const redemption = this.dealRedemptions.get(id);
    if (!redemption) {
      throw new Error("Redemption not found");
    }
    
    const updatedRedemption: DealRedemption = {
      ...redemption,
      status,
    };
    
    this.dealRedemptions.set(id, updatedRedemption);
    return updatedRedemption;
  }
  
  // User notification preferences methods
  async getUserNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined> {
    return Array.from(this.userNotificationPreferences.values())
      .find(pref => pref.userId === userId);
  }
  
  async getNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined> {
    // This is an alias for getUserNotificationPreferences
    return this.getUserNotificationPreferences(userId);
  }

  async createUserNotificationPreferences(preferencesData: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    const id = this.currentUserNotificationPreferencesId++;
    
    const preferences: UserNotificationPreferences = {
      ...preferencesData,
      id,
    };
    
    this.userNotificationPreferences.set(id, preferences);
    return preferences;
  }

  async updateUserNotificationPreferences(userId: number, preferencesData: Partial<Omit<InsertUserNotificationPreferences, "id" | "userId">>): Promise<UserNotificationPreferences> {
    let preferences = await this.getUserNotificationPreferences(userId);
    
    if (!preferences) {
      // Create new preferences if they don't exist
      preferences = await this.createUserNotificationPreferences({
        userId,
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        weeklyNewsletter: true,
        ...preferencesData,
      });
      return preferences;
    }
    
    // Update existing preferences
    const updatedPreferences: UserNotificationPreferences = {
      ...preferences,
      ...preferencesData,
    };
    
    this.userNotificationPreferences.set(preferences.id, updatedPreferences);
    return updatedPreferences;
  }
  
  async updateNotificationPreferences(userId: number, preferencesData: Partial<Omit<InsertUserNotificationPreferences, "id" | "userId">>): Promise<UserNotificationPreferences> {
    // This is an alias for updateUserNotificationPreferences
    return this.updateUserNotificationPreferences(userId, preferencesData);
  }

  // Redemption rating methods
  async createRedemptionRating(redemptionId: number, userId: number, dealId: number, businessId: number, ratingData: RatingData): Promise<RedemptionRating> {
    // Check if a rating already exists for this redemption
    const existingRating = await this.getRedemptionRating(redemptionId);
    if (existingRating) {
      throw new Error("Rating already exists for this redemption");
    }
    
    // Create a new rating
    const id = this.currentRedemptionRatingId++;
    const rating: RedemptionRating = {
      id,
      redemptionId,
      userId,
      dealId,
      businessId,
      rating: ratingData.rating,
      comment: ratingData.comment || null,
      createdAt: new Date(),
      anonymous: ratingData.anonymous || false
    };
    
    this.redemptionRatings.set(id, rating);
    return rating;
  }
  
  async getRedemptionRating(redemptionId: number): Promise<RedemptionRating | undefined> {
    return Array.from(this.redemptionRatings.values()).find(
      (rating) => rating.redemptionId === redemptionId
    );
  }
  
  async getUserRatings(userId: number): Promise<(RedemptionRating & { deal: Deal, business: Business })[]> {
    const ratings = Array.from(this.redemptionRatings.values()).filter(
      (rating) => rating.userId === userId
    );
    
    return ratings.map(rating => {
      const deal = this.deals.get(rating.dealId)!;
      const business = this.businesses.get(rating.businessId)!;
      return {
        ...rating,
        deal,
        business
      };
    });
  }
  
  async getBusinessRatings(businessId: number): Promise<RedemptionRating[]> {
    return Array.from(this.redemptionRatings.values()).filter(
      (rating) => rating.businessId === businessId
    );
  }
  
  async getBusinessRatingSummary(businessId: number): Promise<{ averageRating: number, totalRatings: number, ratingCounts: Record<number, number> }> {
    const ratings = await this.getBusinessRatings(businessId);
    
    // Initialize the rating counts object
    const ratingCounts: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    
    // Calculate the total ratings and the sum of all ratings
    let totalRatings = 0;
    let sumRatings = 0;
    
    ratings.forEach(rating => {
      totalRatings++;
      sumRatings += rating.rating;
      ratingCounts[rating.rating]++;
    });
    
    // Calculate the average rating
    const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
    
    return {
      averageRating,
      totalRatings,
      ratingCounts
    };
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Make email lookup case-insensitive to avoid login issues with different case
    const normalizedEmail = email.toLowerCase();
    
    // Use SQL LOWER function for case-insensitive comparison
    const [user] = await db.select().from(users).where(
      sql`LOWER(${users.email}) = LOWER(${normalizedEmail})`
    );
    
    return user || undefined;
  }

  async getUserWithBusiness(userId: number): Promise<(User & { business?: Business }) | undefined> {
    const user = await this.getUser(userId);
    if (!user) {
      return undefined;
    }

    if (user.userType === "business") {
      const business = await this.getBusinessByUserId(userId);
      return {
        ...user,
        business
      };
    }

    return user;
  }

  async createIndividualUser(userData: Omit<InsertUser, "userType" | "username">): Promise<User> {
    // Generate username from email
    const username = userData.email.split('@')[0];
    
    const [user] = await db.insert(users)
      .values({
        ...userData,
        username,
        userType: "individual",
        password: hashPassword(userData.password)
      })
      .returning();
    
    return user;
  }

  async createBusinessUser(userData: Omit<InsertUser, "userType" | "username">, businessData: Omit<InsertBusiness, "userId">): Promise<User & { business: Business }> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Create the user first
      const [user] = await tx.insert(users)
        .values({
          ...userData,
          username: userData.email.split('@')[0],
          userType: "business",
          password: hashPassword(userData.password)
        })
        .returning();
      
      // Then create the business with default 'pending' verification status if not set
      const [business] = await tx.insert(businesses)
        .values({
          ...businessData,
          userId: user.id,
          // Always ensure we have a default verificationStatus of 'pending' 
          // if one is not explicitly provided
          verificationStatus: businessData.verificationStatus || 'pending'
        })
        .returning();
      
      return {
        ...user,
        business
      };
    });
  }

  private async createBusiness(businessData: Omit<InsertBusiness, "id">): Promise<Business> {
    const [business] = await db.insert(businesses)
      .values({
        ...businessData,
        // Always ensure there's a default verificationStatus
        verificationStatus: businessData.verificationStatus || 'pending'
      })
      .returning();
    
    return business;
  }

  async verifyLogin(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      return null;
    }
    
    if (bcrypt.compareSync(password, user.password)) {
      return user;
    }
    
    return null;
  }

  async updateUser(userId: number, userData: Partial<Omit<InsertUser, "id" | "password">>): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      throw new Error("Current password is incorrect");
    }
    
    await db.update(users)
      .set({ password: hashPassword(newPassword) })
      .where(eq(users.id, userId));
    
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  // Password reset methods implementation
  async createPasswordResetToken(email: string, clientInfo?: { ipAddress?: string, userAgent?: string }): Promise<{ token: string, user: User } | null> {
    // 1. Find the user by email
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }
    
    // 2. Generate a secure random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // 3. Set expiration time (usually 1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    // 4. Delete any existing tokens for this user to prevent token pollution
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));
    
    // 5. Store the new token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: token,
      expiresAt: expiresAt,
      ipAddress: clientInfo?.ipAddress || null,
      userAgent: clientInfo?.userAgent || null
    });
    
    return { token, user };
  }
  
  async validatePasswordResetToken(token: string): Promise<User | null> {
    // 1. Find the token and ensure it's not expired or used
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        sql`${passwordResetTokens.expiresAt} > NOW()`,
        sql`${passwordResetTokens.usedAt} IS NULL`
      ));
    
    if (!resetToken) {
      return null; // Token not found, expired, or already used
    }
    
    // 2. Get the associated user
    const user = await this.getUser(resetToken.userId);
    
    return user || null;
  }
  
  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    // 1. Find and validate the token
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        sql`${passwordResetTokens.expiresAt} > NOW()`,
        sql`${passwordResetTokens.usedAt} IS NULL`
      ));
    
    if (!resetToken) {
      return false; // Token not found, expired, or already used
    }
    
    // 2. Update the user's password
    await db.update(users)
      .set({ password: hashPassword(newPassword) })
      .where(eq(users.id, resetToken.userId));
    
    // 3. Mark the token as used
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));
    
    return true;
  }

  async adminCreateUser(userData: Omit<InsertUser, "id">, password: string): Promise<User> {
    // Generate username from email if not provided
    const username = userData.username || userData.email.split('@')[0];
    
    const [user] = await db.insert(users)
      .values({
        ...userData,
        username,
        password: hashPassword(password)
      })
      .returning();
    
    return user;
  }

  async adminUpdateUser(userId: number, userData: Partial<Omit<InsertUser, "id">>): Promise<User> {
    // If password is provided, hash it
    if (userData.password) {
      userData.password = hashPassword(userData.password);
    }
    
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("User not found");
    }
    
    return updatedUser;
  }

  async adminDeleteUser(userId: number): Promise<boolean> {
    // Check if user exists
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Start a transaction to delete the user and related data
    await db.transaction(async (tx) => {
      // If it's a business user, delete the business first
      if (user.userType === "business") {
        const business = await this.getBusinessByUserId(userId);
        if (business) {
          // Delete related business data first
          await tx.delete(businessHours).where(eq(businessHours.businessId, business.id));
          await tx.delete(businessSocial).where(eq(businessSocial.businessId, business.id));
          await tx.delete(businessDocuments).where(eq(businessDocuments.businessId, business.id));
          
          // Get all deals by this business
          const businessDeals = await tx.select({ id: deals.id })
            .from(deals)
            .where(eq(deals.businessId, business.id));
          
          // Delete deal-related data
          for (const deal of businessDeals) {
            await tx.delete(dealApprovals).where(eq(dealApprovals.dealId, deal.id));
            await tx.delete(dealRedemptions).where(eq(dealRedemptions.dealId, deal.id));
            await tx.delete(userFavorites).where(eq(userFavorites.dealId, deal.id));
          }
          
          // Delete deals
          await tx.delete(deals).where(eq(deals.businessId, business.id));
          
          // Finally delete the business
          await tx.delete(businesses).where(eq(businesses.id, business.id));
        }
      }
      
      // Delete user-related data
      await tx.delete(userNotificationPreferences).where(eq(userNotificationPreferences.userId, userId));
      await tx.delete(userFavorites).where(eq(userFavorites.userId, userId));
      await tx.delete(dealRedemptions).where(eq(dealRedemptions.userId, userId));
      await tx.delete(redemptionRatings).where(eq(redemptionRatings.userId, userId));
      
      // Delete the user
      await tx.delete(users).where(eq(users.id, userId));
    });
    
    return true;
  }

  async adminCreateBusinessUser(userData: Omit<InsertUser, "id">, businessData: Omit<InsertBusiness, "id" | "userId">): Promise<User & { business: Business }> {
    // Create business user
    return this.createBusinessUser(userData, businessData);
  }

  async getAllBusinesses(): Promise<(Business & { user: User })[]> {
    return await db.select()
      .from(businesses)
      .innerJoin(users, eq(businesses.userId, users.id))
      .then(rows => rows.map(row => ({
        ...row.businesses,
        user: row.users
      })));
  }

  async getBusinessesByStatus(status: string): Promise<(Business & { user: User })[]> {
    console.log(`DatabaseStorage.getBusinessesByStatus("${status}") called`);
    
    return await db.select()
      .from(businesses)
      .innerJoin(users, eq(businesses.userId, users.id))
      .where(eq(businesses.verificationStatus, status))
      .then(rows => {
        console.log(`Found ${rows.length} businesses with status "${status}"`);
        return rows.map(row => ({
          ...row.businesses,
          user: row.users
        }));
      });
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async getBusinessByUserId(userId: number): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.userId, userId));
    return business || undefined;
  }

  async updateBusiness(id: number, businessData: Partial<Omit<InsertBusiness, "id" | "userId">>): Promise<Business> {
    const [updatedBusiness] = await db.update(businesses)
      .set(businessData)
      .where(eq(businesses.id, id))
      .returning();
    
    if (!updatedBusiness) {
      throw new Error("Business not found");
    }
    
    return updatedBusiness;
  }

  async updateBusinessVerificationStatus(id: number, status: string, feedback?: string): Promise<Business> {
    const [updatedBusiness] = await db.update(businesses)
      .set({ 
        verificationStatus: status,
        verificationFeedback: feedback 
      })
      .where(eq(businesses.id, id))
      .returning();
    
    if (!updatedBusiness) {
      throw new Error("Business not found");
    }
    
    return updatedBusiness;
  }

  async getBusinessHours(businessId: number): Promise<BusinessHours[]> {
    return await db.select()
      .from(businessHours)
      .where(eq(businessHours.businessId, businessId));
  }

  async addBusinessHours(businessHoursData: Omit<InsertBusinessHours, "id">): Promise<BusinessHours> {
    const [addedHours] = await db.insert(businessHours)
      .values(businessHoursData)
      .returning();
    
    return addedHours;
  }

  async updateBusinessHours(id: number, businessHoursData: Partial<Omit<InsertBusinessHours, "id" | "businessId">>): Promise<BusinessHours> {
    const [updatedHours] = await db.update(businessHours)
      .set(businessHoursData)
      .where(eq(businessHours.id, id))
      .returning();
    
    if (!updatedHours) {
      throw new Error("Business hours not found");
    }
    
    return updatedHours;
  }

  async deleteBusinessHours(id: number): Promise<void> {
    await db.delete(businessHours).where(eq(businessHours.id, id));
  }

  async getBusinessSocialLinks(businessId: number): Promise<BusinessSocial[]> {
    return await db.select()
      .from(businessSocial)
      .where(eq(businessSocial.businessId, businessId));
  }

  async addBusinessSocialLink(socialLinkData: Omit<InsertBusinessSocial, "id">): Promise<BusinessSocial> {
    const [addedLink] = await db.insert(businessSocial)
      .values(socialLinkData)
      .returning();
    
    return addedLink;
  }

  async updateBusinessSocialLink(id: number, socialLinkData: Partial<Omit<InsertBusinessSocial, "id" | "businessId">>): Promise<BusinessSocial> {
    const [updatedLink] = await db.update(businessSocial)
      .set(socialLinkData)
      .where(eq(businessSocial.id, id))
      .returning();
    
    if (!updatedLink) {
      throw new Error("Social media link not found");
    }
    
    return updatedLink;
  }

  async deleteBusinessSocialLink(id: number): Promise<void> {
    await db.delete(businessSocial).where(eq(businessSocial.id, id));
  }

  async getBusinessDocuments(businessId: number): Promise<BusinessDocument[]> {
    return await db.select()
      .from(businessDocuments)
      .where(eq(businessDocuments.businessId, businessId));
  }

  async addBusinessDocument(documentData: Omit<InsertBusinessDocument, "id" | "submittedAt">): Promise<BusinessDocument> {
    const [addedDocument] = await db.insert(businessDocuments)
      .values({
        ...documentData,
        submittedAt: new Date()
      })
      .returning();
    
    return addedDocument;
  }

  async updateBusinessDocumentStatus(id: number, status: string, feedback?: string): Promise<BusinessDocument> {
    const [updatedDocument] = await db.update(businessDocuments)
      .set({ 
        status,
        feedback
      })
      .where(eq(businessDocuments.id, id))
      .returning();
    
    if (!updatedDocument) {
      throw new Error("Document not found");
    }
    
    return updatedDocument;
  }

  async getDeals(userRole: string = 'individual', userId?: number): Promise<(Deal & { business: Business & { logoUrl?: string } })[]> {
    console.log(`STORAGE: Getting deals for user role: ${userRole}, userId: ${userId || 'none'}`);
    
    // Build the base query
    let query = db.select()
      .from(deals)
      .innerJoin(businesses, eq(deals.businessId, businesses.id));
    
    // Apply role-based filtering
    if (userRole === 'individual') {
      // For customers, only return approved or active deals
      query = query.where(
        sql`${deals.status} = 'approved' OR ${deals.status} = 'active'`
      );
    } else if (userRole === 'business' && userId) {
      // For business users, return all their own deals but filter others
      const businessData = await this.getBusinessByUserId(userId);
      if (businessData) {
        const businessId = businessData.id;
        query = query.where(
          sql`(${deals.businessId} = ${businessId}) OR (${deals.status} = 'approved' OR ${deals.status} = 'active')`
        );
      } else {
        // If no business found, default to approved/active only
        query = query.where(
          sql`${deals.status} = 'approved' OR ${deals.status} = 'active'`
        );
      }
    }
    // For admins (default), return all deals without filtering
    
    // Execute the query and format results
    const result = await query;
    
    // Log the status distribution
    const statuses = result.map(row => row.deals.status);
    const statusCounts = statuses.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`STORAGE: Returning deals with status distribution: ${JSON.stringify(statusCounts)}`);
    
    return result.map(row => ({
      ...row.deals,
      business: {
        ...row.businesses,
        // Ensure logoUrl exists for front-end compatibility
        logoUrl: row.businesses.imageUrl
      }
    }));
  }

  async getDeal(id: number): Promise<(Deal & { business: Business & { logoUrl?: string } }) | undefined> {
    const result = await db.select()
      .from(deals)
      .innerJoin(businesses, eq(deals.businessId, businesses.id))
      .where(eq(deals.id, id));
    
    if (result.length === 0) {
      return undefined;
    }
    
    return {
      ...result[0].deals,
      business: {
        ...result[0].businesses,
        // Ensure logoUrl exists for front-end compatibility
        logoUrl: result[0].businesses.imageUrl
      }
    };
  }

  async getDealsByBusiness(businessId: number): Promise<(Deal & { business: Business & { logoUrl?: string } })[]> {
    // First fetch the business to ensure we have the data
    const business = await this.getBusiness(businessId);
    if (!business) {
      return [];
    }
    
    // Add logoUrl property for compatibility with front-end components
    const enhancedBusiness = {
      ...business,
      // Use imageUrl as logoUrl if it exists
      logoUrl: business.imageUrl
    };
    
    // Fetch deals and include the enhanced business object
    const dealsData = await db.select()
      .from(deals)
      .where(eq(deals.businessId, businessId));
    
    // Return deals with the business object included
    return dealsData.map(deal => ({
      ...deal,
      business: enhancedBusiness
    }));
  }

  async getFeaturedDeals(limit = 10, userRole: string = 'individual', userId?: number): Promise<(Deal & { business: Business & { logoUrl?: string } })[]> {
    console.log(`STORAGE: Getting featured deals for user role: ${userRole}, userId: ${userId || 'none'}`);
    
    // Build the base query for featured deals
    let query = db.select()
      .from(deals)
      .innerJoin(businesses, eq(deals.businessId, businesses.id))
      .where(eq(deals.featured, true));
    
    // Apply role-based filtering (same logic as getDeals)
    if (userRole === 'individual') {
      // For customers, only return approved or active deals
      query = query.where(
        sql`(${deals.status} = 'approved' OR ${deals.status} = 'active')`
      );
    } else if (userRole === 'business' && userId) {
      // For business users, return all their own deals but filter others
      const businessData = await this.getBusinessByUserId(userId);
      if (businessData) {
        const businessId = businessData.id;
        query = query.where(
          sql`(${deals.businessId} = ${businessId}) OR (${deals.status} = 'approved' OR ${deals.status} = 'active')`
        );
      } else {
        // If no business found, default to approved/active only
        query = query.where(
          sql`(${deals.status} = 'approved' OR ${deals.status} = 'active')`
        );
      }
    }
    // For admins (default), return all featured deals without filtering
    
    // Apply ordering and limit
    query = query.orderBy(desc(deals.createdAt)).limit(limit);
    
    // Execute the query
    const result = await query;
    
    // Log the status distribution
    const statuses = result.map(row => row.deals.status);
    const statusCounts = statuses.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`STORAGE: Returning featured deals with status distribution: ${JSON.stringify(statusCounts)}`);
    
    return result.map(row => ({
      ...row.deals,
      business: {
        ...row.businesses,
        // Ensure logoUrl exists for front-end compatibility
        logoUrl: row.businesses.imageUrl
      }
    }));
  }

  async createDeal(dealData: Omit<InsertDeal, "id" | "createdAt">): Promise<Deal> {
    // Process date fields to ensure they are proper Date objects
    const processedData = {
      ...dealData,
      startDate: dealData.startDate ? new Date(dealData.startDate) : dealData.startDate,
      endDate: dealData.endDate ? new Date(dealData.endDate) : dealData.endDate,
      createdAt: new Date()
    };
    
    const [addedDeal] = await db.insert(deals)
      .values(processedData)
      .returning();
    
    return addedDeal;
  }

  async updateDeal(id: number, dealData: Partial<Omit<InsertDeal, "id" | "businessId">>): Promise<Deal> {
    // Process date fields if they exist
    const processedData = { ...dealData };
    
    if (processedData.startDate) {
      processedData.startDate = new Date(processedData.startDate);
    }
    
    if (processedData.endDate) {
      processedData.endDate = new Date(processedData.endDate);
    }
    
    const [updatedDeal] = await db.update(deals)
      .set(processedData)
      .where(eq(deals.id, id))
      .returning();
    
    if (!updatedDeal) {
      throw new Error("Deal not found");
    }
    
    return updatedDeal;
  }

  async deleteDeal(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete deal-related data first
      await tx.delete(dealApprovals).where(eq(dealApprovals.dealId, id));
      await tx.delete(dealRedemptions).where(eq(dealRedemptions.dealId, id));
      await tx.delete(userFavorites).where(eq(userFavorites.dealId, id));
      await tx.delete(redemptionRatings).where(eq(redemptionRatings.dealId, id));
      
      // Then delete the deal
      await tx.delete(deals).where(eq(deals.id, id));
    });
  }

  async updateDealStatus(id: number, status: string): Promise<Deal> {
    const [updatedDeal] = await db.update(deals)
      .set({ status })
      .where(eq(deals.id, id))
      .returning();
    
    if (!updatedDeal) {
      throw new Error("Deal not found");
    }
    
    return updatedDeal;
  }

  async duplicateDeal(dealId: number): Promise<Deal> {
    const originalDeal = await db.select().from(deals).where(eq(deals.id, dealId)).then(rows => rows[0]);
    
    if (!originalDeal) {
      throw new Error("Deal not found");
    }
    
    // Ensure dates are proper Date objects
    const startDate = originalDeal.startDate ? new Date(originalDeal.startDate) : null;
    const endDate = originalDeal.endDate ? new Date(originalDeal.endDate) : null;
    
    const [newDeal] = await db.insert(deals)
      .values({
        ...originalDeal,
        id: undefined, // Let the database assign a new ID
        startDate,
        endDate,
        title: `${originalDeal.title} (Copy)`,
        createdAt: new Date(),
        viewCount: 0,
        redemptionCount: 0,
        savedCount: 0
      })
      .returning();
    
    return newDeal;
  }

  async incrementDealViews(dealId: number): Promise<Deal> {
    const [updatedDeal] = await db.update(deals)
      .set({
        viewCount: sql`${deals.viewCount} + 1`
      })
      .where(eq(deals.id, dealId))
      .returning();
    
    if (!updatedDeal) {
      throw new Error("Deal not found");
    }
    
    return updatedDeal;
  }

  async incrementDealSaves(dealId: number): Promise<Deal> {
    const [updatedDeal] = await db.update(deals)
      .set({
        saveCount: sql`${deals.saveCount} + 1`
      })
      .where(eq(deals.id, dealId))
      .returning();
    
    if (!updatedDeal) {
      throw new Error("Deal not found");
    }
    
    return updatedDeal;
  }

  async incrementDealRedemptions(dealId: number): Promise<Deal> {
    const [updatedDeal] = await db.update(deals)
      .set({
        redemptionCount: sql`${deals.redemptionCount} + 1`
      })
      .where(eq(deals.id, dealId))
      .returning();
    
    if (!updatedDeal) {
      throw new Error("Deal not found");
    }
    
    return updatedDeal;
  }

  async getDealsByStatus(status: string): Promise<(Deal & { business: Business & { logoUrl?: string } })[]> {
    console.log(`DEBUG: DatabaseStorage.getDealsByStatus("${status}") called`);
    
    // For debugging - log all possible deals
    const allDeals = await db.select().from(deals);
    const statusCounts = {};
    allDeals.forEach(deal => {
      statusCounts[deal.status] = (statusCounts[deal.status] || 0) + 1;
    });
    console.log(`DEBUG: All deals in the database: ${allDeals.length}`);
    console.log(`DEBUG: Status distribution: ${JSON.stringify(statusCounts)}`);
    
    // The dashboard might show different counts compared to what we filter here
    // This is because 'pending' is shown on dashboard, but stored as different values in DB
    let query;
    if (status === 'pending') {
      // For 'pending' status, we need to catch deals with status 'pending_revision' as well
      query = db.select()
        .from(deals)
        .innerJoin(businesses, eq(deals.businessId, businesses.id))
        .where(sql`${deals.status} = 'pending' OR ${deals.status} = 'pending_revision'`);
      
      console.log('DEBUG: Using OR condition for pending deals to include pending_revision');
    } else {
      // For other statuses, use exact match
      query = db.select()
        .from(deals)
        .innerJoin(businesses, eq(deals.businessId, businesses.id))
        .where(eq(deals.status, status));
    }
    
    // Execute query
    const result = await query;
    console.log(`DEBUG: Query returned ${result.length} deals with status "${status}"`);
    
    // Map to final format
    const mappedResults = result.map(row => ({
      ...row.deals,
      business: {
        ...row.businesses,
        // Ensure logoUrl exists for front-end compatibility
        logoUrl: row.businesses.imageUrl
      }
    }));
    
    console.log(`DEBUG: Returning ${mappedResults.length} deals with status "${status}"`);
    return mappedResults;
  }

  async createDealApproval(approvalData: Omit<InsertDealApproval, "id" | "submittedAt">): Promise<DealApproval> {
    const [addedApproval] = await db.insert(dealApprovals)
      .values({
        ...approvalData,
        submittedAt: new Date()
      })
      .returning();
    
    return addedApproval;
  }

  async getDealApproval(dealId: number): Promise<DealApproval | undefined> {
    const [approval] = await db.select()
      .from(dealApprovals)
      .where(eq(dealApprovals.dealId, dealId))
      .orderBy(desc(dealApprovals.submittedAt))
      .limit(1);
    
    return approval || undefined;
  }

  async getDealApprovalHistory(dealId: number): Promise<DealApproval[]> {
    return await db.select()
      .from(dealApprovals)
      .where(eq(dealApprovals.dealId, dealId))
      .orderBy(desc(dealApprovals.submittedAt));
  }

  async updateDealApproval(id: number, status: string, reviewerId?: number, feedback?: string): Promise<DealApproval> {
    const [updatedApproval] = await db.update(dealApprovals)
      .set({
        status,
        reviewerId,
        feedback,
        reviewedAt: new Date()
      })
      .where(eq(dealApprovals.id, id))
      .returning();
    
    if (!updatedApproval) {
      throw new Error("Approval record not found");
    }
    
    return updatedApproval;
  }

  async getDealRedemptions(dealId: number): Promise<DealRedemption[]> {
    return await db.select()
      .from(dealRedemptions)
      .where(eq(dealRedemptions.dealId, dealId));
  }
  
  async hasUserRedeemedDeal(userId: number, dealId: number): Promise<boolean> {
    const redemptions = await db.select()
      .from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.userId, userId),
        eq(dealRedemptions.dealId, dealId)
      ));
      
    return redemptions.length > 0;
  }
  
  async getUserRedemptionCountForDeal(userId: number, dealId: number): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(dealRedemptions)
      .where(and(
        eq(dealRedemptions.userId, userId),
        eq(dealRedemptions.dealId, dealId)
      ));
      
    return Number(result[0]?.count || 0);
  }

  async verifyRedemptionCode(dealId: number, code: string): Promise<boolean> {
    const deal = await this.getDeal(dealId);
    
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    // Check if the code matches the deal's redemption code
    return deal.redemptionCode === code;
  }

  async getUserFavorites(userId: number): Promise<(UserFavorite & { deal: Deal & { business: Business } })[]> {
    const favorites = await db.select()
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId));
    
    const result: (UserFavorite & { deal: Deal & { business: Business } })[] = [];
    
    for (const favorite of favorites) {
      const dealWithBusiness = await this.getDeal(favorite.dealId);
      
      if (dealWithBusiness) {
        result.push({
          ...favorite,
          deal: dealWithBusiness
        });
      }
    }
    
    return result;
  }

  async addUserFavorite(userId: number, dealId: number): Promise<UserFavorite> {
    // Check if user already has this deal as a favorite
    const existing = await db.select()
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.dealId, dealId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [addedFavorite] = await db.insert(userFavorites)
      .values({
        userId,
        dealId,
        createdAt: new Date()
      })
      .returning();
    
    // Increment saved count on the deal
    await this.incrementDealSaves(dealId);
    
    return addedFavorite;
  }

  async removeUserFavorite(userId: number, dealId: number): Promise<void> {
    await db.delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.dealId, dealId)
      ));
  }

  async getUserRedemptions(userId: number): Promise<(DealRedemption & { deal: Deal & { business: Business } })[]> {
    const redemptions = await db.select()
      .from(dealRedemptions)
      .where(eq(dealRedemptions.userId, userId));
    
    const result: (DealRedemption & { deal: Deal & { business: Business } })[] = [];
    
    for (const redemption of redemptions) {
      const dealWithBusiness = await this.getDeal(redemption.dealId);
      
      if (dealWithBusiness) {
        result.push({
          ...redemption,
          deal: dealWithBusiness
        });
      }
    }
    
    return result;
  }

  async createRedemption(userId: number, dealId: number): Promise<DealRedemption> {
    // Check if the deal exists
    const deal = await this.getDeal(dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    // Check if the deal has a per-user redemption limit
    if (deal.maxRedemptionsPerUser) {
      // Count how many times this user has already redeemed this deal
      const userRedemptions = await db.select({ count: sql`count(*)` })
        .from(dealRedemptions)
        .where(and(
          eq(dealRedemptions.userId, userId),
          eq(dealRedemptions.dealId, dealId)
        ));
      
      const redemptionCount = Number(userRedemptions[0]?.count || 0);
      
      // If user has reached the limit, throw an error
      if (redemptionCount >= deal.maxRedemptionsPerUser) {
        throw new Error(`You have reached the maximum redemption limit (${deal.maxRedemptionsPerUser}) for this deal`);
      }
    }
    
    // Check if the deal has a total redemptions limit
    if (deal.totalRedemptionsLimit) {
      // Count total redemptions for this deal
      const totalRedemptions = await db.select({ count: sql`count(*)` })
        .from(dealRedemptions)
        .where(eq(dealRedemptions.dealId, dealId));
      
      const totalCount = Number(totalRedemptions[0]?.count || 0);
      
      // If the total limit has been reached, throw an error
      if (totalCount >= deal.totalRedemptionsLimit) {
        throw new Error("This deal has reached its maximum total redemptions limit");
      }
    }
    
    // All checks passed, create the redemption
    const [addedRedemption] = await db.insert(dealRedemptions)
      .values({
        userId,
        dealId,
        status: "redeemed",
        redemptionCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        redeemedAt: new Date()
      })
      .returning();
    
    // Increment redemption count on the deal
    await this.incrementDealRedemptions(dealId);
    
    return addedRedemption;
  }

  async updateRedemptionStatus(id: number, status: string): Promise<DealRedemption> {
    const [updatedRedemption] = await db.update(dealRedemptions)
      .set({ status })
      .where(eq(dealRedemptions.id, id))
      .returning();
    
    if (!updatedRedemption) {
      throw new Error("Redemption not found");
    }
    
    return updatedRedemption;
  }

  async getUserNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined> {
    const [preferences] = await db.select()
      .from(userNotificationPreferences)
      .where(eq(userNotificationPreferences.userId, userId));
    
    return preferences || undefined;
  }
  
  async getNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined> {
    // This is an alias for getUserNotificationPreferences
    return this.getUserNotificationPreferences(userId);
  }

  async updateUserNotificationPreferences(userId: number, preferencesData: Partial<Omit<InsertUserNotificationPreferences, "id" | "userId">>): Promise<UserNotificationPreferences> {
    let preferences = await this.getUserNotificationPreferences(userId);
    
    if (!preferences) {
      // Create preferences if they don't exist
      const [newPreferences] = await db.insert(userNotificationPreferences)
        .values({
          userId,
          dealAlerts: preferencesData.dealAlerts ?? false,
          expiringDeals: preferencesData.expiringDeals ?? false,
          newBusinesses: preferencesData.newBusinesses ?? false,
          specialPromotions: preferencesData.specialPromotions ?? false,
          emailNotifications: preferencesData.emailNotifications ?? false,
          pushNotifications: preferencesData.pushNotifications ?? false
        })
        .returning();
      
      return newPreferences;
    }
    
    // Update existing preferences
    const [updatedPreferences] = await db.update(userNotificationPreferences)
      .set(preferencesData)
      .where(eq(userNotificationPreferences.id, preferences.id))
      .returning();
    
    return updatedPreferences;
  }
  
  async updateNotificationPreferences(userId: number, preferencesData: Partial<Omit<InsertUserNotificationPreferences, "id" | "userId">>): Promise<UserNotificationPreferences> {
    // This is an alias for updateUserNotificationPreferences
    return this.updateUserNotificationPreferences(userId, preferencesData);
  }

  async createRedemptionRating(redemptionId: number, userId: number, dealId: number, businessId: number, ratingData: RatingData): Promise<RedemptionRating> {
    const [addedRating] = await db.insert(redemptionRatings)
      .values({
        redemptionId,
        userId,
        dealId,
        businessId,
        rating: ratingData.rating,
        comment: ratingData.comment,
        experienceQuality: ratingData.experienceQuality,
        valueForMoney: ratingData.valueForMoney,
        wouldRecommend: ratingData.wouldRecommend,
        createdAt: new Date()
      })
      .returning();
    
    return addedRating;
  }

  async getRedemptionRating(redemptionId: number): Promise<RedemptionRating | undefined> {
    const [rating] = await db.select()
      .from(redemptionRatings)
      .where(eq(redemptionRatings.redemptionId, redemptionId));
    
    return rating || undefined;
  }

  async getUserRatings(userId: number): Promise<(RedemptionRating & { deal: Deal, business: Business })[]> {
    const ratings = await db.select()
      .from(redemptionRatings)
      .where(eq(redemptionRatings.userId, userId));
    
    const result: (RedemptionRating & { deal: Deal, business: Business })[] = [];
    
    for (const rating of ratings) {
      const [deal] = await db.select().from(deals).where(eq(deals.id, rating.dealId));
      const [business] = await db.select().from(businesses).where(eq(businesses.id, rating.businessId));
      
      if (deal && business) {
        result.push({
          ...rating,
          deal,
          business
        });
      }
    }
    
    return result;
  }

  async getBusinessRatings(businessId: number): Promise<RedemptionRating[]> {
    return await db.select()
      .from(redemptionRatings)
      .where(eq(redemptionRatings.businessId, businessId));
  }

  async getBusinessRatingSummary(businessId: number): Promise<{ averageRating: number, totalRatings: number, ratingCounts: Record<number, number> }> {
    const ratings = await this.getBusinessRatings(businessId);
    
    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }
    
    // Calculate average rating
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = sum / ratings.length;
    
    // Count ratings by value
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    for (const rating of ratings) {
      ratingCounts[rating.rating] = (ratingCounts[rating.rating] || 0) + 1;
    }
    
    return {
      averageRating,
      totalRatings: ratings.length,
      ratingCounts
    };
  }
}

// Use the DatabaseStorage implementation
export const storage = new DatabaseStorage();
