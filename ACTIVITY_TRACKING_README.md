# Activity Tracking for Grocery Lists

## Overview

The app now tracks all activities related to grocery lists, including:
- ✅ When a grocery list was created
- ✅ When items are added to a list (with date/time)
- ✅ When items are deleted from a list (with date/time)
- ✅ Who performed each action

## Setup Instructions

### 1. Run the SQL Migration

Run the `add-activity-tracking.sql` script in your **Supabase SQL Editor**:

```sql
-- This will create:
-- - grocery_list_activity table
-- - Indexes for performance
-- - RLS policies for security
-- - Automatic trigger to log list creation
```

### 2. Verify Setup

After running the script, you should see:
```
✓ Activity tracking setup complete!
✓ 9 columns in grocery_list_activity table
```

## How It Works

### Automatic Tracking

The app automatically logs activities when:

1. **List Created**: Triggered by database when a new grocery list is created
2. **Item Added**: Logged when `addProductToGroceryList()` is called
3. **Item Deleted**: Logged when `deleteGroceryListItem()` is called

### Activity Data Structure

Each activity record contains:
```typescript
{
  id: string;              // Unique activity ID
  list_id: string;         // Which list this activity belongs to
  user_id: string;         // Who performed the action
  action: string;          // 'item_added', 'item_deleted', 'list_created'
  item_name: string;       // Name of the item (if applicable)
  item_id: string;         // ID of the item (if applicable)
  product_id: string;      // Product ID (if applicable)
  metadata: object;        // Additional data (quantity, store, price, etc.)
  created_at: timestamp;   // When the action occurred
}
```

### Example Activity Log

```
List "Weekly Groceries" created at 2025-11-08 09:00:00
Added "Milk" at 2025-11-08 09:05:23
Added "Bread" at 2025-11-08 09:06:15
Deleted "Milk" at 2025-11-08 09:10:45
Added "Almond Milk" at 2025-11-08 09:11:02
```

## Using the Activity Service

### Import the Service

```typescript
import { 
  logActivity, 
  getListActivity, 
  getUserActivity,
  formatActivityMessage 
} from '@/lib/services/activityService';
```

### Get Activity for a List

```typescript
// Get last 50 activities for a specific list
const activities = await getListActivity(listId, 50);

// Display activities
activities.forEach(activity => {
  console.log(formatActivityMessage(activity));
});
```

### Get User's Recent Activity

```typescript
// Get last 50 activities across all user's lists
const activities = await getUserActivity(userId, 50);
```

### Manually Log Activity (if needed)

```typescript
await logActivity(
  listId,
  userId,
  'item_added',
  'Milk',
  itemId,
  productId,
  { quantity: 2, store: 'Walmart', price: 3.99 }
);
```

## Database Schema

### grocery_list_activity Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| list_id | UUID | Foreign key to grocery_lists |
| user_id | UUID | User who performed action |
| action | TEXT | Type of action (enum) |
| item_name | TEXT | Name of item (optional) |
| item_id | UUID | ID of item (optional) |
| product_id | TEXT | Product ID (optional) |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | When action occurred |

### Indexes

- `idx_activity_list_id` - Fast queries by list
- `idx_activity_user_id` - Fast queries by user
- `idx_activity_created_at` - Fast queries by date

## Security (RLS Policies)

- ✅ Users can view activity for lists they own or collaborate on
- ✅ Users can insert activity for lists they own or collaborate on
- ❌ Users cannot modify or delete activity logs (audit trail)

## Future Enhancements

Potential features to add:
- Activity feed UI component
- Filter activities by date range
- Export activity log to CSV
- Activity notifications
- Undo/redo functionality based on activity log
- Analytics dashboard showing usage patterns

## Existing Timestamps

The app already tracks:
- `grocery_lists.created_at` - When list was created
- `grocery_lists.updated_at` - When list was last modified
- `grocery_items.created_at` - When item was added
- `grocery_items.updated_at` - When item was last modified

The new activity log provides a **complete audit trail** of all actions!
