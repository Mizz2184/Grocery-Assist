-- Temporary script to mark current user as PAID for testing
-- Run this in Supabase SQL Editor to bypass the paywall

-- First, check current payment status
SELECT 
  up.user_id,
  u.email,
  up.status,
  up.created_at
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
ORDER BY up.created_at DESC;

-- To mark a specific user as PAID, replace 'YOUR_USER_EMAIL' with your actual email
-- UPDATE user_payments 
-- SET status = 'PAID', updated_at = NOW()
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_USER_EMAIL');

-- Or mark ALL users as PAID (for testing only!)
-- UPDATE user_payments SET status = 'PAID', updated_at = NOW();

-- To check if it worked:
-- SELECT user_id, status FROM user_payments;
