/**
 * Utility functions for working with store data
 */

// Helper function to get store name from any product structure
export const getProductStore = (product: any): string => {
  if (!product) return 'Unknown';
  
  // Direct store property
  if (product.store) {
    // Normalize store names
    const storeName = String(product.store).trim();
    
    // Handle exact matches first
    if (storeName === 'MaxiPali') return 'MaxiPali';
    if (storeName === 'MasxMenos') return 'MasxMenos';
    if (storeName === 'Walmart') return 'Walmart';
    if (storeName === 'PriceSmart') return 'PriceSmart';
    if (storeName === 'Automercado') return 'Automercado';
    
    // Handle case-insensitive matches with word boundaries to avoid confusion
    const storeNameLower = storeName.toLowerCase();
    
    // Use more specific matching to prevent overlap between MasxMenos and MaxiPali
    if (storeNameLower === 'maxipali' || 
        storeNameLower === 'maxi pali' ||
        storeNameLower.startsWith('maxipali ') || 
        storeNameLower.endsWith(' maxipali')) {
      return 'MaxiPali';
    }
    
    if (storeNameLower === 'masxmenos' || 
        storeNameLower === 'mas x menos' || 
        storeNameLower === 'mas por menos' ||
        storeNameLower.startsWith('masxmenos ') || 
        storeNameLower.endsWith(' masxmenos')) {
      return 'MasxMenos';
    }
    
    if (storeNameLower === 'walmart' || 
        storeNameLower.startsWith('walmart ') || 
        storeNameLower.endsWith(' walmart')) {
      return 'Walmart';
    }
    
    if (storeNameLower === 'pricesmart' || 
        storeNameLower === 'price smart' ||
        storeNameLower.startsWith('pricesmart ') || 
        storeNameLower.endsWith(' pricesmart')) {
      return 'PriceSmart';
    }
    
    if (storeNameLower === 'automercado' || 
        storeNameLower === 'auto mercado' ||
        storeNameLower.startsWith('automercado ') || 
        storeNameLower.endsWith(' automercado')) {
      return 'Automercado';
    }
    
    // Only use includes as a last resort as it can be too broad
    if (storeNameLower.includes('maxipali')) return 'MaxiPali';
    if (storeNameLower.includes('masxmenos') || storeNameLower.includes('mas x menos')) return 'MasxMenos';
    if (storeNameLower.includes('walmart')) return 'Walmart';
    if (storeNameLower.includes('pricesmart')) return 'PriceSmart';
    if (storeNameLower.includes('automercado')) return 'Automercado';
    
    return 'Unknown';
  }
  
  // If product has prices array (mock product structure)
  if (product.prices && Array.isArray(product.prices) && product.prices.length > 0) {
    const storeId = String(product.prices[0].storeId || '').toLowerCase();
    
    if (storeId === 'maxipali' || storeId.includes('maxi-pali')) return 'MaxiPali';
    if (storeId === 'masxmenos' || storeId.includes('mas-x-menos')) return 'MasxMenos';
    if (storeId === 'walmart') return 'Walmart';
    if (storeId === 'pricesmart') return 'PriceSmart';
    if (storeId === 'automercado') return 'Automercado';
  }
  
  // Check product ID for store hints
  if (product.id) {
    const id = String(product.id).toLowerCase();
    
    // Use more specific prefixes to properly categorize
    if (id.startsWith('mp-') || id.startsWith('maxipali-')) return 'MaxiPali';
    if (id.startsWith('mm-') || id.startsWith('masxmenos-')) return 'MasxMenos';
    if (id.startsWith('wm-') || id.startsWith('walmart-')) return 'Walmart';
    if (id.startsWith('ps-') || id.startsWith('pricesmart-')) return 'PriceSmart';
    if (id.startsWith('am-') || id.startsWith('automercado-')) return 'Automercado';
    
    // Last resort, check for inclusions
    if (id.includes('maxipali')) return 'MaxiPali';
    if (id.includes('masxmenos') || id.includes('mas-x-menos')) return 'MasxMenos';
    if (id.includes('walmart')) return 'Walmart';
    if (id.includes('pricesmart')) return 'PriceSmart';
    if (id.includes('automercado')) return 'Automercado';
  }
  
  // Check product name for store hints
  if (product.name) {
    const name = String(product.name).toLowerCase();
    // Only check for explicit mentions in the name as a last resort
    if (name.includes(' maxipali ')) return 'MaxiPali';
    if (name.includes(' masxmenos ') || name.includes(' mas x menos ')) return 'MasxMenos';
    if (name.includes(' walmart ')) return 'Walmart';
    if (name.includes(' pricesmart ')) return 'PriceSmart';
    if (name.includes(' automercado ') || name.includes(' auto mercado ')) return 'Automercado';
  }
  
  return 'Unknown';
};

// Define store names and their display names
export const storeNames = {
  'Walmart': 'Walmart',
  'MaxiPali': 'MaxiPali',
  'MasxMenos': 'MasxMenos',
  'PriceSmart': 'PriceSmart',
  'Automercado': 'Automercado',
  'Unknown': 'Other Stores'
};

// Define store order for display
export const storeOrder = ['Walmart', 'MaxiPali', 'MasxMenos', 'PriceSmart', 'Automercado', 'Unknown'];

// Define store colors for consistent UI
export const storeColors = {
  'Walmart': 'bg-blue-600 text-white border-blue-600',
  'MaxiPali': 'bg-yellow-500 text-white border-yellow-500',
  'MasxMenos': 'bg-green-600 text-white border-green-600',
  'PriceSmart': 'bg-purple-600 text-white border-purple-600',
  'Automercado': 'bg-pink-600 text-white border-pink-600',
  'Unknown': 'bg-gray-500 text-white border-gray-500'
}; 