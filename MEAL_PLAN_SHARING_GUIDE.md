# Meal Plan Sharing Feature Guide

## Overview
You can now share your meal plans with others, just like grocery lists! Collaborators can view and edit shared meal plans together in real-time.

## Setup Instructions

### 1. Run the Database Migration
Before using the sharing feature, you need to add the `collaborators` column to your database:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `add-meal-plan-sharing.sql`
4. Copy and paste the entire SQL script
5. Click **Run** to execute

This will:
- Add a `collaborators` column to the `meal_plans` table
- Update Row Level Security (RLS) policies to allow collaborators to view and edit
- Update policies for the `meals` table to respect collaborators

### 2. Verify the Setup
After running the migration, verify it worked:
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'meal_plans';
```

You should see a `collaborators` column with type `ARRAY`.

## How to Use

### Sharing a Meal Plan

1. **Navigate to Meal Planner** (`/meal-plan`)
2. **Click the "Share" button** in the header (between "Recipes" and "Add to List")
3. **Share via link:**
   - Copy the share link
   - Send it to anyone you want to share with
   - They can view the plan (read-only) when they click the link
4. **Add collaborators:**
   - Enter an email address
   - Click "Add"
   - That person can now view AND edit the meal plan

### Managing Collaborators

- **View collaborators:** Open the Share dialog to see who has access
- **Remove collaborators:** Click the X button next to their email
- **Multiple collaborators:** Add as many as you need

### Accessing Shared Meal Plans

When someone shares a meal plan with you:
1. Click the shared link they sent
2. You'll be taken to `/shared-meal-plan/:id`
3. If you're a collaborator, you can edit meals
4. If you only have the link, you can view (read-only)

## Features

### ✅ What Works
- Share meal plans via link
- Add/remove collaborators by email
- Real-time collaboration (multiple people can edit)
- View shared plans in read-only mode
- Full translation support (Spanish/English)
- Secure access control via RLS policies

### 🔒 Security
- Only owners and collaborators can view meal plans
- RLS policies enforce access control at the database level
- Collaborators are identified by their email address
- All changes are tracked with user authentication

## Components Created

### 1. ShareMealPlan Component
**Location:** `src/components/ShareMealPlan.tsx`

A dialog component for sharing meal plans:
- Copy share link
- Add/remove collaborators
- View current collaborators
- Fully translated

### 2. SharedMealPlan Page
**Location:** `src/pages/SharedMealPlan.tsx`

A read-only view of shared meal plans:
- Shows all meals for the week
- Displays plan name and date range
- Indicates it's a shared plan
- Back button to return to your plans

### 3. Database Migration
**Location:** `add-meal-plan-sharing.sql`

SQL script to enable sharing:
- Adds `collaborators` column
- Updates RLS policies
- Creates indexes for performance

## API Changes

### MealPlan Type
Updated `src/lib/types/mealPlanner.ts`:
```typescript
export interface MealPlan {
  id: string;
  user_id: string;
  name: string;
  week_start_date: string;
  notes?: string;
  collaborators?: string[]; // NEW
  created_at: string;
  updated_at: string;
  meals?: Meal[];
}
```

## Translations

All sharing features are fully translated:
- Share button and dialog
- Email validation messages
- Success/error notifications
- Collaborator management
- Shared plan labels

## Troubleshooting

### "No tienes acceso a este plan de comidas"
- Make sure you're logged in with the email that was added as a collaborator
- Ask the owner to re-add your email

### Share button not appearing
- Make sure you have a meal plan loaded
- Refresh the page
- Check that you're logged in

### Collaborators can't edit
- Verify the database migration ran successfully
- Check RLS policies in Supabase Dashboard
- Ensure the collaborator's email matches their account email

### Changes not syncing
- Refresh the page
- Check your internet connection
- Verify Supabase is accessible

## Future Enhancements

Potential improvements:
- Real-time notifications when collaborators make changes
- Activity log showing who made what changes
- Permission levels (view-only vs. edit)
- Share via QR code
- Invite via in-app notifications
- Bulk add collaborators

## Testing

To test the sharing feature:

1. **Create a meal plan** with some meals
2. **Click Share** and add a collaborator email
3. **Open an incognito window** and log in with that email
4. **Access the shared link** or navigate to the meal plan
5. **Make changes** from both accounts
6. **Verify** both users see the changes

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify the database migration ran successfully
3. Check Supabase logs for RLS policy errors
4. Ensure all files are properly imported

---

**Note:** This feature requires Supabase with RLS enabled and proper authentication setup.
