/**
 * Unified route handlers that integrate the new Supabase-first system
 */
import express from 'express';
import { registerIndividual, registerBusiness, login } from './auth.routes.supabase';
import { getAllUsers, getPendingVendors, updateBusinessStatus, getDashboardStats } from './admin.routes.supabase';
// Remove auth middleware temporarily for testing
// import { authenticate } from '../middleware/auth';
// import { uploadMiddleware } from '../uploadMiddleware.supabase';

export const unifiedRouter = express.Router();

// New Supabase-first auth routes
unifiedRouter.post('/auth/register/individual/unified', registerIndividual);
unifiedRouter.post('/auth/register/business/unified', registerBusiness);
unifiedRouter.post('/auth/login/unified', login);

// New Supabase-first admin routes (temporarily without auth for testing)
unifiedRouter.get('/admin/users/unified', getAllUsers);
unifiedRouter.get('/admin/pending-vendors/unified', getPendingVendors);
unifiedRouter.put('/admin/business/:businessId/status/unified', updateBusinessStatus);
unifiedRouter.get('/admin/dashboard/stats/unified', getDashboardStats);

// Health check for unified system
unifiedRouter.get('/unified/health', async (req, res) => {
  try {
    const { getAllUsersWithBusinesses } = await import('../supabaseQueries');
    const users = await getAllUsersWithBusinesses();
    
    res.json({
      status: 'healthy',
      system: 'unified',
      users: users.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      system: 'unified',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});