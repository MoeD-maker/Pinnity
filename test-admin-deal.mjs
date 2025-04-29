// Simple test script to directly test the admin deal creation endpoint
// This bypasses the browser and React to help us debug the API
import fetch from 'node-fetch';

async function testAdminDealCreation() {
  try {
    console.log('Starting admin deal creation test...');
    
    // First, login to get auth cookies
    console.log('Logging in as admin...');
    const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@pinnity.com',
        password: 'Admin123!'
      }),
      redirect: 'manual',
      credentials: 'include',
    });
    
    console.log('Login response status:', loginResponse.status);
    
    // Store cookies from login response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('Set-Cookie header:', setCookieHeader);
    
    if (!setCookieHeader) {
      throw new Error('No cookies received from login');
    }
    
    // Parse the cookies
    const cookies = setCookieHeader.split(',').map(cookie => cookie.split(';')[0]).join('; ');
    console.log('Parsed cookies:', cookies);
    
    // Get a CSRF token
    console.log('Getting CSRF token...');
    const csrfResponse = await fetch('http://localhost:5000/api/csrf-token', {
      headers: {
        'Cookie': cookies
      },
      credentials: 'include',
    });
    
    console.log('CSRF response status:', csrfResponse.status);
    const csrfData = await csrfResponse.json();
    console.log('CSRF data:', csrfData);
    
    if (!csrfData.csrfToken) {
      throw new Error('No CSRF token received');
    }
    
    // Create a simple test deal
    const dealData = {
      businessId: 1, // Use an existing business ID
      title: 'Test Deal ' + new Date().toISOString(),
      category: 'Food & Drink',
      description: 'This is a test deal created via the test script',
      dealType: 'percent_off',
      discount: '20% off',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      maxRedemptionsPerUser: 1,
      standardTerms: ['not_combinable', 'one_per_customer'],
      terms: '• Cannot be combined with any other offers or discounts\n• Limit one per customer',
      redemptionCode: '12345',
      requiresPin: true,
      featured: false
    };
    
    // Now create the deal
    console.log('Creating test deal...');
    const createResponse = await fetch('http://localhost:5000/api/v1/admin/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'CSRF-Token': csrfData.csrfToken
      },
      body: JSON.stringify(dealData),
      credentials: 'include',
    });
    
    console.log('Create deal response status:', createResponse.status);
    const rawResponseText = await createResponse.text();
    console.log('Raw response text:', rawResponseText);
    
    // Try to parse the response if it's JSON
    try {
      const responseData = JSON.parse(rawResponseText);
      console.log('Parsed response data:', responseData);
      console.log('Test completed successfully!');
    } catch (parseError) {
      console.error('Error parsing response as JSON:', parseError);
      console.log('Response was not valid JSON');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAdminDealCreation();