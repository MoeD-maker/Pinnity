import { db } from './server/db';
import { users, businesses, deals } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

// Hash passwords for storage
function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

async function createPendingTestData() {
  console.log("Creating pending test data...");
  
  try {
    // Generate a timestamp to create unique usernames and emails
    const timestamp = Date.now();
    
    // 1. Create pending vendor account
    const [pendingVendor] = await db.insert(users)
      .values({
        username: `pending_vendor_${timestamp}`,
        email: `pending${timestamp}@vendor.com`,
        password: hashPassword("Pending123!"),
        firstName: "Pending",
        lastName: "Vendor",
        phone: "555-777-8888",
        address: "300 Pending St, Anytown, USA",
        userType: "business"
      })
      .returning();
    
    console.log("Pending vendor account created:", pendingVendor.email);
    
    // Create pending business
    const [pendingBusiness] = await db.insert(businesses)
      .values({
        userId: pendingVendor.id,
        businessName: `Pending Business ${timestamp}`,
        businessCategory: "services",
        description: "A pending business awaiting approval",
        address: "300 Pending St, Anytown, USA",
        latitude: 37.7861,
        longitude: -122.4097,
        phone: "555-777-8888",
        website: "www.pendingbusiness.com",
        imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        governmentId: "placeholder",
        proofOfAddress: "placeholder",
        proofOfBusiness: "placeholder",
        verificationStatus: "pending" // Explicitly set to "pending"
      })
      .returning();
    
    console.log("Pending business created:", pendingBusiness.businessName);
    
    // Create pending deals
    const today = new Date();
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    // Create pending deals for the verified vendor (Ziad)
    // First get Ziad's business
    const [ziadVendor] = await db.select()
      .from(users)
      .where(eq(users.email, "ziad@vendor.com"));
    
    if (ziadVendor) {
      const [ziadBusiness] = await db.select()
        .from(businesses)
        .where(eq(businesses.userId, ziadVendor.id));
      
      if (ziadBusiness) {
        // Create pending deals
        const [pendingDeal1] = await db.insert(deals)
          .values({
            businessId: ziadBusiness.id,
            title: "New Pending Deal 1",
            description: "This is a pending deal awaiting approval",
            category: "Retail",
            imageUrl: "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
            startDate: today,
            endDate: oneMonthFromNow,
            terms: "Some terms and conditions apply",
            discount: "15%",
            dealType: "percent_off",
            featured: false,
            redemptionCode: "PENDING15",
            status: "pending", // Explicitly set to "pending"
            maxRedemptionsPerUser: 1,
            totalRedemptionsLimit: 50,
            redemptionInstructions: "Show the code at checkout."
          })
          .returning();
        
        console.log(`Created pending deal: ${pendingDeal1.title}`);
        
        const [pendingDeal2] = await db.insert(deals)
          .values({
            businessId: ziadBusiness.id,
            title: "New Pending Deal 2",
            description: "Another pending deal awaiting approval",
            category: "Food & Dining",
            imageUrl: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
            startDate: today,
            endDate: oneMonthFromNow,
            terms: "Some terms and conditions apply",
            discount: "Free Item",
            dealType: "free_item",
            featured: false,
            redemptionCode: "PENDINGFREE",
            status: "pending", // Explicitly set to "pending"
            maxRedemptionsPerUser: 1,
            totalRedemptionsLimit: 30,
            redemptionInstructions: "Show the code at checkout."
          })
          .returning();
        
        console.log(`Created pending deal: ${pendingDeal2.title}`);
      }
    }
    
    console.log("Pending test data created successfully!");
  } catch (error) {
    console.error("Error creating pending test data:", error);
  } finally {
    process.exit();
  }
}

createPendingTestData();