import { db } from './server/db';
import { users, deals, userFavorites, businesses } from './shared/schema';
import { eq } from 'drizzle-orm';

async function addNewDealsToZiadFavorites() {
  console.log("Adding Ziad's vendor deals to Ziad's customer favorites...");
  
  try {
    // Find Ziad's customer account
    const [ziadCustomer] = await db.select()
      .from(users)
      .where(eq(users.email, "ziad@customer.com"));
    
    if (!ziadCustomer) {
      console.error("Ziad's customer account not found!");
      return;
    }
    
    // Find Ziad's vendor business
    const [ziadVendor] = await db.select()
      .from(users)
      .where(eq(users.email, "ziad@vendor.com"));
    
    if (!ziadVendor) {
      console.error("Ziad's vendor account not found!");
      return;
    }
    
    // Get deals from Ziad's vendor business
    const [ziadBusiness] = await db.select()
      .from(businesses)
      .where(eq(businesses.userId, ziadVendor.id));
    
    if (!ziadBusiness) {
      console.error("Ziad's business not found!");
      return;
    }
    
    // Get deals by business ID
    const ziadBusinessDeals = await db.select()
      .from(deals)
      .where(eq(deals.businessId, ziadBusiness.id));
    
    // Add each deal as a favorite for Ziad's customer account
    for (const deal of ziadBusinessDeals) {
      await db.insert(userFavorites)
        .values({
          userId: ziadCustomer.id,
          dealId: deal.id,
          createdAt: new Date()
        });
      
      console.log(`Added deal '${deal.title}' to Ziad's customer favorites.`);
    }
    
    console.log(`Added ${ziadBusinessDeals.length} deals to Ziad's customer favorites.`);
    
  } catch (error) {
    console.error("Error adding favorites:", error);
  } finally {
    process.exit();
  }
}

addNewDealsToZiadFavorites();