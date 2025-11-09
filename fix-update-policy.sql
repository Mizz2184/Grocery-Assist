-- FIX: Update policy to allow owners to add collaborators
-- The issue: The old policy might be too restrictive

-- Drop ALL old UPDATE policies
DROP POLICY IF EXISTS "meal_plans_update_policy" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans or shared plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;

-- Create simplified UPDATE policy
-- Owner can always update their meal plans
-- Collaborators can update meal plans they're added to
CREATE POLICY "meal_plans_update_policy"
  ON meal_plans FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR 
    auth.email() = ANY(collaborators)
  );

-- Note: Removed WITH CHECK clause to simplify
-- USING clause is sufficient for access control
-- WITH CHECK is only needed if you want to restrict what can be updated

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'meal_plans' AND cmd = 'UPDATE';

-- Test: Try to update a meal plan
-- Replace 'YOUR_MEAL_PLAN_ID' with actual ID
-- UPDATE meal_plans 
-- SET collaborators = ARRAY['test@example.com']
-- WHERE id = 'YOUR_MEAL_PLAN_ID';

-- If this works, the policy is correct!
