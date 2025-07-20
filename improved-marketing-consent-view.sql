-- Improved view with phone numbers and user types
-- Run this in your Supabase SQL Editor to replace the existing view

CREATE OR REPLACE VIEW public.users_with_marketing_consent AS
SELECT
  id,
  email,
  COALESCE(phone, raw_user_meta_data->>'phone') as phone,
  created_at,
  raw_user_meta_data->>'firstName' as first_name,
  raw_user_meta_data->>'lastName' as last_name,
  COALESCE(raw_user_meta_data->>'userType', 'individual') as user_type,
  CASE
    WHEN raw_user_meta_data->>'marketing_consent' = 'true' THEN true
    ELSE false
  END as marketing_consent,
  email_confirmed_at,
  phone_confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Test the improved view
SELECT 
  email,
  phone,
  user_type,
  marketing_consent,
  first_name,
  last_name
FROM public.users_with_marketing_consent;