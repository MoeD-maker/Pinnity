// @ts-nocheck
import express from 'express';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
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

// GET /api/v1/admin/tools/reconcile-auth - Check for sync inconsistencies
router.get('/reconcile-auth', async (req, res) => {
  try {
    console.log('Admin reconcile: Starting auth/profile reconciliation check...');

    // Get all profiles with their auth_user_id
    const profilesResult = await pool.query(`
      SELECT id, auth_user_id, email, user_type, created_at 
      FROM profiles 
      WHERE user_type = 'business'
      ORDER BY created_at DESC
    `);

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('Admin reconcile: Failed to fetch auth users:', authError);
      return res.status(500).json({ error: 'Failed to fetch auth users' });
    }

    const profiles = profilesResult.rows;
    
    // Find profiles without auth_user_id or with invalid auth_user_id
    const profilesWithoutAuth = profiles.filter(p => !p.auth_user_id);
    
    // Find auth users without corresponding profiles
    const authUserIds = new Set(profiles.map(p => p.auth_user_id).filter(Boolean));
    const authUsersWithoutProfiles = authUsers.users.filter(user => !authUserIds.has(user.id));
    
    // Find email mismatches
    const profilesWithEmailMismatch = [];
    for (const profile of profiles) {
      if (profile.auth_user_id) {
        const authUser = authUsers.users.find(u => u.id === profile.auth_user_id);
        if (authUser && authUser.email !== profile.email) {
          profilesWithEmailMismatch.push({
            profile_id: profile.id,
            auth_user_id: profile.auth_user_id,
            profile_email: profile.email,
            auth_email: authUser.email
          });
        }
      }
    }

    const result = {
      profiles_without_auth: profilesWithoutAuth.map(p => ({
        profile_id: p.id,
        email: p.email,
        user_type: p.user_type,
        created_at: p.created_at
      })),
      auth_users_without_profiles: authUsersWithoutProfiles.map(u => ({
        auth_user_id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: u.user_metadata
      })),
      profiles_with_email_mismatch: profilesWithEmailMismatch,
      summary: {
        total_profiles: profiles.length,
        total_auth_users: authUsers.users.length,
        issues_found: profilesWithoutAuth.length + authUsersWithoutProfiles.length + profilesWithEmailMismatch.length
      }
    };

    console.log(`Admin reconcile: Found ${result.summary.issues_found} sync issues`);
    res.json(result);

  } catch (error) {
    console.error('Admin reconcile: Error during reconciliation check:', error);
    res.status(500).json({ error: 'Failed to perform reconciliation check' });
  }
});

// POST /api/v1/admin/tools/reconcile-auth/fix - Fix specific sync issues
router.post('/reconcile-auth/fix', async (req, res) => {
  try {
    const { mode, auth_user_id, profile_id } = req.body;

    if (!mode || !['delete_orphan_profile', 'delete_orphan_auth', 'link_profile_auth', 'sync_email'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid or missing mode' });
    }

    console.log(`Admin reconcile fix: Starting ${mode} operation...`);

    switch (mode) {
      case 'delete_orphan_profile':
        if (!profile_id) {
          return res.status(400).json({ error: 'profile_id required for delete_orphan_profile' });
        }
        await pool.query('DELETE FROM profiles WHERE id = $1', [profile_id]);
        console.log(`Admin reconcile fix: Deleted orphan profile ${profile_id}`);
        res.json({ success: true, message: `Deleted orphan profile ${profile_id}` });
        break;

      case 'delete_orphan_auth':
        if (!auth_user_id) {
          return res.status(400).json({ error: 'auth_user_id required for delete_orphan_auth' });
        }
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(auth_user_id);
        if (deleteError) {
          throw new Error(`Failed to delete auth user: ${deleteError.message}`);
        }
        console.log(`Admin reconcile fix: Deleted orphan auth user ${auth_user_id}`);
        res.json({ success: true, message: `Deleted orphan auth user ${auth_user_id}` });
        break;

      case 'link_profile_auth':
        if (!profile_id || !auth_user_id) {
          return res.status(400).json({ error: 'Both profile_id and auth_user_id required for link_profile_auth' });
        }
        await pool.query('UPDATE profiles SET auth_user_id = $1 WHERE id = $2', [auth_user_id, profile_id]);
        console.log(`Admin reconcile fix: Linked profile ${profile_id} to auth user ${auth_user_id}`);
        res.json({ success: true, message: `Linked profile ${profile_id} to auth user ${auth_user_id}` });
        break;

      case 'sync_email':
        if (!profile_id || !auth_user_id) {
          return res.status(400).json({ error: 'Both profile_id and auth_user_id required for sync_email' });
        }
        
        // Get profile email
        const profileResult = await pool.query('SELECT email FROM profiles WHERE id = $1', [profile_id]);
        if (profileResult.rows.length === 0) {
          return res.status(404).json({ error: 'Profile not found' });
        }
        
        const profileEmail = profileResult.rows[0].email;
        
        // Update auth user email to match profile
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, {
          email: profileEmail
        });
        
        if (updateError) {
          throw new Error(`Failed to update auth user email: ${updateError.message}`);
        }
        
        console.log(`Admin reconcile fix: Synced email for profile ${profile_id} and auth user ${auth_user_id} to ${profileEmail}`);
        res.json({ success: true, message: `Synced email to ${profileEmail}` });
        break;

      default:
        res.status(400).json({ error: 'Unknown fix mode' });
    }

  } catch (error) {
    console.error('Admin reconcile fix: Error during fix operation:', error);
    res.status(500).json({ error: `Failed to perform fix: ${(error as Error).message}` });
  }
});

export default router;