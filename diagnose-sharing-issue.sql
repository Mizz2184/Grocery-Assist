-- STEP-BY-STEP DIAGNOSIS FOR MEAL PLAN SHARING
-- Run each section one at a time to identify the issue

-- ============================================
-- STEP 1: Check if collaborators column exists
-- ============================================
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'meal_plans' 
  AND column_name = 'collaborators';

-- Expected: Should show one row with data_type = 'ARRAY'
-- If NO ROWS: Run fix-meal-plan-sharing-policies.sql first!


-- ============================================
-- STEP 2: View your meal plans with collaborators
-- ============================================
-- This shows YOUR meal plans and who you've shared them with
SELECT 
  id,
  name,
  user_id,
  collaborators,
  array_length(collaborators, 1) as num_collaborators,
  week_start_date,
  created_at
FROM meal_plans
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Check: Do you see the collaborator email in the 'collaborators' array?
-- If NO: The email wasn't saved properly when you clicked "Add"


-- ============================================
-- STEP 3: Check what email the collaborator uses to log in
-- ============================================
-- Run this query WHILE LOGGED IN AS THE COLLABORATOR
SELECT 
  auth.uid() as user_id,
  auth.email() as email_used_to_login;

-- CRITICAL: This email MUST EXACTLY MATCH the email in the collaborators array
-- Case sensitive! 'Test@example.com' ≠ 'test@example.com'


-- ============================================
-- STEP 4: Test if RLS policies are working
-- ============================================
-- Run this WHILE LOGGED IN AS THE COLLABORATOR
-- Replace 'collaborator@example.com' with the actual email
SELECT 
  id,
  name,
  user_id,
  collaborators,
  week_start_date,
  auth.email() as my_email,
  'collaborator@example.com' = ANY(collaborators) as email_in_array,
  auth.email() = ANY(collaborators) as i_should_see_this
FROM meal_plans
WHERE 'collaborator@example.com' = ANY(collaborators);

-- If this returns ZERO ROWS: Either the email isn't in the array, or RLS is blocking


-- ============================================
-- STEP 5: Check RLS policies exist
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN policyname LIKE '%select%' OR policyname LIKE '%SELECT%' OR cmd = 'SELECT' THEN '✅ SELECT'
    WHEN policyname LIKE '%insert%' OR policyname LIKE '%INSERT%' OR cmd = 'INSERT' THEN '✅ INSERT'
    WHEN policyname LIKE '%update%' OR policyname LIKE '%UPDATE%' OR cmd = 'UPDATE' THEN '✅ UPDATE'
    WHEN policyname LIKE '%delete%' OR policyname LIKE '%DELETE%' OR cmd = 'DELETE' THEN '✅ DELETE'
    ELSE cmd
  END as operation
FROM pg_policies
WHERE tablename = 'meal_plans'
ORDER BY policyname;

-- Expected: Should see 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- If LESS THAN 4: Run fix-meal-plan-sharing-policies.sql


-- ============================================
-- STEP 6: Check if RLS is enabled
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS ENABLED'
    ELSE '❌ RLS DISABLED'
  END as status
FROM pg_tables
WHERE tablename IN ('meal_plans', 'meals');

-- Both should show 'RLS ENABLED'


-- ============================================
-- STEP 7: Test the actual query the app uses
-- ============================================
-- Run this WHILE LOGGED IN AS THE COLLABORATOR
-- Replace '2025-11-03' with the current week's Monday date
SELECT 
  id,
  name,
  user_id,
  collaborators,
  week_start_date,
  created_at
FROM meal_plans
WHERE week_start_date = '2025-11-03'
  AND user_id != auth.uid()
ORDER BY created_at DESC
LIMIT 1;

-- This is the EXACT query the app runs
-- If this returns ZERO ROWS: The collaborator can't see the plan


-- ============================================
-- STEP 8: Check the SELECT policy details
-- ============================================
SELECT 
  policyname,
  qual as policy_condition
FROM pg_policies
WHERE tablename = 'meal_plans' 
  AND cmd = 'SELECT';

-- The policy should include: auth.email() = ANY(collaborators)


-- ============================================
-- STEP 9: Manual test - Bypass client query
-- ============================================
-- Run this WHILE LOGGED IN AS THE COLLABORATOR
-- This tests if RLS allows access at all
SELECT 
  COUNT(*) as plans_i_can_see,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ RLS IS WORKING - I can see shared plans'
    ELSE '❌ RLS IS BLOCKING - I cannot see any shared plans'
  END as status
FROM meal_plans
WHERE user_id != auth.uid();

-- If count = 0: RLS is blocking access
-- If count > 0: RLS works, but app query might be wrong


-- ============================================
-- STEP 10: Check for the specific meal plan
-- ============================================
-- Replace 'MEAL_PLAN_ID' with the actual ID you're trying to share
-- Run this WHILE LOGGED IN AS THE COLLABORATOR
SELECT 
  id,
  name,
  user_id,
  collaborators,
  auth.uid() as my_user_id,
  auth.email() as my_email,
  user_id = auth.uid() as i_am_owner,
  auth.email() = ANY(collaborators) as i_am_collaborator,
  CASE 
    WHEN user_id = auth.uid() THEN '✅ I OWN THIS'
    WHEN auth.email() = ANY(collaborators) THEN '✅ I AM COLLABORATOR'
    ELSE '❌ NO ACCESS'
  END as my_access
FROM meal_plans
WHERE id = 'MEAL_PLAN_ID';

-- This will show exactly why you can or cannot see the plan


-- ============================================
-- COMMON ISSUES AND FIXES
-- ============================================

/*
ISSUE 1: collaborators column doesn't exist
FIX: Run this:
  ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';

ISSUE 2: Email mismatch
FIX: Make sure the email in collaborators array EXACTLY matches auth.email()
  - Check capitalization
  - Check for spaces
  - Use the EXACT email from Supabase Auth → Users

ISSUE 3: RLS policies missing or wrong
FIX: Run fix-meal-plan-sharing-policies.sql completely

ISSUE 4: Collaborator array is empty
FIX: Re-add the collaborator through the Share dialog
  - Make sure you see "Compartido exitosamente" toast
  - Refresh the page
  - Check Step 2 query to verify it saved

ISSUE 5: Wrong week_start_date
FIX: Make sure the meal plan's week_start_date matches current week
  - The app only shows plans for the current week
  - Check what date the app is looking for in browser console
*/
