import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';

// Create storage for cookies
const cookieJar = [];

// Helper function to store cookies
function saveCookies(cookieHeader) {
  if (!cookieHeader) return;
  
  const setCookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  
  for (const setCookie of setCookies) {
    // Extract cookie name and value
    const cookie = setCookie.split(';')[0].trim();
    
    if (cookie.includes('=')) {
      cookieJar.push(cookie);
    }
  }
}

// Helper function to get saved cookies as a header string
function getCookiesAsHeader() {
  return cookieJar.join('; ');
}

// Helper function to get a CSRF token
async function getCSRFToken() {
  const response = await fetch('http://localhost:5000/api/csrf-token', {
    headers: {
      'Cookie': getCookiesAsHeader(),
      'Cache-Control': 'no-cache'
    }
  });
  
  // Save any cookies
  saveCookies(response.headers.raw()['set-cookie']);
  
  const data = await response.json();
  return data.csrfToken;
}

// Helper function to login as admin
async function adminLogin() {
  // First get a CSRF token
  const csrfToken = await getCSRFToken();
  console.log('Initial CSRF token:', csrfToken);
  
  // Then login
  const loginResponse = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken,
      'Cookie': getCookiesAsHeader()
    },
    body: JSON.stringify({
      email: 'admin@test.com',
      password: 'admin123'
    })
  });
  
  // Store any cookies
  saveCookies(loginResponse.headers.raw()['set-cookie']);
  
  console.log('Login response status:', loginResponse.status);
  console.log('Current cookies:', cookieJar);
  
  // Check response to see if login worked
  const responseText = await loginResponse.text();
  console.log('Login response:', responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
  
  return getCookiesAsHeader();
}

// Test creating a deal
async function testCreateDeal() {
  try {
    console.log('Starting admin deal creation test...');
    
    // Login to get cookies
    await adminLogin();
    console.log('Login successful, got cookies:', cookieJar);
    
    // Get fresh CSRF token
    const csrfToken = await getCSRFToken();
    console.log('Got CSRF token for deal creation:', csrfToken);
    
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
    
    // Add referer header to mimic browser behavior
    const createResponse = await fetch('http://localhost:5000/api/v1/admin/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken,
        'Cookie': getCookiesAsHeader(),
        'Referer': 'http://localhost:5000/admin/deals/add'
      },
      body: JSON.stringify(dealData)
    });
    
    // Save any cookies
    saveCookies(createResponse.headers.raw()['set-cookie']);
    
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