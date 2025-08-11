import cron from 'node-cron';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Extract Supabase URL from DATABASE_URL if it's a Supabase connection
let supabaseUrl = 'https://your-project.supabase.co';
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (process.env.DATABASE_URL?.includes('supabase')) {
  try {
    const url = new URL(process.env.DATABASE_URL.replace('postgresql://', 'https://'));
    supabaseUrl = `https://${url.hostname.replace('db.', '')}`;
  } catch (e) {
    console.warn('SyncWorker: Could not parse Supabase URL from DATABASE_URL, using placeholder');
  }
}

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const MAX_RETRY_ATTEMPTS = 5;
const BACKOFF_MULTIPLIER = 2;

interface SyncOutboxEntry {
  id: number;
  type: string;
  payload: any;
  attempts: number;
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

async function processSyncOutboxEntry(entry: SyncOutboxEntry): Promise<boolean> {
  const { id, type, payload, attempts } = entry;
  
  try {
    let success = false;
    
    switch (type) {
      case 'create_vendor_db_retry':
        success = await retryCreateVendorDB(payload);
        break;
        
      case 'update_email_db_retry':
        success = await retryUpdateEmailDB(payload);
        break;
        
      case 'update_phone_db_retry':
        success = await retryUpdatePhoneDB(payload);
        break;
        
      case 'update_password_db_retry':
        success = await retryUpdatePasswordDB(payload);
        break;
        
      case 'update_status_auth_retry':
        success = await retryUpdateStatusAuth(payload);
        break;
        
      case 'delete_auth_user_retry':
        success = await retryDeleteAuthUser(payload);
        break;
        
      default:
        console.log(`SyncWorker: Unknown sync type ${type} for entry ${id}`);
        return false;
    }
    
    if (success) {
      // Remove from outbox
      await pool.query('DELETE FROM sync_outbox WHERE id = $1', [id]);
      console.log(`SyncWorker: Successfully processed and removed outbox entry ${id} (${type})`);
      return true;
    } else {
      throw new Error('Retry operation failed');
    }
    
  } catch (error) {
    // Update attempt count and error
    const newAttempts = attempts + 1;
    await pool.query(
      'UPDATE sync_outbox SET attempts = $1, last_error = $2, updated_at = NOW() WHERE id = $3',
      [newAttempts, (error as Error).message, id]
    );
    
    if (newAttempts >= MAX_RETRY_ATTEMPTS) {
      console.log(`SyncWorker: Max retries reached for outbox entry ${id} (${type}), marking as failed`);
      // Could move to a dead letter queue or mark as failed
    } else {
      console.log(`SyncWorker: Retry ${newAttempts}/${MAX_RETRY_ATTEMPTS} failed for outbox entry ${id} (${type}): ${(error as Error).message}`);
    }
    
    return false;
  }
}

async function retryCreateVendorDB(payload: any): Promise<boolean> {
  const { authUserId, input } = payload;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create profile
    const profileResult = await client.query(`
      INSERT INTO profiles (auth_user_id, email, phone, user_type, created_at, updated_at)
      VALUES ($1, $2, $3, 'business', NOW(), NOW())
      RETURNING id
    `, [authUserId, input.email, input.phone || null]);

    const profileId = profileResult.rows[0].id;

    // Create business (NO password storage)
    await client.query(`
      INSERT INTO businesses_new (
        profile_id, business_name, business_category,
        email, phone, verification_status,
        government_id, proof_of_address, proof_of_business,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, NOW(), NOW())
    `, [
      profileId, input.businessName, input.businessCategory,
      input.email, input.phone || null,
      input.documents?.governmentId || null,
      input.documents?.proofOfAddress || null,
      input.documents?.proofOfBusiness || null
    ]);
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function retryUpdateEmailDB(payload: any): Promise<boolean> {
  const { profileId, newEmail } = payload;
  
  await pool.query('UPDATE profiles SET email = $1, updated_at = NOW() WHERE id = $2', [newEmail, profileId]);
  await pool.query('UPDATE businesses_new SET email = $1, updated_at = NOW() WHERE profile_id = $2', [newEmail, profileId]);
  
  return true;
}

async function retryUpdatePhoneDB(payload: any): Promise<boolean> {
  const { profileId, newPhoneE164 } = payload;
  
  await pool.query('UPDATE profiles SET phone = $1, updated_at = NOW() WHERE id = $2', [newPhoneE164, profileId]);
  await pool.query('UPDATE businesses_new SET phone = $1, updated_at = NOW() WHERE profile_id = $2', [newPhoneE164, profileId]);
  
  return true;
}

async function retryUpdatePasswordAuth(payload: any): Promise<boolean> {
  const { authUserId, password } = payload;
  
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { error } = await admin.auth.admin.updateUserById(authUserId, { password });
  if (error) throw new Error(error.message);
  
  return true;
}

async function retryUpdateStatusAuth(payload: any): Promise<boolean> {
  const { authUserId, status } = payload;
  
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    user_metadata: {
      verification_status: status,
      updated_at: new Date().toISOString()
    }
  });
  
  if (error) throw new Error(error.message);
  return true;
}

async function retryDeleteAuthUser(payload: any): Promise<boolean> {
  const { authUserId } = payload;
  
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
  
  if (error) throw new Error(error.message);
  return true;
}

export function startSyncWorker(): void {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      // Get pending outbox entries with exponential backoff
      const result = await pool.query(`
        SELECT id, type, payload, attempts, last_error, created_at, updated_at
        FROM sync_outbox 
        WHERE attempts < $1 
        AND (
          attempts = 0 OR 
          updated_at < NOW() - INTERVAL '${BACKOFF_MULTIPLIER}' MINUTE * POWER(${BACKOFF_MULTIPLIER}, attempts)
        )
        ORDER BY created_at ASC
        LIMIT 10
      `, [MAX_RETRY_ATTEMPTS]);
      
      if (result.rows.length > 0) {
        console.log(`SyncWorker: Processing ${result.rows.length} outbox entries`);
        
        for (const entry of result.rows) {
          await processSyncOutboxEntry({
            ...entry,
            payload: entry.payload
          });
        }
      }
    } catch (error) {
      console.error('SyncWorker: Error processing outbox entries:', error);
    }
  });
  
  console.log('SyncWorker: Started sync worker with 1-minute interval');
}