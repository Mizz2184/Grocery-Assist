-- Fix RLS policies for meals table to allow paid users to create meals

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own meals" ON meals;
DROP POLICY IF EXISTS "Users can insert their own meals" ON meals;
DROP POLICY IF EXISTS "Users can update their own meals" ON meals;
DROP POLICY IF EXISTS "Users can delete their own meals" ON meals;

-- Enable RLS on meals table
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Allow users to view meals from their meal plans
CREATE POLICY "Users can view their own meals"
ON meals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND meal_plans.user_id = auth.uid()
  )
);

-- Allow users to insert meals into their meal plans
CREATE POLICY "Users can insert their own meals"
ON meals FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND meal_plans.user_id = auth.uid()
  )
);

-- Allow users to update their own meals
CREATE POLICY "Users can update their own meals"
ON meals FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND meal_plans.user_id = auth.uid()
  )
);

-- Allow users to delete their own meals
CREATE POLICY "Users can delete their own meals"
ON meals FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM meal_plans
    WHERE meal_plans.id = meals.meal_plan_id
    AND meal_plans.user_id = auth.uid()
  )
);

-- Also ensure meal_plans table has proper RLS policies
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own meal plans
CREATE POLICY "Users can view their own meal plans"
ON meal_plans FOR SELECT
USING (user_id = auth.uid());

-- Allow users to create their own meal plans
CREATE POLICY "Users can insert their own meal plans"
ON meal_plans FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Allow users to update their own meal plans
CREATE POLICY "Users can update their own meal plans"
ON meal_plans FOR UPDATE
USING (user_id = auth.uid());

-- Allow users to delete their own meal plans
CREATE POLICY "Users can delete their own meal plans"
ON meal_plans FOR DELETE
USING (user_id = auth.uid());
