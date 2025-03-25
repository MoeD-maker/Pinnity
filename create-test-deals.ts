import { db } from './server/db';
import { users, businesses, deals } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createTestDeals() {
  console.log("Creating a variety of test deals for exploring different view modes...");
  
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

    // Create date ranges
    const today = new Date();
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(today.getMonth() + 1);
    
    const twoMonthsFromNow = new Date(today);
    twoMonthsFromNow.setMonth(today.getMonth() + 2);

    // First let's check how many deals already exist
    const existingDeals = await db.select().from(deals).where(eq(deals.businessId, ziadBusiness.id));
    
    console.log(`Found ${existingDeals.length} existing deals for Ziad's business`);
    
    // Only proceed if there are fewer than 7 deals
    if (existingDeals.length >= 7) {
      console.log("Already have enough test deals. Skipping creation.");
      return;
    }

    // Deal categories for variety
    const categories = ["Food & Dining", "Retail", "Entertainment", "Health & Beauty", "Services"];
    
    // Create a variety of deals to showcase different view modes
    const testDeals = [
      {
        title: "50% Off Premium Coffee",
        description: "Start your morning right with our premium coffee blend for half price!",
        category: "Food & Dining",
        imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        discount: "50%",
        dealType: "percent_off",
        featured: true,
        terms: "Valid for any size coffee. Limit one per customer per day.",
        redemptionCode: "COFFEE50"
      },
      {
        title: "Buy 2 Get 1 Free - Electronics",
        description: "Purchase any two electronics items and get a third item of equal or lesser value free!",
        category: "Retail",
        imageUrl: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        discount: "B2G1",
        dealType: "buy_one_get_one",
        featured: true,
        terms: "Excludes sale items and clearance products. Limited time offer.",
        redemptionCode: "TECH321"
      },
      {
        title: "Free Dessert with Any Entree",
        description: "Enjoy a complimentary dessert with the purchase of any entree.",
        category: "Food & Dining",
        imageUrl: "https://images.unsplash.com/photo-1587314168485-3236d6710a13?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        discount: "Free Item",
        dealType: "free_item",
        featured: false,
        terms: "One dessert per entree purchase. Cannot be combined with other offers.",
        redemptionCode: "SWEETDEAL"
      },
      {
        title: "30% Off Spa Services",
        description: "Treat yourself to some relaxation with 30% off all spa services.",
        category: "Health & Beauty",
        imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        discount: "30%",
        dealType: "percent_off",
        featured: false,
        terms: "Appointment required. 24-hour cancellation notice required.",
        redemptionCode: "RELAX30"
      },
      {
        title: "Movie Night: 2 Tickets for $15",
        description: "Catch the latest blockbuster with our special movie night offer!",
        category: "Entertainment",
        imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        discount: "$15",
        dealType: "fixed_price",
        featured: true,
        terms: "Valid for standard screenings only. Not valid for 3D or IMAX.",
        redemptionCode: "MOVIE215"
      }
    ];
    
    // Add each deal to the database
    for (const dealData of testDeals) {
      const [newDeal] = await db.insert(deals)
        .values({
          businessId: ziadBusiness.id,
          title: dealData.title,
          description: dealData.description,
          category: dealData.category,
          imageUrl: dealData.imageUrl,
          startDate: today,
          endDate: twoMonthsFromNow,
          terms: dealData.terms,
          discount: dealData.discount,
          dealType: dealData.dealType,
          featured: dealData.featured,
          redemptionCode: dealData.redemptionCode,
          status: "active",
          approvalDate: today,
          maxRedemptionsPerUser: 3,
          totalRedemptionsLimit: 100,
          redemptionInstructions: "Show the code at checkout.",
          viewCount: Math.floor(Math.random() * 50),
          saveCount: Math.floor(Math.random() * 15),
          redemptionCount: Math.floor(Math.random() * 10)
        })
        .returning();
      
      console.log(`Created deal: ${newDeal.title}`);
    }
    
    console.log("Test deals created successfully!");
    
  } catch (error) {
    console.error("Error creating test deals:", error);
  } finally {
    process.exit();
  }
}

createTestDeals();