-- ============================================
-- TEST MEAL PLANNER SETUP
-- ============================================
-- Run this in Supabase SQL Editor to check if tables exist and RLS is working

-- 1. Check if tables exist
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('meal_plans'),
    ('meals'),
    ('recipes'),
    ('recipe_ingredients')
) AS t(tablename);

-- 2. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('meal_plans', 'meals', 'recipes', 'recipe_ingredients')
  AND schemaname = 'public';

-- 3. Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command
FROM pg_policies
WHERE tablename IN ('meal_plans', 'meals', 'recipes', 'recipe_ingredients')
ORDER BY tablename, policyname;

-- 4. Check current user
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ AUTHENTICATED'
    ELSE '❌ NOT AUTHENTICATED'
  END as auth_status;

-- 5. Test insert (this will fail if RLS is blocking)
-- Uncomment to test:
/*
INSERT INTO meal_plans (user_id, name, week_start_date)
VALUES (
  auth.uid(),
  'Test Meal Plan',
  CURRENT_DATE
)
RETURNING *;
*/
