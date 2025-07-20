/**
 * Sync marketing consent data from PostgreSQL profiles to Supabase Auth metadata
 */
import { supabaseAdmin } from './server/supabaseAdmin';
import { pool } from './server/db';

async function syncMarketingConsentToSupabase() {
  console.log('🔄 Starting marketing consent sync to Supabase Auth...');
  
  try {
    // Get all profiles with their marketing consent status
    const profilesQuery = `
      SELECT id, email, marketing_consent, supabase_user_id 
      FROM profiles 
      WHERE supabase_user_id IS NOT NULL
    `;
    
    const profilesResult = await pool.query(profilesQuery);
    const profiles = profilesResult.rows;
    
    console.log(`📊 Found ${profiles.length} profiles to sync`);
    
    for (const profile of profiles) {
      try {
        console.log(`🔄 Syncing marketing consent for ${profile.email}: ${profile.marketing_consent}`);
        
        // Update Supabase Auth user metadata with marketing consent
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          profile.supabase_user_id,
          {
            user_metadata: {
              marketing_consent: profile.marketing_consent
            }
          }
        );
        
        if (error) {
          console.error(`❌ Failed to update Supabase metadata for ${profile.email}:`, error);
          continue;
        }
        
        console.log(`✅ Successfully synced marketing consent for ${profile.email}`);
        
      } catch (error) {
        console.error(`❌ Error syncing ${profile.email}:`, error);
      }
    }
    
    // Verify the sync by checking Supabase users
    console.log('\n📋 Verifying sync results...');
    const { data: supabaseUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list Supabase users:', listError);
      return;
    }
    
    console.log('\n📊 Supabase Auth users with marketing consent:');
    supabaseUsers.users.forEach(user => {
      const marketingConsent = user.user_metadata?.marketing_consent;
      console.log(`  ${user.email}: ${marketingConsent !== undefined ? marketingConsent : 'not set'}`);
    });
    
    console.log('\n✅ Marketing consent sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Marketing consent sync failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the sync
syncMarketingConsentToSupabase();