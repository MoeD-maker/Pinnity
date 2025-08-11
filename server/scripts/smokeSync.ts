import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import {
  createVendorWithAuth,
  updateVendorEmail,
  updateVendorPhone,
  setVendorPassword,
  setVendorStatus,
  deleteVendorFully,
  getProfileByBusinessId
} from '../sync/VendorSyncService.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const supabaseUrl = process.env.DATABASE_URL?.includes('supabase') 
  ? process.env.DATABASE_URL.replace('postgresql://', '').split('@')[1].split(':')[0]
  : 'your-project.supabase.co';

const supabaseAdmin = createClient(
  `https://${supabaseUrl}`,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key-needed',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runSmokeTest(): Promise<void> {
  console.log('🧪 Starting VendorSync smoke test...');
  
  let businessId: number | undefined;
  let profileId: string | undefined;
  let authUserId: string | undefined;
  
  try {
    // 1. Create a temp vendor
    console.log('\n1️⃣ Creating temp vendor...');
    const createResult = await createVendorWithAuth({
      email: `smoke-test-${Date.now()}@example.com`,
      password: 'TempPassword123!',
      phone: '+1234567890',
      businessName: 'Smoke Test Business',
      businessCategory: 'Restaurant',
      businessAddress: '123 Test Street',
      documents: {
        governmentId: 'temp-gov-id-url',
        proofOfAddress: 'temp-address-url',
        proofOfBusiness: 'temp-business-url'
      }
    });
    
    console.log('Create result:', createResult);
    
    if (!createResult.success) {
      throw new Error(`Create failed: ${createResult.error}`);
    }
    
    businessId = createResult.businessId;
    profileId = createResult.profileId;
    authUserId = createResult.authUserId;
    
    console.log(`✅ Created vendor - Business ID: ${businessId}, Profile ID: ${profileId}, Auth User ID: ${authUserId}`);
    
    // Verify in both systems
    const dbCheck = await pool.query('SELECT * FROM businesses_new WHERE id = $1', [businessId]);
    const authCheck = await supabaseAdmin.auth.admin.getUserById(authUserId!);
    
    console.log(`   DB: Business exists: ${dbCheck.rows.length > 0}`);
    console.log(`   Auth: User exists: ${!authCheck.error && !!authCheck.data.user}`);
    
    // 2. Update email
    console.log('\n2️⃣ Updating email...');
    const newEmail = `updated-smoke-test-${Date.now()}@example.com`;
    const emailResult = await updateVendorEmail({ profileId: profileId!, newEmail });
    
    console.log('Email update result:', emailResult);
    
    if (!emailResult.success) {
      throw new Error(`Email update failed: ${emailResult.error}`);
    }
    
    // Verify email sync
    const dbEmailCheck = await pool.query('SELECT email FROM profiles WHERE id = $1', [profileId]);
    const authEmailCheck = await supabaseAdmin.auth.admin.getUserById(authUserId!);
    
    console.log(`   DB email: ${dbEmailCheck.rows[0]?.email}`);
    console.log(`   Auth email: ${authEmailCheck.data.user?.email}`);
    console.log(`   Emails match: ${dbEmailCheck.rows[0]?.email === authEmailCheck.data.user?.email}`);
    
    // 3. Update phone
    console.log('\n3️⃣ Updating phone...');
    const newPhone = '+19876543210';
    const phoneResult = await updateVendorPhone({ profileId: profileId!, newPhoneE164: newPhone });
    
    console.log('Phone update result:', phoneResult);
    
    if (!phoneResult.success) {
      throw new Error(`Phone update failed: ${phoneResult.error}`);
    }
    
    // 4. Change password
    console.log('\n4️⃣ Changing password...');
    const passwordResult = await setVendorPassword({ profileId: profileId!, newPassword: 'NewPassword456!' });
    
    console.log('Password update result:', passwordResult);
    
    if (!passwordResult.success) {
      throw new Error(`Password update failed: ${passwordResult.error}`);
    }
    
    // 5. Change status to approved
    console.log('\n5️⃣ Approving vendor...');
    const approveResult = await setVendorStatus({ profileId: profileId!, status: 'approved' });
    
    console.log('Approval result:', approveResult);
    
    if (!approveResult.success) {
      throw new Error(`Approval failed: ${approveResult.error}`);
    }
    
    // 6. Change status to deactivated
    console.log('\n6️⃣ Deactivating vendor...');
    const deactivateResult = await setVendorStatus({ profileId: profileId!, status: 'deactivated' });
    
    console.log('Deactivation result:', deactivateResult);
    
    if (!deactivateResult.success) {
      throw new Error(`Deactivation failed: ${deactivateResult.error}`);
    }
    
    // 7. Reactivate (set to approved)
    console.log('\n7️⃣ Reactivating vendor...');
    const reactivateResult = await setVendorStatus({ profileId: profileId!, status: 'approved' });
    
    console.log('Reactivation result:', reactivateResult);
    
    if (!reactivateResult.success) {
      throw new Error(`Reactivation failed: ${reactivateResult.error}`);
    }
    
    // 8. Delete vendor
    console.log('\n8️⃣ Deleting vendor...');
    const deleteResult = await deleteVendorFully({ businessId: businessId! });
    
    console.log('Delete result:', deleteResult);
    
    if (!deleteResult.success) {
      throw new Error(`Delete failed: ${deleteResult.error}`);
    }
    
    // Final verification - both should be gone
    const finalDbCheck = await pool.query('SELECT * FROM businesses_new WHERE id = $1', [businessId]);
    const finalProfileCheck = await pool.query('SELECT * FROM profiles WHERE id = $1', [profileId]);
    
    let finalAuthCheck;
    try {
      finalAuthCheck = await supabaseAdmin.auth.admin.getUserById(authUserId!);
    } catch {
      finalAuthCheck = { error: { message: 'User not found' } };
    }
    
    console.log(`   Business deleted from DB: ${finalDbCheck.rows.length === 0}`);
    console.log(`   Profile deleted from DB: ${finalProfileCheck.rows.length === 0}`);
    console.log(`   Auth user deleted: ${!!finalAuthCheck.error}`);
    
    if (finalDbCheck.rows.length === 0 && finalProfileCheck.rows.length === 0 && finalAuthCheck.error) {
      console.log('\n✅ SMOKE TEST PASSED - All sync operations work correctly!');
    } else {
      console.log('\n❌ SMOKE TEST FAILED - Cleanup verification failed');
    }
    
  } catch (error) {
    console.error('\n❌ SMOKE TEST FAILED:', error);
    
    // Cleanup on failure
    if (businessId) {
      console.log('🧹 Attempting cleanup...');
      try {
        await deleteVendorFully({ businessId });
        console.log('✅ Cleanup successful');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      }
    }
  } finally {
    await pool.end();
  }
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSmokeTest().catch(console.error);
}

export { runSmokeTest };