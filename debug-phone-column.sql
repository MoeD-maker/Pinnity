-- Debug why phone column isn't showing data
-- Run this in Supabase SQL Editor to see what's actually stored

-- Check the raw data in auth.users
SELECT 
  email,
  phone,
  raw_user_meta_data->>'phone' as metadata_phone,
  raw_user_meta_data
FROM auth.users;

-- Check if phone field has any data at all
SELECT 
  COUNT(*) as total_users,
  COUNT(phone) as users_with_phone_field,
  COUNT(CASE WHEN raw_user_meta_data->>'phone' IS NOT NULL THEN 1 END) as users_with_metadata_phone
FROM auth.users;