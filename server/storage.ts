import { users, businesses, type User, type InsertUser, type Business, type InsertBusiness } from "@shared/schema";
import crypto from "crypto";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithBusiness(userId: number): Promise<(User & { business?: Business }) | undefined>;
  createIndividualUser(user: Omit<InsertUser, "userType">): Promise<User>;
  createBusinessUser(user: Omit<InsertUser, "userType">, business: Omit<InsertBusiness, "userId">): Promise<User & { business: Business }>;
  verifyLogin(email: string, password: string): Promise<User | null>;
}

// Hash passwords for storage
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private businesses: Map<number, Business>;
  private currentUserId: number;
  private currentBusinessId: number;

  constructor() {
    this.users = new Map();
    this.businesses = new Map();
    this.currentUserId = 1;
    this.currentBusinessId = 1;
  }

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

  async createIndividualUser(userData: Omit<InsertUser, "userType">): Promise<User> {
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
    };
    
    this.users.set(id, user);
    return user;
  }

  async createBusinessUser(userData: Omit<InsertUser, "userType">, businessData: Omit<InsertBusiness, "userId">): Promise<User & { business: Business }> {
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
    };
    
    const businessId = this.currentBusinessId++;
    const business: Business = {
      ...businessData,
      id: businessId,
      userId,
    };
    
    this.users.set(userId, user);
    this.businesses.set(businessId, business);
    
    return { ...user, business };
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
}

export const storage = new MemStorage();
