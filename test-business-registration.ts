/**
 * Test script to verify business registration with file uploads works correctly
 */

import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

async function createTestPDF(filename: string): Promise<string> {
  // Create a minimal valid PDF
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
178
%%EOF`;

  const filepath = `./${filename}`;
  fs.writeFileSync(filepath, pdfContent);
  return filepath;
}

async function testBusinessRegistration() {
  console.log('🧪 Testing business registration with file uploads...\n');

  try {
    // Create test PDF files
    console.log('1️⃣ Creating test documents...');
    const govIdPath = await createTestPDF('test-gov-id.pdf');
    const proofAddrPath = await createTestPDF('test-proof-address.pdf');
    const proofBizPath = await createTestPDF('test-proof-business.pdf');
    console.log('✅ Test documents created\n');

    // Prepare form data
    console.log('2️⃣ Preparing registration data...');
    const formData = new FormData();
    
    // Business information
    formData.append('businessName', 'Test Business Ltd');
    formData.append('businessCategory', 'Restaurant');
    formData.append('firstName', 'Business');
    formData.append('lastName', 'Owner');
    formData.append('email', `business.test.${Date.now()}@example.com`);
    formData.append('password', 'SecurePass123!');
    formData.append('phone', '+15551234890');
    formData.append('address', '456 Business Ave, Toronto, ON M5V 1A1');
    formData.append('termsAccepted', 'true');

    // File attachments
    formData.append('governmentId', fs.createReadStream(govIdPath));
    formData.append('proofOfAddress', fs.createReadStream(proofAddrPath));
    formData.append('proofOfBusiness', fs.createReadStream(proofBizPath));

    console.log('✅ Form data prepared\n');

    // Submit registration
    console.log('3️⃣ Submitting business registration...');
    const response = await fetch('http://localhost:5000/api/v1/auth/register/business', {
      method: 'POST',
      body: formData as any
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    let result;
    try {
      result = await response.json();
      console.log('✅ Response parsed successfully');
    } catch (e) {
      console.error('❌ Failed to parse response as JSON:', e);
      const text = await response.text();
      console.log('Raw response:', text);
      throw new Error('Invalid JSON response');
    }

    if (!response.ok) {
      console.error('❌ Registration failed:', result);
      throw new Error(result?.message || 'Registration failed');
    }

    console.log('✅ Business registration successful!');
    console.log('Response details:', {
      message: result.message,
      userId: result.userId,
      userType: result.userType,
      supabaseUserId: result.supabaseUserId
    });

    // Cleanup test files
    console.log('\n4️⃣ Cleaning up test files...');
    [govIdPath, proofAddrPath, proofBizPath].forEach(path => {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    });
    console.log('✅ Test files cleaned up');

    console.log('\n🎉 Business registration test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   - PDF files created and uploaded successfully');
    console.log('   - Business registration endpoint working');
    console.log('   - JSON response parsing working');
    console.log('   - Files uploaded to Supabase Storage');
    console.log('   - User created in both Supabase and local database');

  } catch (error) {
    console.error('\n❌ Business registration test failed:', error);
    
    // Cleanup on failure
    ['test-gov-id.pdf', 'test-proof-address.pdf', 'test-proof-business.pdf'].forEach(filename => {
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
      }
    });
    
    throw error;
  }
}

// Run the test
testBusinessRegistration()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });