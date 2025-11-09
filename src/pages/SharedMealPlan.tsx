import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/context/TranslationContext';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { MealPlan, Meal } from '@/lib/types/mealPlanner';
import {
  DAYS_OF_WEEK,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ICONS,
  getWeekDateRange
} from '@/lib/types/mealPlanner';

export default function SharedMealPlan() {
  const { mealPlanId } = useParams<{ mealPlanId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translateUI } = useTranslation();
  
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!mealPlanId) {
      setError('Invalid meal plan ID');
      setLoading(false);
      return;
    }

    loadSharedMealPlan();
  }, [mealPlanId, user]);

  const loadSharedMealPlan = async () => {
    if (!mealPlanId || !user) return;

    try {
      setLoading(true);
      
      // Fetch the meal plan
      const { data: planData, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (planError) throw planError;

      if (!planData) {
        setError(translateUI('Plan de comidas no encontrado'));
        return;
      }

      // Check if user has access (owner or collaborator)
      const userEmail = user.email;
      const isOwner = planData.user_id === user.id;
      const isCollaborator = planData.collaborators?.includes(userEmail);

      if (!isOwner && !isCollaborator) {
        setError(translateUI('No tienes acceso a este plan de comidas'));
        return;
      }

      // Fetch meals
      const { data: mealsData, error: mealsError } = await supabase
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
        .eq('meal_plan_id', mealPlanId)
        .order('day_of_week')
        .order('meal_type');

      if (mealsError) throw mealsError;

      setMealPlan({
        ...planData,
        meals: mealsData || []
      });
    } catch (error) {
      console.error('Error loading shared meal plan:', error);
      setError(translateUI('Error al cargar el plan de comidas'));
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudo cargar el plan de comidas compartido'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getMealsForDay = (dayOfWeek: number): Meal[] => {
    if (!mealPlan?.meals) return [];
    return mealPlan.meals.filter(m => m.day_of_week === dayOfWeek);
  };

  const getMealForDayAndType = (dayOfWeek: number, mealType: string): Meal | undefined => {
    const meals = getMealsForDay(dayOfWeek);
    return meals.find(m => m.meal_type === mealType);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !mealPlan) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{translateUI('Error')}</h2>
          <p className="text-muted-foreground mb-6">{error || translateUI('Plan de comidas no encontrado')}</p>
          <Button onClick={() => navigate('/meal-plan')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {translateUI('Volver a mis planes')}
          </Button>
        </Card>
      </div>
    );
  }

  const weekStart = new Date(mealPlan.week_start_date);
  const { start, end } = getWeekDateRange(weekStart);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-6">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/meal-plan')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <span className="text-4xl md:text-5xl">📅</span>
              <span>{mealPlan.name}</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-base md:text-sm ml-14">
            {start.toLocaleDateString('es-ES', { day: 'numeric' })} de {start.toLocaleDateString('es-ES', { month: 'long' })} - {end.toLocaleDateString('es-ES', { day: 'numeric' })} de {end.toLocaleDateString('es-ES', { month: 'long' })} de {end.toLocaleDateString('es-ES', { year: 'numeric' })}
          </p>
          <p className="text-sm text-muted-foreground mt-2 ml-14">
            {translateUI('Plan compartido')} • {translateUI('Solo lectura')}
          </p>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map((day, dayIndex) => (
          <Card key={dayIndex} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {translateUI(day)}
              </CardTitle>
              <CardDescription className="text-xs">
                {new Date(weekStart.getTime() + dayIndex * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              {/* Breakfast */}
              <MealSlot
                meal={getMealForDayAndType(dayIndex, 'breakfast')}
                mealType="breakfast"
                translateUI={translateUI}
              />

              {/* Lunch */}
              <MealSlot
                meal={getMealForDayAndType(dayIndex, 'lunch')}
                mealType="lunch"
                translateUI={translateUI}
              />

              {/* Dinner */}
              <MealSlot
                meal={getMealForDayAndType(dayIndex, 'dinner')}
                mealType="dinner"
                translateUI={translateUI}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Meal Slot Component (Read-only version)
interface MealSlotProps {
  meal?: Meal;
  mealType: string;
  translateUI: (text: string) => string;
}

function MealSlot({ meal, mealType, translateUI }: MealSlotProps) {
  if (!meal) {
    return (
      <div className="w-full p-2 border-2 border-dashed border-muted rounded-lg text-left opacity-50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{MEAL_TYPE_ICONS[mealType]}</span>
          <span className="text-xs">{translateUI(MEAL_TYPE_LABELS[mealType])}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 bg-muted rounded-lg">
      <div className="flex items-start gap-2">
        <span className="text-sm">{MEAL_TYPE_ICONS[mealType]}</span>
        <div className="flex-grow min-w-0">
          <p className="text-sm font-medium truncate">{meal.name}</p>
          {meal.notes && (
            <p className="text-xs text-muted-foreground truncate">{meal.notes}</p>
          )}
          {meal.recipe && (
            <p className="text-xs text-primary truncate">📖 {meal.recipe.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}
