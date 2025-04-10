-- IMPORTANT: Run this in the Supabase SQL Editor to directly verify a user
-- Replace 'your-email@example.com' with the actual email you need to verify

-- This SQL statement directly updates the auth.users table to mark the email as confirmed
UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email = 'your-email@example.com'
AND email_confirmed_at IS NULL;

-- If you don't know the exact email, you can run this query first to see all users:
-- SELECT id, email, email_confirmed_at FROM auth.users; 