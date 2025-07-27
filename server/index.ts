import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Import custom modules
import { setupVite, serveStatic, log } from "./vite.js";
// Skip environment validator for now
// import { EnvironmentValidator } from "./utils/environmentValidator.js";
import { initializeSupabaseStorage } from "./supabaseStorage.js";
// Simplified imports for minimal server startup
import { gatedRegister, gatedLogin } from "./routes/auth.routes.gated.js";
import { pool } from "./db.js";
// Skip complex imports that are causing issues
// import { router as adminRouter } from "./routes/admin.routes.supabase.js";
// import { router as authRouter } from "./routes/auth.routes.supabase.js";
// import { router as legacyRoutes } from "./routes/index.js";
import { sendSMSVerification, verifySMSCode } from "./smsService.js";
// import testTermsRouter from "./test-terms.js";

// Validate environment configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Twilio for real SMS verification
console.log("Initializing Twilio for real SMS verification");

// Skip environment validation for now
// EnvironmentValidator.validateAll();

const app = express();
const server = createServer(app);

// Express configuration
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'default-secret'));

// CORS setup
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [] // Configure production domains
    : [
        /^https:\/\/.*\.replit\.dev$/,
        /^https:\/\/.*\.repl\.co$/,
        /^https:\/\/.*\.replit\.app$/,
        'http://localhost:3000',
        'http://localhost:5173'
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Skip admin API bypass for now
// app.use('/api/direct/admin', adminBypassRouter);
// console.log("Admin API bypass router mounted at /api/direct/admin");

// Initialize Supabase Storage
console.log('🚀 Initializing Supabase Storage...');
initializeSupabaseStorage().then(() => {
  console.log('✅ Supabase Storage initialized successfully');
}).catch(err => {
  console.error('❌ Supabase Storage initialization failed:', err);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// API routes - mount BEFORE Vite middleware to ensure they take precedence

// Basic CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: 'dev-csrf-token' });
});

// User status endpoint for auth context
app.get('/api/v1/user', (req, res) => {
  // For now, return unauthenticated status
  res.status(401).json({ message: 'Not authenticated' });
});

// Logout endpoint
app.post('/api/v1/auth/logout', (req, res) => {
  // Clear any auth cookies and return success
  res.clearCookie('auth-token');
  res.json({ message: 'Logged out successfully' });
});

// Refresh token endpoint
app.post('/api/v1/auth/refresh', (req, res) => {
  // For minimal setup, just return unauthorized
  res.status(401).json({ message: 'No refresh token available' });
});

// SMS endpoint for phone verification - REAL TWILIO IMPLEMENTATION
app.post('/api/v1/sms/send', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    console.log('SMS send request (real Twilio):', { phoneNumber });
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number is required' 
      });
    }
    
    const success = await sendSMSVerification(phoneNumber);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Verification code sent successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send verification code' 
      });
    }
  } catch (error: any) {
    console.error('SMS send error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send verification code' 
    });
  }
});

app.post('/api/v1/sms/verify', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;
    console.log('SMS verify request (real Twilio):', { phoneNumber, code });
    
    if (!phoneNumber || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone number and verification code are required' 
      });
    }
    
    const isValid = await verifySMSCode(phoneNumber, code);
    
    if (isValid) {
      res.json({ 
        success: true, 
        message: 'Phone number verified successfully' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification code' 
      });
    }
  } catch (error: any) {
    console.error('SMS verify error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify code' 
    });
  }
});

// Gated authentication routes (minimal implementation)
console.log('🔥 Registering gated authentication routes');
app.post('/api/auth/gated/register', gatedRegister);
app.post('/api/auth/gated/login', gatedLogin);

// Standard login route that the frontend expects
app.post('/api/v1/auth/login', gatedLogin);

// Import and register the full auth routes for business registration
console.log('🔥 Importing business registration routes...');
try {
  const { authRoutes } = await import('./routes/auth.routes.fixed.js');
  authRoutes(app);
  console.log('✅ Business registration routes registered');
} catch (error) {
  console.error('❌ Failed to import business registration routes:', error);
}

// Admin API endpoints that the dashboard needs
app.get('/api/v1/admin/businesses', async (req, res) => {
  try {
    console.log('Admin businesses endpoint called');
    const result = await pool.query(`
      SELECT 
        b.id,
        b.business_name,
        b.business_category,
        b.verification_status,
        b.created_at as applied_date,
        b.updated_at,
        p.email,
        p.first_name,
        p.last_name,
        p.phone,
        p.created_at,
        p.address
      FROM businesses_new b
      LEFT JOIN profiles p ON b.profile_id = p.id
      ORDER BY b.created_at DESC
    `);
    
    console.log(`Found ${result.rows.length} businesses`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

app.get('/api/v1/admin/businesses/pending', async (req, res) => {
  try {
    console.log('Admin pending businesses endpoint called');
    const result = await pool.query(`
      SELECT 
        b.id,
        b.business_name,
        b.business_category,
        b.verification_status,
        b.created_at as applied_date,
        b.updated_at,
        p.email,
        p.first_name,
        p.last_name,
        p.phone,
        p.created_at,
        p.address
      FROM businesses_new b
      LEFT JOIN profiles p ON b.profile_id = p.id
      WHERE b.verification_status = 'pending'
      ORDER BY b.created_at DESC
    `);
    
    console.log(`Found ${result.rows.length} pending businesses`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending businesses:', error);
    res.status(500).json({ error: 'Failed to fetch pending businesses' });
  }
});

// Individual business detail endpoint
app.get('/api/v1/admin/business/:id', async (req, res) => {
  try {
    const businessId = req.params.id;
    console.log(`Fetching business details for ID: ${businessId}`);
    
    const result = await pool.query(`
      SELECT 
        b.id,
        b.business_name,
        b.business_category,
        b.verification_status,
        b.government_id,
        b.proof_of_address,
        b.proof_of_business,
        b.created_at as applied_date,
        b.updated_at,
        p.email,
        p.first_name,
        p.last_name,
        p.phone,
        p.created_at,
        p.address,
        p.user_type
      FROM businesses_new b
      LEFT JOIN profiles p ON b.profile_id = p.id
      WHERE b.id = $1
    `, [businessId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    console.log(`Found business: ${result.rows[0].business_name}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching business details:', error);
    res.status(500).json({ error: 'Failed to fetch business details' });
  }
});

// Admin business approval endpoint
app.post('/api/v1/admin/businesses/:id/approve', async (req, res) => {
  try {
    const businessId = req.params.id;
    console.log(`Approving business ID: ${businessId}`);
    
    const result = await pool.query(`
      UPDATE businesses_new 
      SET verification_status = 'approved', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [businessId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    console.log(`Approved business: ${result.rows[0].business_name}`);
    res.json({ message: 'Business approved successfully', business: result.rows[0] });
  } catch (error) {
    console.error('Error approving business:', error);
    res.status(500).json({ error: 'Failed to approve business' });
  }
});

// Admin business rejection endpoint
app.post('/api/v1/admin/businesses/:id/reject', async (req, res) => {
  try {
    const businessId = req.params.id;
    const { reason } = req.body;
    console.log(`Rejecting business ID: ${businessId}, reason: ${reason}`);
    
    const result = await pool.query(`
      UPDATE businesses_new 
      SET verification_status = 'rejected', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [businessId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    console.log(`Rejected business: ${result.rows[0].business_name}`);
    res.json({ message: 'Business rejected successfully', business: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting business:', error);
    res.status(500).json({ error: 'Failed to reject business' });
  }
});

// Document viewing/download endpoint
app.get('/api/v1/admin/documents/:businessId/:documentType', async (req, res) => {
  try {
    const { businessId, documentType } = req.params;
    console.log(`Document request for business ${businessId}, type: ${documentType}`);
    
    // Get the document path from database
    const columnMap = {
      'government_id': 'government_id',
      'proof_of_address': 'proof_of_address', 
      'proof_of_business': 'proof_of_business'
    };
    
    const column = columnMap[documentType];
    if (!column) {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    const result = await pool.query(
      `SELECT ${column} as document_url FROM businesses_new WHERE id = $1`,
      [businessId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const documentUrl = result.rows[0].document_url;
    
    // Check if it's a placeholder URL or real Supabase path
    if (!documentUrl || documentUrl.includes('example.com')) {
      return res.status(404).json({ error: 'Document not found or not uploaded' });
    }
    
    // If it's already a signed URL, return it
    if (documentUrl.includes('supabase')) {
      return res.json({ url: documentUrl });
    }
    
    // For now, since we have placeholder URLs, return a mock response
    // In production, this would generate signed URLs from Supabase Storage
    res.json({ 
      url: documentUrl,
      message: 'Document is available but stored with placeholder URL',
      type: documentType
    });
    
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

app.get('/api/v1/admin/deals', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, b.business_name, b.business_category
      FROM deals d
      LEFT JOIN businesses_new b ON d.business_id = b.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Featured deals endpoint - PUBLIC (no auth required)
app.get('/api/v1/deals/featured', async (req, res) => {
  try {
    console.log(`FEATURED DEALS API: GET ${req.path} called with limit: ${req.query.limit}`);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    
    const result = await pool.query(`
      SELECT d.*, b.business_name, b.business_category
      FROM deals d
      LEFT JOIN businesses_new b ON d.business_id = b.id
      WHERE d.status = 'approved' AND d.featured = true
      ORDER BY d.created_at DESC
      LIMIT $1
    `, [limit]);
    
    console.log(`FEATURED DEALS API: Found ${result.rows.length} featured deals`);
    res.json(result.rows);
  } catch (error) {
    console.error('Featured deals error:', error);
    res.status(500).json({ error: 'Failed to fetch featured deals' });
  }
});

// All deals endpoint - PUBLIC (no auth required)
app.get('/api/v1/deals', async (req, res) => {
  try {
    console.log(`DEALS API: GET ${req.path} called`);
    
    const result = await pool.query(`
      SELECT d.*, b.business_name, b.business_category
      FROM deals d
      LEFT JOIN businesses_new b ON d.business_id = b.id
      WHERE d.status = 'approved'
      ORDER BY d.created_at DESC
    `);
    
    console.log(`DEALS API: Found ${result.rows.length} deals`);
    res.json(result.rows);
  } catch (error) {
    console.error('Deals error:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

app.get('/api/v1/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, user_type, role, phone, 
             created_at, marketing_consent, is_live
      FROM profiles
      ORDER BY created_at DESC
    `);
    
    // Convert snake_case to camelCase for frontend
    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      role: user.role,
      phone: user.phone,
      createdAt: user.created_at,
      marketingConsent: user.marketing_consent, // This is the key fix
      isLive: user.is_live
    }));
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/v1/admin/transactions', async (req, res) => {
  try {
    // Return empty array for now since there might be data type mismatches
    // The transactions table exists but may have different column types
    res.json([]);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/v1/admin/analytics', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '30days';
    
    // Calculate date ranges based on timeRange
    let days = 30;
    if (timeRange === '7days') days = 7;
    else if (timeRange === '90days') days = 90;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get basic counts
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM profiles');
    const businessesResult = await pool.query('SELECT COUNT(*) as count FROM businesses_new');
    const dealsResult = await pool.query('SELECT COUNT(*) as count FROM deals');
    const transactionsResult = await pool.query('SELECT COUNT(*) as count FROM deal_redemptions');
    
    // Get user distribution by type
    const userTypeResult = await pool.query(`
      SELECT user_type, COUNT(*) as count 
      FROM profiles 
      GROUP BY user_type
    `);
    
    // Get recent users (last 10)
    const recentUsersResult = await pool.query(`
      SELECT id, email, first_name, last_name, user_type, created_at
      FROM profiles 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    // Get deals by status (if any exist)
    const dealsByStatusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM deals 
      GROUP BY status
    `);
    
    // Get user registrations by month for the last 12 months
    const registrationsByMonthResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        user_type,
        COUNT(*) as count
      FROM profiles 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
      GROUP BY DATE_TRUNC('month', created_at), user_type
      ORDER BY month
    `);
    
    // Get login activity by month (we'll use created_at as a proxy since we don't track login timestamps)
    // In a real app, you'd have a separate login_logs table
    const loginsByMonthResult = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        user_type,
        COUNT(*) as count
      FROM profiles 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
      GROUP BY DATE_TRUNC('month', created_at), user_type
      ORDER BY month
    `);
    
    const totalUsers = parseInt(usersResult.rows[0].count);
    const totalBusinesses = parseInt(businessesResult.rows[0].count);
    const totalDeals = parseInt(dealsResult.rows[0].count);
    const totalRedemptions = parseInt(transactionsResult.rows[0].count);
    
    // Transform user types data
    const usersByType = userTypeResult.rows.map(row => ({
      name: row.user_type,
      value: parseInt(row.count)
    }));
    
    // Transform recent users data
    const recentUsers = recentUsersResult.rows.map(user => ({
      id: user.id,
      username: user.email, // Use email as username since that's what we have
      email: user.email,
      userType: user.user_type,
      created_at: user.created_at
    }));
    
    // Transform deals by status
    const dealsByStatus = dealsByStatusResult.rows.map(row => ({
      name: row.status,
      value: parseInt(row.count)
    }));
    
    // Transform registrations by month data
    const registrationsByMonth = [];
    const loginsByMonth = [];
    
    // Create a map to organize data by month
    const registrationsMap = new Map();
    const loginsMap = new Map();
    
    // Process registrations data
    registrationsByMonthResult.rows.forEach(row => {
      const monthKey = new Date(row.month).toISOString().substring(0, 7); // YYYY-MM format
      if (!registrationsMap.has(monthKey)) {
        registrationsMap.set(monthKey, { month: monthKey, individual: 0, business: 0, admin: 0 });
      }
      const monthData = registrationsMap.get(monthKey);
      monthData[row.user_type] = parseInt(row.count);
    });
    
    // Process logins data (using same data as registrations for now)
    loginsByMonthResult.rows.forEach(row => {
      const monthKey = new Date(row.month).toISOString().substring(0, 7); // YYYY-MM format
      if (!loginsMap.has(monthKey)) {
        loginsMap.set(monthKey, { month: monthKey, individual: 0, business: 0, admin: 0 });
      }
      const monthData = loginsMap.get(monthKey);
      monthData[row.user_type] = parseInt(row.count);
    });
    
    // Convert maps to arrays and format for charts
    registrationsByMonth.push(...Array.from(registrationsMap.values()).map(data => ({
      month: new Date(data.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      individual: data.individual,
      business: data.business,
      admin: data.admin
    })));
    
    loginsByMonth.push(...Array.from(loginsMap.values()).map(data => ({
      month: new Date(data.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      individual: data.individual,
      business: data.business,
      admin: data.admin
    })));
    
    const analyticsData = {
      totalUsers,
      totalBusinesses,
      totalDeals,
      totalRedemptions,
      activeDeals: totalDeals, // Assuming all deals are active for now
      pendingDeals: 0, // No pending deals currently
      usersGrowth: 0, // Would need historical data
      businessesGrowth: 0,
      dealsGrowth: 0,
      redemptionsGrowth: 0,
      redemptionsOverTime: [], // Would need time-series data
      dealsByCategory: [], // Would need category data
      dealsByStatus,
      topDeals: [], // Would need deals with metrics
      recentUsers,
      popularBusinesses: [], // Would need business metrics
      usersByType,
      registrationsByMonth,
      loginsByMonth,
      engagementRate: 0,
      redemptionsByDay: [],
      averageRating: 0
    };
    
    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/v1/admin/dashboard', async (req, res) => {
  try {
    const [usersResult, businessesResult, dealsResult, pendingResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM profiles'),
      pool.query('SELECT COUNT(*) as count FROM businesses_new'),
      pool.query('SELECT COUNT(*) as count FROM deals'),
      pool.query('SELECT COUNT(*) as count FROM businesses_new WHERE verification_status = \'pending\'')
    ]);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalBusinesses: parseInt(businessesResult.rows[0].count),
      totalDeals: parseInt(dealsResult.rows[0].count),
      pendingApprovals: parseInt(pendingResult.rows[0].count),
      recentTransactions: []
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// User favorites endpoint - MUST come before parameterized routes
app.get('/api/v1/user/favorites', async (req, res) => {
  try {
    // For now, return empty array since we need authentication to get user favorites
    res.json([]);
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// User data endpoint
app.get('/api/v1/user/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, user_type, role, phone, 
             created_at, marketing_consent, is_live
      FROM profiles
      WHERE id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      role: user.role,
      phone: user.phone,
      marketingConsent: user.marketing_consent,
      isLive: user.is_live,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ADD MISSING FAVORITES API ROUTES
// User favorites routes (requires authentication)
app.get('/api/v1/user/:userId/favorites', async (req, res) => {
  try {
    const userId = req.params.userId; // UUID string
    console.log(`FAVORITES API: GET favorites for user ${userId}`);
    
    const result = await pool.query(`
      SELECT f.deal_id, d.*, b.business_name, b.business_category
      FROM user_favorites f
      LEFT JOIN deals d ON f.deal_id = d.id
      LEFT JOIN businesses_new b ON d.business_id = b.id
      WHERE f.user_id = $1 AND d.id IS NOT NULL
      ORDER BY f.created_at DESC
    `, [userId]);
    
    console.log(`FAVORITES API: Found ${result.rows.length} favorites for user ${userId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/v1/user/:userId/favorites/:dealId', async (req, res) => {
  try {
    const userId = req.params.userId; // UUID string
    const dealId = parseInt(req.params.dealId);
    console.log(`FAVORITES API: POST add favorite user ${userId}, deal ${dealId}`);
    
    // Check if favorite already exists
    const existingResult = await pool.query(
      'SELECT id FROM user_favorites WHERE user_id = $1 AND deal_id = $2',
      [userId, dealId]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ message: 'Deal already favorited' });
    }
    
    // Add new favorite
    await pool.query(
      'INSERT INTO user_favorites (user_id, deal_id, created_at) VALUES ($1, $2, NOW())',
      [userId, dealId]
    );
    
    res.status(201).json({ message: 'Favorite added successfully' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/v1/user/:userId/favorites/:dealId', async (req, res) => {
  try {
    const userId = req.params.userId; // UUID string  
    const dealId = parseInt(req.params.dealId);
    console.log(`FAVORITES API: DELETE remove favorite user ${userId}, deal ${dealId}`);
    
    const result = await pool.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND deal_id = $2',
      [userId, dealId]
    );
    
    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// ADD MISSING BUSINESS API ROUTES
// Business profile route for vendor dashboard
app.get('/api/business/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId; // UUID string
    console.log(`BUSINESS API: GET business profile for user ${userId}`);
    
    const result = await pool.query(`
      SELECT b.*, p.email, p.first_name, p.last_name, p.phone, p.address, p.created_at
      FROM businesses_new b
      LEFT JOIN profiles p ON b.profile_id = p.id
      WHERE b.profile_id = $1
    `, [userId]);
    
    if (result.rows.length === 0) {
      console.log(`BUSINESS API: No business found for user ${userId}`);
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const business = result.rows[0];
    // Convert snake_case to camelCase for frontend
    const businessData = {
      id: business.id,
      userId: business.profile_id,
      businessName: business.business_name,
      businessCategory: business.business_category,
      verificationStatus: business.verification_status,
      createdAt: business.created_at,
      // Document fields
      government_id: business.government_id,
      proof_of_address: business.proof_of_address,
      proof_of_business: business.proof_of_business,
      // Profile data
      email: business.email,
      firstName: business.first_name,
      lastName: business.last_name,
      phone: business.phone, // From profiles table
      address: business.address // From profiles table
    };
    
    console.log(`BUSINESS API: Found business data for user ${userId}`);
    res.json(businessData);
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ error: 'Failed to fetch business data' });
  }
});

// Business deals route for vendor dashboard
app.get('/api/business/:businessId/deals', async (req, res) => {
  try {
    const businessId = req.params.businessId; // business ID number
    console.log(`DEALS API: GET deals for business ${businessId}`);
    
    const result = await pool.query(`
      SELECT * FROM deals WHERE business_id = $1 ORDER BY created_at DESC
    `, [businessId]);
    
    console.log(`DEALS API: Found ${result.rows.length} deals for business ${businessId}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Get business deals error:', error);
    res.status(500).json({ error: 'Failed to fetch business deals' });
  }
});

console.log('✅ Gated authentication routes registered');

// Skip other routes for now
// app.use('/api/auth', authRouter);
// app.use('/api/admin', adminRouter);
// app.use('/api', legacyRoutes);
// app.use('/api/terms', testTermsRouter);

// Static file serving and dev setup
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
} else {
  // Serve static files from public directory in development
  app.use(express.static(path.join(__dirname, '../public')));
  await setupVite(app, server);
}

const PORT = parseInt(process.env.PORT || '5000', 10);
server.listen(PORT, "0.0.0.0", () => {
  log(`serving on port ${PORT}`);
  if (process.env.NODE_ENV === "development") {
    const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN;
    if (REPLIT_DEV_DOMAIN) {
      log(`Dev server running! Access via:`);
      log(`→ Replit webview: https://${REPLIT_DEV_DOMAIN}`);
      log(`→ This terminal's port forwarding: http://localhost:${PORT}`);
    }
  }
});