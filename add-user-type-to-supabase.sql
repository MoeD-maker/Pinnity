-- Add user_type column to auth.users table to show individual/business/admin
-- Run this in Supabase SQL Editor

-- Add user_type column to auth.users table
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Update existing users with their user type from metadata
UPDATE auth.users 
SET user_type = COALESCE(raw_user_meta_data->>'userType', 'individual')
WHERE user_type IS NULL;

-- Create a function to automatically sync user type from metadata
CREATE OR REPLACE FUNCTION sync_user_type_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user_type column whenever user_metadata changes
  NEW.user_type := COALESCE(NEW.raw_user_meta_data->>'userType', 'individual');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync when metadata changes
DROP TRIGGER IF EXISTS trigger_sync_user_type ON auth.users;
CREATE TRIGGER trigger_sync_user_type
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_type_from_metadata();

-- Verify the results
SELECT 
  email,
  phone,
  user_type,
  raw_user_meta_data->>'userType' as metadata_user_type
FROM auth.users
ORDER BY created_at;