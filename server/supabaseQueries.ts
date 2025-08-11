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
  role: 'individual' | 'vendor' | 'admin';
  is_live: boolean;
  phone_verified: boolean;
  marketing_consent: boolean;
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
      role: row.role,
      is_live: row.is_live,
      phone_verified: row.phone_verified,
      marketing_consent: row.marketing_consent,
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
      marketing_consent: row.marketing_consent,
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
      WHERE lower(p.email) = lower($1)
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
      role: row.role,
      is_live: row.is_live,
      phone_verified: row.phone_verified,
      marketing_consent: row.marketing_consent,
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
 * Create a new profile
 */
export async function createProfile(
  supabaseUserId: string,
  profileData: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    userType: 'individual' | 'business' | 'admin';
    role?: 'individual' | 'vendor' | 'admin';
    isLive?: boolean;
    phoneVerified?: boolean;
    marketingConsent?: boolean;
  }
): Promise<Profile> {
  try {
    const query = `
      INSERT INTO profiles (
        supabase_user_id, email, first_name, last_name, phone, address, 
        user_type, role, is_live, phone_verified, marketing_consent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      supabaseUserId,
      profileData.email,
      profileData.firstName,
      profileData.lastName,
      profileData.phone || null,
      profileData.address || null,
      profileData.userType,
      profileData.role || 'individual',
      profileData.isLive || false,
      profileData.phoneVerified || false,
      profileData.marketingConsent || false
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating profile:', error);
    throw new Error(`Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update a profile
 */
export async function updateProfile(
  id: string,
  updates: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    phoneVerified: boolean;
    marketingConsent: boolean;
  }>
): Promise<Profile | null> {
  try {
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      const columnName = key === 'firstName' ? 'first_name' 
                       : key === 'lastName' ? 'last_name'
                       : key === 'phoneVerified' ? 'phone_verified'
                       : key === 'marketingConsent' ? 'marketing_consent'
                       : key;
      setClause.push(`${columnName} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid updates provided');
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE profiles 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a profile and related data
 */
export async function deleteProfile(id: string): Promise<void> {
  try {
    // Start a transaction
    await pool.query('BEGIN');
    
    try {
      // Delete related businesses first
      await pool.query('DELETE FROM businesses_new WHERE profile_id = $1', [id]);
      
      // Delete the profile
      const result = await pool.query('DELETE FROM profiles WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw new Error('Profile not found');
      }
      
      // Commit the transaction
      await pool.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    throw new Error(`Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a new business for a profile
 */
export async function createBusiness(
  profileId: string,
  businessData: {
    businessName: string;
    businessCategory: string;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
    governmentId?: string;
    proofOfAddress?: string;
    proofOfBusiness?: string;
  }
): Promise<Business> {
  try {
    const query = `
      INSERT INTO businesses_new (
        profile_id, business_name, business_category, verification_status,
        government_id, proof_of_address, proof_of_business
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      profileId,
      businessData.businessName,
      businessData.businessCategory,
      businessData.verificationStatus || 'pending',
      businessData.governmentId || null,
      businessData.proofOfAddress || null,
      businessData.proofOfBusiness || null
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating business:', error);
    throw new Error(`Failed to create business: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get pending businesses for admin approval
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
      ORDER BY b.created_at DESC
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
      marketing_consent: row.marketing_consent,
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
 * Update a business
 */
export async function updateBusiness(
  businessId: number,
  updates: Partial<{
    businessName: string;
    businessCategory: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    governmentId: string;
    proofOfAddress: string;
    proofOfBusiness: string;
  }>
): Promise<Business | null> {
  try {
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      const columnName = key === 'businessName' ? 'business_name' 
                       : key === 'businessCategory' ? 'business_category'
                       : key === 'verificationStatus' ? 'verification_status'
                       : key === 'governmentId' ? 'government_id'
                       : key === 'proofOfAddress' ? 'proof_of_address'
                       : key === 'proofOfBusiness' ? 'proof_of_business'
                       : key;
      setClause.push(`${columnName} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid updates provided');
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(businessId);
    
    const query = `
      UPDATE businesses_new 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error updating business:', error);
    throw new Error(`Failed to update business: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}