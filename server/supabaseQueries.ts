/**
 * Supabase database queries for unified user management
 */
import { supabaseAdmin } from './supabaseAdmin';
import { pool } from './db';

export interface Profile {
  id: string;
  supabase_user_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  address?: string;
  user_type: 'individual' | 'business' | 'admin';
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: number;
  profile_id: string;
  business_name: string;
  business_category: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  government_id?: string;
  proof_of_address?: string;
  proof_of_business?: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithBusiness extends Profile {
  business?: Business;
}

/**
 * Get all users with their business information
 */
export async function getAllUsersWithBusinesses(): Promise<UserWithBusiness[]> {
  try {
    const query = `
      SELECT 
        p.*,
        b.id as business_id,
        b.business_name,
        b.business_category,
        b.verification_status,
        b.government_id,
        b.proof_of_address,
        b.proof_of_business,
        b.created_at as business_created_at,
        b.updated_at as business_updated_at
      FROM profiles p
      LEFT JOIN businesses_new b ON p.id = b.profile_id
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      supabase_user_id: row.supabase_user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      address: row.address,
      user_type: row.user_type,
      phone_verified: row.phone_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      business: row.business_id ? {
        id: row.business_id,
        profile_id: row.id,
        business_name: row.business_name,
        business_category: row.business_category,
        verification_status: row.verification_status,
        government_id: row.government_id,
        proof_of_address: row.proof_of_address,
        proof_of_business: row.proof_of_business,
        created_at: row.business_created_at,
        updated_at: row.business_updated_at
      } : null
    }));
  } catch (error) {
    console.error('Error fetching users with businesses:', error);
    throw new Error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user by ID with business information
 */
export async function getUserById(id: string): Promise<UserWithBusiness | null> {
  try {
    const query = `
      SELECT 
        p.*,
        b.id as business_id,
        b.business_name,
        b.business_category,
        b.verification_status,
        b.government_id,
        b.proof_of_address,
        b.proof_of_business,
        b.created_at as business_created_at,
        b.updated_at as business_updated_at
      FROM profiles p
      LEFT JOIN businesses_new b ON p.id = b.profile_id
      WHERE p.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      supabase_user_id: row.supabase_user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      address: row.address,
      user_type: row.user_type,
      phone_verified: row.phone_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      business: row.business_id ? {
        id: row.business_id,
        profile_id: row.id,
        business_name: row.business_name,
        business_category: row.business_category,
        verification_status: row.verification_status,
        government_id: row.government_id,
        proof_of_address: row.proof_of_address,
        proof_of_business: row.proof_of_business,
        created_at: row.business_created_at,
        updated_at: row.business_updated_at
      } : null
    };
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserWithBusiness | null> {
  try {
    const query = `
      SELECT 
        p.*,
        b.id as business_id,
        b.business_name,
        b.business_category,
        b.verification_status,
        b.government_id,
        b.proof_of_address,
        b.proof_of_business,
        b.created_at as business_created_at,
        b.updated_at as business_updated_at
      FROM profiles p
      LEFT JOIN businesses_new b ON p.id = b.profile_id
      WHERE p.email = $1
    `;
    
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      supabase_user_id: row.supabase_user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      address: row.address,
      user_type: row.user_type,
      phone_verified: row.phone_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      business: row.business_id ? {
        id: row.business_id,
        profile_id: row.id,
        business_name: row.business_name,
        business_category: row.business_category,
        verification_status: row.verification_status,
        government_id: row.government_id,
        proof_of_address: row.proof_of_address,
        proof_of_business: row.proof_of_business,
        created_at: row.business_created_at,
        updated_at: row.business_updated_at
      } : null
    };
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw new Error(`Failed to fetch user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create user profile (called after Supabase Auth user creation)
 */
export async function createProfile(
  supabaseUserId: string,
  profileData: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    userType?: 'individual' | 'business' | 'admin';
    phoneVerified?: boolean;
  }
): Promise<Profile> {
  try {
    const query = `
      INSERT INTO profiles (
        supabase_user_id, email, first_name, last_name, 
        phone, address, user_type, phone_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      supabaseUserId,
      profileData.email,
      profileData.firstName,
      profileData.lastName,
      profileData.phone,
      profileData.address,
      profileData.userType || 'individual',
      profileData.phoneVerified || false
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating profile:', error);
    throw new Error(`Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a business for a user
 */
export async function createBusiness(
  profileId: string,
  businessData: {
    businessName: string;
    businessCategory: string;
    governmentId?: string;
    proofOfAddress?: string;
    proofOfBusiness?: string;
  }
): Promise<Business> {
  try {
    const query = `
      INSERT INTO businesses_new (
        profile_id, business_name, business_category, 
        government_id, proof_of_address, proof_of_business, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      profileId,
      businessData.businessName,
      businessData.businessCategory,
      businessData.governmentId,
      businessData.proofOfAddress,
      businessData.proofOfBusiness
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating business:', error);
    throw new Error(`Failed to create business: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update business with Supabase sync
 */
export async function updateBusiness(
  businessId: number,
  updates: Partial<Omit<Business, 'id' | 'profile_id' | 'created_at' | 'updated_at'>>
): Promise<Business> {
  try {
    console.log(`[SUPABASE SYNC] Starting business update for ${businessId}`);
    
    // First update PostgreSQL business record
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const updateValues = Object.values(updates);
    
    const query = `
      UPDATE businesses_new 
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [businessId, ...updateValues]);
    
    if (result.rows.length === 0) {
      throw new Error('Business not found');
    }

    const updatedBusiness = result.rows[0];

    // If verification status changed, sync to Supabase Auth user metadata
    if (updates.verification_status) {
      console.log(`[SUPABASE SYNC] Business verification status changed to: ${updates.verification_status}`);
      
      // Get the profile to find supabase_user_id
      const profile = await getUserById(updatedBusiness.profile_id);
      
      if (profile?.supabase_user_id) {
        console.log(`[SUPABASE SYNC] Syncing verification status to Supabase Auth: ${profile.supabase_user_id}`);
        
        const { error: supabaseError } = await supabaseAdmin.auth.admin.updateUserById(
          profile.supabase_user_id,
          {
            user_metadata: {
              ...profile,
              businessVerificationStatus: updates.verification_status,
              businessName: updatedBusiness.business_name,
              businessCategory: updatedBusiness.business_category
            }
          }
        );
        
        if (supabaseError) {
          console.error('[SUPABASE SYNC] Error syncing business status to Supabase Auth:', supabaseError);
          // Don't throw here - local update was successful
        } else {
          console.log('[SUPABASE SYNC] Successfully synced business status to Supabase Auth');
        }
      }
    }
    
    return updatedBusiness;
  } catch (error) {
    console.error('Error updating business:', error);
    throw new Error(`Failed to update business: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all pending businesses for admin approval
 */
export async function getPendingBusinesses(): Promise<UserWithBusiness[]> {
  try {
    const query = `
      SELECT 
        p.*,
        b.id as business_id,
        b.business_name,
        b.business_category,
        b.verification_status,
        b.government_id,
        b.proof_of_address,
        b.proof_of_business,
        b.created_at as business_created_at,
        b.updated_at as business_updated_at
      FROM profiles p
      INNER JOIN businesses_new b ON p.id = b.profile_id
      WHERE b.verification_status = 'pending'
      ORDER BY p.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      supabase_user_id: row.supabase_user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      address: row.address,
      user_type: row.user_type,
      phone_verified: row.phone_verified,
      created_at: row.created_at,
      updated_at: row.updated_at,
      business: {
        id: row.business_id,
        profile_id: row.id,
        business_name: row.business_name,
        business_category: row.business_category,
        verification_status: row.verification_status,
        government_id: row.government_id,
        proof_of_address: row.proof_of_address,
        proof_of_business: row.proof_of_business,
        created_at: row.business_created_at,
        updated_at: row.business_updated_at
      }
    }));
  } catch (error) {
    console.error('Error fetching pending businesses:', error);
    throw new Error(`Failed to fetch pending businesses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update user profile with Supabase sync
 */
export async function updateProfile(
  id: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  try {
    console.log(`[SUPABASE SYNC] Starting profile update for ${id}`);
    
    // First update PostgreSQL profile
    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const updateValues = Object.values(updates);
    
    const query = `
      UPDATE profiles 
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, ...updateValues]);
    
    if (result.rows.length === 0) {
      throw new Error('Profile not found');
    }

    const updatedProfile = result.rows[0];

    // Sync to Supabase Auth if supabase_user_id exists
    if (updatedProfile.supabase_user_id) {
      console.log(`[SUPABASE SYNC] Syncing profile updates to Supabase Auth: ${updatedProfile.supabase_user_id}`);
      
      const authUpdates: any = {};
      
      // Map profile fields to Supabase Auth user metadata
      if (updates.first_name || updates.last_name) {
        authUpdates.user_metadata = {
          firstName: updatedProfile.first_name,
          lastName: updatedProfile.last_name,
          phone: updatedProfile.phone,
          address: updatedProfile.address,
          userType: updatedProfile.user_type,
          phoneVerified: updatedProfile.phone_verified
        };
      }
      
      if (updates.email) {
        authUpdates.email = updates.email;
      }
      
      if (updates.phone) {
        authUpdates.phone = updates.phone;
      }

      // Update Supabase Auth user if there are changes to sync
      if (Object.keys(authUpdates).length > 0) {
        const { error: supabaseError } = await supabaseAdmin.auth.admin.updateUserById(
          updatedProfile.supabase_user_id,
          authUpdates
        );
        
        if (supabaseError) {
          console.error('[SUPABASE SYNC] Error syncing to Supabase Auth:', supabaseError);
          // Don't throw here - local update was successful
        } else {
          console.log('[SUPABASE SYNC] Successfully synced to Supabase Auth');
        }
      }
    } else {
      console.log('[SUPABASE SYNC] Profile has no supabase_user_id, skipping Auth sync');
    }
    
    return updatedProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete user profile from Supabase (both auth and profile data)
 */
export async function deleteSupabaseUser(profileId: string): Promise<boolean> {
  try {
    console.log(`[SUPABASE DELETE] Starting deletion process for profile ID: ${profileId}`);
    
    // First get the profile to find the supabase_user_id
    const profile = await getUserById(profileId);
    if (!profile) {
      console.log(`[SUPABASE DELETE] Profile ${profileId} not found, skipping deletion`);
      return true; // Consider it successfully deleted if it doesn't exist
    }

    // Delete from Supabase Auth if supabase_user_id exists
    if (profile.supabase_user_id) {
      console.log(`[SUPABASE DELETE] Deleting from Supabase Auth: ${profile.supabase_user_id}`);
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profile.supabase_user_id);
      if (authDeleteError) {
        console.error(`[SUPABASE DELETE] Error deleting auth user ${profile.supabase_user_id}:`, authDeleteError);
        // Don't throw here - continue with profile deletion even if auth deletion fails
      } else {
        console.log(`[SUPABASE DELETE] Successfully deleted from Supabase Auth`);
      }
    }

    // Delete from profiles table
    console.log(`[SUPABASE DELETE] Deleting profile record: ${profileId}`);
    const query = `DELETE FROM profiles WHERE id = $1`;
    const result = await pool.query(query, [profileId]);
    
    console.log(`[SUPABASE DELETE] Profile deletion completed. Rows affected: ${result.rowCount}`);
    return true;

  } catch (error) {
    console.error('[SUPABASE DELETE] Error deleting user:', error);
    throw new Error(`Failed to delete Supabase user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete business from Supabase profiles system
 */
export async function deleteSupabaseBusiness(profileId: string): Promise<boolean> {
  try {
    console.log(`[SUPABASE DELETE] Starting business deletion process for profile ID: ${profileId}`);
    
    // First delete the business record
    const businessQuery = `DELETE FROM businesses_new WHERE profile_id = $1`;
    const businessResult = await pool.query(businessQuery, [profileId]);
    console.log(`[SUPABASE DELETE] Business deletion completed. Rows affected: ${businessResult.rowCount}`);
    
    // Then delete the user profile (which will also handle auth deletion)
    return await deleteSupabaseUser(profileId);

  } catch (error) {
    console.error('[SUPABASE DELETE] Error deleting business:', error);
    throw new Error(`Failed to delete Supabase business: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}