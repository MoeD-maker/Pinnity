import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

import { randomUUID } from 'crypto';

// Initialize Supabase admin client for Auth operations
// Extract Supabase URL from DATABASE_URL if it's a Supabase connection
let supabaseUrl = 'https://your-project.supabase.co';
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (process.env.DATABASE_URL?.includes('supabase')) {
  try {
    const url = new URL(process.env.DATABASE_URL.replace('postgresql://', 'https://'));
    supabaseUrl = `https://${url.hostname.replace('db.', '')}`;
  } catch (e) {
    console.warn('VendorSync: Could not parse Supabase URL from DATABASE_URL, using placeholder');
  }
}

// Initialize Supabase client (fallback mode if not properly configured)
const isSupabaseConfigured = supabaseServiceKey && supabaseServiceKey !== '' && !supabaseUrl.includes('your-project');

const supabaseAdmin = isSupabaseConfigured ? createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Sync outbox for failed operations
interface SyncOutboxEntry {
  id?: number;
  type: string;
  payload: any;
  attempts: number;
  last_error?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface VendorCreateInput {
  email: string;
  password: string;
  phone?: string;
  businessName: string;
  businessCategory: string;
  businessAddress?: string;
  documents?: {
    governmentId?: string;
    proofOfAddress?: string;
    proofOfBusiness?: string;
  };
}

export interface SyncResult {
  success: boolean;
  profileId?: string;
  authUserId?: string;
  businessId?: number;
  partial?: boolean;
  error?: string;
  outboxUsed?: boolean;
}

// Helper functions
export async function getAuthIdByProfileId(profileId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT auth_user_id FROM profiles WHERE id = $1',
    [profileId]
  );
  return result.rows[0]?.auth_user_id || null;
}

export async function getProfileByBusinessId(businessId: number): Promise<any> {
  const result = await pool.query(`
    SELECT p.*, b.business_name 
    FROM profiles p 
    JOIN businesses_new b ON b.profile_id = p.id 
    WHERE b.id = $1
  `, [businessId]);
  return result.rows[0] || null;
}

async function addToSyncOutbox(type: string, payload: any, error?: string): Promise<void> {
  await pool.query(`
    INSERT INTO sync_outbox (type, payload, attempts, last_error, created_at, updated_at)
    VALUES ($1, $2, 0, $3, NOW(), NOW())
  `, [type, JSON.stringify(payload), error || null]);
}

// Main sync functions
export async function createVendorWithAuth(input: VendorCreateInput): Promise<SyncResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Create Supabase Auth user first (or generate UUID if Supabase not configured)
    let authUserId: string;
    
    if (!supabaseAdmin) {
      // Fallback: generate a UUID for auth_user_id (simulating Auth user creation)
      authUserId = `auth_${randomUUID()}`;
      console.log(`VendorSync: createVendorWithAuth using fallback auth ID - email:${input.email} authUserId:${authUserId}`);
    } else {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        phone: input.phone,
        email_confirm: true,
        phone_confirm: !!input.phone,
        user_metadata: {
          user_type: 'business',
          business_name: input.businessName
        }
      });

      if (authError || !authUser.user) {
        console.log(`VendorSync: createVendorWithAuth failed at Auth step - email:${input.email} error:${authError?.message}`);
        await client.query('ROLLBACK');
        return { success: false, error: `Auth creation failed: ${authError?.message}` };
      }

      authUserId = authUser.user.id;
    }

    try {
      // 2. Create profile
      const profileResult = await client.query(`
        INSERT INTO profiles (auth_user_id, email, phone, user_type, created_at, updated_at)
        VALUES ($1, $2, $3, 'business', NOW(), NOW())
        RETURNING id
      `, [authUserId, input.email, input.phone || null]);

      const profileId = profileResult.rows[0].id;

      // 3. Create business (NO password storage)
      const businessResult = await client.query(`
        INSERT INTO businesses_new (
          profile_id, business_name, business_category,
          email, phone, verification_status,
          government_id, proof_of_address, proof_of_business,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, NOW(), NOW())
        RETURNING id
      `, [
        profileId, input.businessName, input.businessCategory,
        input.email, input.phone || null,
        input.documents?.governmentId || null,
        input.documents?.proofOfAddress || null,
        input.documents?.proofOfBusiness || null
      ]);

      const businessId = businessResult.rows[0].id;

      await client.query('COMMIT');
      console.log(`VendorSync: createVendorWithAuth success - profileId:${profileId} authUserId:${authUserId} businessId:${businessId} outboxUsed:false`);
      
      return {
        success: true,
        profileId,
        authUserId,
        businessId,
        partial: false,
        outboxUsed: false
      };

    } catch (dbError) {
      // DB failed but Auth succeeded - add to outbox and cleanup Auth
      await client.query('ROLLBACK');
      
      if (supabaseAdmin) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      
      await addToSyncOutbox('create_vendor_db_retry', {
        authUserId,
        input
      }, (dbError as Error).message);

      console.log(`VendorSync: createVendorWithAuth partial failure - authUserId:${authUserId} error:${(dbError as Error).message} outboxUsed:true`);
      
      return {
        success: false,
        authUserId,
        partial: true,
        error: `Database creation failed: ${(dbError as Error).message}`,
        outboxUsed: true
      };
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.log(`VendorSync: createVendorWithAuth failed - email:${input.email} error:${(error as Error).message} outboxUsed:false`);
    return { success: false, error: (error as Error).message, outboxUsed: false };
  } finally {
    client.release();
  }
}

export async function updateVendorEmail({ profileId, newEmail }: { profileId: string; newEmail: string }): Promise<SyncResult> {
  try {
    const authUserId = await getAuthIdByProfileId(profileId);
    if (!authUserId) {
      return { success: false, error: 'Profile not found or missing auth_user_id' };
    }

    // 1. Update Supabase Auth first (or simulate if not configured)
    if (supabaseAdmin) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email: newEmail
      });

      if (authError) {
        console.log(`VendorSync: updateVendorEmail failed at Auth - profileId:${profileId} authUserId:${authUserId} error:${authError.message} outboxUsed:false`);
        return { success: false, error: `Auth update failed: ${authError.message}` };
      }
    } else {
      console.log(`VendorSync: updateVendorEmail simulated auth update - profileId:${profileId} authUserId:${authUserId} newEmail:${newEmail}`);
    }

    try {
      // 2. Update local database
      await pool.query(`
        UPDATE profiles SET email = $1, updated_at = NOW() WHERE id = $2
      `, [newEmail, profileId]);

      await pool.query(`
        UPDATE businesses_new SET email = $1, updated_at = NOW() WHERE profile_id = $2
      `, [newEmail, profileId]);

      console.log(`VendorSync: updateVendorEmail success - profileId:${profileId} authUserId:${authUserId} outboxUsed:false`);
      return { success: true, profileId, authUserId, partial: false, outboxUsed: false };

    } catch (dbError) {
      // Auth succeeded but DB failed - add to outbox
      await addToSyncOutbox('update_email_db_retry', {
        profileId,
        authUserId,
        newEmail
      }, (dbError as Error).message);

      console.log(`VendorSync: updateVendorEmail partial failure - profileId:${profileId} authUserId:${authUserId} error:${(dbError as Error).message} outboxUsed:true`);
      return { success: true, profileId, authUserId, partial: true, outboxUsed: true };
    }

  } catch (error) {
    console.log(`VendorSync: updateVendorEmail failed - profileId:${profileId} error:${(error as Error).message} outboxUsed:false`);
    return { success: false, error: (error as Error).message, outboxUsed: false };
  }
}

export async function updateVendorPhone({ profileId, newPhoneE164 }: { profileId: string; newPhoneE164: string }): Promise<SyncResult> {
  try {
    const authUserId = await getAuthIdByProfileId(profileId);
    if (!authUserId) {
      return { success: false, error: 'Profile not found or missing auth_user_id' };
    }

    // 1. Update Supabase Auth first (or simulate if not configured)
    if (supabaseAdmin) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        phone: newPhoneE164
      });

      if (authError) {
        console.log(`VendorSync: updateVendorPhone failed at Auth - profileId:${profileId} authUserId:${authUserId} error:${authError.message} outboxUsed:false`);
        return { success: false, error: `Auth update failed: ${authError.message}` };
      }
    } else {
      console.log(`VendorSync: updateVendorPhone simulated auth update - profileId:${profileId} authUserId:${authUserId} newPhone:${newPhoneE164}`);
    }

    try {
      // 2. Update local database
      await pool.query(`
        UPDATE profiles SET phone = $1, updated_at = NOW() WHERE id = $2
      `, [newPhoneE164, profileId]);

      await pool.query(`
        UPDATE businesses_new SET phone = $1, updated_at = NOW() WHERE profile_id = $2
      `, [newPhoneE164, profileId]);

      console.log(`VendorSync: updateVendorPhone success - profileId:${profileId} authUserId:${authUserId} outboxUsed:false`);
      return { success: true, profileId, authUserId, partial: false, outboxUsed: false };

    } catch (dbError) {
      await addToSyncOutbox('update_phone_db_retry', {
        profileId,
        authUserId,
        newPhoneE164
      }, (dbError as Error).message);

      console.log(`VendorSync: updateVendorPhone partial failure - profileId:${profileId} authUserId:${authUserId} error:${(dbError as Error).message} outboxUsed:true`);
      return { success: true, profileId, authUserId, partial: true, outboxUsed: true };
    }

  } catch (error) {
    console.log(`VendorSync: updateVendorPhone failed - profileId:${profileId} error:${(error as Error).message} outboxUsed:false`);
    return { success: false, error: (error as Error).message, outboxUsed: false };
  }
}

export async function setVendorPassword({ profileId, newPassword }: { profileId: string; newPassword: string }): Promise<SyncResult> {
  try {
    const authUserId = await getAuthIdByProfileId(profileId);
    if (!authUserId) {
      return { success: false, error: 'Profile not found or missing auth_user_id' };
    }

    // 1. Update Supabase Auth first (or simulate if not configured)
    if (supabaseAdmin) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: newPassword
      });

      if (authError) {
        console.log(`VendorSync: setVendorPassword failed at Auth - profileId:${profileId} authUserId:${authUserId} error:${authError.message} outboxUsed:false`);
        return { success: false, error: `Auth update failed: ${authError.message}` };
      }
    } else {
      console.log(`VendorSync: setVendorPassword simulated auth update - profileId:${profileId} authUserId:${authUserId}`);
    }

    // Password is now stored only in Supabase Auth, no local DB update needed
    console.log(`VendorSync: setVendorPassword success - profileId:${profileId} authUserId:${authUserId} outboxUsed:false`);
    return { success: true, profileId, authUserId, partial: false, outboxUsed: false };

  } catch (error) {
    console.log(`VendorSync: setVendorPassword failed - profileId:${profileId} error:${(error as Error).message} outboxUsed:false`);
    return { success: false, error: (error as Error).message, outboxUsed: false };
  }
}

export async function setVendorStatus({ profileId, status }: { profileId: string; status: 'approved' | 'pending' | 'rejected' | 'deactivated' }): Promise<SyncResult> {
  try {
    const authUserId = await getAuthIdByProfileId(profileId);
    if (!authUserId) {
      return { success: false, error: 'Profile not found or missing auth_user_id' };
    }

    // 1. Update local database first (status is app-specific)
    await pool.query(`
      UPDATE businesses_new SET verification_status = $1, updated_at = NOW() WHERE profile_id = $2
    `, [status, profileId]);

    // 2. Update Supabase Auth user metadata (or simulate if not configured)
    if (supabaseAdmin) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        user_metadata: {
          verification_status: status,
          updated_at: new Date().toISOString()
        }
      });

      if (authError) {
        await addToSyncOutbox('update_status_auth_retry', {
          profileId,
          authUserId,
          status
        }, authError.message);

        console.log(`VendorSync: setVendorStatus partial failure - profileId:${profileId} authUserId:${authUserId} status:${status} error:${authError.message} outboxUsed:true`);
        return { success: true, profileId, authUserId, partial: true, outboxUsed: true };
      }
    } else {
      console.log(`VendorSync: setVendorStatus simulated auth update - profileId:${profileId} authUserId:${authUserId} status:${status}`);
    }

    console.log(`VendorSync: setVendorStatus success - profileId:${profileId} authUserId:${authUserId} status:${status} outboxUsed:false`);
    return { success: true, profileId, authUserId, partial: false, outboxUsed: false };

  } catch (error) {
    console.log(`VendorSync: setVendorStatus failed - profileId:${profileId} status:${status} error:${(error as Error).message} outboxUsed:false`);
    return { success: false, error: (error as Error).message, outboxUsed: false };
  }
}

export async function deleteVendorFully({ businessId }: { businessId: number }): Promise<SyncResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get profile and auth info
    const profile = await getProfileByBusinessId(businessId);
    if (!profile) {
      console.log(`VendorSync: deleteVendorFully failed - businessId:${businessId} error:Profile not found outboxUsed:false`);
      return { success: false, error: 'Business/Profile not found' };
    }

    const { id: profileId, auth_user_id: authUserId, business_name } = profile;

    try {
      // 1. Delete from local database first (cascade will handle related data)
      await client.query('DELETE FROM businesses_new WHERE id = $1', [businessId]);
      
      // Check if profile has other businesses
      const otherBusinesses = await client.query(
        'SELECT COUNT(*) FROM businesses_new WHERE profile_id = $1',
        [profileId]
      );

      const shouldDeleteProfile = parseInt(otherBusinesses.rows[0].count) === 0;
      
      if (shouldDeleteProfile) {
        await client.query('DELETE FROM profiles WHERE id = $1', [profileId]);
      }

      // 2. Delete from Supabase Auth if profile was deleted
      if (shouldDeleteProfile && authUserId) {
        if (supabaseAdmin) {
          const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
          
          if (authError) {
            // DB succeeded but Auth failed - add to outbox
            await addToSyncOutbox('delete_auth_user_retry', {
              authUserId,
              businessId,
              profileId: shouldDeleteProfile ? profileId : null
            }, authError.message);

            await client.query('COMMIT');
            console.log(`VendorSync: deleteVendorFully partial success - businessId:${businessId} profileId:${profileId} authUserId:${authUserId} error:${authError.message} outboxUsed:true`);
            
            return {
              success: true,
              businessId,
              profileId,
              authUserId,
              partial: true,
              outboxUsed: true
            };
          }
        } else {
          console.log(`VendorSync: deleteVendorFully simulated auth deletion - businessId:${businessId} profileId:${profileId} authUserId:${authUserId}`);
        }
      }

      await client.query('COMMIT');
      console.log(`VendorSync: deleteVendorFully success - businessId:${businessId} profileId:${profileId} authUserId:${authUserId} deletedProfile:${shouldDeleteProfile} outboxUsed:false`);
      
      return {
        success: true,
        businessId,
        profileId: shouldDeleteProfile ? profileId : undefined,
        authUserId: shouldDeleteProfile ? authUserId : undefined,
        partial: false,
        outboxUsed: false
      };

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.log(`VendorSync: deleteVendorFully failed at DB - businessId:${businessId} profileId:${profileId} error:${(dbError as Error).message} outboxUsed:false`);
      return { success: false, error: `Database deletion failed: ${(dbError as Error).message}`, outboxUsed: false };
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.log(`VendorSync: deleteVendorFully failed - businessId:${businessId} error:${(error as Error).message} outboxUsed:false`);
    return { success: false, error: (error as Error).message, outboxUsed: false };
  } finally {
    client.release();
  }
}