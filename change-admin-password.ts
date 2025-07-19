/**
 * Simple script to change admin password
 */
import { supabaseAdmin } from './server/supabaseAdmin';
import { pool } from './server/db';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function changeAdminPassword() {
  try {
    console.log('🔐 Admin Password Change Tool');
    console.log('============================');
    
    // Get admin profile
    const { rows: adminProfiles } = await pool.query(
      'SELECT * FROM profiles WHERE email = $1',
      ['admin@test.com']
    );
    
    if (adminProfiles.length === 0) {
      throw new Error('Admin profile not found');
    }
    
    const adminProfile = adminProfiles[0];
    console.log('👤 Found admin:', adminProfile.email);
    
    // Ask for new password
    const newPassword = await new Promise<string>((resolve) => {
      rl.question('Enter new password (minimum 8 characters): ', (answer) => {
        resolve(answer);
      });
    });
    
    if (!newPassword || newPassword.length < 8) {
      console.log('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    // Update password in Supabase
    console.log('🔄 Updating password in Supabase...');
    
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      adminProfile.supabase_user_id,
      {
        password: newPassword
      }
    );
    
    if (error) {
      console.error('❌ Failed to update password:', error);
      throw error;
    }
    
    console.log('✅ Admin password updated successfully!');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 New password: [hidden for security]');
    console.log('\n⚠️  Remember to use the new password for login');
    
  } catch (error) {
    console.error('❌ Failed to change admin password:', error);
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

changeAdminPassword();