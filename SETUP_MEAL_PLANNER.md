# 🔧 Meal Planner Setup Guide

## ⚠️ IMPORTANT: You Must Run This SQL First!

The meal planner feature requires database tables that don't exist yet. Follow these steps **exactly** to set it up.

---

## 📋 Step-by-Step Setup

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `rcmuzstcirbulftnbcth`
3. Click on **"SQL Editor"** in the left sidebar

### Step 2: Test Current Setup
1. Copy the contents of `test-meal-planner-setup.sql`
2. Paste into SQL Editor
3. Click **Run** (or press Ctrl+Enter)
4. Check the results:
   - If tables show "❌ MISSING" → Continue to Step 3
   - If tables show "✅ EXISTS" → Skip to Step 4

### Step 3: Create Tables and Policies
1. Copy the **ENTIRE** contents of `meal-planner-schema-fixed.sql`
2. Paste into SQL Editor
3. Click **Run** (or press Ctrl+Enter)
4. Wait for it to complete (should take 2-3 seconds)
5. You should see "Success. No rows returned"

### Step 4: Verify Setup
1. Run `test-meal-planner-setup.sql` again
2. Check that all tables show "✅ EXISTS"
3. Check that RLS is enabled (rls_enabled = true)
4. Check that you see policies listed
5. Check that auth_status shows "✅ AUTHENTICATED"

### Step 5: Test in App
1. Refresh your browser (hard refresh: Ctrl+Shift+R)
2. Navigate to the Meal Plan page
3. You should see the weekly view without errors!

---

## 🐛 Troubleshooting

### Error: "new row violates row-level security policy"

**Cause:** The SQL schema hasn't been run yet, or RLS policies aren't working.

**Solution:**
1. Make sure you ran `meal-planner-schema-fixed.sql` in Supabase
2. Check that you're logged in (run test query in Step 4)
3. Try running the schema again (it's safe to run multiple times)

### Error: "406 Not Acceptable"

**Cause:** The tables don't exist yet.

**Solution:**
1. Run `meal-planner-schema-fixed.sql` in Supabase SQL Editor
2. Verify tables exist using `test-meal-planner-setup.sql`

### Error: "relation does not exist"

**Cause:** Tables haven't been created.

**Solution:**
1. Run `meal-planner-schema-fixed.sql` in Supabase SQL Editor
2. Make sure you're in the correct project

### Still Having Issues?

Run this diagnostic query in Supabase SQL Editor:

```sql
-- Check everything
SELECT 
  'Tables' as check_type,
  COUNT(*) as count
FROM pg_tables
WHERE tablename IN ('meal_plans', 'meals', 'recipes', 'recipe_ingredients')
  AND schemaname = 'public'

UNION ALL

SELECT 
  'Policies' as check_type,
  COUNT(*) as count
FROM pg_policies
WHERE tablename IN ('meal_plans', 'meals', 'recipes', 'recipe_ingredients')

UNION ALL

SELECT 
  'User Auth' as check_type,
  CASE WHEN auth.uid() IS NOT NULL THEN 1 ELSE 0 END as count;
```

**Expected Results:**
- Tables: 4
- Policies: 16 (4 per table)
- User Auth: 1

---

## 📁 Files You Need

1. **meal-planner-schema-fixed.sql** - Main schema file (RUN THIS FIRST)
2. **test-meal-planner-setup.sql** - Test/verification queries
3. **SETUP_MEAL_PLANNER.md** - This guide

---

## ✅ Success Checklist

- [ ] Opened Supabase SQL Editor
- [ ] Ran `meal-planner-schema-fixed.sql`
- [ ] Saw "Success" message
- [ ] Ran `test-meal-planner-setup.sql`
- [ ] All tables show "✅ EXISTS"
- [ ] RLS is enabled on all tables
- [ ] Policies are created (16 total)
- [ ] User is authenticated
- [ ] Refreshed browser
- [ ] Meal Plan page loads without errors

---

## 🎉 After Setup

Once setup is complete, you can:
- Create meal plans
- Add meals for each day
- Create recipes with ingredients
- Generate grocery lists from meal plans

Enjoy your new meal planner! 🍽️
