# Notifications Setup Guide

## Overview
This guide will help you set up the complete notification system for grocery lists and meal plan sharing.

## Required SQL Scripts (Run in Order)

You need to run **FIVE** SQL scripts in your Supabase SQL Editor:

### 1. `create-profiles-table.sql`
Creates the profiles table for user information.
- **Purpose:** Stores user profiles with email addresses
- **Required for:** User lookup by email

### 2. `create-get-user-id-function.sql` ⭐ **NEW**
Creates a helper function to get user ID by email.
- **Purpose:** Lookup user UUID from email address
- **Required for:** Both grocery list and meal plan notifications

### 3. `create-notifications-table.sql` ⭐ **NEW**
Creates the notifications table.
- **Purpose:** Stores all in-app notifications
- **Required for:** Notification bell to work

### 4. `update-notification-preferences.sql`
Adds meal plan notification preferences.
- **Purpose:** User preferences for notification types
- **Required for:** Users to control which notifications they receive

### 5. `add-meal-plan-sharing.sql`
Adds collaborator functionality to meal plans.
- **Purpose:** Enable meal plan sharing
- **Required for:** Meal plan sharing to work

## How to Run SQL Scripts

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL from each file
5. Click **Run** (or press Ctrl+Enter)
6. Verify success (should see "Success. No rows returned")

## Verification Steps

### Check Tables Exist

Run this query to verify all tables are created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'notifications', 'notification_preferences', 'meal_plans');
```

Should return:
- ✅ profiles
- ✅ notifications
- ✅ notification_preferences
- ✅ meal_plans

### Check Function Exists

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_id_by_email';
```

Should return:
- ✅ get_user_id_by_email

### Check Profiles Have Data

```sql
SELECT id, email, full_name 
FROM profiles 
LIMIT 5;
```

Should show your users with their emails.

### Check Notifications Table Structure

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications';
```

Should include:
- ✅ id (uuid)
- ✅ user_id (uuid)
- ✅ type (text)
- ✅ title (text)
- ✅ message (text)
- ✅ data (jsonb)
- ✅ read (boolean)
- ✅ created_at (timestamp)

## Testing Notifications

### Test Grocery List Sharing

1. **User A** creates a grocery list
2. **User A** adds **User B** as collaborator
3. Check console logs:
   ```
   🔍 Looking up user with email: userb@example.com
   ✅ Found user ID: xxx-xxx-xxx
   ```
4. **User B** logs in
5. **User B** should see notification bell with badge (1)
6. Click bell to see: "Someone shared 'List Name' with you"

### Test Meal Plan Sharing

1. **User A** creates a meal plan
2. **User A** adds **User B** as collaborator
3. Check console logs:
   ```
   🔍 Looking up user with email: userb@example.com
   ✅ Found user ID: xxx-xxx-xxx
   ✅ Notification sent successfully to userb@example.com
   ```
4. **User B** logs in
5. **User B** should see notification bell with badge (1)
6. Click bell to see: "Someone shared the meal plan 'Plan Name' with you"

### Verify Notification in Database

```sql
SELECT * FROM notifications 
WHERE type IN ('list_shared', 'meal_plan_shared')
ORDER BY created_at DESC 
LIMIT 5;
```

Should show recent notifications with:
- user_id (collaborator's UUID)
- type (list_shared or meal_plan_shared)
- title
- message
- read (false for new notifications)

## Troubleshooting

### Issue: No notifications appearing

**Check 1: Notifications table exists**
```sql
SELECT COUNT(*) FROM notifications;
```

If error "relation does not exist":
- ❌ Run `create-notifications-table.sql`

**Check 2: Function exists**
```sql
SELECT get_user_id_by_email('test@example.com');
```

If error "function does not exist":
- ❌ Run `create-get-user-id-function.sql`

**Check 3: User has profile**
```sql
SELECT * FROM profiles WHERE email = 'collaborator@example.com';
```

If no results:
- ❌ Run `create-profiles-table.sql`
- ❌ Have user log out and log back in

**Check 4: Notification was created**
```sql
SELECT * FROM notifications 
WHERE user_id = (SELECT get_user_id_by_email('collaborator@example.com'))
ORDER BY created_at DESC 
LIMIT 5;
```

If no results:
- Check console logs for errors
- Verify RLS policies allow insert

### Issue: Notification created but not showing in bell

**Check 1: RLS policies**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'notifications';
```

Should include:
- ✅ "Users can view their own notifications" (SELECT)
- ✅ "System can insert notifications" (INSERT)

**Check 2: Real-time subscription**
- Open browser console
- Look for "Subscribed to notifications" message
- Check for WebSocket connection errors

**Check 3: User ID matches**
```sql
-- Get current user's ID from auth
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Check if notification exists for that ID
SELECT * FROM notifications WHERE user_id = 'user-uuid-here';
```

### Issue: Console shows "User not found"

**Solution:**
```sql
-- Check if user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'collaborator@example.com';

-- If exists, add to profiles
INSERT INTO profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE email = 'collaborator@example.com'
ON CONFLICT (id) DO NOTHING;
```

### Issue: RPC function error

**Error:** `function get_user_id_by_email(user_email => text) does not exist`

**Solution:**
1. Run `create-get-user-id-function.sql`
2. Verify with:
   ```sql
   SELECT get_user_id_by_email('test@example.com');
   ```

## Notification Types

The system supports these notification types:

### Grocery Lists:
- `list_shared` - When someone shares a list with you
- `item_added` - When an item is added to a shared list
- `item_checked` - When an item is checked off
- `list_updated` - When a shared list is updated

### Meal Plans:
- `meal_plan_shared` - When someone shares a meal plan with you
- `meal_added` - When a meal is added to a shared plan
- `meal_plan_updated` - When a shared meal plan is updated

## User Preferences

Users can control which notifications they receive:

```sql
SELECT * FROM notification_preferences WHERE user_id = 'user-uuid';
```

Default settings (all enabled):
- ✅ list_shared: true
- ✅ meal_plan_shared: true
- ✅ item_added: true
- ✅ meal_added: true

## Real-time Updates

Notifications appear in real-time using Supabase Realtime:

1. User subscribes to their notifications channel
2. When notification is inserted, real-time event fires
3. NotificationBell component receives update
4. Badge count updates automatically
5. Toast notification appears
6. Browser notification shows (if permitted)

## Summary Checklist

Before testing, ensure:

- [ ] Ran `create-profiles-table.sql`
- [ ] Ran `create-get-user-id-function.sql` ⭐
- [ ] Ran `create-notifications-table.sql` ⭐
- [ ] Ran `update-notification-preferences.sql`
- [ ] Ran `add-meal-plan-sharing.sql`
- [ ] Both users have logged in at least once
- [ ] Both users exist in `profiles` table
- [ ] Function `get_user_id_by_email` exists
- [ ] Table `notifications` exists with correct structure
- [ ] RLS policies are enabled on all tables

## Expected Console Output

### When adding collaborator:
```
🔍 Looking up user with email: collaborator@example.com
✅ Found user ID: abc-123-def-456
✅ Notification sent successfully to collaborator@example.com
Collaborator collaborator@example.com added to meal plan xyz-789
```

### When collaborator logs in:
```
Subscribed to notifications for user: abc-123-def-456
Loaded 1 notification(s)
Unread count: 1
```

## Need Help?

If notifications still aren't working after following this guide:

1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Verify all SQL scripts ran successfully
4. Test with the verification queries above
5. Check that both users exist in auth.users and profiles tables
