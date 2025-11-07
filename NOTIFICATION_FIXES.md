# Notification System Fixes

## Issues Fixed

### 1. ✅ Show Collaborators on Shared Lists
**Problem:** Users couldn't see who they were collaborating with on shared grocery lists.

**Solution:**
- Updated `ShareGroceryList` component to display current collaborators
- Shows collaborator count with user icon
- Lists all collaborator emails in the share dialog
- Added ability to remove collaborators with X button
- Collaborators list updates in real-time when adding/removing

**Files Modified:**
- `src/components/ShareGroceryList.tsx`
- `src/pages/GroceryList.tsx`

### 2. ✅ Fix Notification Triggers for Item Added
**Problem:** List owners weren't receiving notifications when collaborators added items to shared lists.

**Solution:**
- Created database function `get_user_id_by_email()` to safely query user IDs from emails
- Updated notification trigger in `addProductToGroceryList()` to use the new function
- Fixed `addCollaboratorToList()` to properly send "list shared" notifications
- Notifications now work for both:
  - When a list is shared with someone
  - When someone adds items to a shared list

**Files Modified:**
- `notifications-schema.sql` - Added `get_user_id_by_email()` function
- `src/lib/services/groceryListService.ts` - Fixed notification triggers

## How It Works Now

### Sharing a List
1. Owner clicks "Share List" button
2. Enters collaborator's email and clicks "Add"
3. Collaborator is added to the list
4. **Collaborator receives in-app notification** "List shared with you"
5. **Owner sees the collaborator listed** in the share dialog
6. When collaborator logs in, they see the shared list automatically

### Adding Items to Shared List
1. Any collaborator (or owner) adds an item to the shared list
2. **All other collaborators receive notification** "Item added to shared list"
3. Notification appears in real-time in the notification bell
4. Browser push notification appears (if enabled)
5. Clicking notification navigates to the shared list

### Viewing Collaborators
1. Open a grocery list you own
2. Click "Share List" button
3. See section "Current Collaborators (X)" with all collaborator emails
4. Click X button to remove a collaborator

## Database Setup Required

**IMPORTANT:** You must run the updated `notifications-schema.sql` in your Supabase SQL Editor to add the new `get_user_id_by_email()` function.

```sql
-- This function is now in notifications-schema.sql
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_uuid;
END;
$$;
```

## Testing the Fixes

### Test 1: View Collaborators
1. Create a grocery list
2. Click "Share List"
3. Add a collaborator email
4. Verify the collaborator appears in "Current Collaborators" section
5. Try removing the collaborator with X button

### Test 2: List Shared Notification
1. User A shares a list with User B's email
2. User B logs in
3. User B should see:
   - The shared list in their grocery lists
   - Notification: "User A shared 'List Name' with you"

### Test 3: Item Added Notification
1. User A shares a list with User B
2. User B adds an item to the shared list
3. User A should see:
   - Notification: "User B added [Product] to [List Name]"
   - Notification appears in real-time (no refresh needed)
   - Browser notification (if enabled)

## Next Steps

If you want to enhance this further, you could add:
- Email notifications (send actual emails when lists are shared)
- Notification when items are checked/unchecked
- Notification when list name is changed
- Notification preferences per list
- Mute notifications for specific lists
