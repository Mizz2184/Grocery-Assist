# Shared Meal Plan Access - Update

## Problem Solved
Collaborators can now automatically see shared meal plans when they log into the app!

## What Changed

### 1. Automatic Shared Plan Loading
**Before:** Collaborators could only access shared plans via direct link  
**After:** When a collaborator logs in, they automatically see shared meal plans

### 2. How It Works

When you open the Meal Planner page (`/meal-plan`):

1. **First**, the app checks if you have your own meal plan for the current week
2. **If yes**, it shows your plan
3. **If no**, it checks if anyone has shared a meal plan with you (using your email)
4. **If found**, it shows the shared plan with a "👥 Plan compartido" indicator

### 3. Visual Indicators

**Shared Plan Badge:**
- When viewing a shared plan, you'll see "👥 Plan compartido" below the date
- This lets you know you're viewing someone else's plan

**Share Button:**
- Only the plan owner sees the "Share" button
- Collaborators can edit but can't manage other collaborators

### 4. Permissions

**Plan Owner:**
- ✅ View and edit meals
- ✅ Share with others
- ✅ Add/remove collaborators
- ✅ Delete the plan

**Collaborators:**
- ✅ View all meals
- ✅ Add new meals
- ✅ Edit existing meals
- ✅ Delete meals
- ❌ Cannot manage collaborators
- ❌ Cannot delete the plan

## Code Changes

### Updated Files:

1. **`src/lib/services/mealPlannerService.ts`**
   - Updated `getCurrentWeekMealPlan()` to accept `userEmail` parameter
   - Now checks for shared plans if user doesn't have their own
   - Added `getSharedMealPlans()` function to get all plans shared with a user

2. **`src/pages/MealPlan.tsx`**
   - Pass user email to `getCurrentWeekMealPlan()`
   - Show "👥 Plan compartido" badge when viewing shared plans
   - Hide Share button for collaborators (only owner can share)

## Testing

### Test Scenario 1: Owner Shares Plan
1. **User A** creates a meal plan
2. **User A** clicks Share and adds **User B's** email
3. **User B** logs in
4. **User B** sees the shared meal plan automatically ✅

### Test Scenario 2: Collaborator Edits
1. **User B** (collaborator) adds a meal
2. **User A** (owner) refreshes and sees the new meal ✅
3. Both users can edit the same plan

### Test Scenario 3: Multiple Shared Plans
1. **User A** shares Week 1 plan with **User C**
2. **User B** shares Week 2 plan with **User C**
3. **User C** sees the most recent shared plan for current week ✅

## Priority Logic

The app follows this priority when loading meal plans:

```
1. Your own meal plan (if exists)
   ↓
2. Shared meal plan for current week (if exists)
   ↓
3. Create new meal plan (if neither exists)
```

## API Function Signature

```typescript
// Updated function
getCurrentWeekMealPlan(userId: string, userEmail?: string): Promise<MealPlan | null>

// New function
getSharedMealPlans(userEmail: string): Promise<MealPlan[]>
```

## Database Query

The shared plan query uses:
```sql
SELECT * FROM meal_plans
WHERE week_start_date = '2025-11-03'
AND 'user@example.com' = ANY(collaborators)
ORDER BY created_at DESC
LIMIT 1;
```

## Future Enhancements

Potential improvements:
- [ ] Show list of all shared plans (not just current week)
- [ ] Notification when someone shares a plan with you
- [ ] Switch between your plan and shared plans
- [ ] Activity feed showing who made changes
- [ ] Conflict resolution if both owner and collaborator edit simultaneously

## Troubleshooting

### "I shared a plan but collaborator can't see it"
**Check:**
1. Did you run the `add-meal-plan-sharing.sql` migration?
2. Is the collaborator's email exactly matching their account email?
3. Did the collaborator refresh the page after being added?

### "Collaborator sees old data"
**Solution:** Refresh the page (Ctrl + R or F5)

### "Share button not showing"
**This is correct!** Only the plan owner sees the Share button. Collaborators can edit but not manage sharing.

### "Can't add meals to shared plan"
**Check:**
1. Verify RLS policies are set correctly in Supabase
2. Check browser console for errors
3. Ensure you're logged in with the collaborator email

## Security Notes

- ✅ RLS policies enforce access control
- ✅ Only owner and collaborators can view/edit
- ✅ Collaborators identified by email address
- ✅ Database-level security (not just UI)

---

**Status:** ✅ Implemented and Ready to Use

No additional database migrations needed - uses the same `collaborators` column from the previous update.
