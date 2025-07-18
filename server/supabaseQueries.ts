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
 * Update business
 */
export async function updateBusiness(
  businessId: number,
  updates: Partial<Omit<Business, 'id' | 'profile_id' | 'created_at' | 'updated_at'>>
): Promise<Business> {
  try {
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
    
    return result.rows[0];
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
 * Update user profile
 */
export async function updateProfile(
  id: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  try {
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
    
    return result.rows[0];
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}