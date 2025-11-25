# Meal Plan Sharing Setup Guide

## Overview
This guide explains how to enable meal plan sharing functionality, allowing paid users to share their meal plans with collaborators (similar to grocery list sharing).

## What's Been Added

### 1. Database Changes
- Added `collaborators` column to `meal_plans` table (TEXT[] array)
- Updated RLS policies to allow collaborators to view and edit shared meal plans
- Updated RLS policies for `meals` table to respect meal plan collaborators

### 2. Service Functions
Added three new functions to `mealPlannerService.ts`:
- `addMealPlanCollaborator()` - Add a collaborator by email
- `removeMealPlanCollaborator()` - Remove a collaborator
- `getSharedMealPlan()` - Get a meal plan accessible to collaborators

### 3. Updated Functions
- `getUserMealPlans()` - Now includes meal plans where user is a collaborator

## Setup Instructions

### Step 1: Run Database Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file `add-meal-plan-sharing.sql`
4. Copy all the SQL code
5. Paste and click **Run**

This will:
- ✅ Add `collaborators` column to `meal_plans` table
- ✅ Update all RLS policies for meal plans and meals
- ✅ Create indexes for better performance
- ✅ Allow collaborators to view, add, update, and delete meals

### Step 2: Update Your UI (Optional)

To add sharing UI similar to grocery lists, you'll need to:

1. **Add Share Button to Meal Plan Page**
   - Similar to the grocery list share button
   - Opens a dialog to add collaborators by email

2. **Add Collaborator Management UI**
   - Show list of current collaborators
   - Allow owner to remove collaborators
   - Display if meal plan is shared

3. **Add Shared Meal Plan Indicator**
   - Show an icon or badge for shared meal plans
   - Display owner name for shared meal plans

### Step 3: Test the Feature

1. **As Owner:**
   - Create a meal plan
   - Add a collaborator using their email
   - Verify they receive access

2. **As Collaborator:**
   - Log in with collaborator account
   - Verify you can see the shared meal plan
   - Add/edit/delete meals
   - Verify changes are visible to owner

## How It Works

### Sharing a Meal Plan

```typescript
import { addMealPlanCollaborator } from '@/lib/services/mealPlannerService';

// Add collaborator
const success = await addMealPlanCollaborator(
  mealPlanId,
  userId,
  'collaborator@example.com'
);
```

### Removing a Collaborator

```typescript
import { removeMealPlanCollaborator } from '@/lib/services/mealPlannerService';

// Remove collaborator
const success = await removeMealPlanCollaborator(
  mealPlanId,
  userId,
  'collaborator@example.com'
);
```

### Accessing Shared Meal Plans

```typescript
import { getUserMealPlans, getSharedMealPlan } from '@/lib/services/mealPlannerService';

// Get all meal plans (owned + shared)
const mealPlans = await getUserMealPlans(userId);

// Get specific shared meal plan
const sharedPlan = await getSharedMealPlan(mealPlanId);
```

## Permissions

### Owner Can:
- ✅ View the meal plan
- ✅ Add/edit/delete meals
- ✅ Add collaborators
- ✅ Remove collaborators
- ✅ Delete the meal plan

### Collaborator Can:
- ✅ View the meal plan
- ✅ Add/edit/delete meals
- ❌ Add other collaborators
- ❌ Remove collaborators
- ❌ Delete the meal plan

## Database Schema

### meal_plans Table
```sql
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  week_start_date DATE,
  notes TEXT,
  collaborators TEXT[] DEFAULT '{}',  -- NEW COLUMN
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### RLS Policies

**View Policy:**
```sql
-- Users can view meal plans they own OR are collaborators on
CREATE POLICY "Users can view their own or shared meal plans"
ON meal_plans FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  (SELECT auth.jwt()->>'email') = ANY(collaborators)
);
```

**Update Policy:**
```sql
-- Users can update meal plans they own OR are collaborators on
CREATE POLICY "Users can update their own or shared meal plans"
ON meal_plans FOR UPDATE
USING (
  user_id = auth.uid() 
  OR 
  (SELECT auth.jwt()->>'email') = ANY(collaborators)
);
```

## Example UI Implementation

Here's a basic example of how to add sharing UI to your meal plan page:

```typescript
import { useState } from 'react';
import { addMealPlanCollaborator, removeMealPlanCollaborator } from '@/lib/services/mealPlannerService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function MealPlanShareDialog({ mealPlan, userId }) {
  const [email, setEmail] = useState('');
  const [collaborators, setCollaborators] = useState(mealPlan.collaborators || []);

  const handleAddCollaborator = async () => {
    const success = await addMealPlanCollaborator(mealPlan.id, userId, email);
    if (success) {
      setCollaborators([...collaborators, email]);
      setEmail('');
    }
  };

  const handleRemoveCollaborator = async (collaboratorEmail) => {
    const success = await removeMealPlanCollaborator(mealPlan.id, userId, collaboratorEmail);
    if (success) {
      setCollaborators(collaborators.filter(e => e !== collaboratorEmail));
    }
  };

  return (
    <div>
      <h3>Share Meal Plan</h3>
      
      {/* Add Collaborator */}
      <div>
        <Input 
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
        />
        <Button onClick={handleAddCollaborator}>Add</Button>
      </div>

      {/* Collaborator List */}
      <div>
        <h4>Collaborators</h4>
        {collaborators.map(collaborator => (
          <div key={collaborator}>
            <span>{collaborator}</span>
            <Button onClick={() => handleRemoveCollaborator(collaborator)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Troubleshooting

### Issue: 403 Error when adding meals
**Solution:** Make sure you ran the SQL migration to update RLS policies.

### Issue: Collaborators can't see shared meal plan
**Solution:** 
- Verify the email is correctly added to the `collaborators` array
- Check that the collaborator is logged in with the same email
- Emails are case-insensitive and trimmed

### Issue: Can't add collaborators
**Solution:**
- Only the owner can add/remove collaborators
- Verify you're the owner of the meal plan (`user_id` matches your `userId`)

## Next Steps

1. **Run the SQL migration** (`add-meal-plan-sharing.sql`)
2. **Test the backend functions** to ensure sharing works
3. **Add UI components** for sharing (optional)
4. **Add notifications** when users are added as collaborators (optional)

## Security Notes

- ✅ RLS policies ensure users can only access meal plans they own or are collaborators on
- ✅ Only owners can add/remove collaborators
- ✅ Only owners can delete meal plans
- ✅ Emails are normalized (lowercase, trimmed) for consistency
- ✅ Collaborators array is validated and cleaned

Enjoy sharing meal plans with your users! 🍽️👥
