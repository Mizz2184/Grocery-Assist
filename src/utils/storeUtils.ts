/**
 * Utility functions for working with store data
 */

// Define the standard store names for consistency
export const STORE = {
  WALMART: 'Walmart',
  MAXIPALI: 'MaxiPali',
  MASXMENOS: 'MasxMenos',
  PRICESMART: 'PriceSmart',
  AUTOMERCADO: 'Automercado',
  UNKNOWN: 'Unknown'
};

// Helper function to get store name from any product structure
export const getProductStore = (product: any): string => {
  if (!product) {
    console.log('getProductStore: Null product, returning Unknown');
    return STORE.UNKNOWN;
  }
  
  // Add debug info
  const productId = product.id || 'no-id';
  const productName = product.name || 'no-name';
  
  console.log(`getProductStore: Identifying store for product ${productId} (${productName})`);
  
  // 1. Direct store property with exact match - highest priority
  if (product.store) {
    const rawStore = String(product.store).trim();
    
    // Log the raw store value
    console.log(`getProductStore: Raw store value is "${rawStore}"`);
    
    // Exact matches (case-sensitive)
    if (rawStore === STORE.MAXIPALI) {
      console.log(`getProductStore: Exact match for MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (rawStore === STORE.MASXMENOS) {
      console.log(`getProductStore: Exact match for MasxMenos`);
      return STORE.MASXMENOS;
    }
    if (rawStore === STORE.WALMART) {
      console.log(`getProductStore: Exact match for Walmart`);
      return STORE.WALMART;
    }
    if (rawStore === STORE.PRICESMART) {
      console.log(`getProductStore: Exact match for PriceSmart`);
      return STORE.PRICESMART;
    }
    if (rawStore === STORE.AUTOMERCADO) {
      console.log(`getProductStore: Exact match for Automercado`);
      return STORE.AUTOMERCADO;
    }
    
    // Exact matches (case-insensitive)
    const storeLower = rawStore.toLowerCase();
    
    if (storeLower === 'maxipali') {
      console.log(`getProductStore: Case-insensitive match for MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (storeLower === 'masxmenos') {
      console.log(`getProductStore: Case-insensitive match for MasxMenos`);
      return STORE.MASXMENOS;
    }
    if (storeLower === 'walmart') {
      console.log(`getProductStore: Case-insensitive match for Walmart`);
      return STORE.WALMART;
    }
    if (storeLower === 'pricesmart') {
      console.log(`getProductStore: Case-insensitive match for PriceSmart`);
      return STORE.PRICESMART;
    }
    if (storeLower === 'automercado') {
      console.log(`getProductStore: Case-insensitive match for Automercado`);
      return STORE.AUTOMERCADO;
    }
    
    // Common variants with spaces
    if (storeLower === 'maxi pali') {
      console.log(`getProductStore: Variant match for MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (storeLower === 'mas x menos' || storeLower === 'mas por menos') {
      console.log(`getProductStore: Variant match for MasxMenos`);
      return STORE.MASXMENOS;
    }
    if (storeLower === 'price smart') {
      console.log(`getProductStore: Variant match for PriceSmart`);
      return STORE.PRICESMART;
    }
    if (storeLower === 'auto mercado') {
      console.log(`getProductStore: Variant match for Automercado`);
      return STORE.AUTOMERCADO;
    }
    
    // If none of the direct matches worked, we'll check prefixes
    if (storeLower.startsWith('maxi') || storeLower.startsWith('maxipali')) {
      console.log(`getProductStore: Prefix match for MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (storeLower.startsWith('mas') || storeLower.startsWith('masxmenos')) {
      console.log(`getProductStore: Prefix match for MasxMenos`);
      return STORE.MASXMENOS;
    }
    if (storeLower.startsWith('wal') || storeLower.startsWith('walmart')) {
      console.log(`getProductStore: Prefix match for Walmart`);
      return STORE.WALMART;
    }
    if (storeLower.startsWith('price') || storeLower.startsWith('pricesmart')) {
      console.log(`getProductStore: Prefix match for PriceSmart`);
      return STORE.PRICESMART;
    }
    if (storeLower.startsWith('auto') || storeLower.startsWith('automercado')) {
      console.log(`getProductStore: Prefix match for Automercado`);
      return STORE.AUTOMERCADO;
    }
    
    // Now we use includes, but we need to be very careful to avoid misidentification
    // For MaxiPali vs MasxMenos, we need to be especially careful
    
    // Strict specific check for MaxiPali vs MasxMenos
    if (storeLower.includes('maxipali') && !storeLower.includes('masxmenos')) {
      console.log(`getProductStore: Includes match for MaxiPali (no MasxMenos conflict)`);
      return STORE.MAXIPALI;
    }
    
    if (storeLower.includes('masxmenos') && !storeLower.includes('maxipali')) {
      console.log(`getProductStore: Includes match for MasxMenos (no MaxiPali conflict)`);
      return STORE.MASXMENOS;
    }
    
    // For other stores, inclusion can be simpler
    if (storeLower.includes('walmart')) {
      console.log(`getProductStore: Includes match for Walmart`);
      return STORE.WALMART;
    }
    if (storeLower.includes('pricesmart')) {
      console.log(`getProductStore: Includes match for PriceSmart`);
      return STORE.PRICESMART;
    }
    if (storeLower.includes('automercado')) {
      console.log(`getProductStore: Includes match for Automercado`);
      return STORE.AUTOMERCADO;
    }
    
    // For the case where we have 'maxi' but it's not clear if MaxiPali or MasxMenos
    if (storeLower.includes('maxi') && !storeLower.includes('mas')) {
      console.log(`getProductStore: Partial match for MaxiPali (contains 'maxi' but not 'mas')`);
      return STORE.MAXIPALI;
    }
    
    // For the case where we have 'mas' but it's not clear if MasxMenos or MaxiPali
    if (storeLower.includes('mas') && !storeLower.includes('maxi')) {
      console.log(`getProductStore: Partial match for MasxMenos (contains 'mas' but not 'maxi')`);
      return STORE.MASXMENOS;
    }
    
    // Otherwise, return the raw store value to preserve the original
    console.log(`getProductStore: Using raw store value "${rawStore}" (no identified match)`);
    return rawStore;
  }
  
  // 2. Check for prices array with store information
  if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
    console.log(`getProductStore: Checking prices array for store info`);
    const storeId = String(product.prices[0].storeId || '').toLowerCase();
    
    if (storeId.includes('maxi')) {
      console.log(`getProductStore: Prices array indicates MaxiPali (${storeId})`);
      return STORE.MAXIPALI;
    }
    if (storeId.includes('mas')) {
      console.log(`getProductStore: Prices array indicates MasxMenos (${storeId})`);
      return STORE.MASXMENOS;
    }
    if (storeId.includes('wal')) {
      console.log(`getProductStore: Prices array indicates Walmart (${storeId})`);
      return STORE.WALMART;
    }
    if (storeId.includes('price')) {
      console.log(`getProductStore: Prices array indicates PriceSmart (${storeId})`);
      return STORE.PRICESMART;
    }
    if (storeId.includes('auto')) {
      console.log(`getProductStore: Prices array indicates Automercado (${storeId})`);
      return STORE.AUTOMERCADO;
    }
  }
  
  // 3. Check product ID for store hints
  if (product.id) {
    console.log(`getProductStore: Checking product ID for store info: ${product.id}`);
    const id = String(product.id).toLowerCase();
    
    // Check for store-specific ID prefixes
    if (id.startsWith('mp-') || id.startsWith('maxipali-')) {
      console.log(`getProductStore: ID prefix indicates MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (id.startsWith('mm-') || id.startsWith('masxmenos-')) {
      console.log(`getProductStore: ID prefix indicates MasxMenos`);
      return STORE.MASXMENOS;
    }
    if (id.startsWith('wm-') || id.startsWith('walmart-')) {
      console.log(`getProductStore: ID prefix indicates Walmart`);
      return STORE.WALMART;
    }
    if (id.startsWith('ps-') || id.startsWith('pricesmart-')) {
      console.log(`getProductStore: ID prefix indicates PriceSmart`);
      return STORE.PRICESMART;
    }
    if (id.startsWith('am-') || id.startsWith('automercado-')) {
      console.log(`getProductStore: ID prefix indicates Automercado`);
      return STORE.AUTOMERCADO;
    }
    
    // Check for store names in ID
    // MaxiPali vs MasxMenos distinction
    if (id.includes('maxipali') && !id.includes('masxmenos')) {
      console.log(`getProductStore: ID includes MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (id.includes('masxmenos') && !id.includes('maxipali')) {
      console.log(`getProductStore: ID includes MasxMenos`);
      return STORE.MASXMENOS;
    }
    
    // Other stores
    if (id.includes('walmart')) {
      console.log(`getProductStore: ID includes Walmart`);
      return STORE.WALMART;
    }
    if (id.includes('pricesmart')) {
      console.log(`getProductStore: ID includes PriceSmart`);
      return STORE.PRICESMART;
    }
    if (id.includes('automercado')) {
      console.log(`getProductStore: ID includes Automercado`);
      return STORE.AUTOMERCADO;
    }
  }
  
  // 4. Check source field if available
  if (product.source) {
    console.log(`getProductStore: Checking source field: ${product.source}`);
    const source = String(product.source).toLowerCase();
    
    if (source.includes('maxipali')) {
      console.log(`getProductStore: Source field indicates MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (source.includes('masxmenos')) {
      console.log(`getProductStore: Source field indicates MasxMenos`);
      return STORE.MASXMENOS;
    }
    if (source.includes('walmart')) {
      console.log(`getProductStore: Source field indicates Walmart`);
      return STORE.WALMART;
    }
    if (source.includes('pricesmart')) {
      console.log(`getProductStore: Source field indicates PriceSmart`);
      return STORE.PRICESMART;
    }
    if (source.includes('automercado')) {
      console.log(`getProductStore: Source field indicates Automercado`);
      return STORE.AUTOMERCADO;
    }
  }
  
  // 5. Last resort, check product name
  if (product.name) {
    console.log(`getProductStore: Last resort - checking product name: ${product.name}`);
    const name = String(product.name).toLowerCase();
    
    // Only use this as a last resort and require more specific mentions
    if (name.includes(' maxipali ')) {
      console.log(`getProductStore: Product name indicates MaxiPali`);
      return STORE.MAXIPALI;
    }
    if (name.includes(' masxmenos ') || name.includes(' mas x menos ')) {
      console.log(`getProductStore: Product name indicates MasxMenos`);
      return STORE.MASXMENOS;
    }
    if (name.includes(' walmart ')) {
      console.log(`getProductStore: Product name indicates Walmart`);
      return STORE.WALMART;
    }
    if (name.includes(' pricesmart ')) {
      console.log(`getProductStore: Product name indicates PriceSmart`);
      return STORE.PRICESMART;
    }
    if (name.includes(' automercado ') || name.includes(' auto mercado ')) {
      console.log(`getProductStore: Product name indicates Automercado`);
      return STORE.AUTOMERCADO;
    }
  }
  
  console.log(`getProductStore: Could not determine store for product ${productId}, returning Unknown`);
  return STORE.UNKNOWN;
};

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