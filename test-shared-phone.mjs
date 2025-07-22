#!/usr/bin/env node

/**
 * Test script to verify that multiple accounts can use the same phone number
 */

async function testSharedPhoneNumber() {
  const baseURL = 'http://localhost:5000';
  
  console.log('🧪 Testing shared phone number registration...');
  
  const sharedPhone = '+1234567890';
  const timestamp = Date.now();
  
  // Test data for two different users with the same phone number
  const user1 = {
    firstName: 'John',
    lastName: 'Doe',
    email: `john.${timestamp}@test.com`,
    password: 'TestPassword123!',
    phone: sharedPhone,
    address: '123 Main St, Toronto, ON',
    role: 'individual',
    phoneVerified: true, // Skip verification for testing
    marketingConsent: false
  };
  
  const user2 = {
    firstName: 'Jane',
    lastName: 'Smith', 
    email: `jane.${timestamp}@test.com`,
    password: 'TestPassword123!',
    phone: sharedPhone, // Same phone number!
    address: '456 Oak Ave, Vancouver, BC',
    role: 'individual',
    phoneVerified: true, // Skip verification for testing
    marketingConsent: true
  };
  
  try {
    // Register first user
    console.log('\n1️⃣ Registering first user with phone:', sharedPhone);
    const response1 = await fetch(`${baseURL}/api/auth/gated/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user1)
    });
    
    const result1 = await response1.json();
    console.log('✅ First user registration result:', response1.status, result1.message || result1.email);
    
    // Register second user with same phone number
    console.log('\n2️⃣ Registering second user with SAME phone:', sharedPhone);
    const response2 = await fetch(`${baseURL}/api/auth/gated/register`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user2)
    });
    
    const result2 = await response2.json();
    console.log('✅ Second user registration result:', response2.status, result2.message || result2.email);
    
    // Verify both users exist in database
    console.log('\n3️⃣ Verifying both accounts exist...');
    const verifyResponse = await fetch(`${baseURL}/api/v1/admin/users`);
    const users = await verifyResponse.json();
    
    const user1Found = users.find(u => u.email === user1.email);
    const user2Found = users.find(u => u.email === user2.email);
    
    if (user1Found && user2Found) {
      console.log('🎉 SUCCESS: Both users registered with same phone number!');
      console.log(`   User 1: ${user1Found.email} - Phone: ${user1Found.phone}`);
      console.log(`   User 2: ${user2Found.email} - Phone: ${user2Found.phone}`);
      console.log('✅ Shared phone number feature is working correctly!');
    } else {
      console.log('❌ FAILED: One or both users not found in database');
      console.log('   User 1 found:', !!user1Found);
      console.log('   User 2 found:', !!user2Found);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testSharedPhoneNumber();