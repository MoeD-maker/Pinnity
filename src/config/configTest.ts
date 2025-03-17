/**
 * Configuration System Test Utility
 * 
 * This script tests the application configuration system to ensure it:
 * 1. Loads correctly from environment variables
 * 2. Validates critical security values
 * 3. Redacts sensitive information in logs
 * 4. Provides both private and public configuration interfaces
 * 
 * To run this test: npx ts-node ./src/config/configTest.ts
 */

import { getConfig, getPublicConfig, logAppConfig } from './appConfig';

/**
 * Test configuration validation and loading
 */
function testConfigurationSystem(): void {
  console.log('=== Testing Configuration System ===\n');
  
  try {
    console.log('1. Loading application configuration...');
    logAppConfig();
    
    // Get the full configuration (with sensitive values)
    const config = getConfig();
    
    console.log('\n2. Checking configuration access...');
    console.log('✓ Full config accessed successfully');
    
    // Get the public configuration (without sensitive values)
    const publicConfig = getPublicConfig();
    
    console.log('\n3. Testing public vs. private configuration...');
    const publicConfigString = JSON.stringify(publicConfig, null, 2);
    
    // Verify sensitive values are not present in public config
    const containsSensitiveValues = [
      'jwtSecret',
      'cookieSecret',
      'csrfSecret',
      'databaseUrl'
    ].some(key => {
      // Check if the key exists in publicConfig string
      if (publicConfigString.includes(key)) {
        // Get the value safely based on where it should be in the config
        let sensitiveValue = '';
        if (key === 'databaseUrl') {
          sensitiveValue = config.infrastructure.databaseUrl;
        } else {
          sensitiveValue = String(config.security[key as keyof typeof config.security] || '');
        }
        
        // Check if this sensitive value appears in the public config
        return publicConfigString.includes(sensitiveValue);
      }
      return false;
    });
    
    if (containsSensitiveValues) {
      console.error('✗ Public config contains sensitive values!');
    } else {
      console.log('✓ Public config correctly excludes sensitive values');
    }
    
    // Test configuration structure
    console.log('\n4. Verifying configuration structure...');
    
    // Check required properties exist
    const requiredSections = ['security', 'infrastructure', 'features', 'development'];
    const missingProps = requiredSections.filter(prop => !(prop in config));
    
    if (missingProps.length > 0) {
      console.error(`✗ Missing required sections: ${missingProps.join(', ')}`);
    } else {
      console.log('✓ All required configuration sections present');
    }
    
    // Verify security settings
    console.log('\n5. Verifying security settings...');
    if (!config.security.jwtSecret || config.security.jwtSecret.length < 32) {
      console.warn('⚠️ JWT_SECRET is missing or too short (less than 32 characters)');
    } else {
      console.log('✓ JWT_SECRET is properly configured');
    }
    
    if (!config.security.cookieSecret || config.security.cookieSecret.length < 32) {
      console.warn('⚠️ COOKIE_SECRET is missing or too short (less than 32 characters)');
    } else {
      console.log('✓ COOKIE_SECRET is properly configured');
    }
    
    if (!config.security.csrfSecret || config.security.csrfSecret.length < 32) {
      console.warn('⚠️ CSRF_SECRET is missing or too short (less than 32 characters)');
    } else {
      console.log('✓ CSRF_SECRET is properly configured');
    }
    
    // Test immutability
    console.log('\n6. Testing configuration immutability...');
    try {
      (config as any).security.jwtSecret = 'hacked';
      console.error('✗ Configuration is not properly immutable!');
    } catch (error) {
      console.log('✓ Configuration is properly immutable');
    }
    
    // Final summary
    console.log('\n=== Configuration Test Summary ===');
    console.log(`Environment: ${config.env}`);
    console.log(`Database connection: ${config.infrastructure.databaseUrl ? 'Configured' : 'Missing'}`);
    console.log(`Security settings: ${config.security.jwtSecret ? 'Configured' : 'Missing'}`);
    console.log(`Development Mode: ${config.isDevelopment ? 'Enabled' : 'Disabled'}`);
    
  } catch (error) {
    console.error('\n✗ Configuration test failed with error:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testConfigurationSystem();
}

export { testConfigurationSystem };