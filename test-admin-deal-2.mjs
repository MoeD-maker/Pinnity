import fetch from 'node-fetch';

// Helper function to get a CSRF token
async function getCSRFToken() {
  const response = await fetch('http://localhost:5000/api/csrf-token', {
    credentials: 'include',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  
  const data = await response.json();
  return data.csrfToken;
}

// Helper function to login as admin
async function adminLogin() {
  const csrfToken = await getCSRFToken();
  
  const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken
    },
    body: JSON.stringify({
      email: 'admin@pinnity.com',
      password: 'Admin123!'
    })
  });
  
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('Login response status:', loginResponse.status);
  
  if (!cookies) {
    throw new Error('No cookies returned from login');
  }
  
  return cookies;
}

// Test creating a deal
async function testCreateDeal() {
  try {
    console.log('Starting admin deal creation test...');
    
    // Login to get cookies
    const authCookies = await adminLogin();
    console.log('Login successful, got cookies');
    
    // Get fresh CSRF token
    const csrfResponse = await fetch('http://localhost:5000/api/csrf-token', {
      headers: {
        'Cookie': authCookies
      }
    });
    const csrfData = await csrfResponse.json();
    console.log('Got CSRF token:', csrfData.csrfToken);
    
    // Create a test deal
    const dealData = {
      businessId: 1, // Adjust to match an existing business ID in your database
      title: 'Test Deal from API Script',
      description: 'This is a test deal created directly via API for debugging',
      category: 'Food & Drink',
      dealType: 'percent_off',
      discount: '20%',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      standardTerms: ['not_combinable', 'one_per_customer'],
      terms: '• Cannot be combined with any other offers or discounts\n• Limit one per customer',
      redemptionCode: '12345',
      maxRedemptionsPerUser: 1,
      featured: false,
      requiresPin: true
    };
    
    const createResponse = await fetch('http://localhost:5000/api/v1/admin/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfData.csrfToken,
        'Cookie': authCookies
      },
      body: JSON.stringify(dealData)
    });
    
    console.log('Create deal response status:', createResponse.status);
    console.log('Create deal response headers:', createResponse.headers.raw());
    
    // Try to parse the response
    let responseData;
    try {
      const responseText = await createResponse.text();
      console.log('Raw response text:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      
      // Check if we got HTML instead of JSON
      if (responseText.includes('<!DOCTYPE')) {
        console.error('Received HTML response instead of JSON!');
      } else {
        try {
          responseData = JSON.parse(responseText);
          console.log('Successfully parsed JSON response:', responseData);
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', parseError);
        }
      }
    } catch (error) {
      console.error('Error handling response:', error);
    }
    
    console.log('Test completed');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testCreateDeal();