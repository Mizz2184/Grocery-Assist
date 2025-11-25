# Meal Plan Notifications Setup Guide

## Overview
This guide explains how to enable notifications when users are added as collaborators to meal plans.

## What's Been Added

### 1. New Notification Types
Added three new notification types for meal plans:
- `meal_plan_shared` - When someone shares a meal plan with you
- `meal_added` - When a meal is added to a shared meal plan
- `meal_plan_updated` - When a shared meal plan is updated

### 2. Updated Services

#### `notificationService.ts`
- ✅ Added meal plan notification types
- ✅ Updated `NotificationPreferences` interface
- ✅ Updated default preferences to include meal plan notifications

#### `mealPlannerService.ts`
- ✅ Imported notification service
- ✅ Updated `addMealPlanCollaborator()` to send notifications
- ✅ Looks up collaborator user ID by email
- ✅ Creates notification with meal plan details

### 3. Database Changes
New columns added to `notification_preferences` table:
- `meal_plan_shared` (BOOLEAN)
- `meal_added` (BOOLEAN)
- `meal_plan_updated` (BOOLEAN)

## Setup Instructions

### Step 1: Run Database Migrations

You need to run **TWO** SQL scripts in order:

#### 1. First, run `add-meal-plan-sharing.sql`
This adds the collaborators functionality to meal plans.

#### 2. Then, run `update-notification-preferences.sql`
This adds meal plan notification preferences.

**How to run:**
1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the SQL from each file
4. Click **Run** for each script

### Step 2: Verify Database Tables

After running the scripts, verify:

#### `meal_plans` table has:
```sql
collaborators TEXT[] DEFAULT '{}'
```

#### `notification_preferences` table has:
```sql
meal_plan_shared BOOLEAN DEFAULT true
meal_added BOOLEAN DEFAULT true
meal_plan_updated BOOLEAN DEFAULT true
```

#### `profiles` table exists with:
```sql
id UUID
email TEXT
```

**Note:** The notification system requires a `profiles` table with user emails to look up user IDs.

### Step 3: Test Notifications

1. **Add a collaborator to a meal plan:**
   ```typescript
   import { addMealPlanCollaborator } from '@/lib/services/mealPlannerService';
   
   const success = await addMealPlanCollaborator(
     mealPlanId,
     userId,
     'collaborator@example.com'
   );
   ```

2. **Check notifications:**
   - Log in as the collaborator
   - Click the notification bell icon
   - You should see: "Someone shared the meal plan 'Meal Plan Name' with you"

## How It Works

### When a Collaborator is Added:

1. **Update meal plan** - Add email to `collaborators` array
2. **Look up user** - Find collaborator's user ID by email in `profiles` table
3. **Create notification** - Insert notification record with:
   - Type: `meal_plan_shared`
   - Title: "Meal Plan Shared"
   - Message: "{User} shared the meal plan '{Name}' with you"
   - Data: meal plan ID, name, shared by info
4. **Real-time update** - Notification appears in bell icon immediately

### Notification Flow:

```
User A shares meal plan with User B
         ↓
addMealPlanCollaborator() called
         ↓
Update meal_plans.collaborators
         ↓
Look up User B's ID from profiles table
         ↓
createNotification() called
         ↓
Insert into notifications table
         ↓
Real-time subscription triggers
         ↓
User B sees notification in bell icon
```

## Notification Data Structure

When a meal plan is shared, the notification includes:

```typescript
{
  id: "uuid",
  user_id: "collaborator-user-id",
  type: "meal_plan_shared",
  title: "Meal Plan Shared",
  message: "John Doe shared the meal plan 'Weekly Meals' with you",
  data: {
    meal_plan_id: "meal-plan-uuid",
    meal_plan_name: "Weekly Meals",
    shared_by: "John Doe",
    shared_by_id: "owner-user-id"
  },
  read: false,
  created_at: "2025-11-25T14:22:00Z"
}
```

## User Preferences

Users can control meal plan notifications in their settings:

```typescript
import { updateNotificationPreferences } from '@/lib/services/notificationService';

// Disable meal plan shared notifications
await updateNotificationPreferences(userId, {
  meal_plan_shared: false
});
```

### Default Preferences:
- ✅ `meal_plan_shared`: **true** (enabled)
- ✅ `meal_added`: **true** (enabled)
- ✅ `meal_plan_updated`: **true** (enabled)

## Troubleshooting

### Issue: Notifications not appearing

**Possible causes:**
1. **Profiles table missing** - The system looks up user IDs by email in the `profiles` table
   - Solution: Ensure you have a `profiles` table with `id` and `email` columns
   - The email should match the user's auth email

2. **User preferences disabled** - User may have disabled meal plan notifications
   - Solution: Check `notification_preferences` table for the user

3. **SQL migrations not run** - Database columns missing
   - Solution: Run both SQL scripts in order

### Issue: "User not found in profiles table" warning

**Solution:** 
- Create a `profiles` table if it doesn't exist:
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();
```

### Issue: Notification sent but user doesn't see it

**Check:**
1. User is logged in
2. Notification bell component is mounted
3. Real-time subscription is active
4. Check browser console for errors

## Future Enhancements

### Potential additions:
- 📧 **Email notifications** - Send email when meal plan is shared
- 🔔 **Push notifications** - Browser push notifications
- 📱 **Mobile notifications** - If you add a mobile app
- 🔄 **Meal added notifications** - Notify when meals are added to shared plans
- ✏️ **Meal updated notifications** - Notify when meals are edited
- 🗑️ **Meal deleted notifications** - Notify when meals are removed

### Implementation example for meal added:
```typescript
// In createMeal function
export async function createMeal(input: CreateMealInput): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .insert(input)
    .select()
    .single();

  if (error) throw error;

  // Send notifications to collaborators
  const { data: mealPlan } = await supabase
    .from('meal_plans')
    .select('collaborators, name, user_id')
    .eq('id', input.meal_plan_id)
    .single();

  if (mealPlan?.collaborators) {
    // Notify each collaborator
    for (const email of mealPlan.collaborators) {
      // Look up user ID and send notification
    }
  }

  return data;
}
```

## Testing Checklist

- [ ] Run `add-meal-plan-sharing.sql`
- [ ] Run `update-notification-preferences.sql`
- [ ] Verify `profiles` table exists with user emails
- [ ] Create a meal plan as User A
- [ ] Add User B as collaborator
- [ ] Log in as User B
- [ ] Check notification bell - should show new notification
- [ ] Click notification - should navigate to shared meal plan
- [ ] Verify User B can see and edit the meal plan

## Summary

✅ **Notifications are now sent when:**
- A user is added as a collaborator to a meal plan

✅ **Users can:**
- See notifications in the bell icon
- Control notification preferences in settings
- Get real-time updates when shared

✅ **System handles:**
- Looking up user IDs by email
- Creating notifications with meal plan details
- Respecting user preferences
- Real-time delivery

Enjoy the new meal plan notification feature! 🍽️🔔
