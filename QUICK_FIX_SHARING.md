# QUICK FIX - Meal Plan Sharing Not Working

## Run These Steps IN ORDER

### Step 1: Verify Database Setup (Run in Supabase SQL Editor)

```sql
-- Check if collaborators column exists
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'meal_plans' AND column_name = 'collaborators';
```

**If NO ROWS returned:** The column doesn't exist. Run this:

```sql
ALTER TABLE meal_plans 
ADD COLUMN collaborators TEXT[] DEFAULT '{}';
```

---

### Step 2: Fix RLS Policies (Run in Supabase SQL Editor)

Copy and paste this ENTIRE script:

```sql
-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can view their own meal plans or shared plans" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_select_policy" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans or shared plans" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_update_policy" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_insert_policy" ON meal_plans;
DROP POLICY IF EXISTS "meal_plans_delete_policy" ON meal_plans;

-- Create NEW policies that work
CREATE POLICY "meal_plans_select_policy"
  ON meal_plans FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    auth.email() = ANY(collaborators)
  );

CREATE POLICY "meal_plans_insert_policy"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meal_plans_update_policy"
  ON meal_plans FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR 
    auth.email() = ANY(collaborators)
  );

CREATE POLICY "meal_plans_delete_policy"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);
```

---

### Step 3: Verify Policies Were Created

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'meal_plans';
```

**Expected output:** Should see 4 policies:
- `meal_plans_select_policy` (SELECT)
- `meal_plans_insert_policy` (INSERT)  
- `meal_plans_update_policy` (UPDATE)
- `meal_plans_delete_policy` (DELETE)

---

### Step 4: Test Adding a Collaborator

1. **As the OWNER:**
   - Go to your app → Meal Planner
   - Click **Share** button
   - Add collaborator's email (e.g., `collaborator@example.com`)
   - Click **Add**
   - You should see "Compartido exitosamente" toast

2. **Verify it saved:**

```sql
-- Run this in Supabase (as owner or admin)
SELECT id, name, collaborators 
FROM meal_plans 
ORDER BY created_at DESC 
LIMIT 1;
```

**Check:** Does the `collaborators` column show `{collaborator@example.com}`?

---

### Step 5: Test Collaborator Access

**IMPORTANT:** Get the exact email the collaborator uses:

```sql
-- Run this WHILE LOGGED IN AS THE COLLABORATOR
SELECT auth.email() as my_login_email;
```

**The email MUST match exactly** (case-sensitive)!

Then test if they can see the plan:

```sql
-- Run this WHILE LOGGED IN AS THE COLLABORATOR
SELECT 
  id,
  name,
  collaborators,
  auth.email() as my_email,
  auth.email() = ANY(collaborators) as should_see_it
FROM meal_plans
WHERE auth.email() = ANY(collaborators);
```

**If this returns rows:** RLS is working! ✅  
**If this returns ZERO rows:** Email mismatch or RLS issue ❌

---

### Step 6: Check in the App

1. **Collaborator logs in** with the exact email you added
2. **Navigate to** `/meal-plan`
3. **Should see** the shared meal plan with "👥 Plan compartido" badge

---

## Common Issues

### Issue: "Email doesn't match"

**Problem:** The email in `collaborators` array doesn't match `auth.email()`

**Solution:**
1. Check exact email in Supabase Dashboard → Authentication → Users
2. Copy that EXACT email (with correct capitalization)
3. Remove old collaborator from Share dialog
4. Re-add with the correct email

### Issue: "Collaborators array is empty"

**Problem:** Email didn't save when you clicked Add

**Solution:**
1. Check browser console for errors
2. Make sure you're the owner of the meal plan
3. Try adding again
4. Verify with Step 4 query

### Issue: "RLS is blocking"

**Problem:** Policies aren't set up correctly

**Solution:**
1. Run Step 2 again (the full DROP and CREATE script)
2. Verify with Step 3
3. Make sure RLS is enabled:

```sql
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
```

### Issue: "Wrong week"

**Problem:** Meal plan is for a different week

**Solution:**
The app only shows plans for the current week. Make sure:
1. The meal plan's `week_start_date` is this week's Monday
2. Both owner and collaborator are looking at the same week

---

## Still Not Working?

Run the complete diagnostic:

```sql
-- Get ALL the info we need
SELECT 
  'Step 1: Column exists?' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'collaborators'
  ) THEN '✅ YES' ELSE '❌ NO' END as result
UNION ALL
SELECT 
  'Step 2: Policies exist?',
  CASE WHEN COUNT(*) = 4 THEN '✅ YES (4 policies)' 
       ELSE '❌ NO (found ' || COUNT(*) || ')' END
FROM pg_policies WHERE tablename = 'meal_plans'
UNION ALL
SELECT 
  'Step 3: RLS enabled?',
  CASE WHEN rowsecurity THEN '✅ YES' ELSE '❌ NO' END
FROM pg_tables WHERE tablename = 'meal_plans';
```

**Send me the output** from this query and I can help further!

---

## Quick Test Script

Run this to test everything at once:

```sql
-- TEST EVERYTHING
DO $$
DECLARE
  col_exists boolean;
  policy_count integer;
  rls_enabled boolean;
BEGIN
  -- Check column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'collaborators'
  ) INTO col_exists;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE tablename = 'meal_plans';
  
  -- Check RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables WHERE tablename = 'meal_plans';
  
  -- Report
  RAISE NOTICE '=== MEAL PLAN SHARING DIAGNOSIS ===';
  RAISE NOTICE 'Collaborators column exists: %', col_exists;
  RAISE NOTICE 'Number of policies: %', policy_count;
  RAISE NOTICE 'RLS enabled: %', rls_enabled;
  
  IF col_exists AND policy_count = 4 AND rls_enabled THEN
    RAISE NOTICE '✅ DATABASE SETUP IS CORRECT';
  ELSE
    RAISE NOTICE '❌ DATABASE SETUP HAS ISSUES';
    IF NOT col_exists THEN
      RAISE NOTICE '  - Missing collaborators column';
    END IF;
    IF policy_count != 4 THEN
      RAISE NOTICE '  - Wrong number of policies (need 4, have %)', policy_count;
    END IF;
    IF NOT rls_enabled THEN
      RAISE NOTICE '  - RLS is not enabled';
    END IF;
  END IF;
END $$;
```

This will tell you exactly what's wrong!
