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
- **Primary Database**: PostgreSQL with Neon serverless hosting
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
- **Neon Database**: Serverless PostgreSQL hosting
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
- Local PostgreSQL for database development
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
- June 23, 2025: Complete TypeScript compilation error resolution across application
  - Fixed useOfflineFormPersistence hook signature issues throughout ValidatedOnboardingProvider
  - Resolved 45+ TypeScript errors in deals detail page by properly typing Deal, Favorite, and Business objects
  - Fixed ImageCropper zoom parameter errors preventing image crop functionality 
  - Corrected ValidatedFormField array type errors affecting checkbox forms
  - Fixed admin users page unknown error type in catch blocks
  - Resolved vendor profile Image constructor conflicts with React Image type
  - Fixed vendor deals edit page Calendar imports, API calls, and status handling
  - Debug cache indexedDB name type assertions added
  - All client-side TypeScript compilation errors resolved with complete type safety restored
  - Application running successfully with full functionality for users, vendors, and administrators
- June 16, 2025: Initial setup

## Changelog

Changelog:
- June 16, 2025. Initial setup