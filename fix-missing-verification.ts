import { eq } from 'drizzle-orm';
import { db } from './server/db';
import { businesses } from './shared/schema';

async function fixMissingVerificationStatus() {
  console.log('🔍 Starting: Fix missing verificationStatus fields for businesses');
  
  try {
    // Find businesses with null or undefined verificationStatus
    const results = await db.select()
      .from(businesses)
      .where(eq(businesses.verificationStatus, null as unknown as string));
    
    console.log(`🔎 Found ${results.length} businesses with missing verificationStatus`);
    
    if (results.length > 0) {
      // Update businesses with missing verificationStatus
      const updateResults = await db.update(businesses)
        .set({ verificationStatus: 'pending' })
        .where(eq(businesses.verificationStatus, null as unknown as string))
        .returning();
      
      console.log(`✅ Updated ${updateResults.length} businesses to 'pending' status`);
      console.log('Updated businesses:', updateResults.map(b => ({ id: b.id, name: b.businessName })));
    } else {
      console.log('✅ All businesses already have a verificationStatus set');
    }
  } catch (error) {
    console.error('❌ Error fixing missing verificationStatus:', error);
  }
}

// Execute the function
fixMissingVerificationStatus()
  .then(() => {
    console.log('🏁 Fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('🚨 Script failed:', error);
    process.exit(1);
  });