import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/context/TranslationContext';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ShoppingCart,
  Loader2,
  Trash2,
  Edit,
  BookOpen
} from 'lucide-react';
import {
  getMealPlanForWeek,
  getCurrentWeekMealPlan,
  getUserMealPlans,
  createMealPlan,
  getMealPlanIngredients,
  deleteMeal
} from '@/lib/services/mealPlannerService';
import { addProductToGroceryList } from '@/lib/services/groceryListService';
import { 
  searchMaxiPaliProducts,
  searchMasxMenosProducts,
  searchWalmartProducts,
  searchAutomercadoProducts
} from '@/lib/services';
import type { MealPlan, Meal, RecipeIngredient } from '@/lib/types/mealPlanner';
import {
  DAYS_OF_WEEK,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ICONS,
  getWeekStartDate,
  formatDateISO,
  getWeekDateRange
} from '@/lib/types/mealPlanner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroceryList } from '@/hooks/useGroceryList';
import { ShareMealPlan } from '@/components/ShareMealPlan';

export default function MealPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translateUI } = useTranslation();
  const { activeList } = useGroceryList();

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStartDate());
  const [addMealDialogOpen, setAddMealDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('dinner');
  const [newMealName, setNewMealName] = useState('');
  const [newMealNotes, setNewMealNotes] = useState('');
  const [addingToGroceryList, setAddingToGroceryList] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadMealPlan();
    loadAvailableWeeks();
  }, [user, currentWeekStart]);

  const loadAvailableWeeks = async () => {
    if (!user) return;
    
    try {
      const plans = await getUserMealPlans(user.id);
      const weeks = plans.map(plan => plan.week_start_date);
      setAvailableWeeks(weeks);
    } catch (error) {
      console.error('Error loading available weeks:', error);
    }
  };

  const goToPreviousWeek = () => {
    const previousWeek = new Date(currentWeekStart);
    previousWeek.setDate(previousWeek.getDate() - 7);
    setCurrentWeekStart(previousWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStart(nextWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStartDate());
  };

  const handleWeekSelect = (weekStartDate: string) => {
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    setCurrentWeekStart(selectedDate);
  };

  const generateWeekOptions = () => {
    // Generate options for past 6 months and future 3 months
    const options: { value: string; label: string; hasData: boolean }[] = [];
    const today = new Date();
    
    // Go back 6 months
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 6);
    
    // Go forward 3 months
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 3);
    
    // Get Monday of start week
    let currentDate = new Date(startDate);
    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    currentDate.setDate(diff);
    
    while (currentDate <= endDate) {
      const weekStartISO = formatDateISO(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const hasData = availableWeeks.includes(weekStartISO);
      const label = `${currentDate.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}${hasData ? ' ✓' : ''}`;
      
      options.push({
        value: weekStartISO,
        label,
        hasData
      });
      
      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return options.reverse(); // Most recent first
  };

  const isCurrentWeek = formatDateISO(currentWeekStart) === formatDateISO(getWeekStartDate());

  const loadMealPlan = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const weekStartDate = formatDateISO(currentWeekStart);
      const plan = await getMealPlanForWeek(user.id, weekStartDate, user.email);
      
      if (!plan) {
        // Only create a new meal plan if viewing current week
        const isCurrentWeek = formatDateISO(getWeekStartDate()) === weekStartDate;
        
        if (isCurrentWeek) {
          const newPlan = await createMealPlan(user.id, {
            name: `${translateUI('Plan de Comidas')} - ${weekStartDate}`,
            week_start_date: weekStartDate,
            notes: ''
          });
          setMealPlan(newPlan);
        } else {
          // No meal plan exists for this past/future week
          setMealPlan(null);
        }
      } else {
        setMealPlan(plan);
      }
    } catch (error) {
      console.error('Error loading meal plan:', error);
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudo cargar el plan de comidas'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async () => {
    if (!mealPlan || !newMealName.trim()) return;

    try {
      const { createMeal } = await import('@/lib/services/mealPlannerService');
      
      await createMeal({
        meal_plan_id: mealPlan.id,
        day_of_week: selectedDay,
        meal_type: selectedMealType,
        name: newMealName,
        notes: newMealNotes
      });

      toast({
        title: translateUI('Comida Agregada'),
        description: translateUI('La comida se agregó exitosamente')
      });

      setAddMealDialogOpen(false);
      setNewMealName('');
      setNewMealNotes('');
      loadMealPlan();
    } catch (error) {
      console.error('Error adding meal:', error);
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudo agregar la comida'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteMeal(mealId);
      toast({
        title: translateUI('Comida Eliminada'),
        description: translateUI('La comida se eliminó exitosamente')
      });
      loadMealPlan();
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudo eliminar la comida'),
        variant: 'destructive'
      });
    }
  };

  const handleAddToGroceryList = async () => {
    if (!mealPlan || !user || !activeList) {
      toast({
        title: translateUI('Error'),
        description: translateUI('Por favor selecciona una lista de compras primero'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setAddingToGroceryList(true);
      
      // Get all ingredients from the meal plan
      const ingredients = await getMealPlanIngredients(mealPlan.id);
      
      if (ingredients.length === 0) {
        toast({
          title: translateUI('Sin Ingredientes'),
          description: translateUI('No hay ingredientes para agregar. Agrega recetas a tus comidas primero.'),
          variant: 'destructive'
        });
        return;
      }

      let addedCount = 0;
      let failedCount = 0;

      // Search for each ingredient and add to grocery list
      for (const ingredient of ingredients) {
        try {
          const searchTerm = ingredient.product_search_term || ingredient.ingredient_name;
          
          // Search in all stores
          const [maxipali, masxmenos, walmart, automercado] = await Promise.all([
            searchMaxiPaliProducts({ query: searchTerm, pageSize: 1 }),
            searchMasxMenosProducts({ query: searchTerm, pageSize: 1 }),
            searchWalmartProducts({ query: searchTerm, pageSize: 1 }),
            searchAutomercadoProducts({ query: searchTerm, pageSize: 1 })
          ]);

          // Get the first available product
          const allProducts = [
            ...(maxipali.products || []),
            ...(masxmenos.products || []),
            ...(walmart.products || []),
            ...(automercado.products || [])
          ];

          if (allProducts.length > 0) {
            // Sort by price and get the cheapest
            allProducts.sort((a, b) => a.price - b.price);
            const product = allProducts[0];

            await addProductToGroceryList(activeList.id, user.id, {
              ...product,
              quantity: ingredient.quantity || 1
            });
            addedCount++;
          } else {
            failedCount++;
            console.log(`No product found for: ${searchTerm}`);
          }
        } catch (error) {
          console.error(`Error adding ingredient ${ingredient.ingredient_name}:`, error);
          failedCount++;
        }
      }

      toast({
        title: translateUI('Ingredientes Agregados'),
        description: translateUI(`Se agregaron ${addedCount} productos a tu lista. ${failedCount > 0 ? `${failedCount} no se encontraron.` : ''}`)
      });

      navigate('/grocery-list');
    } catch (error) {
      console.error('Error adding to grocery list:', error);
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudieron agregar los ingredientes'),
        variant: 'destructive'
      });
    } finally {
      setAddingToGroceryList(false);
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

  const { start: weekStart, end: weekEnd } = getWeekDateRange(currentWeekStart);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-6">
        {/* Title and Date - Centered on mobile */}
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3">
            <span className="text-4xl md:text-5xl">📅</span>
            <span>{translateUI('Plan de Comidas')}</span>
          </h1>
          
          {/* Week Navigation */}
          <div className="flex flex-col gap-2 mb-2">
            {/* Week Selector Dropdown */}
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Select
                value={formatDateISO(currentWeekStart)}
                onValueChange={handleWeekSelect}
              >
                <SelectTrigger className="w-[280px] h-9">
                  <SelectValue>
                    {weekStart.toLocaleDateString('es-ES', { day: 'numeric' })} de {weekStart.toLocaleDateString('es-ES', { month: 'long' })} - {weekEnd.toLocaleDateString('es-ES', { day: 'numeric' })} de {weekEnd.toLocaleDateString('es-ES', { month: 'long' })} de {weekEnd.toLocaleDateString('es-ES', { year: 'numeric' })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {generateWeekOptions().map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      className={option.hasData ? 'font-medium' : ''}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Arrow Navigation */}
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="h-7 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs ml-1">{translateUI('Anterior')}</span>
              </Button>
              
              {!isCurrentWeek && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                  className="h-7 px-2"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  <span className="text-xs">{translateUI('Hoy')}</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="h-7 px-2"
              >
                <span className="text-xs mr-1">{translateUI('Siguiente')}</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {mealPlan && user && mealPlan.user_id !== user.id && (
            <p className="text-sm text-primary mt-2 flex items-center justify-center md:justify-start gap-2">
              <span>👥</span>
              <span>{translateUI('Plan compartido')}</span>
            </p>
          )}
        </div>
        
        {/* Buttons - Full width on mobile, side by side */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/recipes')}
            className="w-full sm:w-auto text-base py-6 sm:py-2"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            {translateUI('Recetas')}
          </Button>
          {mealPlan && user && mealPlan.user_id === user.id && (
            <ShareMealPlan
              mealPlanId={mealPlan.id}
              userId={user.id}
              mealPlanName={mealPlan.name}
              collaborators={mealPlan.collaborators || []}
            />
          )}
          <Button
            onClick={handleAddToGroceryList}
            disabled={addingToGroceryList || !mealPlan?.meals?.some(m => m.recipe_id)}
            className="w-full sm:w-auto text-base py-6 sm:py-2"
          >
            {addingToGroceryList ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <ShoppingCart className="h-5 w-5 mr-2" />
            )}
            {translateUI('Agregar a Lista')}
          </Button>
        </div>
      </div>

      {/* No Meal Plan Message */}
      {!mealPlan && !loading && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {translateUI('No hay plan de comidas para esta semana')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isCurrentWeek 
                ? translateUI('Crea un nuevo plan para comenzar')
                : translateUI('No se creó un plan para esta semana')}
            </p>
            {isCurrentWeek && (
              <Button onClick={() => loadMealPlan()}>
                <Plus className="h-4 w-4 mr-2" />
                {translateUI('Crear Plan')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Grid */}
      {mealPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((day, dayIndex) => (
          <Card key={dayIndex} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {translateUI(day)}
              </CardTitle>
              <CardDescription className="text-xs">
                {new Date(currentWeekStart.getTime() + dayIndex * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2">
              {/* Breakfast */}
              <MealSlot
                meal={getMealForDayAndType(dayIndex, 'breakfast')}
                mealType="breakfast"
                onAdd={() => {
                  setSelectedDay(dayIndex);
                  setSelectedMealType('breakfast');
                  setAddMealDialogOpen(true);
                }}
                onDelete={handleDeleteMeal}
                translateUI={translateUI}
              />

              {/* Lunch */}
              <MealSlot
                meal={getMealForDayAndType(dayIndex, 'lunch')}
                mealType="lunch"
                onAdd={() => {
                  setSelectedDay(dayIndex);
                  setSelectedMealType('lunch');
                  setAddMealDialogOpen(true);
                }}
                onDelete={handleDeleteMeal}
                translateUI={translateUI}
              />

              {/* Dinner */}
              <MealSlot
                meal={getMealForDayAndType(dayIndex, 'dinner')}
                mealType="dinner"
                onAdd={() => {
                  setSelectedDay(dayIndex);
                  setSelectedMealType('dinner');
                  setAddMealDialogOpen(true);
                }}
                onDelete={handleDeleteMeal}
                translateUI={translateUI}
              />
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Add Meal Dialog */}
      <Dialog open={addMealDialogOpen} onOpenChange={setAddMealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translateUI('Agregar Comida')}</DialogTitle>
            <DialogDescription>
              {translateUI('Agrega una nueva comida a tu plan semanal')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meal-name">{translateUI('Nombre de la Comida')}</Label>
              <Input
                id="meal-name"
                value={newMealName}
                onChange={(e) => setNewMealName(e.target.value)}
                placeholder={translateUI('Ej: Pasta con Pollo')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-type">{translateUI('Tipo de Comida')}</Label>
              <Select value={selectedMealType} onValueChange={(value: any) => setSelectedMealType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">{MEAL_TYPE_ICONS.breakfast} {translateUI(MEAL_TYPE_LABELS.breakfast)}</SelectItem>
                  <SelectItem value="lunch">{MEAL_TYPE_ICONS.lunch} {translateUI(MEAL_TYPE_LABELS.lunch)}</SelectItem>
                  <SelectItem value="dinner">{MEAL_TYPE_ICONS.dinner} {translateUI(MEAL_TYPE_LABELS.dinner)}</SelectItem>
                  <SelectItem value="snack">{MEAL_TYPE_ICONS.snack} {translateUI(MEAL_TYPE_LABELS.snack)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-notes">{translateUI('Notas')} ({translateUI('Opcional')})</Label>
              <Textarea
                id="meal-notes"
                value={newMealNotes}
                onChange={(e) => setNewMealNotes(e.target.value)}
                placeholder={translateUI('Notas adicionales...')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMealDialogOpen(false)}>
              {translateUI('Cancelar')}
            </Button>
            <Button onClick={handleAddMeal} disabled={!newMealName.trim()}>
              {translateUI('Agregar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Meal Slot Component
interface MealSlotProps {
  meal?: Meal;
  mealType: string;
  onAdd: () => void;
  onDelete: (mealId: string) => void;
  translateUI: (text: string) => string;
}

function MealSlot({ meal, mealType, onAdd, onDelete, translateUI }: MealSlotProps) {
  if (!meal) {
    return (
      <button
        onClick={onAdd}
        className="w-full p-2 border-2 border-dashed border-muted rounded-lg hover:border-primary hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{MEAL_TYPE_ICONS[mealType]}</span>
          <span className="text-xs">{translateUI(MEAL_TYPE_LABELS[mealType])}</span>
          <Plus className="h-3 w-3 ml-auto" />
        </div>
      </button>
    );
  }

  return (
    <div className="p-2 bg-muted rounded-lg group relative">
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
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(meal.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
