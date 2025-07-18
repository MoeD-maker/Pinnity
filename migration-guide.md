# Migration Guide: Unified Supabase + PostgreSQL User Management

## Overview
This guide provides step-by-step instructions for safely migrating from the old user management system to the unified Supabase Auth + PostgreSQL profiles system.

## Migration Steps

### 1. Database Schema Migration

The new schema has been created with these tables:
- `profiles` - Main user table with Supabase Auth integration
- `businesses_new` - Business information linked to profiles

### 2. Data Migration (Safe Approach)

#### Step 2.1: Backup Existing Data
```sql
-- Create backup tables
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE businesses_backup AS SELECT * FROM businesses;
```

#### Step 2.2: Migrate Users to Profiles
```sql
-- Insert existing users into profiles table
INSERT INTO profiles (
    email, first_name, last_name, phone, address, 
    user_type, phone_verified, created_at, updated_at
)
SELECT 
    email, first_name, last_name, phone, address,
    user_type, phone_verified, created_at, updated_at
FROM users
WHERE email NOT IN (SELECT email FROM profiles);
```

#### Step 2.3: Migrate Businesses to New Table
```sql
-- Insert existing businesses into businesses_new table
INSERT INTO businesses_new (
    profile_id, business_name, business_category, 
    verification_status, government_id, proof_of_address, 
    proof_of_business, created_at, updated_at
)
SELECT 
    p.id, b.business_name, b.business_category,
    b.verification_status, b.government_id, b.proof_of_address,
    b.proof_of_business, b.created_at, b.updated_at
FROM businesses b
JOIN users u ON b.user_id = u.id
JOIN profiles p ON u.email = p.email
WHERE b.id NOT IN (SELECT id FROM businesses_new WHERE id IS NOT NULL);
```

### 3. API Route Updates

#### Step 3.1: Update Authentication Routes
Replace the old auth routes with the new Supabase-integrated ones:

```typescript
// Old: server/routes/auth.routes.fixed.ts
// New: server/routes/auth.routes.supabase.ts
```

#### Step 3.2: Update Admin Routes
Replace the old admin routes with the new unified ones:

```typescript
// Old: server/routes/admin.routes.ts
// New: server/routes/admin.routes.supabase.ts
```

### 4. Code Integration Steps

#### Step 4.1: Update Main Server File
```typescript
// In server/index.ts, replace old routes with new ones
import { registerIndividual, registerBusiness, login } from './routes/auth.routes.supabase';
import { getAllUsers, getPendingVendors, updateBusinessStatus } from './routes/admin.routes.supabase';
```

#### Step 4.2: Update Route Handlers
```typescript
// Replace old route handlers
app.post('/api/v1/auth/register/individual', registerIndividual);
app.post('/api/v1/auth/register/business', registerBusiness);
app.post('/api/v1/auth/login', login);
app.get('/api/v1/admin/users', getAllUsers);
app.get('/api/v1/admin/pending-vendors', getPendingVendors);
app.put('/api/v1/admin/business/:businessId/status', updateBusinessStatus);
```

### 5. Testing the Migration

#### Step 5.1: Run Integration Tests
```bash
npm test -- unified-auth.test.ts
```

#### Step 5.2: Test New System
```bash
npx tsx test-unified-system.ts
```

#### Step 5.3: Verify Data Integrity
```sql
-- Check user counts match
SELECT COUNT(*) FROM users; -- Old table
SELECT COUNT(*) FROM profiles; -- New table

-- Check business counts match
SELECT COUNT(*) FROM businesses; -- Old table
SELECT COUNT(*) FROM businesses_new; -- New table
```

### 6. Rollback Plan (If Needed)

If issues arise, you can rollback by:

1. Restore old route handlers
2. Use backup tables
3. Revert database changes

```sql
-- Restore from backup if needed
DROP TABLE profiles;
DROP TABLE businesses_new;
ALTER TABLE users_backup RENAME TO users;
ALTER TABLE businesses_backup RENAME TO businesses;
```

### 7. Final Cleanup (After Successful Migration)

#### Step 7.1: Drop Old Tables
```sql
-- Only after confirming everything works
DROP TABLE users_backup;
DROP TABLE businesses_backup;
-- Rename old tables for safety
ALTER TABLE users RENAME TO users_old;
ALTER TABLE businesses RENAME TO businesses_old;
```

#### Step 7.2: Remove Old Code Files
```bash
# Archive old files
mkdir -p archive/
mv server/routes/auth.routes.fixed.ts archive/
mv server/storage.ts archive/
```

## Verification Checklist

- [ ] New profiles table created with correct schema
- [ ] New businesses_new table created with correct schema  
- [ ] All existing users migrated to profiles
- [ ] All existing businesses migrated to businesses_new
- [ ] New auth routes working for registration/login
- [ ] New admin routes working for user management
- [ ] Supabase Auth integration working
- [ ] File uploads working with new system
- [ ] Admin dashboard showing correct data
- [ ] All tests passing
- [ ] Old tables backed up
- [ ] Production deployment tested

## Benefits of New System

1. **Unified Authentication**: Single source of truth with Supabase Auth
2. **Better Security**: Leverages Supabase's security features
3. **Scalability**: Supabase handles auth scaling automatically
4. **Consistency**: All user data synchronized between systems
5. **Future-Proof**: Easy to add new Supabase features
6. **Better Admin Tools**: Rich admin interface with real-time data

## Support

If you encounter issues during migration:
1. Check the console logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with a small subset of data first
4. Use the rollback plan if needed
5. Contact support with specific error messages