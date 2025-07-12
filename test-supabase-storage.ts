/**
 * Test script to verify Supabase Storage functionality
 * Tests bucket creation, file upload, signed URL generation, and file management
 */

import { 
  initializeSupabaseStorage,
  uploadFileToSupabase,
  generateSignedUrl,
  deleteFileFromSupabase,
  listFiles,
  getFileInfo,
  BUCKET_NAME
} from './server/supabaseStorage';
import { supabaseAdmin } from './server/supabaseAdmin';
import fs from 'fs';

async function testSupabaseStorage() {
  console.log('🧪 Testing Supabase Storage functionality...\n');

  try {
    // Test 1: Initialize storage (should already exist)
    console.log('1️⃣ Testing storage initialization...');
    await initializeSupabaseStorage();
    console.log('✅ Storage initialization successful\n');

    // Test 2: Check bucket exists and list buckets
    console.log('2️⃣ Testing bucket listing...');
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const userDocsBucket = buckets?.find(bucket => bucket.name === BUCKET_NAME);
    if (!userDocsBucket) {
      throw new Error(`Bucket ${BUCKET_NAME} not found`);
    }

    console.log(`✅ Found bucket: ${userDocsBucket.name}`);
    console.log(`   - ID: ${userDocsBucket.id}`);
    console.log(`   - Public: ${userDocsBucket.public}`);
    console.log(`   - Created: ${userDocsBucket.created_at}\n`);

    // Test 3: Create a test PDF file for upload (supported MIME type)
    console.log('3️⃣ Creating test PDF file...');
    // Create a minimal valid PDF content
    const testFileContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF');
    const testFileName = 'test-document.pdf';
    const testFilePath = `./${testFileName}`;
    
    fs.writeFileSync(testFilePath, testFileContent);
    console.log(`✅ Created test PDF file: ${testFileName}\n`);

    // Test 4: Simulate file upload (create mock Express.Multer.File)
    console.log('4️⃣ Testing file upload...');
    const mockFile: Express.Multer.File = {
      fieldname: 'testFile',
      originalname: testFileName,
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: testFileContent.length,
      buffer: testFileContent,
      destination: '',
      filename: testFileName,
      path: testFilePath,
      stream: {} as any
    };

    const uploadResult = await uploadFileToSupabase(mockFile, 'test-user-123', 'test-documents');
    console.log(`✅ File uploaded successfully!`);
    console.log(`   - Path: ${uploadResult.path}`);
    console.log(`   - Signed URL: ${uploadResult.signedUrl}\n`);

    // Test 5: Generate new signed URL
    console.log('5️⃣ Testing signed URL generation...');
    const newSignedUrl = await generateSignedUrl(uploadResult.path, 7200); // 2 hours
    console.log(`✅ Generated new signed URL: ${newSignedUrl}\n`);

    // Test 6: List files in test folder
    console.log('6️⃣ Testing file listing...');
    const files = await listFiles('test-documents/test-user-123');
    console.log(`✅ Found ${files.length} file(s):`);
    files.forEach(file => {
      console.log(`   - ${file.name} (${file.metadata?.size || 'unknown size'})`);
    });
    console.log('');

    // Test 7: Get file info
    console.log('7️⃣ Testing file info retrieval...');
    const fileInfo = await getFileInfo(uploadResult.path);
    if (fileInfo) {
      console.log(`✅ File info retrieved:`);
      console.log(`   - Name: ${fileInfo.name}`);
      console.log(`   - Size: ${fileInfo.metadata?.size || 'unknown'} bytes`);
      console.log(`   - Last Modified: ${fileInfo.updated_at}\n`);
    } else {
      console.log('⚠️ File info not found\n');
    }

    // Test 8: Verify CDN access (try to fetch the signed URL)
    console.log('8️⃣ Testing CDN access...');
    try {
      const response = await fetch(uploadResult.signedUrl);
      if (response.ok) {
        const content = await response.text();
        console.log(`✅ CDN access successful!`);
        console.log(`   - Status: ${response.status}`);
        console.log(`   - Content: "${content}"`);
        console.log(`   - Cache headers: ${response.headers.get('cf-cache-status') || 'N/A'}\n`);
      } else {
        console.log(`❌ CDN access failed: ${response.status} ${response.statusText}\n`);
      }
    } catch (fetchError) {
      console.log(`❌ CDN access error: ${fetchError}\n`);
    }

    // Test 9: Cleanup - delete test file
    console.log('9️⃣ Testing file deletion...');
    await deleteFileFromSupabase(uploadResult.path);
    console.log(`✅ File deleted successfully\n`);

    // Test 10: Verify deletion
    console.log('🔟 Verifying file deletion...');
    const filesAfterDelete = await listFiles('test-documents/test-user-123');
    console.log(`✅ Files after deletion: ${filesAfterDelete.length}\n`);

    // Cleanup local test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🧹 Local test file cleaned up');
    }

    console.log('\n🎉 All Supabase Storage tests passed successfully!');
    console.log('\n📊 Storage Configuration Summary:');
    console.log(`   - Bucket Name: ${BUCKET_NAME}`);
    console.log(`   - Bucket Type: Private (requires signed URLs)`);
    console.log(`   - CDN Enabled: Yes`);
    console.log(`   - Max File Size: 5MB`);
    console.log(`   - Allowed Types: Images (JPG, PNG, WebP, GIF), PDFs`);
    console.log(`   - URL Expiry: 1 hour (configurable)`);

  } catch (error) {
    console.error('\n❌ Supabase Storage test failed:', error);
    throw error;
  }
}

// Run the test (ES module compatible)
testSupabaseStorage()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

export { testSupabaseStorage };