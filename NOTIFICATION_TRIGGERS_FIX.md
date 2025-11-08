# Notification Triggers Fix

## Issue Fixed
Collaborators were not receiving notifications when items were added or deleted from shared grocery lists.

## Root Cause
1. The `get_user_id_by_email()` database function was not created in Supabase
2. The `deleteGroceryListItem()` function had no notification triggers
3. Function calls were missing required parameters (listId, userId)

## Changes Made

### 1. Database Function (Already in schema)
The `get_user_id_by_email()` function in `notifications-schema.sql` allows secure lookup of user IDs from email addresses.

```sql
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

### 2. Updated `deleteGroceryListItem()` Function
**File:** `src/lib/services/groceryListService.ts`

- Added optional `listId` and `userId` parameters
- Fetches item and list details before deletion
- Sends notifications to all collaborators when an item is removed
- Notifies list owner if a collaborator removes an item

**Notification sent:**
- Type: `item_added` (reused for consistency)
- Title: "Item removed from shared list"
- Message: "[User] removed [Item] from [List]"

### 3. Updated Function Calls
**Files:**
- `src/pages/GroceryList.tsx`
- `src/pages/SharedList.tsx`

Changed from:
```typescript
await deleteGroceryListItem(itemId);
```

To:
```typescript
await deleteGroceryListItem(itemId, listId, user?.id);
```

## How It Works Now

### When a Collaborator Adds an Item
1. Item is added to the shared list
2. System gets all collaborators from the list
3. For each collaborator email:
   - Looks up their user ID using `get_user_id_by_email()`
   - Creates a notification: "[User] added [Item] to [List]"
4. Notification appears in real-time in the bell icon
5. Browser push notification (if enabled)

### When a Collaborator Deletes an Item
1. Item details are fetched before deletion
2. Item is deleted from the database
3. System gets all collaborators from the list
4. For each collaborator email:
   - Looks up their user ID using `get_user_id_by_email()`
   - Creates a notification: "[User] removed [Item] from [List]"
5. List owner also gets notified if a collaborator deleted the item
6. Notification appears in real-time

## Setup Required

### CRITICAL: Run SQL in Supabase

You **MUST** run the entire `notifications-schema.sql` file in your Supabase SQL Editor, or at minimum run this function:

```sql
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

Without this function, notifications will NOT work!

## Testing

### Test Item Added Notification
1. User A shares a list with User B
2. User B adds an item to the shared list
3. User A should see notification: "User B added [Product] to [List]"
4. Notification appears instantly in the bell icon

### Test Item Deleted Notification
1. User A shares a list with User B
2. User B deletes an item from the shared list
3. User A should see notification: "User B removed [Product] from [List]"
4. Notification appears instantly in the bell icon

### Test Multiple Collaborators
1. User A shares a list with User B and User C
2. User B adds/deletes an item
3. Both User A and User C should receive notifications

## Notification Types

| Action | Notification Type | Title | Message |
|--------|------------------|-------|---------|
| List Shared | `list_shared` | "List shared with you" | "[User] shared '[List]' with you" |
| Item Added | `item_added` | "Item added to shared list" | "[User] added [Product] to [List]" |
| Item Deleted | `item_added` | "Item removed from shared list" | "[User] removed [Product] from [List]" |

Note: Item deletion reuses the `item_added` type for consistency. You can add a new `item_removed` type if preferred.

## Troubleshooting

### Notifications Not Appearing
1. **Check database function exists:**
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'get_user_id_by_email';
   ```

2. **Check console for errors:**
   - Open browser DevTools (F12)
   - Look for errors mentioning `get_user_id_by_email` or `createNotification`

3. **Verify collaborators are added:**
   - Open Share List dialog
   - Check if collaborators are listed

4. **Check Supabase Realtime is enabled:**
   - Go to Database → Replication
   - Ensure `notifications` table is enabled

### Function Not Found Error
If you see: `function public.get_user_id_by_email(text) does not exist`

**Solution:** Run the SQL function in Supabase SQL Editor (see Setup Required section above)

## Next Steps

Optional enhancements:
1. Add `item_removed` notification type (separate from `item_added`)
2. Add notifications for item quantity changes
3. Add notifications for item check/uncheck
4. Add notification preferences per list
5. Add email notifications (not just in-app)
