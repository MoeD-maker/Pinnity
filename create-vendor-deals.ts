import { db } from './server/db';
import { users, businesses, deals } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createDealsForZiadVendor() {
  console.log("Creating deals for Ziad's vendor account...");
  
  try {
    // Find Ziad's business ID
    const [ziadVendor] = await db.select()
      .from(users)
      .where(eq(users.email, "ziad@vendor.com"));
    
    if (!ziadVendor) {
      console.error("Ziad's vendor account not found!");
      return;
    }
    
    // Get Ziad's business
    const [ziadBusiness] = await db.select()
      .from(businesses)
      .where(eq(businesses.userId, ziadVendor.id));
    
    if (!ziadBusiness) {
      console.error("Ziad's business not found!");
      return;
    }
    
    // Create some deals for the business
    const today = new Date();
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    // Deal 1 - Active deal
    const [deal1] = await db.insert(deals)
      .values({
        businessId: ziadBusiness.id,
        title: "20% Off All Products",
        description: "Get 20% off all products at Ziad's Shop!",
        category: "Retail",
        imageUrl: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        startDate: today,
        endDate: oneMonthFromNow,
        terms: "Cannot be combined with other offers. Limit one per customer.",
        discount: "20%",
        dealType: "percent_off",
        featured: true,
        redemptionCode: "ZIAD20",
        status: "active",
        approvalDate: today,
        maxRedemptionsPerUser: 1,
        totalRedemptionsLimit: 100,
        redemptionInstructions: "Show the code at checkout.",
        viewCount: 15,
        saveCount: 8,
        redemptionCount: 3
      })
      .returning();
    
    // Deal 2 - Pending approval
    const [deal2] = await db.insert(deals)
      .values({
        businessId: ziadBusiness.id,
        title: "Buy One Get One Free",
        description: "Purchase any item and get another one of equal or lesser value for free!",
        category: "Retail",
        imageUrl: "https://images.unsplash.com/photo-1607083207685-57b7fbd53d39?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        startDate: oneWeekFromNow,
        endDate: oneMonthFromNow,
        terms: "Must purchase items of equal or lesser value. Not valid with any other promotion.",
        discount: "BOGO",
        dealType: "buy_one_get_one",
        featured: false,
        redemptionCode: "BOGOFREE",
        status: "pending",
        maxRedemptionsPerUser: 1,
        totalRedemptionsLimit: 50,
        redemptionInstructions: "Present this code at time of purchase."
      })
      .returning();
    
    console.log(`Created active deal: ${deal1.title}`);
    console.log(`Created pending deal: ${deal2.title}`);
    
    console.log("Deals created successfully for Ziad's vendor account!");
    
  } catch (error) {
    console.error("Error creating deals:", error);
  } finally {
    process.exit();
  }
}

createDealsForZiadVendor();