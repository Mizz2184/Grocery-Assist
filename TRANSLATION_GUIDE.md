# Translation Guide

## Overview
The app now has full translation support for the Meal Planner and Recipes sections. When you click the translate button, all text will switch from Spanish to English.

## How It Works

### Translation System
- **Translation Context**: Located in `src/context/TranslationContext.tsx`
- **Translation Utilities**: Located in `src/utils/translationUtils.ts`
- **Translation Toggle**: Click the translate button in the navbar to switch between Spanish and English

### What Gets Translated

#### Meal Planner Section (`/meal-plan`)
- ✅ Page title: "Plan de Comidas" → "Meal Plan"
- ✅ Days of the week: "Lunes" → "Monday", etc.
- ✅ Meal types: "Desayuno" → "Breakfast", "Almuerzo" → "Lunch", "Cena" → "Dinner", "Merienda" → "Snack"
- ✅ Buttons: "Recetas" → "Recipes", "Agregar a Lista" → "Add to List"
- ✅ Dialog titles and descriptions
- ✅ Form labels: "Nombre de la Comida" → "Meal Name", etc.
- ✅ Toast notifications: Success and error messages
- ✅ All UI elements

#### Recipes Section (`/recipes`)
- ✅ Page title: "Mis Recetas" → "My Recipes"
- ✅ Recipe cards with prep time, cook time, and servings
- ✅ Buttons: "Nueva Receta" → "New Recipe", "Eliminar" → "Delete"
- ✅ Form labels and placeholders
- ✅ Empty state messages
- ✅ Toast notifications

## How to Use Translations in Code

### In React Components

```tsx
import { useTranslation } from '@/context/TranslationContext';

function MyComponent() {
  const { translateUI } = useTranslation();
  
  return (
    <div>
      <h1>{translateUI('Plan de Comidas')}</h1>
      <button>{translateUI('Agregar')}</button>
    </div>
  );
}
```

### Adding New Translations

To add new translations, edit `src/utils/translationUtils.ts`:

```typescript
export const manualTranslations: Record<string, string> = {
  // ... existing translations
  "Tu Texto en Español": "Your Text in English",
};
```

## Translation Coverage

### Fully Translated Sections
- ✅ Meal Planner page
- ✅ Recipes page
- ✅ Navigation
- ✅ Search functionality
- ✅ Grocery lists
- ✅ Product cards

### Translation Features
- **Automatic word-by-word translation**: For compound terms
- **Manual overrides**: For specific phrases that need custom translations
- **Context-aware**: Different translation functions for titles, descriptions, and UI elements
- **Persistent state**: Translation preference is maintained across page navigation

## Testing Translations

1. Navigate to the Meal Planner page (`/meal-plan`)
2. Click the translate button in the navbar (usually a globe or language icon)
3. Verify all Spanish text changes to English
4. Navigate to Recipes page (`/recipes`)
5. Verify translations work there too
6. Click translate button again to switch back to Spanish

## Notes

- The translation system uses a simple dictionary-based approach
- For production, consider using a more robust solution like i18next
- All translations are client-side only
- The system automatically handles nested text and compound phrases
