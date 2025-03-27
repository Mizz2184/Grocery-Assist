import { Product, ProductSearchParams, ProductSearchResponse } from "@/lib/types/store";
import { getSearchTranslations } from "@/utils/translations";

export const searchMaxiPaliProducts = async ({ 
  query, 
  page = 1,
  pageSize = 49
}: ProductSearchParams): Promise<ProductSearchResponse> => {
  try {
    console.log('Searching MaxiPali for:', query);
    
    // Get all possible translations for the search query
    const searchTerms = getSearchTranslations(query);
    console.log('Search terms with translations:', searchTerms);
    
    // Use relative path that will be handled by Vite's proxy
    const searchResponse = await fetch('/api/proxy/maxipali/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchTerms.join(' '), // Join all terms with spaces for broader search
        page,
        pageSize
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`MaxiPali search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const data = await searchResponse.json();
    return {
      products: data.products || [],
      total: data.total || 0,
      page,
      pageSize,
      hasMore: (data.products || []).length === pageSize
    };
  } catch (error) {
    console.error('Error fetching MaxiPali products:', error);
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      hasMore: false
    };
  }
};

export const searchMasxMenosProducts = async ({ 
  query, 
  page = 1,
  pageSize = 49
}: ProductSearchParams): Promise<ProductSearchResponse> => {
  try {
    console.log('Searching MasxMenos for:', query);
    
    // If no query is provided, return empty results
    if (!query || query.trim() === '') {
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      };
    }
    
    // Get all possible translations for the search query
    const searchTerms = getSearchTranslations(query);
    console.log('Search terms with translations:', searchTerms);
    
    // Initialize page parameters
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    
    // Create proper URL parameters for the GraphQL API
    const variables = {
      hideUnavailableItems: false,
      skusFilter: "ALL",
      simulationBehavior: "default",
      installmentCriteria: "MAX_WITHOUT_INTEREST",
      productOriginVtex: true,
      map: "ft",
      query: searchTerms.join(' '), // Join all terms with spaces for broader search
      orderBy: "OrderByScoreDESC",
      from: from,
      to: to,
      selectedFacets: [],
      operator: "or",
      fuzzy: "0.7",
      searchState: null,
      facetsBehavior: "Static",
      categoryTreeBehavior: "default",
      withFacets: true
    };
    
    // Encode the variables for the URL
    const encodedVariables = encodeURIComponent(JSON.stringify(variables));
    
    // Use server-side proxy to avoid CORS issues
    const searchResponse = await fetch('/api/proxy/masxmenos/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchTerms.join(' '), // Join all terms with spaces for broader search
        variables: encodedVariables,
        page,
        pageSize
      })
    });

    if (!searchResponse.ok) {
      throw new Error(`MasxMenos search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const data = await searchResponse.json();
    
    // Transform products from MasxMenos format to our app's format
    const products = (data.data?.productSearch?.products || [])
      .map((product: any): Product => {
        // Get the first item from the items array
        const item = product.items && product.items.length > 0 ? product.items[0] : null;
        
        // Get price from the first seller's offer
        const seller = item?.sellers && item.sellers.length > 0 ? item.sellers[0] : null;
        const price = seller?.commertialOffer?.Price || 0;
        
        // Get the first image URL
        const imageUrl = item?.images && item.images.length > 0 
          ? item.images[0].imageUrl 
          : '';
          
        return {
          id: product.productId || '',
          name: product.productName || '',
          description: product.description || '',
          brand: product.brand || '',
          price: price,
          imageUrl: imageUrl,
          category: product.categories && product.categories.length > 0 
            ? product.categories[0].split('/').filter(Boolean).pop() || 'Uncategorized'
            : 'Uncategorized',
          store: 'MasxMenos',
          sku: item?.itemId || '',
          ean: item?.ean || '',
        };
      });
    
    console.log(`MasxMenos found ${data.data?.productSearch?.products?.length || 0} products, mapped to ${products.length} items`);
    
    return {
      products,
      total: data.data?.productSearch?.products?.length || 0,
      page,
      pageSize,
      hasMore: products.length === pageSize
    };
  } catch (error) {
    console.error('Error fetching MasxMenos products:', error);
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      hasMore: false
    };
  }
};

export const compareProductPrices = async (
  productName: string,
  barcode?: string,
  originalStore?: string
): Promise<{
  maxiPaliProducts: Product[],
  masxMenosProducts: Product[],
  bestPrice: {
    store: 'MaxiPali' | 'MasxMenos' | 'Unknown',
    price: number,
    savings: number,
    savingsPercentage: number
  } | null
}> => {
  try {
    // Normalize the original store for better matching
    const normalizedOriginalStore = originalStore?.toLowerCase() || 'unknown';
    
    console.log(`Comparing prices for product: ${productName}, barcode: ${barcode || 'N/A'}, original store: ${originalStore || 'unknown'} (normalized: ${normalizedOriginalStore})`);
    
    // Search query - use barcode if available, otherwise use product name
    const searchQuery = barcode || productName;
    
    // Extract product name parts for better matching (take first 2-3 words)
    const nameWords = productName.split(' ');
    let simplifiedName = nameWords.slice(0, Math.min(3, nameWords.length)).join(' ');
    
    console.log(`Using simplified name for cross-store search: "${simplifiedName}"`);
    
    // Search in both stores concurrently
    const [maxiPaliResponse, masxMenosResponse] = await Promise.all([
      searchMaxiPaliProducts({ query: searchQuery }),
      searchMasxMenosProducts({ query: searchQuery })
    ]);
    
    // Get the products from both responses and ensure store property is correctly set
    let maxiPaliProducts = maxiPaliResponse.products.map(p => ({...p, store: 'MaxiPali' as const}));
    let masxMenosProducts = masxMenosResponse.products.map(p => ({...p, store: 'MasxMenos' as const}));
    
    // If one store has no results using the primary search, try again with simplified name
    if (maxiPaliProducts.length === 0 && simplifiedName !== searchQuery) {
      console.log(`No MaxiPali products found with primary search, trying simplified name: ${simplifiedName}`);
      const altMaxiPaliResponse = await searchMaxiPaliProducts({ query: simplifiedName });
      maxiPaliProducts = altMaxiPaliResponse.products.map(p => ({...p, store: 'MaxiPali' as const}));
    }
    
    if (masxMenosProducts.length === 0 && simplifiedName !== searchQuery) {
      console.log(`No MasxMenos products found with primary search, trying simplified name: ${simplifiedName}`);
      const altMasxMenosResponse = await searchMasxMenosProducts({ query: simplifiedName });
      masxMenosProducts = altMasxMenosResponse.products.map(p => ({...p, store: 'MasxMenos' as const}));
    }
    
    // Log the results
    console.log(`Found ${maxiPaliProducts.length} MaxiPali products and ${masxMenosProducts.length} MasxMenos products`);
    if (maxiPaliProducts.length > 0) {
      console.log(`First MaxiPali product: ${maxiPaliProducts[0].name}, price: ${maxiPaliProducts[0].price}`);
    }
    if (masxMenosProducts.length > 0) {
      console.log(`First MasxMenos product: ${masxMenosProducts[0].name}, price: ${masxMenosProducts[0].price}`);
    }
    
    // If no products found in either store, return null for best price
    if (maxiPaliProducts.length === 0 && masxMenosProducts.length === 0) {
      return {
        maxiPaliProducts,
        masxMenosProducts,
        bestPrice: null
      };
    }
    
    // Find the lowest price product in each store
    const cheapestMaxiPaliProduct = maxiPaliProducts.length > 0
      ? maxiPaliProducts.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest, maxiPaliProducts[0])
      : null;
      
    const cheapestMasxMenosProduct = masxMenosProducts.length > 0
      ? masxMenosProducts.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest, masxMenosProducts[0])
      : null;
    
    // Determine best price
    let bestPrice = null;
    
    if (cheapestMaxiPaliProduct && cheapestMasxMenosProduct) {
      // Both stores have the product - compare prices
      if (cheapestMaxiPaliProduct.price < cheapestMasxMenosProduct.price) {
        // MaxiPali is cheaper
        const savings = cheapestMasxMenosProduct.price - cheapestMaxiPaliProduct.price;
        const savingsPercentage = Math.round((savings / cheapestMasxMenosProduct.price) * 100);
        
        bestPrice = {
          store: 'MaxiPali',
          price: cheapestMaxiPaliProduct.price,
          savings,
          savingsPercentage
        };
      } else if (cheapestMasxMenosProduct.price < cheapestMaxiPaliProduct.price) {
        // MasxMenos is cheaper
        const savings = cheapestMaxiPaliProduct.price - cheapestMasxMenosProduct.price;
        const savingsPercentage = Math.round((savings / cheapestMaxiPaliProduct.price) * 100);
        
        bestPrice = {
          store: 'MasxMenos',
          price: cheapestMasxMenosProduct.price,
          savings,
          savingsPercentage
        };
      } else {
        // Same price
        bestPrice = {
          store: 'MaxiPali', // Default to MaxiPali if same price
          price: cheapestMaxiPaliProduct.price,
          savings: 0,
          savingsPercentage: 0
        };
      }
    } else if (cheapestMaxiPaliProduct) {
      // Only MaxiPali has the product
      bestPrice = {
        store: 'MaxiPali',
        price: cheapestMaxiPaliProduct.price,
        savings: 0,
        savingsPercentage: 0
      };
    } else if (cheapestMasxMenosProduct) {
      // Only MasxMenos has the product
      bestPrice = {
        store: 'MasxMenos',
        price: cheapestMasxMenosProduct.price,
        savings: 0,
        savingsPercentage: 0
      };
    }
    
    return {
      maxiPaliProducts,
      masxMenosProducts,
      bestPrice
    };
  } catch (error) {
    console.error('Error comparing product prices:', error);
    return {
      maxiPaliProducts: [],
      masxMenosProducts: [],
      bestPrice: null
    };
  }
};