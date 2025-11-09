# Troubleshooting Meal Plan Sharing

## Issue: Collaborators Cannot See Shared Meal Plans

### Quick Fix Steps

#### Step 1: Run the Fixed Migration
1. Open Supabase Dashboard → SQL Editor
2. Open the file `fix-meal-plan-sharing-policies.sql`
3. Copy and paste the entire content
4. Click **Run**
5. Verify you see "Success" messages

#### Step 2: Verify Database Setup
Run the diagnostic queries from `debug-meal-plan-sharing.sql`:

```sql
-- Check if collaborators column exists
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'meal_plans' AND column_name = 'collaborators';
```

**Expected result:** Should show `collaborators | ARRAY | text[]`

#### Step 3: Check RLS Policies
```sql
-- View all policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('meal_plans', 'meals')
ORDER BY tablename, policyname;
```

**Expected policies for meal_plans:**
- `meal_plans_select_policy` (SELECT)
- `meal_plans_insert_policy` (INSERT)
- `meal_plans_update_policy` (UPDATE)
- `meal_plans_delete_policy` (DELETE)

**Expected policies for meals:**
- `meals_select_policy` (SELECT)
- `meals_insert_policy` (INSERT)
- `meals_update_policy` (UPDATE)
- `meals_delete_policy` (DELETE)

#### Step 4: Verify Collaborator Email
```sql
-- Check if collaborator is actually saved
SELECT id, name, collaborators 
FROM meal_plans 
WHERE id = 'YOUR_MEAL_PLAN_ID';
```

**Important:** The email in `collaborators` array must **exactly match** the email the collaborator uses to log in.

### Common Issues and Solutions

#### Issue 1: Email Mismatch
**Problem:** Collaborator email doesn't match their login email  
**Solution:** 
- Check the exact email in Supabase Auth → Users
- Make sure you're adding the exact same email (case-sensitive)
- Re-add the collaborator with the correct email

#### Issue 2: RLS Policies Not Applied
**Problem:** Old policies still active  
**Solution:**
1. Run `fix-meal-plan-sharing-policies.sql` which drops ALL old policies
2. Verify with the diagnostic queries
3. Restart your app

#### Issue 3: Collaborators Array Not Saving
**Problem:** Collaborators column doesn't exist or is null  
**Solution:**
```sql
-- Add column if missing
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS collaborators TEXT[] DEFAULT '{}';

-- Update existing rows
UPDATE meal_plans 
SET collaborators = '{}' 
WHERE collaborators IS NULL;
```

#### Issue 4: Client-Side Filtering Conflict
**Problem:** `.contains()` query doesn't work with RLS  
**Solution:** Already fixed in the code - we now rely on RLS policies instead of client-side filtering

### Testing the Fix

#### Test 1: Add Collaborator
1. **User A** (owner) opens Meal Planner
2. Click **Share** button
3. Add **User B's** email: `userb@example.com`
4. Click **Add**
5. Verify email appears in "Current Collaborators"

#### Test 2: Verify in Database
```sql
-- Check if collaborator was saved
SELECT id, name, user_id, collaborators
FROM meal_plans
WHERE 'userb@example.com' = ANY(collaborators);
```

Should return the meal plan with User B's email in the array.

#### Test 3: Collaborator Access
1. **User B** logs in with `userb@example.com`
2. Navigate to `/meal-plan`
3. Should see the shared meal plan automatically
4. Should see "👥 Plan compartido" badge
5. Should be able to add/edit meals

### Debug Checklist

- [ ] `collaborators` column exists in `meal_plans` table
- [ ] RLS policies are enabled on both tables
- [ ] All 8 policies exist (4 for meal_plans, 4 for meals)
- [ ] Collaborator email is saved in the array
- [ ] Collaborator email matches their login email exactly
- [ ] Collaborator is logged in with the correct account
- [ ] Page has been refreshed after adding collaborator
- [ ] No browser console errors

### Manual Test Query

Run this as the **collaborator** (logged in as User B):

```sql
-- This should return meal plans where you're a collaborator
SELECT 
  id,
  name,
  user_id,
  collaborators,
  week_start_date,
  auth.email() as my_email,
  auth.email() = ANY(collaborators) as i_am_collaborator
FROM meal_plans
WHERE auth.email() = ANY(collaborators);
```

If this returns rows, RLS is working. If not, there's a policy issue.

### Code Changes Made

1. **`mealPlannerService.ts`**
   - Removed `.contains()` filter
   - Now relies on RLS policies to filter shared plans
   - Uses `.neq('user_id', userId)` to exclude own plans

2. **`fix-meal-plan-sharing-policies.sql`**
   - Complete set of RLS policies
   - Drops all old policies first
   - Creates clean, working policies

### If Still Not Working

1. **Check Supabase logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for RLS policy errors

2. **Verify auth.email():**
   ```sql
   SELECT auth.email();
   ```
   Make sure this returns the correct email

3. **Check if RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('meal_plans', 'meals');
   ```
   Both should show `rowsecurity = true`

4. **Test without RLS (temporarily):**
   ```sql
   -- ONLY FOR TESTING - DISABLE RLS
   ALTER TABLE meal_plans DISABLE ROW LEVEL SECURITY;
   
   -- Test query
   SELECT * FROM meal_plans WHERE 'test@example.com' = ANY(collaborators);
   
   -- RE-ENABLE RLS IMMEDIATELY
   ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
   ```

### Contact Support

If none of these solutions work, provide:
1. Output from `debug-meal-plan-sharing.sql`
2. Browser console errors
3. Supabase Postgres logs
4. Exact steps to reproduce

---

**Last Updated:** After fixing RLS policy issues and removing client-side filtering
