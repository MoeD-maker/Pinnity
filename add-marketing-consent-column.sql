-- Add marketing_consent column to auth.users table in Supabase
-- Run this in your Supabase SQL Editor

-- Add the marketing_consent column to auth.users table
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT false;

-- Update existing users with their marketing consent from metadata
UPDATE auth.users 
SET marketing_consent = CASE 
  WHEN raw_user_meta_data->>'marketing_consent' = 'true' THEN true
  ELSE false
END;

-- Create a function to automatically sync marketing consent from metadata
CREATE OR REPLACE FUNCTION sync_marketing_consent_from_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the marketing_consent column whenever user_metadata changes
  NEW.marketing_consent := CASE 
    WHEN NEW.raw_user_meta_data->>'marketing_consent' = 'true' THEN true
    ELSE false
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync when metadata changes
DROP TRIGGER IF EXISTS trigger_sync_marketing_consent ON auth.users;
CREATE TRIGGER trigger_sync_marketing_consent
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_marketing_consent_from_metadata();

-- Verify the results
SELECT 
  email,
  marketing_consent,
  raw_user_meta_data->>'marketing_consent' as metadata_value
FROM auth.users
ORDER BY created_at;