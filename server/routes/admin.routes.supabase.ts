/**
 * Refactored admin routes using Supabase Auth + PostgreSQL profiles
 */
import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { getAllUsersWithBusinesses, getPendingBusinesses, updateBusiness } from '../supabaseQueries';

/**
 * Get all users with their business information
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    console.log("Fetching all users with businesses from unified system");
    
    // Get users from our PostgreSQL profiles table with businesses
    const users = await getAllUsersWithBusinesses();
    
    // Also get Supabase Auth users for comparison/sync
    const { data: supabaseUsers, error: supabaseError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (supabaseError) {
      console.warn("Failed to fetch Supabase users:", supabaseError);
    }

    console.log(`Found ${users.length} users in profiles table`);
    console.log(`Found ${supabaseUsers?.users?.length || 0} users in Supabase Auth`);
    
    // Map to admin dashboard format
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      userType: user.user_type,
      phoneVerified: user.phone_verified,
      createdAt: user.created_at,
      // Include business info if available
      businessName: user.business?.business_name || null,
      businessCategory: user.business?.business_category || null,
      verificationStatus: user.business?.verification_status || null
    }));

    return res.status(200).json({
      users: formattedUsers,
      totalUsers: users.length,
      supabaseUsers: supabaseUsers?.users?.length || 0,
      syncStatus: {
        profilesCount: users.length,
        supabaseCount: supabaseUsers?.users?.length || 0,
        synced: users.filter(u => u.supabase_user_id).length
      }
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ 
      message: "Failed to fetch users",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get pending businesses for approval
 */
export async function getPendingVendors(req: Request, res: Response) {
  try {
    console.log("Fetching pending businesses for approval");
    
    const pendingBusinesses = await getPendingBusinesses();
    
    console.log(`Found ${pendingBusinesses.length} pending businesses`);
    
    // Map to admin dashboard format
    const formattedPendingVendors = pendingBusinesses.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      businessName: user.business?.business_name || '',
      businessCategory: user.business?.business_category || '',
      verificationStatus: user.business?.verification_status || 'pending',
      createdAt: user.created_at,
      businessId: user.business?.id,
      documents: {
        governmentId: user.business?.government_id,
        proofOfAddress: user.business?.proof_of_address,
        proofOfBusiness: user.business?.proof_of_business
      }
    }));

    return res.status(200).json({
      pendingVendors: formattedPendingVendors,
      totalPending: pendingBusinesses.length
    });

  } catch (error) {
    console.error("Error fetching pending vendors:", error);
    return res.status(500).json({ 
      message: "Failed to fetch pending vendors",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Approve or reject a business
 */
export async function updateBusinessStatus(req: Request, res: Response) {
  try {
    const { businessId } = req.params;
    const { status, feedback } = req.body;
    
    if (!businessId || !status) {
      return res.status(400).json({ message: "Business ID and status are required" });
    }
    
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'verified' or 'rejected'" });
    }
    
    console.log(`Updating business ${businessId} status to ${status}`);
    
    const updatedBusiness = await updateBusiness(parseInt(businessId), {
      verification_status: status
    });
    
    console.log(`Business ${businessId} status updated successfully`);
    
    return res.status(200).json({
      message: `Business ${status} successfully`,
      business: updatedBusiness
    });

  } catch (error) {
    console.error("Error updating business status:", error);
    return res.status(500).json({ 
      message: "Failed to update business status",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get admin dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    console.log("Fetching admin dashboard statistics");
    
    // Get all users and businesses
    const allUsers = await getAllUsersWithBusinesses();
    const pendingBusinesses = await getPendingBusinesses();
    
    // Calculate statistics
    const totalUsers = allUsers.length;
    const individualUsers = allUsers.filter(u => u.user_type === 'individual').length;
    const businessUsers = allUsers.filter(u => u.user_type === 'business').length;
    const verifiedBusinesses = allUsers.filter(u => u.business?.verification_status === 'verified').length;
    const pendingBusinessesCount = pendingBusinesses.length;
    const rejectedBusinesses = allUsers.filter(u => u.business?.verification_status === 'rejected').length;
    
    // Get Supabase sync status
    const { data: supabaseUsers, error: supabaseError } = await supabaseAdmin.auth.admin.listUsers();
    const supabaseUserCount = supabaseUsers?.users?.length || 0;
    const syncedUsers = allUsers.filter(u => u.supabase_user_id).length;

    return res.status(200).json({
      totalUsers,
      individualUsers,
      businessUsers,
      verifiedBusinesses,
      pendingBusinesses: pendingBusinessesCount,
      rejectedBusinesses,
      syncStatus: {
        supabaseUsers: supabaseUserCount,
        profileUsers: totalUsers,
        syncedUsers,
        syncPercentage: totalUsers > 0 ? Math.round((syncedUsers / totalUsers) * 100) : 0
      }
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ 
      message: "Failed to fetch dashboard statistics",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}