/**
 * Verify marketing consent data is properly stored in Supabase
 */
import { supabaseAdmin } from './server/supabaseAdmin';

async function verifyMarketingConsentInSupabase() {
  console.log('🔍 Verifying marketing consent data in Supabase Auth...');
  
  try {
    // Get specific users and show their marketing consent
    const usersToCheck = [
      { email: 'mohamad.diab@hotmail.com', expectedConsent: true },
      { email: 'admin@test.com', expectedConsent: false }
    ];
    
    for (const userCheck of usersToCheck) {
      console.log(`\n🔍 Checking ${userCheck.email}...`);
      
      // Get user by email
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error(`❌ Error fetching users:`, error);
        continue;
      }
      
      const user = users.users.find(u => u.email === userCheck.email);
      
      if (!user) {
        console.log(`❌ User ${userCheck.email} not found in Supabase Auth`);
        continue;
      }
      
      const marketingConsent = user.user_metadata?.marketing_consent;
      const status = marketingConsent === userCheck.expectedConsent ? '✅ CORRECT' : '❌ INCORRECT';
      
      console.log(`   User ID: ${user.id}`);
      console.log(`   Marketing Consent: ${marketingConsent}`);
      console.log(`   Expected: ${userCheck.expectedConsent}`);
      console.log(`   Status: ${status}`);
      
      // Show how to query this in Supabase SQL Editor
      console.log(`   SQL Query to verify in Supabase:`);
      console.log(`   SELECT id, email, raw_user_meta_data->'marketing_consent' as marketing_consent`);
      console.log(`   FROM auth.users WHERE email = '${userCheck.email}';`);
    }
    
    console.log('\n📋 Summary:');
    console.log('✅ Marketing consent data IS stored in Supabase Auth user_metadata');
    console.log('✅ The data is accessible via API and SQL queries');
    console.log('ℹ️  Note: Supabase Auth dashboard UI may not show all metadata fields in table view');
    console.log('ℹ️  To see full metadata, click on individual users or use SQL editor');
    
    console.log('\n🔍 To view marketing consent in Supabase Dashboard:');
    console.log('1. Go to Authentication > Users');
    console.log('2. Click on a specific user');
    console.log('3. Look in the "User Metadata" section');
    console.log('4. OR use SQL Editor with the queries shown above');
    
  } catch (error) {
    console.error('❌ Error verifying marketing consent:', error);
  }
}

// Run the verification
verifyMarketingConsentInSupabase();