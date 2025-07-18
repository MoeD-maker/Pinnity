/**
 * Script to check synchronization between local database and Supabase Auth
 */
import { supabaseAdmin } from './server/supabaseAdmin';
import { db } from './server/db';
import { users } from './shared/schema';

async function checkSupabaseSync() {
  try {
    console.log('🔍 Checking Supabase Auth users...');
    const { data: supabaseUsers, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching Supabase users:', error);
      return;
    }
    
    console.log(`📊 Total Supabase Auth users: ${supabaseUsers.users.length}`);
    
    console.log('\n📋 Recent Supabase Auth users:');
    supabaseUsers.users.slice(0, 10).forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id})`);
      console.log(`  Created: ${user.created_at}`);
      console.log(`  User Type: ${user.user_metadata?.userType || 'unknown'}`);
      console.log(`  Phone: ${user.phone || 'none'}`);
      console.log('');
    });
    
    // Get local database users
    console.log('🗄️ Checking local database users...');
    const localUsers = await db.select().from(users).orderBy(users.createdAt);
    
    console.log(`📊 Total local database users: ${localUsers.length}`);
    console.log('\n📋 Recent local database users:');
    localUsers.forEach(user => {
      console.log(`- ${user.email} (Local ID: ${user.id})`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Type: ${user.userType}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('');
    });
    
    // Check for synchronization
    console.log('🔄 Checking synchronization...');
    const localEmails = new Set(localUsers.map(u => u.email));
    const supabaseEmails = new Set(supabaseUsers.users.map(u => u.email));
    
    const onlyInLocal = [...localEmails].filter(email => !supabaseEmails.has(email));
    const onlyInSupabase = [...supabaseEmails].filter(email => !localEmails.has(email));
    
    console.log(`\n📈 Synchronization Status:`);
    console.log(`- Users in both systems: ${[...localEmails].filter(email => supabaseEmails.has(email)).length}`);
    console.log(`- Only in local DB: ${onlyInLocal.length}`);
    console.log(`- Only in Supabase: ${onlyInSupabase.length}`);
    
    if (onlyInLocal.length > 0) {
      console.log('\n⚠️ Users only in local database:');
      onlyInLocal.forEach(email => console.log(`  - ${email}`));
    }
    
    if (onlyInSupabase.length > 0) {
      console.log('\n⚠️ Users only in Supabase:');
      onlyInSupabase.forEach(email => console.log(`  - ${email}`));
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkSupabaseSync();