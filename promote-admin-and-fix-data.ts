import { db } from './server/db';
import { users, deals, businesses } from './shared/schema';
import { eq, isNull } from 'drizzle-orm';

async function promoteAdminAndFixData() {
  console.log("🔧 Promoting admin@test.com to real admin and fixing pending data...");

  // 1. Promote admin@test.com
  await db.update(users)
    .set({ userType: 'admin' })
    .where(eq(users.email, 'admin@test.com'));

  console.log("✅ admin@test.com is now an admin.");

  // 2. Set null deal statuses to 'pending'
  const updatedDeals = await db.update(deals)
    .set({ status: 'pending' })
    .where(isNull(deals.status));

  console.log("✅ All deals without status have been set to 'pending'.");

  // 3. Set null verification statuses to 'pending'
  const updatedVendors = await db.update(businesses)
    .set({ verificationStatus: 'pending' })
    .where(isNull(businesses.verificationStatus));

  console.log("✅ All businesses without verificationStatus have been set to 'pending'.");
}

promoteAdminAndFixData().catch((err) => {
  console.error("❌ Error promoting admin or fixing data:", err);
});