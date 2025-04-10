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
  "Nombre: Z-A": "Name: Z-A"
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
  "Vegetariano": "Vegetarian"
}; 