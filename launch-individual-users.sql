-- Launch script: Enable individual users to access the platform
-- Run this SQL when ready to launch for individual users

-- Update all individual users to be live
UPDATE profiles 
SET is_live = true, updated_at = NOW()::text
WHERE role = 'individual';

-- Show results
SELECT 
  COUNT(*) as total_individuals_activated,
  role,
  is_live
FROM profiles 
WHERE role = 'individual'
GROUP BY role, is_live;

-- Verify the update
SELECT 
  email,
  role,
  is_live,
  user_type,
  created_at
FROM profiles 
WHERE role = 'individual'
ORDER BY created_at DESC;

-- Query to check launch readiness
SELECT 
  'Launch Status' as info,
  COUNT(CASE WHEN role = 'individual' AND is_live = true THEN 1 END) as live_individuals,
  COUNT(CASE WHEN role = 'individual' AND is_live = false THEN 1 END) as gated_individuals,
  COUNT(CASE WHEN role = 'vendor' THEN 1 END) as vendors,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
FROM profiles;

-- Optional: Add notification tracking for launched users
CREATE TABLE IF NOT EXISTS launch_notifications (
  id SERIAL PRIMARY KEY,
  profile_id TEXT REFERENCES profiles(id),
  notification_type TEXT DEFAULT 'launch_email',
  sent_at TIMESTAMP DEFAULT NOW(),
  email_status TEXT DEFAULT 'pending'
);

-- Mark users for launch notification
INSERT INTO launch_notifications (profile_id, notification_type)
SELECT id, 'launch_email'
FROM profiles 
WHERE role = 'individual' AND is_live = true
ON CONFLICT DO NOTHING;