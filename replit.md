# Pinnity - Local Deal Discovery Platform

## Overview
Pinnity is a comprehensive full-stack web application designed to connect local businesses with customers through deal discovery. The platform enables businesses to create and manage promotional deals, while providing customers with an intuitive interface to browse, favorite, and redeem local offers. The project's vision is to become the leading platform for local deal discovery, fostering community engagement and supporting local economies by making promotional offers easily accessible and manageable.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library, using Radix UI primitives
- **State Management**: TanStack React Query
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: JWT-based authentication with secure cookie storage
- **File Upload**: Multer with integrated storage (Supabase Storage)
- **Security**: CSRF protection, rate limiting, input validation, bcrypt password hashing

### Database Design
- **Primary Database**: PostgreSQL hosted on Supabase
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**: Users, Businesses, Deals, Favorites, Redemptions, Approvals
- **Location Data**: Latitude/longitude coordinates for mapping

### Key Components
- **Authentication & Authorization System**: Multi-tier user system (individuals, businesses, admins) with JWT and secure cookies.
- **Business Verification System**: Document upload and validation workflow with admin approval and verification status tracking.
- **Deal Management System**: Rich deal creation, image uploads, categorization, temporal validity, and admin moderation.
- **File Upload & Processing**: Secure file validation (magic number), image resizing/optimization (Cloudinary initially, migrated to Supabase Storage), PDF processing, and sanitized filename handling.
- **Location & Mapping**: Geospatial data storage for businesses and map-based deal discovery.

### Data Flow Highlights
- **User Registration**: Validation, secure password storage, document upload for businesses, and account activation with JWT.
- **Deal Creation**: Business user creation, image processing, validation, and admin approval before publication.
- **Deal Discovery**: Public API for approved deals, frontend rendering, and real-time filtering/search.

## External Dependencies

### Infrastructure Services
- **Supabase**: PostgreSQL database hosting, authentication, and storage (for file uploads).
- **Cloudinary**: Image upload, processing, and CDN (initially, largely replaced by Supabase Storage).
- **Replit**: Development and hosting environment.

### Third-Party Integrations
- **Twilio**: SMS verification services.
- **pdf-parse**: For PDF document validation.
- **file-type**: For secure file type validation.

### Security Libraries
- **bcryptjs**: Password hashing.
- **jsonwebtoken**: JWT token management.
- **csurf**: CSRF protection.
- **express-rate-limit**: Rate limiting middleware.
```