import { supabase } from '@/lib/supabase';
import { createNotification } from '@/lib/services/notificationService';
import type {
  MealPlan,
  Meal,
  Recipe,
  RecipeIngredient,
  CreateMealPlanInput,
  CreateMealInput,
  CreateRecipeInput,
  CreateRecipeIngredientInput
} from '@/lib/types/mealPlanner';

// ============================================
// MEAL PLAN FUNCTIONS
// ============================================

/**
 * Get all meal plans for a user (including shared meal plans)
 */
export async function getUserMealPlans(userId: string): Promise<MealPlan[]> {
  // Get user email for collaborator check
  const { data: { user } } = await supabase.auth.getUser();
  const userEmail = user?.email;

  if (!userEmail) {
    // If no email, just get owned meal plans
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false });

    if (error) {
      console.error('Error fetching meal plans:', error);
      throw error;
    }

    return data || [];
  }

  // Get meal plans owned by user OR where user is a collaborator
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .or(`user_id.eq.${userId},collaborators.cs.{${userEmail}}`)
    .order('week_start_date', { ascending: false});

  if (error) {
    console.error('Error fetching meal plans:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific meal plan with all its meals
 */
export async function getMealPlanWithMeals(mealPlanId: string): Promise<MealPlan | null> {
  const { data: mealPlan, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', mealPlanId)
    .single();

  if (planError) {
    console.error('Error fetching meal plan:', planError);
    throw planError;
  }

  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select(`
      *,
      recipe:recipes(*)
    `)
    .eq('meal_plan_id', mealPlanId)
    .order('day_of_week')
    .order('meal_type');

  if (mealsError) {
    console.error('Error fetching meals:', mealsError);
    throw mealsError;
  }

  return {
    ...mealPlan,
    meals: meals || []
  };
}

/**
 * Get meal plan for a specific week
 */
export async function getMealPlanForWeek(userId: string, weekStartDate: string, userEmail?: string): Promise<MealPlan | null> {

  // First, try to get the user's own meal plan
  const { data: ownMealPlans, error: ownPlanError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .order('created_at', { ascending: false })
    .limit(1);

  if (ownPlanError) {
    console.error('Error fetching current week meal plan:', ownPlanError);
    throw ownPlanError;
  }

  // If user has their own plan, use it
  if (ownMealPlans && ownMealPlans.length > 0) {
    const mealPlan = ownMealPlans[0];
    
    // Get meals for this plan
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select(`
        id,
        meal_plan_id,
        day_of_week,
        meal_type,
        name,
        notes,
        recipe_id,
        created_at,
        updated_at,
        recipes (
          id,
          user_id,
          name,
          description,
          instructions,
          prep_time,
          cook_time,
          servings,
          image_url,
          is_favorite,
          created_at,
          updated_at
        )
      `)
      .eq('meal_plan_id', mealPlan.id)
      .order('day_of_week')
      .order('meal_type');

    if (mealsError) {
      console.error('Error fetching meals:', mealsError);
      throw mealsError;
    }

    return {
      ...mealPlan,
      meals: meals || []
    };
  }

  // If no own plan, check for shared plans with this user as collaborator
  // RLS policies will automatically filter to only show plans where user is a collaborator
  if (userEmail) {
    const { data: sharedPlans, error: sharedError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('week_start_date', weekStartDate)
      .neq('user_id', userId) // Exclude own plans (already checked above)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sharedError) {
      console.error('Error fetching shared meal plans:', sharedError);
      throw sharedError;
    }

    if (sharedPlans && sharedPlans.length > 0) {
      const mealPlan = sharedPlans[0];

      // Get meals for this shared plan
      const { data: meals, error: mealsError } = await supabase
        .from('meals')
        .select(`
          id,
          meal_plan_id,
          day_of_week,
          meal_type,
          name,
          notes,
          recipe_id,
          created_at,
          updated_at,
          recipes (
            id,
            user_id,
            name,
            description,
            instructions,
            prep_time,
            cook_time,
            servings,
            image_url,
            is_favorite,
            created_at,
            updated_at
          )
        `)
        .eq('meal_plan_id', mealPlan.id)
        .order('day_of_week')
        .order('meal_type');

      if (mealsError) {
        console.error('Error fetching meals:', mealsError);
        throw mealsError;
      }

      return {
        ...mealPlan,
        meals: meals || []
      };
    }
  }

  // No meal plan found (neither own nor shared)
  return null;
}

/**
 * Get current week's meal plan (wrapper for getMealPlanForWeek)
 */
export async function getCurrentWeekMealPlan(userId: string, userEmail?: string): Promise<MealPlan | null> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  const weekStartDate = monday.toISOString().split('T')[0];
  
  return getMealPlanForWeek(userId, weekStartDate, userEmail);
}

/**
 * Get all meal plans shared with a user (as collaborator)
 * RLS policies automatically filter to only show plans where user is a collaborator
 */
export async function getSharedMealPlans(userId: string): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .neq('user_id', userId) // Only get plans not owned by this user
    .order('week_start_date', { ascending: false });

  if (error) {
    console.error('Error fetching shared meal plans:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new meal plan
 */
export async function createMealPlan(
  userId: string,
  input: CreateMealPlanInput
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: userId,
      ...input
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating meal plan:', error);
    throw error;
  }

  return data;
}

/**
 * Update a meal plan
 */
export async function updateMealPlan(
  mealPlanId: string,
  updates: Partial<CreateMealPlanInput>
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .update(updates)
    .eq('id', mealPlanId)
    .select()
    .single();

  if (error) {
    console.error('Error updating meal plan:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a meal plan
 */
export async function deleteMealPlan(mealPlanId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', mealPlanId);

  if (error) {
    console.error('Error deleting meal plan:', error);
    throw error;
  }
}

// ============================================
// MEAL FUNCTIONS
// ============================================

/**
 * Get all meals for a meal plan
 */
export async function getMealsForPlan(mealPlanId: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select(`
      *,
      recipe:recipes(*)
    `)
    .eq('meal_plan_id', mealPlanId)
    .order('day_of_week')
    .order('meal_type');

  if (error) {
    console.error('Error fetching meals:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new meal
 */
export async function createMeal(input: CreateMealInput): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating meal:', error);
    throw error;
  }

  return data;
}

/**
 * Update a meal
 */
export async function updateMeal(
  mealId: string,
  updates: Partial<CreateMealInput>
): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .update(updates)
    .eq('id', mealId)
    .select()
    .single();

  if (error) {
    console.error('Error updating meal:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a meal
 */
export async function deleteMeal(mealId: string): Promise<void> {
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealId);

  if (error) {
    console.error('Error deleting meal:', error);
    throw error;
  }
}

// ============================================
// RECIPE FUNCTIONS
// ============================================

/**
 * Get all recipes for a user
 */
export async function getUserRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ingredients:recipe_ingredients(*)
    `)
    .eq('user_id', userId)
    .order('name');

  if (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific recipe with ingredients
 */
export async function getRecipeWithIngredients(recipeId: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      ingredients:recipe_ingredients(*)
    `)
    .eq('id', recipeId)
    .single();

  if (error) {
    console.error('Error fetching recipe:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new recipe with ingredients
 */
export async function createRecipe(
  userId: string,
  input: CreateRecipeInput
): Promise<Recipe> {
  const { ingredients, ...recipeData } = input;

  // Create the recipe
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      user_id: userId,
      ...recipeData
    })
    .select()
    .single();

  if (recipeError) {
    console.error('Error creating recipe:', recipeError);
    throw recipeError;
  }

  // Add ingredients if provided
  if (ingredients && ingredients.length > 0) {
    const ingredientsToInsert = ingredients.map(ing => ({
      recipe_id: recipe.id,
      ...ing
    }));

    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsToInsert);

    if (ingredientsError) {
      console.error('Error creating recipe ingredients:', ingredientsError);
      throw ingredientsError;
    }
  }

  // Fetch the complete recipe with ingredients
  return getRecipeWithIngredients(recipe.id) as Promise<Recipe>;
}

/**
 * Update a recipe
 */
export async function updateRecipe(
  recipeId: string,
  updates: Partial<Omit<CreateRecipeInput, 'ingredients'>>
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update(updates)
    .eq('id', recipeId)
    .select()
    .single();

  if (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId);

  if (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
}

/**
 * Toggle recipe favorite status
 */
export async function toggleRecipeFavorite(recipeId: string, isFavorite: boolean): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update({ is_favorite: isFavorite })
    .eq('id', recipeId)
    .select()
    .single();

  if (error) {
    console.error('Error toggling recipe favorite:', error);
    throw error;
  }

  return data;
}

// ============================================
// RECIPE INGREDIENT FUNCTIONS
// ============================================

/**
 * Add an ingredient to a recipe
 */
export async function addRecipeIngredient(
  input: CreateRecipeIngredientInput
): Promise<RecipeIngredient> {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error adding recipe ingredient:', error);
    throw error;
  }

  return data;
}

/**
 * Update a recipe ingredient
 */
export async function updateRecipeIngredient(
  ingredientId: string,
  updates: Partial<Omit<CreateRecipeIngredientInput, 'recipe_id'>>
): Promise<RecipeIngredient> {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .update(updates)
    .eq('id', ingredientId)
    .select()
    .single();

  if (error) {
    console.error('Error updating recipe ingredient:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a recipe ingredient
 */
export async function deleteRecipeIngredient(ingredientId: string): Promise<void> {
  const { error } = await supabase
    .from('recipe_ingredients')
    .delete()
    .eq('id', ingredientId);

  if (error) {
    console.error('Error deleting recipe ingredient:', error);
    throw error;
  }
}

/**
 * Get all ingredients for a recipe
 */
export async function getRecipeIngredients(recipeId: string): Promise<RecipeIngredient[]> {
  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('ingredient_name');

  if (error) {
    console.error('Error fetching recipe ingredients:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// GROCERY LIST INTEGRATION
// ============================================

/**
 * Get all ingredients from a meal plan for grocery list generation
 */
export async function getMealPlanIngredients(mealPlanId: string): Promise<RecipeIngredient[]> {
  // Get all meals with recipes for this meal plan
  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('recipe_id')
    .eq('meal_plan_id', mealPlanId)
    .not('recipe_id', 'is', null);

  if (mealsError) {
    console.error('Error fetching meals for ingredients:', mealsError);
    throw mealsError;
  }

  if (!meals || meals.length === 0) {
    return [];
  }

  const recipeIds = meals.map(m => m.recipe_id).filter(Boolean);

  // Get all ingredients for these recipes
  const { data: ingredients, error: ingredientsError } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .in('recipe_id', recipeIds);

  if (ingredientsError) {
    console.error('Error fetching ingredients:', ingredientsError);
    throw ingredientsError;
  }

  return ingredients || [];
}

// ============================================
// MEAL PLAN SHARING / COLLABORATORS
// ============================================

/**
 * Add a collaborator to a meal plan
 */
export async function addMealPlanCollaborator(
  mealPlanId: string,
  userId: string,
  collaboratorEmail: string
): Promise<boolean> {
  try {
    // First, verify the user has permission to add collaborators (must be owner)
    const { data: mealPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', mealPlanId)
      .single();

    if (fetchError) {
      console.error('Error fetching meal plan:', fetchError);
      return false;
    }

    if (mealPlan.user_id !== userId) {
      console.error('User does not have permission to add collaborators');
      return false;
    }

    // Normalize email to lowercase
    collaboratorEmail = collaboratorEmail.toLowerCase().trim();

    // Get current collaborators array or initialize it
    const currentCollaborators = Array.isArray(mealPlan.collaborators) 
      ? mealPlan.collaborators 
      : [];

    // Check if collaborator is already added
    if (currentCollaborators.includes(collaboratorEmail)) {
      console.log('Collaborator already exists');
      return true;
    }

    // Add the new collaborator
    const updatedCollaborators = [...currentCollaborators, collaboratorEmail];

    // Update the meal plan
    const { error: updateError } = await supabase
      .from('meal_plans')
      .update({ 
        collaborators: updatedCollaborators
      })
      .eq('id', mealPlanId);

    if (updateError) {
      console.error('Error updating collaborators:', updateError);
      return false;
    }

    // Send notification to collaborator
    try {
      // Get current user info
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Someone';

      // Find the collaborator's user ID by email
      const { data: collaboratorUsers, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', collaboratorEmail)
        .limit(1);

      if (!userError && collaboratorUsers && collaboratorUsers.length > 0) {
        const collaboratorUserId = collaboratorUsers[0].id;

        // Create notification
        await createNotification(
          collaboratorUserId,
          'meal_plan_shared',
          'Meal Plan Shared',
          `${userName} shared the meal plan "${mealPlan.name}" with you`,
          {
            meal_plan_id: mealPlanId,
            meal_plan_name: mealPlan.name,
            shared_by: userName,
            shared_by_id: userId
          }
        );

        console.log(`✅ Notification sent to ${collaboratorEmail}`);
      } else {
        console.log(`⚠️ User with email ${collaboratorEmail} not found in profiles table`);
      }
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Continue even if notification fails - the user has been added as a collaborator
    }

    console.log(`Collaborator ${collaboratorEmail} added to meal plan ${mealPlanId}`);
    
    return true;
  } catch (error) {
    console.error('Error adding collaborator:', error);
    return false;
  }
}

/**
 * Remove a collaborator from a meal plan
 */
export async function removeMealPlanCollaborator(
  mealPlanId: string,
  userId: string,
  collaboratorEmail: string
): Promise<boolean> {
  try {
    // Normalize email
    const normalizedEmail = collaboratorEmail.toLowerCase().trim();

    // Check if user has permission to remove collaborators (must be the owner)
    const { data: mealPlan, error: fetchError } = await supabase
      .from('meal_plans')
      .select('id, user_id, collaborators')
      .eq('id', mealPlanId)
      .single();

    if (fetchError) {
      console.error('Error fetching meal plan:', fetchError);
      return false;
    }

    const isOwner = mealPlan.user_id === userId;

    if (!isOwner) {
      console.error('User does not have permission to remove collaborators');
      return false;
    }

    // Clean up the collaborators array
    if (!Array.isArray(mealPlan.collaborators)) {
      mealPlan.collaborators = [];
    }

    // Clean and normalize all existing collaborators
    const collaborators = mealPlan.collaborators
      .filter(item => item !== null && item !== undefined && item !== '')
      .map(item => String(item).toLowerCase().trim());

    // Check if the email exists in the collaborators list
    const emailExists = collaborators.includes(normalizedEmail);

    if (!emailExists) {
      console.log('Collaborator not found in list');
      return true;
    }

    // Remove the email
    const updatedCollaborators = collaborators.filter(email => 
      email !== normalizedEmail
    );

    // Update the meal plan with new collaborators
    const { error: updateError } = await supabase
      .from('meal_plans')
      .update({ collaborators: updatedCollaborators })
      .eq('id', mealPlanId);

    if (updateError) {
      console.error('Error removing collaborator:', updateError);
      return false;
    }

    console.log(`Collaborator ${collaboratorEmail} removed from meal plan ${mealPlanId}`);
    return true;
  } catch (error) {
    console.error('Error removing collaborator:', error);
    return false;
  }
}

/**
 * Get a shared meal plan by ID (accessible to owner and collaborators)
 */
export async function getSharedMealPlan(mealPlanId: string): Promise<MealPlan | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    const userEmail = user?.email;

    // Get the meal plan
    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', mealPlanId)
      .single();

    if (planError) {
      console.error('Error fetching shared meal plan:', planError);
      return null;
    }

    // Check if user has access (owner or collaborator)
    const isOwner = userId && mealPlan.user_id === userId;
    const isCollaborator = userEmail && 
                          mealPlan.collaborators && 
                          Array.isArray(mealPlan.collaborators) && 
                          mealPlan.collaborators.some(email => 
                            email.toLowerCase() === userEmail.toLowerCase()
                          );

    if (!isOwner && !isCollaborator) {
      console.error('User does not have access to this meal plan');
      return null;
    }

    // Get meals for this meal plan
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('meal_plan_id', mealPlanId)
      .order('day_of_week', { ascending: true });

    if (mealsError) {
      console.error('Error fetching meals:', mealsError);
    }

    return {
      ...mealPlan,
      meals: meals || []
    };
  } catch (error) {
    console.error('Error getting shared meal plan:', error);
    return null;
  }
}
