# Pinnity - Local Deal Discovery Platform

## Overview

Pinnity is a comprehensive full-stack web application that connects local businesses with customers through deal discovery. The platform enables businesses to create and manage promotional deals while providing customers with an intuitive interface to browse, favorite, and redeem local offers. Built with modern TypeScript/React frontend and Express.js backend, the application emphasizes security, user experience, and scalable architecture.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack React Query for server state management
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Radix UI primitives for accessible, composable components

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: JWT-based auth with secure cookie storage
- **File Upload**: Multer with Cloudinary integration
- **Security**: Comprehensive middleware stack including CSRF protection, rate limiting, and input validation

### Database Design
- **Primary Database**: PostgreSQL with Supabase hosting
- **Schema Management**: Drizzle Kit for migrations and schema evolution
- **Key Tables**: Users, Businesses, Deals, Favorites, Redemptions, Approvals
- **Location Data**: Latitude/longitude coordinates for mapping functionality

## Key Components

### Authentication & Authorization System
- Multi-tier user system (individuals, businesses, admins)
- JWT tokens with secure httpOnly cookies
- CSRF protection with token validation
- Rate limiting for security endpoints
- Bcrypt password hashing with configurable rounds

### Business Verification System
- Document upload and validation workflow
- Admin approval process for business accounts
- File type validation and security scanning
- Verification status tracking (pending, verified, rejected)

### Deal Management System
- Rich deal creation with image uploads and cropping
- Category-based organization
- Temporal deal validity (start/end dates)
- Admin moderation workflow
- Deal statistics and analytics

### File Upload & Processing
- Secure file validation by magic number detection
- Image resizing and optimization via Cloudinary
- PDF document processing for business verification
- Sanitized filename handling and storage

### Location & Mapping
- Geospatial data storage for businesses
- Map-based deal discovery interface
- Location-based filtering and search

## Data Flow

### User Registration Flow
1. User submits registration form with validation
2. Server validates input and checks for existing accounts
3. Password hashing and secure storage
4. For businesses: document upload and verification queue
5. Email/SMS verification (configurable)
6. Account activation and JWT token generation

### Deal Creation Flow
1. Authenticated business user creates deal
2. Image upload and processing through Cloudinary
3. Deal data validation and sanitization
4. Storage in pending status
5. Admin review and approval process
6. Publication to public deal feed

### Deal Discovery Flow
1. Public API serves approved deals with business data
2. Frontend renders deals in list/map views
3. User interactions (favorites, views) tracked
4. Real-time filtering and search capabilities

## External Dependencies

### Infrastructure Services
- **Supabase**: PostgreSQL database hosting with real-time capabilities
- **Cloudinary**: Image upload, processing, and CDN
- **Replit**: Development and hosting environment

### Third-Party Integrations
- **Twilio**: SMS verification services (configured but optional)
- **File Processing**: pdf-parse for document validation
- **Image Processing**: file-type for security validation

### Security & Monitoring
- **bcryptjs**: Password hashing
- **jsonwebtoken**: JWT token management
- **csurf**: CSRF protection
- **express-rate-limit**: Rate limiting middleware

## Deployment Strategy

### Development Environment
- Replit-based development with hot reloading
- Supabase PostgreSQL for database development
- Environment-based configuration management
- Comprehensive logging and debugging tools

### Production Deployment
- Cloud Run deployment target (configured)
- Environment variable validation at startup
- Secure secret management
- Database migration automation

### Build Process
- Vite production build for frontend assets
- esbuild for server-side TypeScript compilation
- Asset optimization and minification
- Static file serving configuration

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

Recent Changes:
- July 12, 2025: Complete Supabase Auth Integration - Server-side Implementation
  - **Server Admin SDK**: Implemented Supabase Admin SDK in server/supabaseAdmin.ts for user creation
  - **Authentication Routes**: Updated auth.routes.fixed.ts with Supabase user creation before local database storage
  - **Dual Authentication**: Users now created in both Supabase (primary) and local database (compatibility)
  - **UUID Implementation**: Server now returns Supabase UUID as primary user ID instead of local database ID
  - **Environment Variables**: Added SUPABASE_SERVICE_ROLE_KEY for server-side admin operations
  - **File Upload Preservation**: Maintained existing Cloudinary file upload workflow for business documents
  - **Error Handling**: Added comprehensive error handling for Supabase user creation with file cleanup
- January 12, 2025: Migrated from Neon Database to Supabase PostgreSQL
  - **Database Migration**: Switched from @neondatabase/serverless to standard pg client with Supabase
  - **Infrastructure Update**: Updated database connection to use Supabase PostgreSQL instead of Neon
  - **Environment Variables**: Added VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for frontend Supabase client
  - **Documentation Update**: Updated replit.md to reflect Supabase as primary database provider
  - **Client Setup**: Created src/lib/supabaseClient.ts for frontend Supabase integration
- June 23, 2025: Complete TypeScript compilation error resolution across entire application
  - **Client-side fixes (45+ errors)**: useOfflineFormPersistence hook signature, Deal/Favorite/Business type imports, ImageCropper zoom parameters, ValidatedFormField array types, admin users page error handling, vendor profile Image constructor conflicts, vendor deals edit Calendar imports/API calls
  - **Server-side fixes (164+ errors)**: Extended schema definitions for insertUserSchema (phoneVerified), insertBusinessSchema (verificationStatus, phone, address, etc.), insertDealApprovalSchema (status, reviewerId, feedback), and insertPasswordResetTokenSchema (ipAddress, userAgent)
  - **Zod schema fixes**: Applied const assertions to all .omit() calls (15 locations) to resolve "boolean is not assignable to type 'never'" errors
  - **Admin API fixes**: Removed status property from createDealApproval calls to match DealApprovalInsert type requirements
  - **Type safety achievement**: Zero compilation errors across client and server with complete type safety
  - **Application status**: Fully operational with admin dashboard showing live data (5 pending vendors, 20 users)
  - All core functionality restored including authentication, deal management, image processing, and admin controls
- June 16, 2025: Initial setup

## Changelog

Changelog:
- June 16, 2025. Initial setup