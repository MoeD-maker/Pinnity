#!/usr/bin/env tsx
/**
 * Quick test to verify admin dashboard is working with unified data
 */

async function testAdminDashboard() {
  console.log('🧪 Testing Admin Dashboard with Real Data');
  console.log('==========================================');
  
  try {
    // Test the unified admin endpoint
    const response = await fetch('http://localhost:5000/api/v1/direct/admin/users');
    
    if (!response.ok) {
      console.log(`❌ Admin endpoint failed: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Admin endpoint working!`);
    console.log(`   - Total users: ${data.totalUsers}`);
    console.log(`   - Users array length: ${data.users.length}`);
    
    if (data.syncStatus) {
      console.log(`   - Sync status: ${data.syncStatus.synced}/${data.syncStatus.profilesCount} users synced`);
    }
    
    // Show sample users
    const sampleUsers = data.users.slice(0, 3);
    console.log('\n   Sample users:');
    sampleUsers.forEach((user: any, i: number) => {
      console.log(`   ${i+1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.userType}`);
    });
    
    // Test page accessibility
    console.log('\n🌐 Testing admin page accessibility...');
    const pageResponse = await fetch('http://localhost:5000/admin/users');
    
    if (pageResponse.ok) {
      console.log('✅ Admin users page accessible');
    } else {
      console.log(`❌ Admin users page failed: ${pageResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAdminDashboard().then(() => {
  console.log('\n✅ Admin dashboard test completed!');
});