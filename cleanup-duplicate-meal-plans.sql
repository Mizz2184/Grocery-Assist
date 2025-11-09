-- Clean up duplicate meal plans
-- This script keeps the most recent meal plan for each user/week combination
-- and deletes the older duplicates

-- First, let's see what duplicates exist
SELECT 
  user_id, 
  week_start_date, 
  COUNT(*) as duplicate_count
FROM meal_plans
GROUP BY user_id, week_start_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Delete duplicates, keeping only the most recent one for each user/week
DELETE FROM meal_plans
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, week_start_date 
        ORDER BY created_at DESC
      ) as rn
    FROM meal_plans
  ) t
  WHERE rn > 1
);

-- Verify the cleanup
SELECT 
  user_id, 
  week_start_date, 
  COUNT(*) as count
FROM meal_plans
GROUP BY user_id, week_start_date
HAVING COUNT(*) > 1;

-- Add a unique constraint to prevent future duplicates
ALTER TABLE meal_plans 
ADD CONSTRAINT unique_user_week 
UNIQUE (user_id, week_start_date);
