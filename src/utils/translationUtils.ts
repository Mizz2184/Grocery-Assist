/**
 * Simple translation utility using browser's Intl API
 * In a production app, you'd use a more robust translation service like i18next
 */

// Common translations from Spanish to English for grocery-related terms
export const commonTranslations: Record<string, string> = {
  // Product categories
  "Frutas y Verduras": "Fruits and Vegetables",
  "Carnes": "Meats",
  "Lácteos": "Dairy",
  "Panadería": "Bakery",
  "Bebidas": "Beverages",
  "Limpieza": "Cleaning",
  "Higiene Personal": "Personal Hygiene",
  "Enlatados": "Canned Goods",
  "Cereales": "Cereals",
  "Snacks": "Snacks",
  "Congelados": "Frozen Foods",
  
  // Individual food items
  "Arroz": "Rice",
  "Frijoles": "Beans",
  "Azúcar": "Sugar",
  "Leche": "Milk",
  "Queso": "Cheese",
  "Manzana": "Apple",
  "Banano": "Banana",
  "Tomate": "Tomato",
  "Cebolla": "Onion",
  "Café": "Coffee",
  "Té": "Tea",
  "Pollo": "Chicken",
  "Pescado": "Fish",
  "Res": "Beef",
  "Cerdo": "Pork",
  
  // Brands and stores
  "Tío Pelón": "Uncle Baldy",
  "Sabemas": "KnowMore",
  "MaxiPali": "MaxiPali",
  "Palí": "Pali",
  "Mas x Menos": "More for Less",
  "Automercado": "Auto Market",
  
  // App Navigation
  "Buscar": "Search",
  "Listas": "Lists",
  "Lista de Compras": "Grocery List",
  "Perfil": "Profile",
  "Ajustes": "Settings",
  "Iniciar Sesión": "Sign In",
  "Cerrar menú": "Close menu",
  "Abrir menú": "Open menu",
  "Asistente de Compras": "Shop-Assist",
  
  // UI elements
  "Agregar": "Add",
  "Agregar a la lista": "Add to list",
  "Añadir": "Add",
  "Añadir a la lista": "Add to list",
  "Añadido a la lista": "Added to list",
  "Precio": "Price",
  "Precio no disponible": "Price not available",
  "Cantidad": "Quantity",
  "Total": "Total",
  "Guardar": "Save",
  "Eliminar": "Delete",
  "Continuar": "Continue",
  "Cancelar": "Cancel",
  "Confirmar": "Confirm",
  "Detalles": "Details",
  "Crear Lista": "Create List",
  "Nueva Lista": "New List",
  "Nombre de lista": "List name",
  "Sin imagen": "No image",
  "Ver detalles": "View details",
  "Volver a resultados": "Back to results",
  "Escanear código": "Scan code",
  "Cerrar": "Close",
  
  // Status indicators
  "En existencia": "In Stock",
  "Agotado": "Out of Stock",
  "Disponible": "Available",
  "No disponible": "Not Available",
  "Cargando": "Loading",
  "Error": "Error",
  "Completado": "Completed",
  "En progreso": "In progress",
  
  // Grocery list actions
  "Compartir": "Share",
  "Invitar": "Invite",
  "Colaboradores": "Collaborators",
  "Renombrar": "Rename",
  "Eliminar marcados": "Remove Checked",
  "Eliminar lista": "Delete List",
  "Lista vacía": "Empty list",
  "Agregar productos": "Add products",
  
  // Common units
  "unidad": "unit",
  "kilogramo": "kilogram",
  "kg": "kg",
  "gramo": "gram",
  "g": "g",
  "litro": "liter",
  "l": "l",
  "mililitro": "milliliter",
  "ml": "ml",
  
  // Additional common terms
  "Producto": "Product",
  "Productos": "Products",
  "Marca": "Brand",
  "Marca desconocida": "Unknown brand",
  "Supermercado": "Supermarket",
  "Oferta": "Special Offer",
  "Descuento": "Discount",
  "Categoría": "Category",
  "Precio por unidad": "Price per unit",
  "Código de barras": "Barcode",
  "Resultados de búsqueda": "Search results",
  "Sin resultados": "No results",
  "Buscar productos": "Search products",
  "Filtrar por": "Filter by",
  "Ordenar por": "Sort by",
  "Precio: menor a mayor": "Price: low to high",
  "Precio: mayor a menor": "Price: high to low",
  "Nombre: A-Z": "Name: A-Z",
  "Nombre: Z-A": "Name: Z-A",
  
  // Meal Plan translations
  "Plan de Comidas": "Meal Plan",
  "Mis Planes": "My Plans",
  "Compartidos Conmigo": "Shared with Me",
  "Compartido": "Shared",
  "Plan compartido": "Shared plan",
  "Recetas": "Recipes",
  "Anterior": "Previous",
  "Siguiente": "Next",
  "Hoy": "Today",
  "No hay plan de comidas para esta semana": "No meal plan for this week",
  "Crea un nuevo plan para esta semana": "Create a new plan for this week",
  "Crear Plan": "Create Plan",
  "Plan Creado": "Plan Created",
  "Tu plan de comidas ha sido creado exitosamente": "Your meal plan has been created successfully",
  "Agregar Comida": "Add Meal",
  "Agrega una nueva comida a tu plan semanal": "Add a new meal to your weekly plan",
  "Nombre de la Comida": "Meal Name",
  "Ej: Pasta con Pollo": "Ex: Chicken Pasta",
  "Tipo de Comida": "Meal Type",
  "Notas (Opcional)": "Notes (Optional)",
  "Comida Agregada": "Meal Added",
  "La comida se agregó exitosamente": "The meal was added successfully",
  "No se pudo agregar la comida": "Could not add the meal",
  "Comida Eliminada": "Meal Deleted",
  "La comida se eliminó exitosamente": "The meal was deleted successfully",
  "No se pudo eliminar la comida": "Could not delete the meal",
  "No se pudo cargar el plan de comidas": "Could not load the meal plan",
  
  // Days of the week
  "Monday": "Monday",
  "Tuesday": "Tuesday",
  "Wednesday": "Wednesday",
  "Thursday": "Thursday",
  "Friday": "Friday",
  "Saturday": "Saturday",
  "Sunday": "Sunday",
  "Lunes": "Monday",
  "Martes": "Tuesday",
  "Miércoles": "Wednesday",
  "Jueves": "Thursday",
  "Viernes": "Friday",
  "Sábado": "Saturday",
  "Domingo": "Sunday",
  
  // Meal types
  "Desayuno": "Breakfast",
  "Almuerzo": "Lunch",
  "Cena": "Dinner",
  "Merienda": "Snack"
};

/**
 * Translates Spanish text to English using predefined translations
 * If no translation is found, returns the original text
 */
export function translateToEnglish(text: string): string {
  if (!text) return text;
  
  // Check if we have a direct translation
  if (commonTranslations[text]) {
    return commonTranslations[text];
  }
  
  // Check if we have a manual override translation
  if (manualTranslations[text]) {
    return manualTranslations[text];
  }
  
  // Check for common patterns like product titles that follow specific formats
  // Example: "Arroz Tío Pelón 1kg" -> "Uncle Baldy Rice 1kg"
  const productMatch = text.match(/^(\w+)\s+(.+?)(?:\s+(\d+\s*[kgl][gl]?|unidad))?$/i);
  if (productMatch) {
    const [_, productType, brand, size] = productMatch;
    const translatedType = commonTranslations[productType] || productType;
    const translatedBrand = commonTranslations[brand] || brand;
    return `${translatedBrand} ${translatedType}${size ? ' ' + size : ''}`;
  }
  
  // Handle compound terms by translating each word and phrase
  let translatedText = text;
  
  // First try to match and translate common phrases
  Object.keys(commonTranslations).forEach(phrase => {
    if (phrase.includes(' ') && text.includes(phrase)) {
      translatedText = translatedText.replace(
        new RegExp(phrase, 'gi'), 
        commonTranslations[phrase]
      );
    }
  });
  
  // Then translate individual words
  const words = translatedText.split(/\s+/);
  if (words.length > 1) {
    const translatedWords = words.map(word => {
      // Remove punctuation for lookup
      const cleanWord = word.replace(/[.,;!?()]/g, '');
      const translation = commonTranslations[cleanWord] || commonTranslations[cleanWord.toLowerCase()];
      
      // If we found a translation, replace just the word part, keeping punctuation
      if (translation) {
        return word.replace(cleanWord, translation);
      }
      return word;
    });
    
    return translatedWords.join(' ');
  }
  
  // If we can't translate, return the original
  return text;
}

/**
 * Determines if text appears to be Spanish based on specific patterns
 */
export function isSpanishText(text: string): boolean {
  if (!text) return false;
  
  // Check for Spanish-specific characters
  const spanishPatterns = /[áéíóúñ¿¡]/i;
  if (spanishPatterns.test(text)) return true;
  
  // Check for common Spanish words
  const commonSpanishWords = /\b(el|la|los|las|de|en|con|por|para|un|una|unos|unas|y|o)\b/i;
  return commonSpanishWords.test(text);
}

/**
 * Creates an object to track translation state
 */
export function createTranslationState() {
  let isTranslated = false;
  
  const toggleTranslation = (): boolean => {
    isTranslated = !isTranslated;
    return isTranslated;
  };
  
  const getTranslationState = () => isTranslated;
  
  const setTranslated = (state: boolean) => {
    isTranslated = state;
  };
  
  return {
    toggleTranslation,
    getTranslationState,
    setTranslated
  };
}

// Singleton instance for app-wide translation state
export const translationState = createTranslationState();

// Object for specific translations that don't work well with automatic translation
export const manualTranslations: Record<string, string> = {
  "Comparar Precios": "Compare Prices",
  "Lista de Mercado": "Grocery List",
  "Configuración": "Settings",
  "Perfil": "Profile",
  "Cerrar Sesión": "Sign Out",
  "Ingresar": "Sign In",
  "Iniciar sesión": "Sign In",
  "Es más barato en": "It's cheaper at",
  "Añadir": "Add",
  "Lista de Compras": "Shopping List",
  "Ver lista de compras": "View Shopping List",
  "Tema": "Theme",
  "Claro": "Light",
  "Oscuro": "Dark",
  "Sistema": "System",
  "Idioma": "Language",
  "Español": "Spanish",
  "Inglés": "English",
  "Asistente de Compras": "Fam-Assist",
  "Buscar productos...": "Search products...",
  
  // Product descriptions and additional content
  "Producto fresco": "Fresh product",
  "Producto congelado": "Frozen product",
  "Producto importado": "Imported product",
  "Oferta especial": "Special offer",
  "Descuento": "Discount",
  "Nuevo": "New",
  "Sin gluten": "Gluten free",
  "Orgánico": "Organic",
  "Sin azúcar añadido": "No added sugar",
  "Bajo en sodio": "Low sodium",
  "Bajo en grasa": "Low fat",
  "Alto en proteína": "High protein",
  "Vegano": "Vegan",
  "Vegetariano": "Vegetarian",
  
  // Meal Planner translations
  "Plan de Comidas": "Meal Plan",
  "Recetas": "Recipes",
  "Agregar a Lista": "Add to List",
  "Comida Agregada": "Meal Added",
  "La comida se agregó exitosamente": "Meal added successfully",
  "No se pudo cargar el plan de comidas": "Could not load meal plan",
  "No se pudo agregar la comida": "Could not add meal",
  "Comida Eliminada": "Meal Deleted",
  "La comida se eliminó exitosamente": "Meal deleted successfully",
  "No se pudo eliminar la comida": "Could not delete meal",
  "Por favor selecciona una lista de compras primero": "Please select a grocery list first",
  "Sin Ingredientes": "No Ingredients",
  "No hay ingredientes para agregar. Agrega recetas a tus comidas primero.": "No ingredients to add. Add recipes to your meals first.",
  "Ingredientes Agregados": "Ingredients Added",
  "Se agregaron ${addedCount} productos a tu lista. ${failedCount > 0 ? `${failedCount} no se encontraron.` : ''}": "Added ${addedCount} products to your list. ${failedCount > 0 ? `${failedCount} not found.` : ''}",
  "No se pudieron agregar los ingredientes": "Could not add ingredients",
  "Agregar Comida": "Add Meal",
  "Agrega una nueva comida a tu plan semanal": "Add a new meal to your weekly plan",
  "Nombre de la Comida": "Meal Name",
  "Ej: Pasta con Pollo": "Ex: Chicken Pasta",
  "Tipo de Comida": "Meal Type",
  "Notas": "Notes",
  "Opcional": "Optional",
  "Notas adicionales...": "Additional notes...",
  
  // Days of the week
  "Monday": "Monday",
  "Tuesday": "Tuesday",
  "Wednesday": "Wednesday",
  "Thursday": "Thursday",
  "Friday": "Friday",
  "Saturday": "Saturday",
  "Sunday": "Sunday",
  "Lunes": "Monday",
  "Martes": "Tuesday",
  "Miércoles": "Wednesday",
  "Jueves": "Thursday",
  "Viernes": "Friday",
  "Sábado": "Saturday",
  "Domingo": "Sunday",
  
  // Meal types
  "Desayuno": "Breakfast",
  "Almuerzo": "Lunch",
  "Cena": "Dinner",
  "Merienda": "Snack",
  
  // Recipe page translations
  "Mis Recetas": "My Recipes",
  "Crear Receta": "Create Recipe",
  "Nueva Receta": "New Recipe",
  "Crea una nueva receta para tu colección": "Create a new recipe for your collection",
  "Nombre de la Receta": "Recipe Name",
  "Descripción": "Description",
  "Instrucciones": "Instructions",
  "Tiempo de Preparación": "Prep Time",
  "Tiempo de Cocción": "Cook Time",
  "Porciones": "Servings",
  "porciones": "servings",
  "minutos": "minutes",
  "min prep": "min prep",
  "min cook": "min cook",
  "Ingredientes": "Ingredients",
  "Agregar Ingrediente": "Add Ingredient",
  "Nombre del Ingrediente": "Ingredient Name",
  "Unidad": "Unit",
  "Término de Búsqueda": "Search Term",
  "Receta Creada": "Recipe Created",
  "La receta se creó exitosamente": "Recipe created successfully",
  "No se pudo crear la receta": "Could not create recipe",
  "No se pudieron cargar las recetas": "Could not load recipes",
  "Receta Eliminada": "Recipe Deleted",
  "La receta se eliminó exitosamente": "Recipe deleted successfully",
  "No se pudo eliminar la receta": "Could not delete recipe",
  "Ver Receta": "View Recipe",
  "Editar": "Edit",
  "Favorito": "Favorite",
  "Sin recetas": "No recipes",
  "Crea tu primera receta": "Create your first recipe",
  "recetas guardadas": "saved recipes",
  "No tienes recetas aún": "You don't have any recipes yet",
  "Crea tu primera receta para empezar a planificar tus comidas": "Create your first recipe to start planning your meals",
  "Crear Primera Receta": "Create First Recipe",
  "Escribe cada ingrediente en una línea nueva": "Write each ingredient on a new line",
  "Ejemplo: 2 tazas arroz": "Example: 2 cups rice",
  "más": "more",
  "Ej: Pasta Alfredo": "Ex: Alfredo Pasta",
  "Crea una nueva receta para usar en tu plan de comidas": "Create a new recipe to use in your meal plan",
  
  // Sharing translations
  "Compartir": "Share",
  "Compartir plan de comidas": "Share meal plan",
  "Enlace copiado": "Link copied",
  "El enlace para compartir se ha copiado al portapapeles.": "The sharing link has been copied to your clipboard.",
  "Email requerido": "Email required",
  "Por favor ingresa un email para compartir.": "Please enter an email to share with.",
  "Email inválido": "Invalid email",
  "Por favor ingresa un email válido.": "Please enter a valid email.",
  "Ya es colaborador": "Already a collaborator",
  "Compartido exitosamente": "Shared successfully",
  "Ocurrió un error al compartir el plan de comidas.": "An error occurred while sharing the meal plan.",
  "Colaborador eliminado": "Collaborator removed",
  "Se eliminó a": "Removed",
  "del plan": "from the plan",
  "No se pudo eliminar al colaborador": "Could not remove collaborator",
  "Cualquiera con el enlace puede ver tu plan. Agrega colaboradores por email para permitirles editar.": "Anyone with the link can view your plan. Add collaborators by email to allow them to edit.",
  "Enlace para compartir": "Share link",
  "Colaboradores Actuales": "Current Collaborators",
  "Eliminar colaborador": "Remove collaborator",
  "Agregar un colaborador con permisos de edición": "Add a collaborator with edit permissions",
  "Dirección de email": "Email address",
  "Agregando...": "Adding...",
  "Listo": "Done",
  "Plan de comidas no encontrado": "Meal plan not found",
  "No tienes acceso a este plan de comidas": "You don't have access to this meal plan",
  "Error al cargar el plan de comidas": "Error loading meal plan",
  "No se pudo cargar el plan de comidas compartido": "Could not load shared meal plan",
  "Volver a mis planes": "Back to my plans",
  "Plan compartido": "Shared plan",
  "Solo lectura": "Read only",
  "Ir a semana actual": "Go to current week",
  "Semana anterior": "Previous week",
  "Semana siguiente": "Next week",
  "No hay plan de comidas para esta semana": "No meal plan for this week",
  "Crea un nuevo plan para comenzar": "Create a new plan to get started",
  "No se creó un plan para esta semana": "No plan was created for this week",
  "Crear Plan": "Create Plan",
  "Anterior": "Previous",
  "Siguiente": "Next",
  "Hoy": "Today"
}; 