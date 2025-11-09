-- Fix Meal Plan Sharing - Complete RLS Policies
-- Run this in Supabase SQL Editor to fix sharing issues

-- First, ensure the collaborators column exists
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';

-- Create index for collaborators if not exists
CREATE INDEX IF NOT EXISTS idx_meal_plans_collaborators ON meal_plans USING GIN (collaborators);

-- Drop ALL existing policies for meal_plans
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can view their own meal plans or shared plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans or shared plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;

-- Create comprehensive policies for meal_plans

-- SELECT: Users can view meal plans they own OR are collaborators on
CREATE POLICY "meal_plans_select_policy"
  ON meal_plans FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    auth.email() = ANY(collaborators)
  );

-- INSERT: Users can only create their own meal plans
CREATE POLICY "meal_plans_insert_policy"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update meal plans they own OR are collaborators on
CREATE POLICY "meal_plans_update_policy"
  ON meal_plans FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR 
    auth.email() = ANY(collaborators)
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    auth.email() = ANY(collaborators)
  );

-- DELETE: Only owners can delete meal plans
CREATE POLICY "meal_plans_delete_policy"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Drop ALL existing policies for meals
DROP POLICY IF EXISTS "Users can view meals in their meal plans" ON meals;
DROP POLICY IF EXISTS "Users can view meals in their meal plans or shared plans" ON meals;
DROP POLICY IF EXISTS "Users can create meals in their meal plans" ON meals;
DROP POLICY IF EXISTS "Users can create meals in their meal plans or shared plans" ON meals;
DROP POLICY IF EXISTS "Users can update meals in their meal plans" ON meals;
DROP POLICY IF EXISTS "Users can update meals in their meal plans or shared plans" ON meals;
DROP POLICY IF EXISTS "Users can delete meals in their meal plans" ON meals;
DROP POLICY IF EXISTS "Users can delete meals in their meal plans or shared plans" ON meals;

-- Create comprehensive policies for meals

-- SELECT: Users can view meals in meal plans they own or are collaborators on
CREATE POLICY "meals_select_policy"
  ON meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND (
        meal_plans.user_id = auth.uid()
        OR
        auth.email() = ANY(meal_plans.collaborators)
      )
    )
  );

-- INSERT: Users can create meals in meal plans they own or are collaborators on
CREATE POLICY "meals_insert_policy"
  ON meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND (
        meal_plans.user_id = auth.uid()
        OR
        auth.email() = ANY(meal_plans.collaborators)
      )
    )
  );

-- UPDATE: Users can update meals in meal plans they own or are collaborators on
CREATE POLICY "meals_update_policy"
  ON meals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND (
        meal_plans.user_id = auth.uid()
        OR
        auth.email() = ANY(meal_plans.collaborators)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND (
        meal_plans.user_id = auth.uid()
        OR
        auth.email() = ANY(meal_plans.collaborators)
      )
    )
  );

-- DELETE: Users can delete meals in meal plans they own or are collaborators on
CREATE POLICY "meals_delete_policy"
  ON meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meals.meal_plan_id
      AND (
        meal_plans.user_id = auth.uid()
        OR
        auth.email() = ANY(meal_plans.collaborators)
      )
    )
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('meal_plans', 'meals')
ORDER BY tablename, policyname;

-- Verify the collaborators column
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'meal_plans'
ORDER BY ordinal_position;

-- Test query to see if collaborators are working
-- Replace 'test@example.com' with an actual collaborator email
-- SELECT id, name, user_id, collaborators, week_start_date
-- FROM meal_plans
-- WHERE 'test@example.com' = ANY(collaborators);
