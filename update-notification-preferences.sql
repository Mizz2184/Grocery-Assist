-- Add meal plan notification preferences to notification_preferences table

-- Step 1: Add new columns for meal plan notifications
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS meal_plan_shared BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS meal_added BOOLEAN DEFAULT true;

ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS meal_plan_updated BOOLEAN DEFAULT true;

-- Step 2: Update existing users to have meal plan notifications enabled by default
UPDATE notification_preferences 
SET 
  meal_plan_shared = true,
  meal_added = true,
  meal_plan_updated = true
WHERE 
  meal_plan_shared IS NULL 
  OR meal_added IS NULL 
  OR meal_plan_updated IS NULL;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN notification_preferences.meal_plan_shared IS 'Receive notifications when someone shares a meal plan with you';
COMMENT ON COLUMN notification_preferences.meal_added IS 'Receive notifications when a meal is added to a shared meal plan';
COMMENT ON COLUMN notification_preferences.meal_plan_updated IS 'Receive notifications when a shared meal plan is updated';
