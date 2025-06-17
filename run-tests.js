#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('Running PhoneVerification Component Tests...\n');

try {
  const result = execSync('npx vitest run client/src/components/auth/PhoneVerification.test.tsx', {
    stdio: 'inherit',
    encoding: 'utf8'
  });
  
  console.log('\nAll tests completed successfully!');
  console.log('\nTest Summary:');
  console.log('- Phone input and Send Code button rendering');
  console.log('- SMS verification API calls');
  console.log('- Code input transition and validation');
  console.log('- Verification completion callbacks');
  console.log('- Error handling and user feedback');
  console.log('- Input validation and sanitization');
  
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}