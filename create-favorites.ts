import { db } from './server/db';
import { users, deals, userFavorites } from './shared/schema';
import { eq } from 'drizzle-orm';

async function addFavoritesForZiad() {
  console.log("Adding favorites for Ziad's customer account...");
  
  try {
    // Find Ziad's user ID
    const [ziadCustomer] = await db.select()
      .from(users)
      .where(eq(users.email, "ziad@customer.com"));
    
    if (!ziadCustomer) {
      console.error("Ziad's customer account not found!");
      return;
    }
    
    // Get all available deals
    const allDeals = await db.select().from(deals);
    
    if (allDeals.length === 0) {
      console.log("No deals found in the database to add as favorites.");
      return;
    }
    
    // Add each deal as a favorite for Ziad
    for (const deal of allDeals) {
      await db.insert(userFavorites)
        .values({
          userId: ziadCustomer.id,
          dealId: deal.id,
          createdAt: new Date()
        });
    }
    
    console.log(`Added ${allDeals.length} deals as favorites for Ziad's customer account.`);
    
  } catch (error) {
    console.error("Error adding favorites:", error);
  } finally {
    process.exit();
  }
}

addFavoritesForZiad();