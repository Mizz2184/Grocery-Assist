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
const DEBUG = true;

export function getProductStore(product: any): STORE {
  if (!product) {
    if (DEBUG) console.log('getProductStore: No product provided');
    return STORE.UNKNOWN;
  }

  // Normalize store name to handle case differences, extra spaces, etc.
  let storeName = (product.store || '').toString().toLowerCase().trim();
  
  if (DEBUG) {
    console.log(`getProductStore for product ${product.id || 'unknown'} (${product.name || 'unnamed'})`);
    console.log(`Original store property: "${product.store || 'none'}"`);
    console.log(`Normalized store: "${storeName}"`);
  }

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
    if (DEBUG) console.log(`Store detected from URL as Walmart: ${url}`);
    return STORE.WALMART;
  }
  if (url.includes('maxipali.')) {
    if (DEBUG) console.log(`Store detected from URL as MaxiPali: ${url}`);
    return STORE.MAXIPALI;
  }
  if (url.includes('masxmenos.')) {
    if (DEBUG) console.log(`Store detected from URL as MasxMenos: ${url}`);
    return STORE.MASXMENOS;
  }
  if (url.includes('pricesmart.')) {
    if (DEBUG) console.log(`Store detected from URL as PriceSmart: ${url}`);
    return STORE.PRICESMART;
  }
  if (url.includes('automercado.')) {
    if (DEBUG) console.log(`Store detected from URL as Automercado: ${url}`);
    return STORE.AUTOMERCADO;
  }

  // Check productType for Walmart indicators
  const productType = (product.productType || '').toString().toLowerCase();
  if (productType.includes('walmart')) {
    if (DEBUG) console.log(`Store detected from productType as Walmart: ${productType}`);
    return STORE.WALMART;
  }

  // Check product attributes for Walmart indicators
  if (product.attributes) {
    if (product.attributes.seller && product.attributes.seller.toLowerCase().includes('walmart')) {
      if (DEBUG) console.log(`Store detected from seller attribute as Walmart`);
      return STORE.WALMART;
    }
  }

  // Broader checks for partial matches, with specific rules to avoid confusion
  if (storeName.includes('walmart')) {
    if (DEBUG) console.log(`Store detected as Walmart from partial match in store name`);
    return STORE.WALMART;
  }

  // Only check for masxmenos if not already identified as Walmart
  if (storeName.includes('mas x menos') || storeName.includes('masxmenos')) {
    if (DEBUG) console.log(`Store detected as MasxMenos from partial match in store name`);
    return STORE.MASXMENOS;
  }

  // Only check for maxipali if not already identified as Walmart
  // This avoids the common issue where Walmart products are misidentified as MaxiPali
  if ((storeName.includes('maxi') || storeName.includes('pali')) && 
      !storeName.includes('walmart')) {
    if (DEBUG) console.log(`Store detected as MaxiPali from partial match in store name`);
    return STORE.MAXIPALI;
  }

  // Check if the product is from Automercado
  if (storeName.includes('auto') || storeName.includes('mercado')) {
    if (DEBUG) console.log(`Store detected as Automercado from partial match in store name`);
    return STORE.AUTOMERCADO;
  }

  // Check if the product is from PriceSmart
  if (storeName.includes('price') || storeName.includes('smart')) {
    if (DEBUG) console.log(`Store detected as PriceSmart from partial match in store name`);
    return STORE.PRICESMART;
  }

  // Check the product's source, description or other properties for store indicators
  const description = (product.description || '').toString().toLowerCase();
  if (description.includes('walmart')) {
    if (DEBUG) console.log(`Store detected as Walmart from description`);
    return STORE.WALMART;
  }

  // Final fallback
  if (DEBUG) console.log(`Store could not be determined, using UNKNOWN`);
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