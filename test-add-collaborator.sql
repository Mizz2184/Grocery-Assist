-- TEST: Manually add a collaborator to verify database allows it
-- This will help us determine if it's a code issue or database issue

-- STEP 1: Find your most recent meal plan
SELECT 
  id,
  name,
  user_id,
  collaborators,
  week_start_date,
  created_at
FROM meal_plans
ORDER BY created_at DESC
LIMIT 5;

-- Copy the ID of the meal plan you want to test with


-- STEP 2: Manually add a collaborator (replace values below)
-- Replace 'YOUR_MEAL_PLAN_ID' with the actual ID from Step 1
-- Replace 'test@example.com' with the collaborator's email

UPDATE meal_plans
SET collaborators = ARRAY['test@example.com']
WHERE id = 'YOUR_MEAL_PLAN_ID';

-- Expected: "UPDATE 1" (success)
-- If error: There's a database/RLS issue


-- STEP 3: Verify it was saved
SELECT 
  id,
  name,
  collaborators,
  array_length(collaborators, 1) as num_collaborators
FROM meal_plans
WHERE id = 'YOUR_MEAL_PLAN_ID';

-- Should show collaborators = {test@example.com}


-- STEP 4: If Step 2 worked, the issue is in the app code
-- If Step 2 failed, check RLS policies:

-- Check UPDATE policy
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'meal_plans' AND cmd = 'UPDATE';

-- The USING clause should be:
-- (auth.uid() = user_id) OR (auth.email() = ANY(collaborators))


-- STEP 5: Check if RLS is blocking updates
-- Try to see what user_id owns the meal plan
SELECT 
  mp.id,
  mp.name,
  mp.user_id,
  u.email as owner_email,
  mp.collaborators
FROM meal_plans mp
LEFT JOIN auth.users u ON mp.user_id = u.id
WHERE mp.id = 'YOUR_MEAL_PLAN_ID';

-- Verify the user_id matches the logged-in user


-- STEP 6: Test if the app can read the meal plan
-- This simulates what happens when you open the Share dialog
SELECT 
  id,
  name,
  collaborators
FROM meal_plans
WHERE id = 'YOUR_MEAL_PLAN_ID';

-- If this returns the meal plan, the app should be able to read it


-- TROUBLESHOOTING:

-- If UPDATE in Step 2 fails with permission error:
-- The user doesn't own the meal plan OR RLS policy is wrong

-- Fix: Make sure you're logged in as the owner
-- Or run this to temporarily disable RLS for testing:
-- ALTER TABLE meal_plans DISABLE ROW LEVEL SECURITY;
-- (Remember to re-enable after testing!)

-- If UPDATE succeeds but app still doesn't save:
-- Check browser console for errors
-- The issue is in the React code or Supabase client

-- If you see "collaborators = {}" after Step 3:
-- The UPDATE didn't actually save
-- Possible causes:
--   1. Wrong meal plan ID
--   2. RLS blocking the update
--   3. Trigger or constraint preventing the save
