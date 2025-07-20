-- Migration: Add user gating system
-- Add role and is_live columns to profiles table

-- Add role column with default 'individual'
ALTER TABLE profiles 
ADD COLUMN role text NOT NULL DEFAULT 'individual';

-- Add is_live column with default false
ALTER TABLE profiles 
ADD COLUMN is_live boolean NOT NULL DEFAULT false;

-- Add check constraint for role values
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('individual', 'vendor', 'admin'));

-- Create index on role for better query performance
CREATE INDEX idx_profiles_role ON profiles(role);

-- Create index on is_live for launch queries
CREATE INDEX idx_profiles_is_live ON profiles(is_live);

-- Update existing users to appropriate roles
-- Set admin users to have is_live = true
UPDATE profiles 
SET role = 'admin', is_live = true 
WHERE email LIKE '%admin%' OR id IN (
  SELECT id FROM profiles WHERE email = 'admin@test.com'
);

-- Set vendor users to have is_live = true (if any exist)
-- This assumes businesses table has corresponding profiles
UPDATE profiles 
SET role = 'vendor', is_live = true 
WHERE id IN (
  SELECT DISTINCT owner_id FROM businesses WHERE owner_id IS NOT NULL
);

-- All other users remain as 'individual' with is_live = false (default)

COMMENT ON COLUMN profiles.role IS 'User role: individual, vendor, or admin';
COMMENT ON COLUMN profiles.is_live IS 'Whether individual users can access the platform';