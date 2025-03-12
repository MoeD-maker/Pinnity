// Simple test script to debug the deal creation endpoint

// First, authenticate as a business user
async function testDealCreation() {
  try {
    // 1. Login as the vendor
    console.log('Logging in as vendor...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'vendor@test.com',
        password: 'Vendor123!'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('Login successful, got token');

    // 2. Create a deal using that token
    console.log('Creating a deal...');
    const deal = {
      title: 'Test Deal via Script',
      category: 'food_drink',
      description: 'This is a test deal created directly via API to debug the issue',
      dealType: 'percent_off',
      discount: '25%',
      startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 604800000).toISOString(),  // A week from now
      maxRedemptionsPerCustomer: 1,
      terms: '• Cannot be combined with other offers\n• Valid during business hours only',
      redemptionCode: 'TEST123',
      redemptionInstructions: 'Show this code to the cashier'
    };

    const createResponse = await fetch('http://localhost:5000/api/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(deal)
    });

    // Get the full response for debugging
    let responseText;
    try {
      responseText = await createResponse.text();
    } catch (e) {
      responseText = 'Could not get response text';
    }

    if (!createResponse.ok) {
      throw new Error(`Create deal failed: ${createResponse.status} ${createResponse.statusText}\nResponse: ${responseText}`);
    }

    let createdDeal;
    try {
      // If responseText is already parsed, use it directly
      createdDeal = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error('Error parsing response', e);
      console.log('Raw response:', responseText);
    }

    console.log('Deal created successfully:', createdDeal);
    return { success: true, deal: createdDeal };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

testDealCreation()
  .then(result => {
    console.log('Test completed:', result.success ? 'SUCCESS' : 'FAILED');
    if (!result.success) {
      console.error(result.error);
    }
  });