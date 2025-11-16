/**
 * Utility functions for working with store data
 */

// Export store constants
export const STORE = {
  WALMART: 'Walmart',
  MAXIPALI: 'MaxiPali',
  MASXMENOS: 'MasxMenos',
  PRICESMART: 'PriceSmart',
  AUTOMERCADO: 'Automercado',
  UNKNOWN: 'Unknown'
} as const;

// Define type based on the STORE constant
export type STORE = typeof STORE[keyof typeof STORE];

// Enable for debugging store detection issues
const DEBUG = false;

export function getProductStore(product: any): STORE {
  if (!product) {
    return STORE.UNKNOWN;
  }

  // Normalize store name to handle case differences, extra spaces, etc.
  let storeName = (product.store || '').toString().toLowerCase().trim();
  

  // Check for exact store matches first - this has highest priority
  if (storeName === 'walmart') return STORE.WALMART;
  if (storeName === 'maxipali') return STORE.MAXIPALI;
  if (storeName === 'pali') return STORE.MAXIPALI;
  if (storeName === 'masxmenos' || storeName === 'mas x menos') return STORE.MASXMENOS;
  if (storeName === 'pricesmart') return STORE.PRICESMART;
  if (storeName === 'automercado') return STORE.AUTOMERCADO;

  // Check URL for store indicators
  const url = (product.url || '').toString().toLowerCase();
  if (url.includes('walmart.')) {
    return STORE.WALMART;
  }
  if (url.includes('maxipali.')) {
    return STORE.MAXIPALI;
  }
  if (url.includes('masxmenos.')) {
    return STORE.MASXMENOS;
  }
  if (url.includes('pricesmart.')) {
    return STORE.PRICESMART;
  }
  if (url.includes('automercado.')) {
    return STORE.AUTOMERCADO;
  }

  // Check productType for Walmart indicators
  const productType = (product.productType || '').toString().toLowerCase();
  if (productType.includes('walmart')) {
    return STORE.WALMART;
  }

  // Check product attributes for Walmart indicators
  if (product.attributes) {
    if (product.attributes.seller && product.attributes.seller.toLowerCase().includes('walmart')) {
      return STORE.WALMART;
    }
  }

  // Broader checks for partial matches, with specific rules to avoid confusion
  if (storeName.includes('walmart')) {
    return STORE.WALMART;
  }

  // Only check for masxmenos if not already identified as Walmart
  if (storeName.includes('mas x menos') || storeName.includes('masxmenos')) {
    return STORE.MASXMENOS;
  }

  // Only check for maxipali if not already identified as Walmart
  // This avoids the common issue where Walmart products are misidentified as MaxiPali
  if ((storeName.includes('maxi') || storeName.includes('pali')) && 
      !storeName.includes('walmart')) {
    return STORE.MAXIPALI;
  }

  // Check if the product is from Automercado
  if (storeName.includes('auto') || storeName.includes('mercado')) {
    return STORE.AUTOMERCADO;
  }

  // Check if the product is from PriceSmart
  if (storeName.includes('price') || storeName.includes('smart')) {
    return STORE.PRICESMART;
  }

  // Check the product's source, description or other properties for store indicators
  const description = (product.description || '').toString().toLowerCase();
  if (description.includes('walmart')) {
    return STORE.WALMART;
  }

  // Final fallback
  return STORE.UNKNOWN;
}

// Define store names and their display names
export const storeNames = {
  [STORE.WALMART]: 'Walmart',
  [STORE.MAXIPALI]: 'MaxiPali',
  [STORE.MASXMENOS]: 'MasxMenos',
  [STORE.PRICESMART]: 'PriceSmart',
  [STORE.AUTOMERCADO]: 'Automercado',
  [STORE.UNKNOWN]: 'Other Stores'
};

// Define store order for display
export const storeOrder = [
  STORE.WALMART, 
  STORE.MAXIPALI, 
  STORE.MASXMENOS, 
  STORE.PRICESMART, 
  STORE.AUTOMERCADO, 
  STORE.UNKNOWN
];

// Define store colors for consistent UI
export const storeColors = {
  [STORE.WALMART]: 'bg-blue-600 text-white border-blue-600',
  [STORE.MAXIPALI]: 'bg-yellow-500 text-white border-yellow-500',
  [STORE.MASXMENOS]: 'bg-green-600 text-white border-green-600',
  [STORE.PRICESMART]: 'bg-purple-600 text-white border-purple-600',
  [STORE.AUTOMERCADO]: 'bg-pink-600 text-white border-pink-600',
  [STORE.UNKNOWN]: 'bg-gray-500 text-white border-gray-500'
}; 