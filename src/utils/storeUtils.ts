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

// Helper function to get store name from any product structure
export function getProductStore(product: any): STORE {
  // Skip if no product provided
  if (!product) return 'Unknown';

  // For debugging - enable this only when needed
  const DEBUG = false;
  
  if (DEBUG) console.log(`getProductStore: Identifying store for product ${product.id || 'unknown'} (${product.name || 'Unnamed Product'})`);

  // Handle different product object structures
  let storeValue: string = 'Unknown';

  // Direct store property
  if (product.store) {
    storeValue = product.store;
    if (DEBUG) console.log(`getProductStore: Raw store value is "${storeValue}"`);
  } 
  // Store in prices array
  else if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
    const storeId = product.prices[0].storeId;
    storeValue = storeId || 'Unknown';
    if (DEBUG) console.log(`getProductStore: Store from prices array: "${storeValue}"`);
  }
  
  // Normalize the store name
  const normalizedStore = storeValue.trim().toLowerCase();
  
  // Exact matches for specific store names (case-insensitive)
  // This first check guarantees exact store name matches take precedence
  if (normalizedStore === 'walmart') {
    if (DEBUG) console.log(`getProductStore: Exact match for Walmart`);
    return 'Walmart';
  }
  
  if (normalizedStore === 'maxipali' || normalizedStore === 'maxi pali') {
    if (DEBUG) console.log(`getProductStore: Exact match for MaxiPali`);
    return 'MaxiPali';
  }
  
  if (normalizedStore === 'masxmenos' || normalizedStore === 'mas x menos') {
    if (DEBUG) console.log(`getProductStore: Exact match for MasxMenos`);
    return 'MasxMenos';
  }
  
  if (normalizedStore === 'pricesmart' || normalizedStore === 'price smart') {
    if (DEBUG) console.log(`getProductStore: Exact match for PriceSmart`);
    return 'PriceSmart';
  }
  
  if (normalizedStore === 'automercado' || normalizedStore === 'auto mercado') {
    if (DEBUG) console.log(`getProductStore: Exact match for Automercado`);
    return 'Automercado';
  }
  
  // Check for partial matches using includes, in priority order
  // Order matters here: More specific matches (like 'walmart') should come before 
  // less specific ones (like 'maxi' which could match many strings)
  
  // 1. Walmart check (highest priority to avoid misclassification)
  if (normalizedStore.includes('walmart') || normalizedStore.includes('wal-mart')) {
    if (DEBUG) console.log('getProductStore: Matched Walmart via partial match');
    return 'Walmart';
  }
  
  // 2. MasxMenos check (must include both parts to be specific)
  if (normalizedStore.includes('mas') && (normalizedStore.includes('menos') || normalizedStore.includes('x menos'))) {
    if (DEBUG) console.log('getProductStore: Matched MasxMenos via partial match');
    return 'MasxMenos';
  }
  
  // 3. Other specific store checks
  if (normalizedStore.includes('price') && normalizedStore.includes('smart')) {
    if (DEBUG) console.log('getProductStore: Matched PriceSmart via partial match');
    return 'PriceSmart';
  }
  
  if (normalizedStore.includes('auto') && normalizedStore.includes('mercado')) {
    if (DEBUG) console.log('getProductStore: Matched Automercado via partial match');
    return 'Automercado';
  }
  
  // 4. MaxiPali check after others to avoid mismatches
  // Must contain 'maxi' or 'pali' but NOT 'walmart' to avoid misclassification
  if ((normalizedStore.includes('maxi') || normalizedStore.includes('pali')) && !normalizedStore.includes('walmart')) {
    if (DEBUG) console.log('getProductStore: Matched MaxiPali via partial match');
    return 'MaxiPali';
  }
  
  // Default to Unknown if no match
  if (DEBUG) console.log(`getProductStore: No match found for "${storeValue}", using Unknown`);
  return 'Unknown';
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