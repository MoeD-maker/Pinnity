/**
 * Check what's actually stored in Supabase Auth user metadata
 */
import { supabaseAdmin } from './server/supabaseAdmin';

async function checkSupabaseMetadata() {
  console.log('🔍 Checking Supabase Auth user metadata...');
  
  try {
    // Get all users from Supabase Auth
    const { data: supabaseUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list Supabase users:', listError);
      return;
    }
    
    console.log(`📊 Found ${supabaseUsers.users.length} users in Supabase Auth`);
    
    for (const user of supabaseUsers.users) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   User Metadata:`, JSON.stringify(user.user_metadata, null, 2));
      console.log(`   App Metadata:`, JSON.stringify(user.app_metadata, null, 2));
      
      // Check if marketing_consent exists
      const marketingConsent = user.user_metadata?.marketing_consent;
      console.log(`   Marketing Consent: ${marketingConsent !== undefined ? marketingConsent : 'NOT SET'}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking metadata:', error);
  }
}

// Run the check
checkSupabaseMetadata();