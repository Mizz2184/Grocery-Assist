import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/context/TranslationContext';
import {
  Plus,
  Loader2,
  Trash2,
  Edit,
  Heart,
  Clock,
  Users,
  ChefHat,
  ArrowLeft
} from 'lucide-react';
import {
  getUserRecipes,
  createRecipe,
  deleteRecipe,
  toggleRecipeFavorite
} from '@/lib/services/mealPlannerService';
import type { Recipe } from '@/lib/types/mealPlanner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function Recipes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { translateUI } = useTranslation();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRecipeDialogOpen, setAddRecipeDialogOpen] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeDescription, setNewRecipeDescription] = useState('');
  const [newRecipeInstructions, setNewRecipeInstructions] = useState('');
  const [newRecipePrepTime, setNewRecipePrepTime] = useState('');
  const [newRecipeCookTime, setNewRecipeCookTime] = useState('');
  const [newRecipeServings, setNewRecipeServings] = useState('4');
  const [newRecipeIngredients, setNewRecipeIngredients] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadRecipes();
  }, [user]);

  const loadRecipes = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userRecipes = await getUserRecipes(user.id);
      setRecipes(userRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudieron cargar las recetas'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipe = async () => {
    if (!user || !newRecipeName.trim()) return;

    try {
      // Parse ingredients from text (one per line)
      const ingredientLines = newRecipeIngredients
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Try to parse "quantity unit name" format
          const match = line.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);
          if (match) {
            return {
              quantity: parseFloat(match[1]),
              unit: match[2] || '',
              ingredient_name: match[3],
              product_search_term: match[3]
            };
          }
          // If no match, just use the whole line as ingredient name
          return {
            ingredient_name: line.trim(),
            product_search_term: line.trim()
          };
        });

      await createRecipe(user.id, {
        name: newRecipeName,
        description: newRecipeDescription || undefined,
        instructions: newRecipeInstructions || undefined,
        prep_time: newRecipePrepTime ? parseInt(newRecipePrepTime) : undefined,
        cook_time: newRecipeCookTime ? parseInt(newRecipeCookTime) : undefined,
        servings: parseInt(newRecipeServings) || 4,
        ingredients: ingredientLines
      });

      toast({
        title: translateUI('Receta Creada'),
        description: translateUI('La receta se creó exitosamente')
      });

      setAddRecipeDialogOpen(false);
      resetForm();
      loadRecipes();
    } catch (error) {
      console.error('Error creating recipe:', error);
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudo crear la receta'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      await deleteRecipe(recipeId);
      toast({
        title: translateUI('Receta Eliminada'),
        description: translateUI('La receta se eliminó exitosamente')
      });
      loadRecipes();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      toast({
        title: translateUI('Error'),
        description: translateUI('No se pudo eliminar la receta'),
        variant: 'destructive'
      });
    }
  };

  const handleToggleFavorite = async (recipeId: string, isFavorite: boolean) => {
    try {
      await toggleRecipeFavorite(recipeId, !isFavorite);
      loadRecipes();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const resetForm = () => {
    setNewRecipeName('');
    setNewRecipeDescription('');
    setNewRecipeInstructions('');
    setNewRecipePrepTime('');
    setNewRecipeCookTime('');
    setNewRecipeServings('4');
    setNewRecipeIngredients('');
  };

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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/meal-plan')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              📖 {translateUI('Mis Recetas')}
            </h1>
            <p className="text-muted-foreground">
              {recipes.length} {translateUI('recetas guardadas')}
            </p>
          </div>
        </div>
        <Button onClick={() => setAddRecipeDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {translateUI('Nueva Receta')}
        </Button>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <Card className="p-12 text-center">
          <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            {translateUI('No tienes recetas aún')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {translateUI('Crea tu primera receta para empezar a planificar tus comidas')}
          </p>
          <Button onClick={() => setAddRecipeDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {translateUI('Crear Primera Receta')}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleFavorite(recipe.id, recipe.is_favorite)}
                  >
                    <Heart
                      className={`h-4 w-4 ${recipe.is_favorite ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                </div>
                {recipe.description && (
                  <CardDescription className="line-clamp-2">
                    {recipe.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {recipe.prep_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{recipe.prep_time} min prep</span>
                    </div>
                  )}
                  {recipe.cook_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{recipe.cook_time} min cook</span>
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{recipe.servings} {translateUI('porciones')}</span>
                    </div>
                  )}
                </div>
                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">
                      {translateUI('Ingredientes')} ({recipe.ingredients.length})
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                        <li key={idx} className="truncate">
                          • {ing.quantity && `${ing.quantity} ${ing.unit || ''}`} {ing.ingredient_name}
                        </li>
                      ))}
                      {recipe.ingredients.length > 3 && (
                        <li className="text-xs">
                          +{recipe.ingredients.length - 3} {translateUI('más')}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDeleteRecipe(recipe.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {translateUI('Eliminar')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Recipe Dialog */}
      <Dialog open={addRecipeDialogOpen} onOpenChange={setAddRecipeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{translateUI('Nueva Receta')}</DialogTitle>
            <DialogDescription>
              {translateUI('Crea una nueva receta para usar en tu plan de comidas')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipe-name">{translateUI('Nombre de la Receta')} *</Label>
              <Input
                id="recipe-name"
                value={newRecipeName}
                onChange={(e) => setNewRecipeName(e.target.value)}
                placeholder={translateUI('Ej: Pasta Alfredo')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-description">{translateUI('Descripción')}</Label>
              <Textarea
                id="recipe-description"
                value={newRecipeDescription}
                onChange={(e) => setNewRecipeDescription(e.target.value)}
                placeholder={translateUI('Breve descripción de la receta...')}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prep-time">{translateUI('Tiempo Prep (min)')}</Label>
                <Input
                  id="prep-time"
                  type="number"
                  value={newRecipePrepTime}
                  onChange={(e) => setNewRecipePrepTime(e.target.value)}
                  placeholder="15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cook-time">{translateUI('Tiempo Cocción (min)')}</Label>
                <Input
                  id="cook-time"
                  type="number"
                  value={newRecipeCookTime}
                  onChange={(e) => setNewRecipeCookTime(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servings">{translateUI('Porciones')}</Label>
                <Input
                  id="servings"
                  type="number"
                  value={newRecipeServings}
                  onChange={(e) => setNewRecipeServings(e.target.value)}
                  placeholder="4"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredients">{translateUI('Ingredientes')}</Label>
              <Textarea
                id="ingredients"
                value={newRecipeIngredients}
                onChange={(e) => setNewRecipeIngredients(e.target.value)}
                placeholder={translateUI('Un ingrediente por línea\nEj:\n500 g pollo\n2 tazas arroz\n1 cebolla')}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {translateUI('Escribe un ingrediente por línea. Puedes incluir cantidad y unidad.')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">{translateUI('Instrucciones')}</Label>
              <Textarea
                id="instructions"
                value={newRecipeInstructions}
                onChange={(e) => setNewRecipeInstructions(e.target.value)}
                placeholder={translateUI('Pasos para preparar la receta...')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddRecipeDialogOpen(false);
              resetForm();
            }}>
              {translateUI('Cancelar')}
            </Button>
            <Button onClick={handleAddRecipe} disabled={!newRecipeName.trim()}>
              {translateUI('Crear Receta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
