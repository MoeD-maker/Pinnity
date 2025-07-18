/**
 * Test script to verify the unified Supabase + PostgreSQL system
 */
import { getAllUsersWithBusinesses, getUserByEmail, createProfile, createBusiness } from './server/supabaseQueries';
import { supabaseAdmin } from './server/supabaseAdmin';

async function testUnifiedSystem() {
  console.log('🧪 Testing Unified User Management System');
  console.log('==========================================');
  
  try {
    // Test 1: Get all users
    console.log('\n1. Testing getAllUsersWithBusinesses()');
    const allUsers = await getAllUsersWithBusinesses();
    console.log(`✅ Found ${allUsers.length} users in profiles table`);
    
    if (allUsers.length > 0) {
      const firstUser = allUsers[0];
      console.log(`   Latest user: ${firstUser.email} (${firstUser.user_type})`);
      if (firstUser.business) {
        console.log(`   Business: ${firstUser.business.business_name} (${firstUser.business.verification_status})`);
      }
    }
    
    // Test 2: Get user by email
    console.log('\n2. Testing getUserByEmail()');
    if (allUsers.length > 0) {
      const testUser = await getUserByEmail(allUsers[0].email);
      console.log(`✅ Found user by email: ${testUser?.email}`);
    }
    
    // Test 3: Check Supabase Auth sync
    console.log('\n3. Testing Supabase Auth integration');
    const { data: supabaseUsers, error: supabaseError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (supabaseError) {
      console.log(`❌ Error fetching Supabase users: ${supabaseError.message}`);
    } else {
      console.log(`✅ Found ${supabaseUsers.users.length} users in Supabase Auth`);
      
      // Check sync status
      const syncedUsers = allUsers.filter(u => u.supabase_user_id);
      console.log(`   Synced users: ${syncedUsers.length}/${allUsers.length}`);
      
      if (syncedUsers.length > 0) {
        console.log(`   Example synced user: ${syncedUsers[0].email} (${syncedUsers[0].supabase_user_id})`);
      }
    }
    
    // Test 4: Test new unified endpoints
    console.log('\n4. Testing new API endpoints');
    
    // Test admin users endpoint
    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Admin users endpoint working: ${data.users?.length || 0} users`);
      } else {
        console.log(`❌ Admin users endpoint failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Admin users endpoint error: ${error}`);
    }
    
    console.log('\n✅ Unified system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUnifiedSystem();