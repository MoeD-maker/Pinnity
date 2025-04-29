import { db } from './server/db';
import { deals, businesses, users, dealApprovals, type Deal } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * This diagnostic script checks and fixes issues with admin-created deals
 * by examining the database directly and fixing inconsistencies
 */
async function diagnoseDealIssues() {
  console.log("=========== DEAL DIAGNOSTIC TOOL ===========");
  console.log("Checking database for issues with deals...");
  
  try {
    // Get all deals
    const allDeals = await db.select().from(deals);
    console.log(`Total deals in database: ${allDeals.length}`);
    
    // Count deals by status
    const statusCount = {};
    allDeals.forEach(deal => {
      statusCount[deal.status] = (statusCount[deal.status] || 0) + 1;
    });
    console.log("Deal status distribution:", statusCount);
    
    // Get all businesses
    const allBusinesses = await db.select().from(businesses);
    console.log(`Total businesses in database: ${allBusinesses.length}`);
    
    // Get all deal approvals
    const allApprovals = await db.select().from(dealApprovals);
    console.log(`Total deal approvals in database: ${allApprovals.length}`);
    
    // Check for deals without approvals (if they're in pending status)
    const pendingDeals = allDeals.filter(deal => 
      deal.status === 'pending' || deal.status === 'pending_revision'
    );
    
    console.log(`Pending deals: ${pendingDeals.length}`);
    
    // For each pending deal, check if there's an approval record
    const pendingDealsWithoutApprovals = [];
    for (const deal of pendingDeals) {
      const approvalRecord = allApprovals.find(approval => approval.dealId === deal.id);
      if (!approvalRecord) {
        pendingDealsWithoutApprovals.push(deal);
      }
    }
    
    console.log(`Pending deals without approval records: ${pendingDealsWithoutApprovals.length}`);
    
    // Create approval records for deals that don't have them
    if (pendingDealsWithoutApprovals.length > 0) {
      console.log("Creating missing approval records...");
      
      const fixedDeals = [];
      
      for (const deal of pendingDealsWithoutApprovals) {
        try {
          // Get the business owner for this deal
          const business = allBusinesses.find(b => b.id === deal.businessId);
          
          if (!business) {
            console.error(`Business not found for deal ${deal.id}`);
            continue;
          }
          
          // Create an approval record
          const [approval] = await db.insert(dealApprovals)
            .values({
              dealId: deal.id,
              submitterId: business.userId, // Use business owner as submitter
              status: 'pending',
              submittedAt: deal.createdAt || new Date(),
            })
            .returning();
            
          console.log(`Created approval record for deal ${deal.id}`);
          fixedDeals.push(deal.id);
        } catch (error) {
          console.error(`Error creating approval record for deal ${deal.id}:`, error);
        }
      }
      
      console.log(`Fixed ${fixedDeals.length} deals by creating approval records`);
    }
    
    // Check for missing verificationStatus fields on businesses
    const businessesWithoutStatus = allBusinesses.filter(b => !b.verificationStatus);
    console.log(`Businesses without verificationStatus: ${businessesWithoutStatus.length}`);
    
    if (businessesWithoutStatus.length > 0) {
      console.log("Fixing businesses without verificationStatus...");
      
      const fixedBusiness = [];
      for (const business of businessesWithoutStatus) {
        try {
          // Update the business with a default status
          await db.update(businesses)
            .set({ verificationStatus: 'approved' })
            .where(eq(businesses.id, business.id));
            
          console.log(`Fixed business ${business.id} by setting verificationStatus to 'approved'`);
          fixedBusiness.push(business.id);
        } catch (error) {
          console.error(`Error fixing business ${business.id}:`, error);
        }
      }
      
      console.log(`Fixed ${fixedBusiness.length} businesses by setting verificationStatus`);
    }
    
    // Check if approvals are properly linked to deals
    const potentialOrphanedApprovals = [];
    for (const approval of allApprovals) {
      const deal = allDeals.find(d => d.id === approval.dealId);
      if (!deal) {
        potentialOrphanedApprovals.push(approval);
      }
    }
    
    console.log(`Potentially orphaned approvals: ${potentialOrphanedApprovals.length}`);
    
    // Final diagnostic
    console.log("\n=========== DIAGNOSTIC SUMMARY ===========");
    console.log(`Total deals: ${allDeals.length}`);
    console.log(`Pending deals: ${pendingDeals.length}`);
    console.log(`Fixed deals: ${pendingDealsWithoutApprovals.length > 0 ? pendingDealsWithoutApprovals.length : "None needed"}`);
    console.log(`Fixed businesses: ${businessesWithoutStatus.length > 0 ? businessesWithoutStatus.length : "None needed"}`);
    console.log(`Orphaned approvals: ${potentialOrphanedApprovals.length > 0 ? potentialOrphanedApprovals.length : "None found"}`);
    
  } catch (error) {
    console.error("Error during diagnostic:", error);
  }
}

diagnoseDealIssues()
  .then(() => {
    console.log("Diagnostic completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("Fatal error in diagnostic:", error);
    process.exit(1);
  });