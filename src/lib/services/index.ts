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
    store: 'MaxiPali' | 'MasxMenos' ,
    price: number,
    savings: number,
    savingsPercentage: number
  } | null
}> => {
  try {
    // Normalize the original store for better matching
    const normalizedOriginalStore = originalStore?.toLowerCase() || 'unknown';
    
    console.log(`Comparing prices for product: ${productName}, original store: ${originalStore || 'unknown'} (normalized: ${normalizedOriginalStore})`);
    
    // Search query - use barcode if available, otherwise use product name
    const searchQuery = productName;
    
    // Extract product name parts for better matching
    // Remove brand names and common words that might differ between stores
    const nameWords = productName.split(' ');
    const cleanedWords = nameWords.filter(word => 
      word.length > 2 && 
      !['de', 'la', 'el', 'los', 'las', 'con', 'sin', 'para', 'por'].includes(word.toLowerCase())
    );
    
    // Use different search strategies
    // 1. First 2-3 words from cleaned name (primary identification)
    const simplifiedName = cleanedWords.slice(0, Math.min(3, cleanedWords.length)).join(' ');
    
    // 2. Keywords from product name (likely to be consistent across stores)
    // Find words that are likely to be product identifiers (longer words, numbers)
    const keywordName = cleanedWords
      .filter(word => word.length > 4 || /\d/.test(word))
      .join(' ');
    
    // 3. Category + key attribute (e.g., "leche entera" or "arroz 1kg")
    const specificAttributes = productName.match(/(\d+\s*(kg|g|ml|l|oz))/gi);
    const attributeText = specificAttributes ? specificAttributes[0] : '';
    const categoryMatch = productName.match(/(leche|arroz|frijol|pasta|cereal|aceite|atun|cafe|azucar|sal)/i);
    const categoryText = categoryMatch ? categoryMatch[0] : '';
    const categorySearch = [categoryText, attributeText].filter(Boolean).join(' ');
    
    console.log(`Search strategies:
      - Original query: "${searchQuery}"
      - Simplified name: "${simplifiedName}"
      - Keyword name: "${keywordName}"
      - Category search: "${categorySearch}"`);
    
    // If the product is from a specific store, we need to search for it in the other store
    let maxiPaliProducts: Product[] = [];
    let masxMenosProducts: Product[] = [];
    
    // FIXED: Always search both stores, but remember the original store for display logic
    // Instead of skipping the original store search, we'll store its products separately
    const searchMaxiPali = true;
    const searchMasxMenos = true;
    
    console.log(`Search configuration: 
      - Search MaxiPali: ${searchMaxiPali}
      - Search MasxMenos: ${searchMasxMenos}
      - Original store: ${normalizedOriginalStore}`);
    
    // Search in both stores concurrently (always)
    const [maxiPaliResponse, masxMenosResponse] = await Promise.all([
      searchMaxiPaliProducts({ query: searchQuery }),
      searchMasxMenosProducts({ query: searchQuery })
    ]);
    
    console.log("MaxiPali raw API response:", maxiPaliResponse);
    console.log("MasxMenos raw API response:", masxMenosResponse);
    
    maxiPaliProducts = maxiPaliResponse.products.map(p => ({...p, store: 'MaxiPali' as const}));
    masxMenosProducts = masxMenosResponse.products.map(p => ({...p, store: 'MasxMenos' as const}));
    
    console.log("After mapping - MaxiPali products:", maxiPaliProducts);
    console.log("After mapping - MasxMenos products:", masxMenosProducts);
    
    // If one store has no results, try alternative search strategies
    const searchStrategies = [simplifiedName, keywordName, categorySearch].filter(s => s && s !== searchQuery);
    
    for (const strategy of searchStrategies) {
      // Only proceed if the strategy has meaningful content
      if (!strategy || strategy.trim().length < 3) continue;
      
      // Try MaxiPali if needed
      if (maxiPaliProducts.length === 0) {
        console.log(`Trying alternative strategy for MaxiPali: "${strategy}"`);
        const altResponse = await searchMaxiPaliProducts({ query: strategy });
        maxiPaliProducts = altResponse.products.map(p => ({...p, store: 'MaxiPali' as const}));
        
        if (maxiPaliProducts.length > 0) {
          console.log(`Found ${maxiPaliProducts.length} MaxiPali products using strategy: "${strategy}"`);
          break; // Found results, no need to try more strategies
        }
      }
      
      // Try MasxMenos if needed
      if (masxMenosProducts.length === 0) {
        console.log(`Trying alternative strategy for MasxMenos: "${strategy}"`);
        const altResponse = await searchMasxMenosProducts({ query: strategy });
        masxMenosProducts = altResponse.products.map(p => ({...p, store: 'MasxMenos' as const}));
        
        if (masxMenosProducts.length > 0) {
          console.log(`Found ${masxMenosProducts.length} MasxMenos products using strategy: "${strategy}"`);
          break; // Found results, no need to try more strategies
        }
      }
    }
    
    // Log the results
    console.log(`Found ${maxiPaliProducts.length} MaxiPali products and ${masxMenosProducts.length} MasxMenos products`);
    if (maxiPaliProducts.length > 0) {
      console.log(`First MaxiPali product: ${maxiPaliProducts[0].name}, price: ${maxiPaliProducts[0].price}, store: ${maxiPaliProducts[0].store}`);
      console.log(`MaxiPali products details:`, maxiPaliProducts);
    }
    if (masxMenosProducts.length > 0) {
      console.log(`First MasxMenos product: ${masxMenosProducts[0].name}, price: ${masxMenosProducts[0].price}, store: ${masxMenosProducts[0].store}`);
      console.log(`MasxMenos products details:`, masxMenosProducts);
    }
    
    // If no products found in either store, return null for best price
    if (maxiPaliProducts.length === 0 && masxMenosProducts.length === 0) {
      return {
        maxiPaliProducts,
        masxMenosProducts,
        bestPrice: null
      };
    }
    
    // Ensure each product has the correct store property
    maxiPaliProducts = maxiPaliProducts.map(p => ({...p, store: 'MaxiPali' as const}));
    masxMenosProducts = masxMenosProducts.map(p => ({...p, store: 'MasxMenos' as const}));
    
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