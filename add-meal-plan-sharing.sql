-- Add collaborators functionality to meal plans (similar to grocery lists)

-- Step 1: Add collaborators column to meal_plans table
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';

-- Step 2: Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;

DROP POLICY IF EXISTS "Users can view their own meals" ON meals;
DROP POLICY IF EXISTS "Users can insert their own meals" ON meals;
DROP POLICY IF EXISTS "Users can update their own meals" ON meals;
DROP POLICY IF EXISTS "Users can delete their own meals" ON meals;

-- Step 3: Enable RLS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new RLS policies for meal_plans with collaborator support

-- Allow users to view meal plans they own OR are collaborators on
CREATE POLICY "Users can view their own or shared meal plans"
ON meal_plans FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  (
    SELECT auth.jwt()->>'email'
  ) = ANY(collaborators)
);

-- Allow users to create their own meal plans
CREATE POLICY "Users can insert their own meal plans"
ON meal_plans FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to update meal plans they own OR are collaborators on
CREATE POLICY "Users can update their own or shared meal plans"
ON meal_plans FOR UPDATE
USING (
  user_id = auth.uid() 
  OR 
  (
    SELECT auth.jwt()->>'email'
  ) = ANY(collaborators)
);

-- Allow only owners to delete meal plans
CREATE POLICY "Users can delete their own meal plans"
ON meal_plans FOR DELETE
USING (user_id = auth.uid());

-- Step 5: Create new RLS policies for meals with collaborator support

-- Allow users to view meals from meal plans they own or are collaborators on
CREATE POLICY "Users can view meals from their own or shared meal plans"
ON meals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR
      (SELECT auth.jwt()->>'email') = ANY(meal_plans.collaborators)
    )
  )
);

-- Allow users to insert meals into meal plans they own or are collaborators on
CREATE POLICY "Users can insert meals into their own or shared meal plans"
ON meals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR
      (SELECT auth.jwt()->>'email') = ANY(meal_plans.collaborators)
    )
  )
);

-- Allow users to update meals from meal plans they own or are collaborators on
CREATE POLICY "Users can update meals in their own or shared meal plans"
ON meals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR
      (SELECT auth.jwt()->>'email') = ANY(meal_plans.collaborators)
    )
  )
);

-- Allow users to delete meals from meal plans they own or are collaborators on
CREATE POLICY "Users can delete meals from their own or shared meal plans"
ON meals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND (
      meal_plans.user_id = auth.uid()
      OR
      (SELECT auth.jwt()->>'email') = ANY(meal_plans.collaborators)
    )
  )
);

-- Step 6: Create index for better performance on collaborators queries
CREATE INDEX IF NOT EXISTS idx_meal_plans_collaborators ON meal_plans USING GIN (collaborators);

-- Step 7: Add comment for documentation
COMMENT ON COLUMN meal_plans.collaborators IS 'Array of email addresses of users who can view and edit this meal plan';
