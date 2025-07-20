-- Create a comprehensive users view that shows all the information you need
-- This replaces the need to modify the protected auth.users table
-- Run this in Supabase SQL Editor

CREATE OR REPLACE VIEW public.comprehensive_users_view AS
SELECT
  id,
  email,
  phone,
  created_at,
  updated_at,
  last_sign_in_at,
  email_confirmed_at,
  phone_confirmed_at,
  raw_user_meta_data->>'firstName' as first_name,
  raw_user_meta_data->>'lastName' as last_name,
  COALESCE(raw_user_meta_data->>'userType', 'individual') as user_type,
  CASE
    WHEN raw_user_meta_data->>'marketing_consent' = 'true' THEN true
    ELSE false
  END as marketing_consent,
  raw_user_meta_data->>'phone' as metadata_phone,
  raw_user_meta_data->>'address' as address,
  CASE
    WHEN raw_user_meta_data->>'phoneVerified' = 'true' THEN true
    ELSE false
  END as phone_verified
FROM auth.users
ORDER BY created_at DESC;

-- Grant permissions
GRANT SELECT ON public.comprehensive_users_view TO authenticated;
GRANT SELECT ON public.comprehensive_users_view TO anon;

-- Test the comprehensive view
SELECT 
  email,
  first_name,
  last_name,
  user_type,
  phone,
  marketing_consent,
  phone_verified,
  created_at
FROM public.comprehensive_users_view;