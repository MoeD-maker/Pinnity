-- Alternative approach: Create a view to display marketing consent
-- Run this in your Supabase SQL Editor

-- Option 1: Create a view that shows users with marketing consent
CREATE OR REPLACE VIEW public.users_with_marketing_consent AS
SELECT 
  id,
  email,
  phone,
  created_at,
  updated_at,
  email_confirmed_at,
  phone_confirmed_at,
  last_sign_in_at,
  raw_user_meta_data->>'firstName' as first_name,
  raw_user_meta_data->>'lastName' as last_name,
  raw_user_meta_data->>'userType' as user_type,
  CASE 
    WHEN raw_user_meta_data->>'marketing_consent' = 'true' THEN true
    ELSE false
  END as marketing_consent,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;

-- Grant permissions to view this data
GRANT SELECT ON public.users_with_marketing_consent TO authenticated;
GRANT SELECT ON public.users_with_marketing_consent TO anon;

-- Test the view
SELECT 
  email,
  first_name,
  last_name,
  user_type,
  marketing_consent,
  created_at
FROM public.users_with_marketing_consent;