# Meal Plan Sharing Troubleshooting Guide

## Issues You're Experiencing

1. ✅ **Shared meal plan count shows** - This means `getUserMealPlans()` is working
2. ❌ **Shared meal plans not displaying** - The meal plan content isn't showing
3. ❌ **No notifications received** - Notifications aren't being created

## Root Causes & Solutions

### Issue 1: Shared Meal Plans Not Displaying

**Problem:** The `getMealPlanForWeek()` function wasn't properly querying for shared meal plans.

**Fix Applied:** Changed the query from:
```typescript
.neq('user_id', userId) // This doesn't work with RLS
```

To:
```typescript
.contains('collaborators', [userEmail]) // Properly checks the collaborators array
```

### Issue 2: Notifications Not Working

**Problem:** The `profiles` table doesn't exist or doesn't have user data.

**Solution:** Run the `create-profiles-table.sql` script.

## Step-by-Step Fix Instructions

### Step 1: Run All SQL Migrations in Order

You need to run **FOUR** SQL scripts in your Supabase dashboard:

#### 1. First: `fix-meal-planner-rls.sql`
This sets up basic RLS policies for meal plans and meals.

#### 2. Second: `add-meal-plan-sharing.sql`
This adds the `collaborators` column and updates RLS for sharing.

#### 3. Third: `create-profiles-table.sql` ⭐ **NEW - IMPORTANT**
This creates the profiles table needed for notifications.

#### 4. Fourth: `update-notification-preferences.sql`
This adds meal plan notification preferences.

### Step 2: Verify Database Setup

After running all scripts, verify in Supabase:

#### Check `meal_plans` table:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meal_plans';
```

Should include:
- `id` (uuid)
- `user_id` (uuid)
- `name` (text)
- `week_start_date` (date)
- `collaborators` (text[]) ⭐ **Must exist**

#### Check `profiles` table exists:
```sql
SELECT * FROM profiles LIMIT 5;
```

Should show user profiles with:
- `id` (uuid)
- `email` (text)
- `full_name` (text)

#### Check RLS policies:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('meal_plans', 'meals', 'profiles');
```

### Step 3: Test Sharing

1. **User A** creates a meal plan
2. **User A** adds **User B** as collaborator
3. Check browser console for logs:
   ```
   🔍 Looking up user with email: userb@example.com
   ✅ Found user ID: xxx-xxx-xxx
   ✅ Notification sent successfully to userb@example.com
   Collaborator userb@example.com added to meal plan xxx
   ```

4. **User B** logs in and clicks "Shared with Me"
5. **User B** should see the shared meal plan

### Step 4: Verify Notifications

1. **User B** clicks the notification bell icon
2. Should see: "Someone shared the meal plan 'Plan Name' with you"

## Common Issues & Solutions

### Issue: "User not found in profiles table"

**Console shows:**
```
⚠️ User with email user@example.com not found in profiles table
💡 The user may need to log in at least once to create their profile
```

**Solution:**
1. Make sure you ran `create-profiles-table.sql`
2. Have the collaborator log out and log back in
3. The trigger will auto-create their profile
4. Or manually insert:
   ```sql
   INSERT INTO profiles (id, email, full_name)
   SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
   FROM auth.users
   WHERE email = 'collaborator@example.com';
   ```

### Issue: "Error querying profiles table"

**Console shows:**
```
❌ Error querying profiles table: relation "profiles" does not exist
⚠️ Make sure you have run create-profiles-table.sql
```

**Solution:**
Run `create-profiles-table.sql` in Supabase SQL Editor.

### Issue: Shared meal plans show in count but not in view

**Problem:** The filter is working but the meal plan content isn't loading.

**Check:**
1. Open browser console
2. Click "Shared with Me"
3. Look for errors in console
4. Check Network tab for failed requests

**Verify RLS policies:**
```sql
-- Test if you can see shared meal plans
SELECT * FROM meal_plans 
WHERE 'your-email@example.com' = ANY(collaborators);
```

### Issue: Can see shared meal plan but can't see meals

**Problem:** RLS policies on `meals` table aren't allowing access.

**Verify:**
```sql
-- Check if meals RLS includes collaborators
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'meals';
```

**Should include policies like:**
- "Users can view meals from their own or shared meal plans"
- "Users can insert meals into their own or shared meal plans"

If missing, re-run `add-meal-plan-sharing.sql`.

## Debugging Checklist

- [ ] Ran `fix-meal-planner-rls.sql`
- [ ] Ran `add-meal-plan-sharing.sql`
- [ ] Ran `create-profiles-table.sql` ⭐
- [ ] Ran `update-notification-preferences.sql`
- [ ] `meal_plans` table has `collaborators` column (text[])
- [ ] `profiles` table exists with user data
- [ ] `notification_preferences` table has meal plan columns
- [ ] Both users have logged in at least once
- [ ] Browser console shows no errors
- [ ] RLS policies are active on all tables

## Testing Commands

### Check if collaborator was added:
```sql
SELECT id, name, user_id, collaborators 
FROM meal_plans 
WHERE id = 'your-meal-plan-id';
```

### Check if notification was created:
```sql
SELECT * FROM notifications 
WHERE type = 'meal_plan_shared' 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check user's profiles:
```sql
SELECT id, email, full_name 
FROM profiles 
WHERE email IN ('user1@example.com', 'user2@example.com');
```

### Manually test shared meal plan query:
```sql
-- Replace with actual values
SELECT * FROM meal_plans 
WHERE week_start_date = '2025-11-25' 
AND 'collaborator@example.com' = ANY(collaborators);
```

## Expected Console Output

### When adding collaborator (successful):
```
🔍 Looking up user with email: collaborator@example.com
✅ Found user ID: abc-123-def-456
✅ Notification sent successfully to collaborator@example.com
Collaborator collaborator@example.com added to meal plan xyz-789
```

### When viewing shared meal plans:
```
Loading meal plan for week: 2025-11-25
Found shared meal plan: Plan Name
Loading meals for meal plan: xyz-789
```

## Still Not Working?

1. **Check Supabase logs:**
   - Go to Supabase Dashboard
   - Click "Logs" → "Postgres Logs"
   - Look for RLS policy violations

2. **Verify user authentication:**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user?.email);
   ```

3. **Test RLS policies directly:**
   - Go to Supabase Table Editor
   - Try to view `meal_plans` table
   - Try to view `profiles` table
   - Check if you can see collaborator data

4. **Clear browser cache and reload**

5. **Check browser console for detailed error messages**

## Summary

The main fixes applied:
1. ✅ Fixed `getMealPlanForWeek()` to use `.contains('collaborators', [userEmail])`
2. ✅ Added detailed logging for debugging
3. ✅ Created `create-profiles-table.sql` for notifications
4. ✅ Added better error handling

**Most important:** Make sure you run `create-profiles-table.sql` - this is critical for notifications to work!
