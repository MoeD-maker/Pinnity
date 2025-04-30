// Login test script for admin user
import fetch from 'node-fetch';
import { readFileSync, writeFileSync } from 'fs';

// Function to save cookies for future requests
function saveCookies(cookieHeader) {
  if (!cookieHeader || cookieHeader.length === 0) return;
  
  try {
    writeFileSync('./cookies.txt', cookieHeader.join('\n'), 'utf8');
    console.log('Cookies saved successfully');
  } catch (error) {
    console.error('Error saving cookies:', error);
  }
}

// Function to load cookies from file
function loadCookies() {
  try {
    const cookieData = readFileSync('./cookies.txt', 'utf8');
    return cookieData.split('\n');
  } catch (error) {
    console.log('No saved cookies found');
    return [];
  }
}

async function testAdminLogin() {
  try {
    console.log('Attempting to login with admin credentials...');
    
    // Load any existing cookies
    const savedCookies = loadCookies();
    const cookieHeader = savedCookies.length > 0 ? savedCookies.join('; ') : '';
    
    // Fetch a CSRF token first
    const csrfResponse = await fetch('http://localhost:5000/api/csrf-token', {
      headers: {
        Cookie: cookieHeader
      }
    });
    
    // Save any cookies returned from CSRF token request
    const csrfCookies = csrfResponse.headers.raw()['set-cookie'];
    if (csrfCookies) saveCookies(csrfCookies);
    
    const csrfData = await csrfResponse.json();
    console.log('CSRF token obtained:', csrfData.csrfToken ? 'Yes (hidden for security)' : 'No');
    
    // Make the login request with all cookies from the CSRF request
    const updatedCookies = loadCookies();
    const loginCookieHeader = updatedCookies.join('; ');
    
    // Make the login request
    const response = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfData.csrfToken,
        'Cookie': loginCookieHeader
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Admin123!'
      })
    });
    
    console.log('Status:', response.status);
    console.log('StatusText:', response.statusText);
    
    // Get all cookies from response
    const cookies = response.headers.raw()['set-cookie'];
    console.log('Cookies received:', cookies ? cookies.length : 0);
    if (cookies) {
      cookies.forEach((cookie, index) => {
        console.log(`Cookie ${index + 1}:`, cookie.split(';')[0]); // Only show name=value part
      });
    }
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed data:', data);
      
      // Save auth cookies for future requests
      if (cookies) saveCookies(cookies);
      
      // Load all cookies for admin request
      const allCookies = loadCookies();
      const adminCookieHeader = allCookies.join('; ');
      
      // Make a request to the admin endpoint to test authentication
      console.log('\nTesting access to admin endpoint...');
      const adminResponse = await fetch('http://localhost:5000/api/v1/admin/businesses?status=pending', {
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfData.csrfToken,
          'Cookie': adminCookieHeader
        }
      });
      
      console.log('Admin endpoint status:', adminResponse.status);
      
      const adminResponseText = await adminResponse.text();
      try {
        const adminData = JSON.parse(adminResponseText);
        console.log('Admin endpoint response:', JSON.stringify(adminData, null, 2));
      } catch (parseError) {
        console.log('Admin endpoint raw response:', adminResponseText);
      }
      
      // Test our bypass endpoint
      console.log('\nTesting our dedicated bypass router endpoint...');
      try {
        const bypassHeaders = {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfData.csrfToken,
          'Cookie': adminCookieHeader,
          'X-Bypass-Vite': 'true',
          'X-Requested-With': 'xmlhttprequest',
          'User-Agent': 'node-fetch'
        };
        
        console.log('Using request headers:', JSON.stringify(bypassHeaders, null, 2));
        
        const bypassBodyData = {
          businessId: 1, // Use first business as example
          title: "Test Bypass Deal",
          category: "Food & Drink",
          description: "Test deal created via bypass API",
          dealType: "percent-off",
          discount: "15%",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          terms: "• Standard terms apply",
          redemptionCode: "12345",
          featured: false
        };
        
        const bypassResponse = await fetch('http://localhost:5000/api/direct/admin/deals', {
          method: 'POST',
          headers: bypassHeaders,
          body: JSON.stringify(bypassBodyData)
        });
        
        console.log('Bypass endpoint status:', bypassResponse.status);
        console.log('Bypass endpoint response headers:', 
          JSON.stringify(Object.fromEntries([...bypassResponse.headers.entries()]), null, 2));
        
        const bypassResponseText = await bypassResponse.text();
        try {
          const bypassData = JSON.parse(bypassResponseText);
          console.log('Bypass endpoint response:', JSON.stringify(bypassData, null, 2));
        } catch (parseError) {
          console.log('Failed to parse bypass response as JSON');
          console.log('Bypass endpoint raw response (first 500 chars):', 
            bypassResponseText.substring(0, 500));
        }
      } catch (bypassError) {
        console.error('Error testing bypass endpoint:', bypassError);
      }
      
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('Error during admin login test:', error);
  }
}

testAdminLogin();