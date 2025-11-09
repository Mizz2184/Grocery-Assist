// Meal Planner Types

export interface MealPlan {
  id: string;
  user_id: string;
  name: string;
  week_start_date: string; // ISO date string
  notes?: string;
  collaborators?: string[]; // Array of collaborator emails
  created_at: string;
  updated_at: string;
  meals?: Meal[]; // Optional, populated when fetching with meals
}

export interface Meal {
  id: string;
  meal_plan_id: string;
  day_of_week: number; // 0=Monday, 6=Sunday
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  notes?: string;
  recipe_id?: string;
  recipe?: Recipe; // Optional, populated when fetching with recipe
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  instructions?: string;
  prep_time?: number; // in minutes
  cook_time?: number; // in minutes
  servings?: number;
  image_url?: string;
  is_favorite: boolean;
  ingredients?: RecipeIngredient[]; // Optional, populated when fetching with ingredients
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  product_search_term?: string; // Term to use when searching in grocery stores
  notes?: string;
  created_at: string;
}

// Helper types for creating/updating
export interface CreateMealPlanInput {
  name: string;
  week_start_date: string;
  notes?: string;
}

export interface CreateMealInput {
  meal_plan_id: string;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  notes?: string;
  recipe_id?: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  instructions?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  image_url?: string;
  ingredients?: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at'>[];
}

export interface CreateRecipeIngredientInput {
  recipe_id: string;
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  product_search_term?: string;
  notes?: string;
}

// UI Helper types
export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
] as const;

export const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'snack'
] as const;

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Merienda'
};

export const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍴',
  dinner: '🍽️',
  snack: '🍪'
};

// Helper function to get week start date (Monday)
export function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Helper function to format date as ISO string (YYYY-MM-DD)
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to get date range for a week
export function getWeekDateRange(weekStart: Date): { start: Date; end: Date } {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

// Helper function to get day name from day_of_week number
export function getDayName(dayOfWeek: number): string {
  return DAYS_OF_WEEK[dayOfWeek] || 'Unknown';
}
