import { 
  users, businesses, deals, userFavorites, dealRedemptions, userNotificationPreferences,
  type User, type InsertUser, type Business, type InsertBusiness, 
  type Deal, type InsertDeal, type UserFavorite, type InsertUserFavorite,
  type DealRedemption, type InsertDealRedemption, 
  type UserNotificationPreferences, type InsertUserNotificationPreferences
} from "@shared/schema";
import crypto from "crypto";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithBusiness(userId: number): Promise<(User & { business?: Business }) | undefined>;
  createIndividualUser(user: Omit<InsertUser, "userType" | "username">): Promise<User>;
  createBusinessUser(user: Omit<InsertUser, "userType" | "username">, business: Omit<InsertBusiness, "userId">): Promise<User & { business: Business }>;
  verifyLogin(email: string, password: string): Promise<User | null>;
  updateUser(userId: number, userData: Partial<Omit<InsertUser, "id" | "password">>): Promise<User>;

  // Deal methods
  getDeals(): Promise<(Deal & { business: Business })[]>;
  getDeal(id: number): Promise<(Deal & { business: Business }) | undefined>;
  getDealsByBusiness(businessId: number): Promise<Deal[]>;
  getFeaturedDeals(limit?: number): Promise<(Deal & { business: Business })[]>;
  createDeal(deal: Omit<InsertDeal, "id" | "createdAt">): Promise<Deal>;
  updateDeal(id: number, dealData: Partial<Omit<InsertDeal, "id" | "businessId">>): Promise<Deal>;
  deleteDeal(id: number): Promise<void>;
  
  // User favorites methods
  getUserFavorites(userId: number): Promise<(UserFavorite & { deal: Deal & { business: Business } })[]>;
  addUserFavorite(userId: number, dealId: number): Promise<UserFavorite>;
  removeUserFavorite(userId: number, dealId: number): Promise<void>;
  
  // Deal redemption methods
  getUserRedemptions(userId: number): Promise<(DealRedemption & { deal: Deal & { business: Business } })[]>;
  createRedemption(userId: number, dealId: number): Promise<DealRedemption>;
  updateRedemptionStatus(id: number, status: string): Promise<DealRedemption>;
  
  // Notification preferences methods
  getUserNotificationPreferences(userId: number): Promise<UserNotificationPreferences | undefined>;
  updateUserNotificationPreferences(userId: number, preferences: Partial<Omit<InsertUserNotificationPreferences, "id" | "userId">>): Promise<UserNotificationPreferences>;
}

// Hash passwords for storage
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private businesses: Map<number, Business>;
  private deals: Map<number, Deal>;
  private userFavorites: Map<number, UserFavorite>;
  private dealRedemptions: Map<number, DealRedemption>;
  private userNotificationPreferences: Map<number, UserNotificationPreferences>;
  
  private currentUserId: number;
  private currentBusinessId: number;
  private currentDealId: number;
  private currentUserFavoriteId: number;
  private currentDealRedemptionId: number;
  private currentUserNotificationPreferencesId: number;

  constructor() {
    this.users = new Map();
    this.businesses = new Map();
    this.deals = new Map();
    this.userFavorites = new Map();
    this.dealRedemptions = new Map();
    this.userNotificationPreferences = new Map();
    
    this.currentUserId = 1;
    this.currentBusinessId = 1;
    this.currentDealId = 1;
    this.currentUserFavoriteId = 1;
    this.currentDealRedemptionId = 1;
    this.currentUserNotificationPreferencesId = 1;
    
    // Populate with sample data
    this.initializeSampleData();
  }

  // Initialize with sample data
  private async initializeSampleData() {
    // Create some sample users, businesses, and deals if no data exists
    if (this.users.size === 0) {
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
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
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
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const hashedPassword = hashPassword(password);
    if (user.password === hashedPassword) {
      return user;
    }
    
    return null;
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
}

export const storage = new MemStorage();
