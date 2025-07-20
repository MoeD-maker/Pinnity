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
// Skip complex imports that are causing issues
// import { router as adminRouter } from "./routes/admin.routes.supabase.js";
// import { router as authRouter } from "./routes/auth.routes.supabase.js";
// import { router as legacyRoutes } from "./routes/index.js";
// import { initializeTwilio, twilioLogger } from "./smsService.js";
// import testTermsRouter from "./test-terms.js";

// Validate environment configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Skip Twilio initialization for now
console.log("Skipping Twilio initialization");

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

// Gated authentication routes (minimal implementation)
console.log('🔥 Registering gated authentication routes');
app.post('/api/auth/gated/register', gatedRegister);
app.post('/api/auth/gated/login', gatedLogin);
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
  await setupVite(app, server);
}

const PORT = process.env.PORT || 5000;
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