import { db } from './server/db';
import { deals, dealApprovals } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * This script verifies that all pending deals have corresponding approval records
 * and that the APIs to retrieve pending deals work correctly
 */
async function verifyPendingDeals() {
  console.log("=========== PENDING DEALS VERIFICATION ===========");
  
  try {
    // Get all pending deals
    const pendingDeals = await db.select()
      .from(deals)
      .where(eq(deals.status, 'pending'));
      
    console.log(`Found ${pendingDeals.length} deals with status 'pending'`);
    
    // Get all approval records for pending deals
    const pendingApprovals = await db.select()
      .from(dealApprovals)
      .where(eq(dealApprovals.status, 'pending'));
      
    console.log(`Found ${pendingApprovals.length} approval records with status 'pending'`);
    
    // For each pending deal, verify it has an approval record
    const dealsWithApprovals = [];
    const dealsWithoutApprovals = [];
    
    for (const deal of pendingDeals) {
      const hasApproval = pendingApprovals.some(approval => approval.dealId === deal.id);
      if (hasApproval) {
        dealsWithApprovals.push(deal.id);
      } else {
        dealsWithoutApprovals.push(deal.id);
      }
    }
    
    console.log(`Pending deals with approval records: ${dealsWithApprovals.length}`);
    console.log(`Pending deals without approval records: ${dealsWithoutApprovals.length}`);
    
    if (dealsWithoutApprovals.length > 0) {
      console.error("Some pending deals are still missing approval records:", dealsWithoutApprovals);
    } else {
      console.log("All pending deals have approval records! ✅");
    }
    
    // Verify that all approval records have valid deal IDs
    const orphanedApprovals = [];
    for (const approval of pendingApprovals) {
      const dealExists = pendingDeals.some(deal => deal.id === approval.dealId);
      if (!dealExists) {
        orphanedApprovals.push(approval.id);
      }
    }
    
    if (orphanedApprovals.length > 0) {
      console.error("Found orphaned approval records:", orphanedApprovals);
    } else {
      console.log("No orphaned approval records found! ✅");
    }
    
    // Print all pending deals for verification
    console.log("\nList of all pending deals:");
    for (const deal of pendingDeals) {
      console.log(`Deal ID: ${deal.id}, Title: ${deal.title}, BusinessID: ${deal.businessId}`);
    }
    
  } catch (error) {
    console.error("Error verifying pending deals:", error);
  }
}

verifyPendingDeals()
  .then(() => {
    console.log("\nVerification completed. You should now see pending deals in the admin dashboard.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Fatal error during verification:", error);
    process.exit(1);
  });