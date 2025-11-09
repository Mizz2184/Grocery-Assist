-- Add collaborators support to meal_plans table
-- Run this in Supabase SQL Editor

-- Add collaborators column to meal_plans
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';

-- Create index for collaborators
CREATE INDEX IF NOT EXISTS idx_meal_plans_collaborators ON meal_plans USING GIN (collaborators);

-- Update RLS policies to allow collaborators to view and edit meal plans
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;

-- New policy: Users can view meal plans they own OR are collaborators on
CREATE POLICY "Users can view their own meal plans or shared plans"
  ON meal_plans FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    auth.email() = ANY(collaborators)
  );

-- New policy: Users can update meal plans they own OR are collaborators on
CREATE POLICY "Users can update their own meal plans or shared plans"
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

-- Update meals policies to allow collaborators
DROP POLICY IF EXISTS "Users can view meals in their meal plans" ON meals;
DROP POLICY IF EXISTS "Users can create meals in their meal plans" ON meals;
DROP POLICY IF EXISTS "Users can update meals in their meal plans" ON meals;
DROP POLICY IF EXISTS "Users can delete meals in their meal plans" ON meals;

-- New meals policies with collaborator support
CREATE POLICY "Users can view meals in their meal plans or shared plans"
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

CREATE POLICY "Users can create meals in their meal plans or shared plans"
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

CREATE POLICY "Users can update meals in their meal plans or shared plans"
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

CREATE POLICY "Users can delete meals in their meal plans or shared plans"
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

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'meal_plans'
ORDER BY ordinal_position;
