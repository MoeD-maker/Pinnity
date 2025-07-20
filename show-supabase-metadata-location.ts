/**
 * Show exactly where to find marketing consent in Supabase Dashboard
 */
import { supabaseAdmin } from './server/supabaseAdmin';

async function showMetadataLocation() {
  console.log('📍 Here\'s exactly where to find marketing consent in Supabase:');
  console.log('');
  
  // Get the users to show their IDs
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log('🔍 STEP-BY-STEP INSTRUCTIONS:');
  console.log('');
  console.log('1. In your Supabase dashboard (where you took the screenshot)');
  console.log('2. Click on "Mohamad D" (the first user in your table)');
  console.log('3. This will open a detailed user view');
  console.log('4. Look for a section called "User Metadata" or "Raw User Meta Data"');
  console.log('5. You should see marketing_consent: true');
  console.log('');
  
  console.log('👤 Your users and their marketing consent:');
  users.users.forEach(user => {
    const marketingConsent = user.user_metadata?.marketing_consent;
    console.log(`   • ${user.email}: marketing_consent = ${marketingConsent}`);
    console.log(`     (Click on this user to see full metadata)`);
  });
  
  console.log('');
  console.log('🔧 ALTERNATIVE: Use SQL Editor');
  console.log('If you still can\'t see it, go to SQL Editor and run:');
  console.log('');
  console.log('SELECT ');
  console.log('  email,');
  console.log('  raw_user_meta_data->>\'marketing_consent\' as marketing_consent');
  console.log('FROM auth.users;');
  console.log('');
  
  console.log('📊 Expected results:');
  console.log('   mohamad.diab@hotmail.com | true');
  console.log('   admin@test.com           | false');
}

showMetadataLocation();