// Login test script
const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Attempting to login with test credentials...');
    
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'customer@test.com',
        password: 'Customer123!'
      })
    });
    
    console.log('Status:', response.status);
    console.log('StatusText:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Parsed data:', data);
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('Error during login test:', error);
  }
}

testLogin();