# 🍽️ Meal Planner Feature

## Overview
The Meal Planner is a smart weekly meal planning feature integrated with your grocery shopping app. It allows users to plan their meals for the week and automatically generate grocery lists from their meal plans.

## Features

### ✅ Implemented Features

1. **Weekly Meal Planning**
   - View meals organized by day of the week (Monday - Sunday)
   - Add breakfast, lunch, dinner, and snacks for each day
   - Visual calendar-style layout
   - Quick add/edit/delete meals

2. **Recipe Library**
   - Create and save custom recipes
   - Add ingredients with quantities and units
   - Include cooking instructions
   - Mark recipes as favorites
   - Track prep time, cook time, and servings

3. **Smart Grocery Integration**
   - "Add to Grocery List" button automatically searches for all ingredients
   - Finds the cheapest products across all stores
   - Adds products directly to your active grocery list
   - No manual copying needed!

4. **User-Friendly Interface**
   - Clean, modern design matching the app's style
   - Mobile-responsive layout
   - Easy navigation between meal plan and recipes
   - Intuitive dialogs for adding meals and recipes

## Database Schema

### Tables Created:
- `meal_plans` - Weekly meal plans
- `meals` - Individual meals within a plan
- `recipes` - User's recipe library
- `recipe_ingredients` - Ingredients for each recipe

### Security:
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Proper foreign key relationships

## How to Use

### 1. Setup Database
Run the SQL schema file to create the necessary tables:
```bash
# In Supabase SQL Editor, run:
meal-planner-schema.sql
```

### 2. Access Meal Planner
- Click on "📅 Plan de Comidas" in the navigation bar
- Or navigate to `/meal-plan`

### 3. Create Your First Meal Plan
1. The app automatically creates a meal plan for the current week
2. Click on any day to add a meal
3. Enter meal name and notes
4. Optionally link to a recipe

### 4. Create Recipes
1. Click "Recetas" button in meal plan page
2. Click "Nueva Receta"
3. Fill in recipe details:
   - Name (required)
   - Description
   - Prep time & cook time
   - Servings
   - Ingredients (one per line)
   - Instructions
4. Save recipe

### 5. Add Recipes to Meals
1. Create a recipe first
2. When adding a meal, you can link it to a recipe
3. The recipe's ingredients will be used for grocery list generation

### 6. Generate Grocery List
1. Make sure you have an active grocery list selected
2. Add meals with recipes to your week
3. Click "Agregar a Lista" button
4. The app will:
   - Extract all ingredients from your meals
   - Search for products in all stores
   - Find the cheapest options
   - Add them to your grocery list

## File Structure

```
src/
├── pages/
│   ├── MealPlan.tsx          # Main meal planner page
│   └── Recipes.tsx            # Recipe management page
├── lib/
│   ├── types/
│   │   └── mealPlanner.ts     # TypeScript types
│   └── services/
│       └── mealPlannerService.ts  # API functions
└── components/
    └── Navbar.tsx             # Updated with meal plan link

meal-planner-schema.sql        # Database schema
```

## API Functions

### Meal Plans
- `getUserMealPlans(userId)` - Get all meal plans
- `getCurrentWeekMealPlan(userId)` - Get current week's plan
- `createMealPlan(userId, input)` - Create new meal plan
- `updateMealPlan(id, updates)` - Update meal plan
- `deleteMealPlan(id)` - Delete meal plan

### Meals
- `getMealsForPlan(planId)` - Get all meals in a plan
- `createMeal(input)` - Add new meal
- `updateMeal(id, updates)` - Update meal
- `deleteMeal(id)` - Delete meal

### Recipes
- `getUserRecipes(userId)` - Get all recipes
- `getRecipeWithIngredients(id)` - Get recipe with ingredients
- `createRecipe(userId, input)` - Create new recipe
- `updateRecipe(id, updates)` - Update recipe
- `deleteRecipe(id)` - Delete recipe
- `toggleRecipeFavorite(id, isFavorite)` - Toggle favorite status

### Grocery Integration
- `getMealPlanIngredients(planId)` - Get all ingredients from a meal plan

## UI Components

### MealPlan Page
- Weekly grid view
- Meal slots for breakfast, lunch, dinner
- Add meal dialog
- Integration with grocery list
- Navigation to recipes

### Recipes Page
- Recipe cards with details
- Create recipe dialog
- Favorite recipes
- Delete recipes
- Ingredient parsing

### MealSlot Component
- Shows meal information
- Quick delete button
- Recipe indicator
- Empty state with add button

## Translation Support

All UI text supports Spanish/English translation:
- "Plan de Comidas" / "Meal Plan"
- "Desayuno" / "Breakfast"
- "Almuerzo" / "Lunch"
- "Cena" / "Dinner"
- "Recetas" / "Recipes"

## Future Enhancements

Potential features to add:
- [ ] Drag and drop meals between days
- [ ] Copy previous week's meal plan
- [ ] Share meal plans with family members
- [ ] Nutrition information
- [ ] Meal prep instructions
- [ ] Recipe photos
- [ ] Recipe ratings and reviews
- [ ] Import recipes from URLs
- [ ] Print meal plan
- [ ] Shopping list by store/aisle
- [ ] Leftover tracking
- [ ] Meal history

## Troubleshooting

### No meals showing
- Check that the database schema was created correctly
- Verify RLS policies are enabled
- Check browser console for errors

### Grocery list integration not working
- Ensure you have an active grocery list selected
- Verify recipes have ingredients added
- Check that product search is working

### Ingredients not found
- Make sure ingredient names match product names in stores
- Use `product_search_term` field for better matches
- Example: "chicken breast" instead of just "chicken"

## Support

For issues or questions:
1. Check the console for error messages
2. Verify database schema is correct
3. Ensure all dependencies are installed
4. Check that Supabase connection is working

## Credits

Built with:
- React + TypeScript
- Supabase (Database & Auth)
- shadcn/ui (UI Components)
- Tailwind CSS (Styling)
- Lucide React (Icons)
