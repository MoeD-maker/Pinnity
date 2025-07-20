-- Fix: Copy phone numbers from metadata to the main phone field
-- Run this in Supabase SQL Editor

-- Update the phone field with data from metadata
UPDATE auth.users 
SET phone = raw_user_meta_data->>'phone'
WHERE raw_user_meta_data->>'phone' IS NOT NULL
  AND raw_user_meta_data->>'phone' != '';

-- Verify the fix worked
SELECT 
  email,
  phone,
  raw_user_meta_data->>'phone' as metadata_phone
FROM auth.users;