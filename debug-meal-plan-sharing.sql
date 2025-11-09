-- Debug Meal Plan Sharing
-- Run these queries in Supabase SQL Editor to diagnose sharing issues

-- 1. Check if collaborators column exists
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'meal_plans'
  AND column_name = 'collaborators';

-- 2. View all meal plans with their collaborators
SELECT 
  id,
  name,
  user_id,
  collaborators,
  week_start_date,
  created_at
FROM meal_plans
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check current RLS policies for meal_plans
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'meal_plans'
ORDER BY policyname;

-- 4. Check current RLS policies for meals
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'meals'
ORDER BY policyname;

-- 5. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('meal_plans', 'meals');

-- 6. Test: Find meal plans where a specific email is a collaborator
-- Replace 'collaborator@example.com' with the actual email you're testing
SELECT 
  id,
  name,
  user_id,
  collaborators,
  week_start_date
FROM meal_plans
WHERE 'collaborator@example.com' = ANY(collaborators);

-- 7. Check auth.email() function (run as authenticated user)
-- This will show the current user's email
SELECT auth.email() as current_user_email;

-- 8. Check auth.uid() function (run as authenticated user)
-- This will show the current user's ID
SELECT auth.uid() as current_user_id;

-- 9. Find all meal plans accessible to current user (run as authenticated user)
SELECT 
  id,
  name,
  user_id,
  collaborators,
  week_start_date,
  CASE 
    WHEN user_id = auth.uid() THEN 'Owner'
    WHEN auth.email() = ANY(collaborators) THEN 'Collaborator'
    ELSE 'No Access'
  END as access_type
FROM meal_plans
WHERE user_id = auth.uid() 
   OR auth.email() = ANY(collaborators)
ORDER BY week_start_date DESC;

-- 10. Check for any meal plans with empty or null collaborators
SELECT 
  id,
  name,
  user_id,
  collaborators,
  COALESCE(array_length(collaborators, 1), 0) as collaborator_count
FROM meal_plans
WHERE collaborators IS NULL 
   OR collaborators = '{}'
   OR array_length(collaborators, 1) IS NULL
ORDER BY created_at DESC
LIMIT 10;
