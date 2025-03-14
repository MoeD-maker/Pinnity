/**
 * Test utility for the file upload middleware
 * Validates our secure file upload implementation
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { Buffer } from 'buffer';
import { fileURLToPath } from 'url';

// Get current directory in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test directories
const TEST_DIR = path.join(__dirname, 'test-files');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Test files to generate
const TEST_FILES = [
  {
    name: 'valid-pdf.pdf',
    content: `%PDF-1.3
1 0 obj
<< /Type /Catalog
   /Pages 2 0 R
>>
endobj
2 0 obj
<< /Type /Pages
   /Kids [3 0 R]
   /Count 1
>>
endobj
3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /Resources << /Font << /F1 4 0 R >>
               >>
   /MediaBox [0 0 612 792]
   /Contents 5 0 R
>>
endobj
4 0 obj
<< /Type /Font
   /Subtype /Type1
   /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 24 Tf
100 700 Td
(Test PDF File) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000257 00000 n
0000000326 00000 n
trailer
<< /Size 6
   /Root 1 0 R
>>
startxref
420
%%EOF`,
    type: 'application/pdf'
  },
  {
    name: 'malicious-pdf.pdf',
    content: `%PDF-1.3
1 0 obj
<< /Type /Catalog
   /Pages 2 0 R
   /OpenAction 5 0 R
>>
endobj
2 0 obj
<< /Type /Pages
   /Kids [3 0 R]
   /Count 1
>>
endobj
3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /Resources << /Font << /F1 4 0 R >>
               >>
   /MediaBox [0 0 612 792]
   /Contents 5 0 R
>>
endobj
4 0 obj
<< /Type /Font
   /Subtype /Type1
   /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Type /Action
   /S /JavaScript
   /JS (app.alert({cMsg: 'This PDF file contains JavaScript', cTitle: 'Testing Security', nIcon: 3});)
>>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000078 00000 n
0000000135 00000 n
0000000277 00000 n
0000000346 00000 n
trailer
<< /Size 6
   /Root 1 0 R
>>
startxref
520
%%EOF`,
    type: 'application/pdf'
  },
  {
    name: 'txt-as-pdf.pdf', 
    content: 'This is just a text file with a .pdf extension, not a real PDF',
    type: 'text/plain'
  },
  {
    name: 'valid-image.jpg',
    // Will download a test image
    url: 'https://picsum.photos/200/300',
    type: 'image/jpeg'
  }
];

// Create the test files
async function createTestFiles() {
  console.log('Creating test files...');
  
  for (const file of TEST_FILES) {
    const filePath = path.join(TEST_DIR, file.name);
    
    if (file.content) {
      // Create file from content
      fs.writeFileSync(filePath, file.content);
      console.log(`Created ${file.name}`);
    } else if (file.url) {
      // Download file
      await downloadFile(file.url, filePath);
      console.log(`Downloaded ${file.name}`);
    }
  }
}

// Helper to download a file
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

// Create test form data for upload testing
function createTestForm(file) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
  const fileContent = fs.readFileSync(path.join(TEST_DIR, file.name));
  
  let body = '';
  // Form boundary start
  body += `--${boundary}\r\n`;
  // File field
  body += `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`;
  body += `Content-Type: ${file.type}\r\n\r\n`;
  
  // Create form data
  const formData = Buffer.concat([
    Buffer.from(body, 'utf8'),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  ]);
  
  return {
    boundary,
    formData
  };
}

// Run the tests
async function runTests() {
  try {
    // Create the test files
    await createTestFiles();
    console.log('\nTest files created successfully in the test/test-files directory.');
    console.log('\nYou can now test the file upload middleware with these files:');
    TEST_FILES.forEach(file => {
      console.log(`- ${file.name} (${file.type})`);
    });
    
    console.log('\nTest utility completed successfully!');
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

// Execute tests
runTests();

// Export functions for use in other modules
export { createTestFiles, downloadFile, createTestForm };