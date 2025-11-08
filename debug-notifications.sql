-- Debug script to check notification system
-- Run these queries in Supabase SQL Editor to diagnose issues

-- 1. Check if get_user_id_by_email function exists
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc 
WHERE proname = 'get_user_id_by_email';

-- 2. Test the function with your email
-- REPLACE 'your-email@example.com' with your actual email
SELECT public.get_user_id_by_email('your-email@example.com');

-- 3. Check if any notifications exist in the table
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
FROM public.notifications
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if notifications table has Realtime enabled
SELECT schemaname, tablename, pubname
FROM pg_publication_tables
WHERE tablename = 'notifications';

-- 5. Check your user ID
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check grocery lists and their collaborators
SELECT 
  id,
  name,
  user_id,
  collaborators,
  created_at
FROM public.grocery_lists
ORDER BY created_at DESC
LIMIT 5;

-- 7. Check recent grocery items added
SELECT 
  gi.id,
  gi.list_id,
  gi.product_data->>'name' as product_name,
  gi.created_at,
  gl.name as list_name,
  gl.collaborators
FROM public.grocery_items gi
JOIN public.grocery_lists gl ON gi.list_id = gl.id
ORDER BY gi.created_at DESC
LIMIT 5;
