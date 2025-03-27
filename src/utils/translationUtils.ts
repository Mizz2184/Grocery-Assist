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
  "Asistente de Compras": "Fam-Assist",
  
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
  
  // Handle compound terms by translating each word
  const words = text.split(/\s+/);
  if (words.length > 1) {
    const translatedWords = words.map(word => {
      // Try to translate individual word
      return commonTranslations[word] || word;
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
const manualTranslations: Record<string, string> = {
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
  // ... existing code ...
}; 