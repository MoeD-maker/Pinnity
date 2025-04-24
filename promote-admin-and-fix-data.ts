import { db } from './server/db';
import { users, deals, businesses } from './shared/schema';
import { eq, isNull, or, sql } from 'drizzle-orm';

async function runFixes() {
  console.log("🔧 Running data fix for admin visibility...");

  try {
    // 1. Promote admin@test.com to admin
    const adminResult = await db.update(users)
      .set({ userType: 'admin' })
      .where(eq(users.email, 'admin@test.com'));
    
    console.log("✅ Updated admin@test.com to have admin role");

    // 2. Fix deals missing status
    const dealsResult = await db.update(deals)
      .set({ status: 'pending' })
      .where(or(
        isNull(deals.status),
        eq(deals.status, '')
      ));
    
    console.log("✅ Updated deals with missing status to 'pending'");

    // 3. Fix businesses missing verification status
    const businessResult = await db.update(businesses)
      .set({ verificationStatus: 'pending' })
      .where(or(
        isNull(businesses.verificationStatus),
        eq(businesses.verificationStatus, '')
      ));
    
    console.log("✅ Updated businesses with missing verification status to 'pending'");

    // 4. Get counts to verify
    const pendingDeals = await db.select({ count: sql`count(*)` })
      .from(deals)
      .where(eq(deals.status, 'pending'));
    
    const pendingVendors = await db.select({ count: sql`count(*)` })
      .from(businesses)
      .where(eq(businesses.verificationStatus, 'pending'));
    
    console.log(`📊 Data verification: Found ${pendingDeals[0]?.count || 0} pending deals and ${pendingVendors[0]?.count || 0} pending vendors`);
    
    console.log("✅ All fixes applied successfully.");
  } catch (err) {
    console.error("❌ Error applying fixes:", err);
    throw err;
  }
}

runFixes().catch((err) => {
  console.error("❌ Error applying fixes:", err);
});