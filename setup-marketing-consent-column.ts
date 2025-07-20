/**
 * Instructions for adding marketing consent column to Supabase Auth users table
 */

console.log('📋 INSTRUCTIONS: Add Marketing Consent Column to Supabase');
console.log('');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Click on "SQL Editor" in the left sidebar');
console.log('3. Create a new query and paste the following SQL:');
console.log('');
console.log('--- COPY THE SQL BELOW ---');
console.log('');
console.log('-- Add marketing_consent column to auth.users table');
console.log('ALTER TABLE auth.users');
console.log('ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;');
console.log('');
console.log('-- Update existing users with their marketing consent from metadata');
console.log('UPDATE auth.users');
console.log('SET marketing_consent = CASE');
console.log('  WHEN raw_user_meta_data->>\'marketing_consent\' = \'true\' THEN true');
console.log('  ELSE false');
console.log('END;');
console.log('');
console.log('-- Verify the results');
console.log('SELECT');
console.log('  email,');
console.log('  marketing_consent,');
console.log('  raw_user_meta_data->>\'marketing_consent\' as metadata_value');
console.log('FROM auth.users');
console.log('ORDER BY created_at;');
console.log('');
console.log('--- END OF SQL ---');
console.log('');
console.log('4. Click "Run" to execute the SQL');
console.log('5. Go back to Authentication > Users');
console.log('6. You should now see a "marketing_consent" column in the table!');
console.log('');
console.log('📊 Expected results after running the SQL:');
console.log('   mohamad.diab@hotmail.com | true');
console.log('   admin@test.com           | false');
console.log('');
console.log('✨ The marketing consent will now be visible as a column in your users table!');