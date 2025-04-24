// Login test script for admin user
import fetch from 'node-fetch';

async function testAdminLogin() {
  try {
    console.log('Attempting to login with admin credentials...');
    
    // Fetch a CSRF token first
    const csrfResponse = await fetch('http://localhost:5000/api/csrf-token', {
      credentials: 'include'
    });
    
    const csrfData = await csrfResponse.json();
    console.log('CSRF token obtained:', csrfData.csrfToken ? 'Yes (hidden for security)' : 'No');
    
    // Make the login request
    const response = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfData.csrfToken
      },
      credentials: 'include',
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
      
      // Make a request to the admin endpoint to test authentication
      console.log('\nTesting access to admin endpoint...');
      const adminResponse = await fetch('http://localhost:5000/api/v1/admin/businesses?status=pending', {
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': csrfData.csrfToken
        },
        credentials: 'include'
      });
      
      console.log('Admin endpoint status:', adminResponse.status);
      
      const adminResponseText = await adminResponse.text();
      try {
        const adminData = JSON.parse(adminResponseText);
        console.log('Admin endpoint response:', JSON.stringify(adminData, null, 2));
      } catch (parseError) {
        console.log('Admin endpoint raw response:', adminResponseText);
      }
      
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('Error during admin login test:', error);
  }
}

testAdminLogin();