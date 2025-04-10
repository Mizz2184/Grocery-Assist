export interface TranslationMap {
  [key: string]: string[];
}

export const productTranslations: TranslationMap = {
  // Fruits and Vegetables
  'apple': ['manzana'],
  'banana': ['banano', 'plátano'],
  'pineapple': ['piña'],
  'lettuce': ['lechuga'],
  'carrot': ['zanahoria'],
  'onion': ['cebolla'],
  'cucumber': ['pepino'],
  'tomato': ['tomate'],
  'cilantro': ['culantro'],
  'plantain': ['plátano'],

  // Meat and Seafood
  'chicken': ['pollo'],
  'beef': ['res', 'carne de res'],
  'pork': ['cerdo', 'carne de cerdo'],
  'fish': ['pescado'],
  'shrimp': ['camarón', 'camarones'],

  // Dairy and Eggs
  'milk': ['leche'],
  'cheese': ['queso'],
  'eggs': ['huevos'],

  // Bakery
  'bread': ['pan'],

  // Beverages
  'coffee': ['café'],
  'juice': ['jugo'],

  // Pantry Staples
  'rice': ['arroz'],
  'beans': ['frijoles'],
  'sugar': ['azúcar'],
  'flour': ['harina'],
  'salt': ['sal'],
  'oil': ['aceite'],
  'pasta': ['pasta'],
  'tuna': ['atún'],
  'peanut': ['maní'],

  // Household Items
  'detergent': ['detergente'],
  'fabric softener': ['suavizante de telas'],
  'toilet paper': ['papel higiénico'],
  'paper towels': ['toallas de papel'],
  'soap': ['jabón'],
  'bleach': ['cloro'],
  'napkins': ['servilletas'],
  'trash bags': ['bolsas para basura'],
  'sponge': ['esponja'],

  // Personal Care
  'shampoo': ['champú'],
  'conditioner': ['acondicionador'],
  'toothpaste': ['pasta de dientes'],
  'toothbrush': ['cepillo de dientes'],
  'deodorant': ['desodorante'],
  'razor': ['rasuradora']
};

// Function to get all possible translations for a search term
export function getSearchTranslations(searchTerm: string): string[] {
  const normalizedTerm = searchTerm.toLowerCase().trim();
  const translations: string[] = [normalizedTerm]; // Include original term

  // Check if the term exists in our translations
  if (productTranslations[normalizedTerm]) {
    translations.push(...productTranslations[normalizedTerm]);
  }

  // Check if any Spanish term matches our search
  Object.entries(productTranslations).forEach(([english, spanishTerms]) => {
    if (spanishTerms.includes(normalizedTerm)) {
      translations.push(english);
      translations.push(...spanishTerms);
    }
  });

  return [...new Set(translations)]; // Remove duplicates
}

// Function to check if a term is a translation of another
export function isTranslation(term1: string, term2: string): boolean {
  const normalized1 = term1.toLowerCase().trim();
  const normalized2 = term2.toLowerCase().trim();

  // Check direct mapping
  if (productTranslations[normalized1]?.includes(normalized2)) {
    return true;
  }

  // Check reverse mapping
  if (productTranslations[normalized2]?.includes(normalized1)) {
    return true;
  }

  // Check if they're the same term
  return normalized1 === normalized2;
} 