import { Product, ProductSearchParams, ProductSearchResponse } from "@/lib/types/store";
import { getSearchTranslations } from "@/utils/translations";
import axios from "axios";
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    console.log('[FIXED v2] Searching MasxMenos for:', query);
    
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
    let searchTerms = getSearchTranslations(query);
    console.log('MasxMenos search terms with translations:', searchTerms);
    
    // Ensure we have at least the original query
    if (searchTerms.length === 0 || searchTerms.join(' ').trim() === '') {
      searchTerms = [query];
      console.log('MasxMenos: Using original query as fallback:', query);
    }
    
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
    // MasxMenos API doesn't handle multi-word queries well, so use only the first term
    const finalQuery = searchTerms[0] || query;
    console.log('🔍 MasxMenos DEBUG:', {
      originalQuery: query,
      searchTerms: searchTerms,
      finalQuery: finalQuery,
      finalQueryLength: finalQuery.length
    });
    
    const requestBody = {
      query: finalQuery, // Use first search term only (MasxMenos doesn't support multi-word)
      variables: encodedVariables,
      page,
      pageSize
    };
    
    console.log('📦 MasxMenos request body:', requestBody);
    console.log('📝 MasxMenos query string:', requestBody.query);
    
    const searchResponse = await fetch('/api/proxy/masxmenos/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store'
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
        
        // Debug logging for first product
        if (product.productId === (data.data?.productSearch?.products || [])[0]?.productId) {
          console.log('MasxMenos first product debug:', {
            productName: product.productName,
            hasItems: !!product.items,
            itemsLength: product.items?.length,
            hasSellers: !!item?.sellers,
            sellersLength: item?.sellers?.length,
            hasCommertialOffer: !!seller?.commertialOffer,
            price: price,
            rawPrice: seller?.commertialOffer?.Price
          });
        }
        
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
          barcode: item?.ean || '',
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

// Define interface for Walmart API response
interface WalmartSearchResponse {
  products: Array<Partial<Product> & { store?: string }>;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const searchWalmartProducts = async ({ query, page = 1, pageSize = 30 }: ProductSearchParams): Promise<ProductSearchResponse> => {
  try {
    console.log(`Searching Walmart products with query "${query}"`);
    
    // Make sure we have a valid query
    if (!query || query.trim() === '') {
      console.log('Empty query provided to searchWalmartProducts, returning empty results');
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      };
    }
    
    console.log(`Sending request to Walmart API endpoint with query: "${query}"`);
    const response = await axios.post<WalmartSearchResponse>('/api/proxy/walmart/search', {
      query,
      page,
      pageSize
    });

    console.log('Walmart API response:', {
      status: response.status,
      hasData: !!response.data,
      hasProducts: !!(response.data && response.data.products),
      productCount: response.data?.products?.length || 0
    });

    if (response.status !== 200) {
      console.error('Walmart API returned non-200 status:', response.status);
    }

    // Ensure we have valid product data
    if (!response.data?.products || !Array.isArray(response.data.products)) {
      console.error('Invalid response from Walmart API:', response.data);
      // Return empty results instead of throwing, to prevent blocking other stores
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      };
    }

    // Check if the products have all required fields and add proper store
    const validProducts = response.data.products.map(product => {
      // Important: Explicitly set the store to 'Walmart' with the exact spelling
      // This ensures Walmart products use the EXACT same store name throughout the app
      
      // Debug log for each product
      console.log(`Processing Walmart product: id=${product.id}, name=${product.name}, price=${product.price}, store=${product.store || 'undefined'}`);
      
      // Only include properties that are part of the Product type
      const normalizedProduct: Product = {
        id: product.id || `walmart-api-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: product.name || 'Unknown Walmart Product',
        price: typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0),
        store: 'Walmart', // Always ensure this exact spelling
        currency: product.currency || 'CRC',
        imageUrl: product.imageUrl || '',
        // Optional properties - only add if present in the product
        ...(product.description && { description: product.description }),
        ...(product.brand && { brand: product.brand }),
        ...(product.category && { category: product.category }),
        ...(product.barcode && { barcode: product.barcode }),
        ...(product.regularPrice && { regularPrice: product.regularPrice }),
        ...(product.salePrice && { salePrice: product.salePrice }),
        ...(product.image && { image: product.image }),
        ...(product.largeImage && { largeImage: product.largeImage }),
        ...(product.thumbnailImage && { thumbnailImage: product.thumbnailImage }),
        ...(product.url && { url: product.url }),
        ...(product.productType && { productType: product.productType }),
        ...(product.productStatus && { productStatus: product.productStatus }),
        ...(product.prices && { prices: product.prices }),
        ...(product.attributes && { attributes: product.attributes })
      };
      
      // Log the store value after normalization to ensure consistency 
      console.log(`Normalized Walmart product: id=${normalizedProduct.id}, store=${normalizedProduct.store}`);
      
      return normalizedProduct;
    });

    console.log(`Processed ${validProducts.length} valid Walmart products`);
    
    // Filter out any products with zero or invalid prices
    const filteredProducts = validProducts.filter(p => p.price > 0);
    console.log(`Filtered to ${filteredProducts.length} Walmart products with valid prices`);
    
    // Log the final products we're returning
    if (filteredProducts.length > 0) {
      console.log('First Walmart product being returned:', JSON.stringify(filteredProducts[0]));
    } else {
      console.warn('No Walmart products to return after filtering');
    }

    return {
      products: filteredProducts,
      total: filteredProducts.length,
      page,
      pageSize,
      hasMore: filteredProducts.length >= pageSize
    };
  } catch (error) {
    console.error('Error searching Walmart products:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });
    // Return empty results instead of throwing, to prevent blocking other stores
    return {
      products: [],
      total: 0,
      page,
      pageSize,
      hasMore: false
    };
  }
};

export const searchAutomercadoProducts = async ({ query, page = 1, pageSize = 30 }: ProductSearchParams): Promise<ProductSearchResponse> => {
  try {
    console.log(`Searching Automercado products with query "${query}"`);
    
    if (!query || query.trim() === '') {
      console.log('Empty query provided to searchAutomercadoProducts, returning empty results');
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      };
    }
    
    console.log(`Sending request to Automercado API endpoint with query: "${query}"`);
    const response = await axios.post<any>('/api/proxy/automercado/search', {
      query,
      page,
      pageSize
    });

    console.log('Automercado API response:', {
      status: response.status,
      hasData: !!response.data,
      hasHits: !!(response.data && response.data.hits),
      hitCount: response.data?.hits?.length || 0
    });

    if (response.status !== 200) {
      console.error('Automercado API returned non-200 status:', response.status);
    }

    // Ensure we have valid product data
    if (!response.data?.hits || !Array.isArray(response.data.hits)) {
      console.error('Invalid response from Automercado API:', response.data);
      return {
        products: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      };
    }

    // Transform Algolia hits to Product format
    const validProducts = response.data.hits.map((hit: any): Product => {
      // Try to get price from any available store, prioritizing store 06
      let price = 0;
      const storeDetail = hit.storeDetail || {};
      
      // First try store 06 (main store)
      if (storeDetail['06']?.basePrice) {
        price = parseFloat(storeDetail['06'].basePrice);
      } else {
        // If store 06 doesn't have it, try any other store
        const storeKeys = Object.keys(storeDetail);
        for (const storeKey of storeKeys) {
          if (storeDetail[storeKey]?.basePrice) {
            price = parseFloat(storeDetail[storeKey].basePrice);
            break;
          }
        }
      }
      
      return {
        id: hit.objectID || hit.productNumber || `automercado-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: hit.ecomDescription || hit.productName || 'Unknown Automercado Product',
        price: price,
        store: 'Automercado',
        currency: 'CRC',
        imageUrl: hit.imageUrl || '',
        description: hit.ecomDescription || '',
        brand: hit.supplier || hit.brand || ''
      };
    }).filter((p: Product) => p.price > 0);

    console.log(`Processed ${validProducts.length} valid Automercado products`);
    
    if (validProducts.length > 0) {
      console.log('First Automercado product being returned:', JSON.stringify(validProducts[0]));
    } else {
      console.warn('No Automercado products to return after filtering');
    }

    return {
      products: validProducts,
      total: validProducts.length,
      page,
      pageSize,
      hasMore: validProducts.length >= pageSize
    };
  } catch (error) {
    console.error('Error searching Automercado products:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });
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
  walmartProducts: Product[],
  automercadoProducts: Product[],
  bestPrice: {
    store: 'MaxiPali' | 'MasxMenos' | 'Walmart' | 'Automercado',
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
    let walmartProducts: Product[] = [];
    let automercadoProducts: Product[] = [];
    
    // FIXED: Always search both stores, but remember the original store for display logic
    // Instead of skipping the original store search, we'll store its products separately
    const searchMaxiPali = true;
    const searchMasxMenos = true;
    const searchWalmart = true;
    
    console.log(`Search configuration: 
      - Search MaxiPali: ${searchMaxiPali}
      - Search MasxMenos: ${searchMasxMenos}
      - Search Walmart: ${searchWalmart}
      - Original store: ${normalizedOriginalStore}`);
    
    // Search in all stores concurrently
    const [maxiPaliResponse, masxMenosResponse, walmartResponse, automercadoResponse] = await Promise.all([
      searchMaxiPaliProducts({ query: searchQuery }),
      searchMasxMenosProducts({ query: searchQuery }),
      searchWalmartProducts({ query: searchQuery }),
      searchAutomercadoProducts({ query: searchQuery })
    ]);
    
    console.log("MaxiPali raw API response:", maxiPaliResponse);
    console.log("MasxMenos raw API response:", masxMenosResponse);
    console.log("Walmart raw API response:", walmartResponse);
    console.log("Automercado raw API response:", automercadoResponse);
    
    maxiPaliProducts = maxiPaliResponse.products.map(p => ({...p, store: 'MaxiPali' as const}));
    masxMenosProducts = masxMenosResponse.products.map(p => ({...p, store: 'MasxMenos' as const}));
    walmartProducts = walmartResponse.products.map(p => ({...p, store: 'Walmart' as const}));
    automercadoProducts = automercadoResponse.products.map(p => ({...p, store: 'Automercado' as const}));
    
    console.log("After mapping - MaxiPali products:", maxiPaliProducts);
    console.log("After mapping - MasxMenos products:", masxMenosProducts);
    console.log("After mapping - Walmart products:", walmartProducts);
    console.log("After mapping - Automercado products:", automercadoProducts);
    
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
      
      // Try Walmart if needed
      if (walmartProducts.length === 0) {
        console.log(`Trying alternative strategy for Walmart: "${strategy}"`);
        const altResponse = await searchWalmartProducts({ query: strategy });
        walmartProducts = altResponse.products.map(p => ({...p, store: 'Walmart' as const}));
        
        if (walmartProducts.length > 0) {
          console.log(`Found ${walmartProducts.length} Walmart products using strategy: "${strategy}"`);
          break; // Found results, no need to try more strategies
        }
      }
    }
    
    // Log the results
    console.log(`Found ${maxiPaliProducts.length} MaxiPali products, ${masxMenosProducts.length} MasxMenos products, ${walmartProducts.length} Walmart products, and ${automercadoProducts.length} Automercado products`);
    if (maxiPaliProducts.length > 0) {
      console.log(`First MaxiPali product: ${maxiPaliProducts[0].name}, price: ${maxiPaliProducts[0].price}, store: ${maxiPaliProducts[0].store}`);
      console.log(`MaxiPali products details:`, maxiPaliProducts);
    }
    if (masxMenosProducts.length > 0) {
      console.log(`First MasxMenos product: ${masxMenosProducts[0].name}, price: ${masxMenosProducts[0].price}, store: ${masxMenosProducts[0].store}`);
      console.log(`MasxMenos products details:`, masxMenosProducts);
    }
    if (walmartProducts.length > 0) {
      console.log(`First Walmart product: ${walmartProducts[0].name}, price: ${walmartProducts[0].price}, store: ${walmartProducts[0].store}`);
      console.log(`Walmart products details:`, walmartProducts);
    }
    
    // If no products found in any store, return null for best price
    if (maxiPaliProducts.length === 0 && masxMenosProducts.length === 0 && walmartProducts.length === 0 && automercadoProducts.length === 0) {
      return {
        maxiPaliProducts,
        masxMenosProducts,
        walmartProducts,
        automercadoProducts,
        bestPrice: null
      };
    }
    
    // Ensure each product has the correct store property
    maxiPaliProducts = maxiPaliProducts.map(p => ({...p, store: 'MaxiPali' as const}));
    masxMenosProducts = masxMenosProducts.map(p => ({...p, store: 'MasxMenos' as const}));
    walmartProducts = walmartProducts.map(p => ({...p, store: 'Walmart' as const}));
    automercadoProducts = automercadoProducts.map(p => ({...p, store: 'Automercado' as const}));
    
    // Find the lowest price product in each store
    const cheapestMaxiPaliProduct = maxiPaliProducts.length > 0
      ? maxiPaliProducts.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest, maxiPaliProducts[0])
      : null;
      
    const cheapestMasxMenosProduct = masxMenosProducts.length > 0
      ? masxMenosProducts.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest, masxMenosProducts[0])
      : null;
      
    const cheapestWalmartProduct = walmartProducts.length > 0
      ? walmartProducts.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest, walmartProducts[0])
      : null;
      
    const cheapestAutomercadoProduct = automercadoProducts.length > 0
      ? automercadoProducts.reduce((cheapest, current) => 
          current.price < cheapest.price ? current : cheapest, automercadoProducts[0])
      : null;
    
    // Determine best price among all stores
    let bestPrice = null;
    let cheapestProduct = null;
    let cheapestStore = null;
    
    // Find the cheapest product overall
    if (cheapestMaxiPaliProduct && (!cheapestProduct || cheapestMaxiPaliProduct.price < cheapestProduct.price)) {
      cheapestProduct = cheapestMaxiPaliProduct;
      cheapestStore = 'MaxiPali';
    }
    
    if (cheapestMasxMenosProduct && (!cheapestProduct || cheapestMasxMenosProduct.price < cheapestProduct.price)) {
      cheapestProduct = cheapestMasxMenosProduct;
      cheapestStore = 'MasxMenos';
    }
    
    if (cheapestWalmartProduct && (!cheapestProduct || cheapestWalmartProduct.price < cheapestProduct.price)) {
      cheapestProduct = cheapestWalmartProduct;
      cheapestStore = 'Walmart';
    }
    
    if (cheapestAutomercadoProduct && (!cheapestProduct || cheapestAutomercadoProduct.price < cheapestProduct.price)) {
      cheapestProduct = cheapestAutomercadoProduct;
      cheapestStore = 'Automercado';
    }
    
    if (cheapestProduct && cheapestStore) {
      // Calculate savings compared to the next cheapest option
      let nextCheapestPrice = Infinity;
      
      if (cheapestStore !== 'MaxiPali' && cheapestMaxiPaliProduct) {
        nextCheapestPrice = Math.min(nextCheapestPrice, cheapestMaxiPaliProduct.price);
      }
      
      if (cheapestStore !== 'MasxMenos' && cheapestMasxMenosProduct) {
        nextCheapestPrice = Math.min(nextCheapestPrice, cheapestMasxMenosProduct.price);
      }
      
      if (cheapestStore !== 'Walmart' && cheapestWalmartProduct) {
        nextCheapestPrice = Math.min(nextCheapestPrice, cheapestWalmartProduct.price);
      }
      
      if (cheapestStore !== 'Automercado' && cheapestAutomercadoProduct) {
        nextCheapestPrice = Math.min(nextCheapestPrice, cheapestAutomercadoProduct.price);
      }
      
      // If we don't have a second option for comparison, there's no savings
      if (nextCheapestPrice === Infinity) {
        bestPrice = {
          store: cheapestStore as 'MaxiPali' | 'MasxMenos' | 'Walmart' | 'Automercado',
          price: cheapestProduct.price,
          savings: 0,
          savingsPercentage: 0
        };
      } else {
        const savings = nextCheapestPrice - cheapestProduct.price;
        const savingsPercentage = Math.round((savings / nextCheapestPrice) * 100);
        
        bestPrice = {
          store: cheapestStore as 'MaxiPali' | 'MasxMenos' | 'Walmart' | 'Automercado',
          price: cheapestProduct.price,
          savings,
          savingsPercentage
        };
      }
    }
    
    return {
      maxiPaliProducts,
      masxMenosProducts,
      walmartProducts,
      automercadoProducts,
      bestPrice
    };
  } catch (error) {
    console.error('Error comparing product prices:', error);
    return {
      maxiPaliProducts: [],
      masxMenosProducts: [],
      walmartProducts: [],
      automercadoProducts: [],
      bestPrice: null
    };
  }
};

// Google Gemini Live Voice Agent Service
export interface VoiceAgentConnection {
  session: any;
  disconnect: () => void;
  sendAudio: (audioData: ArrayBuffer) => void;
  isReady: () => boolean;
}

/**
 * Connect to Google Gemini Live voice agent
 */
export async function connectToGeminiVoiceAgent(
  onMessage: (message: any) => void,
  onError: (error: Error) => void,
  onReady?: () => void
): Promise<VoiceAgentConnection> {
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Google Gemini API key not configured');
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';
    const config = { 
      responseModalities: ['AUDIO'],
      systemInstruction: `You are a helpful voice AI assistant for a grocery shopping app called Grocery Assist.
      Your role is to help users locate products from grocery stores in Costa Rica (MaxiPali, MasxMenos, Walmart, and Automercado).
      
      When a user asks about a product:
      1. Acknowledge their request
      2. Tell them you're searching across all stores
      3. Provide information about which stores have the product and their prices
      4. Recommend the best price if multiple stores carry it
      5. Ask if they want to add it to their grocery list
      
      For example, if they ask "Where can I buy Vegan Queso?", respond with:
      "Let me search for Vegan Queso across all our stores... I found it at MaxiPali for 2,500 colones and at Walmart for 2,300 colones. Walmart has the best price. Would you like me to add it to your grocery list?"
      
      Be conversational, friendly, and helpful. Keep responses concise and natural.
      Always mention the store name and price when discussing products.
      Prices are in Costa Rican Colones (₡).
      
      When you need to search for a product, respond with a JSON object in this format:
      {"action": "search", "query": "product name"}
      
      When you need to add a product to the list, respond with:
      {"action": "add_to_list", "product": {"name": "product name", "store": "store name", "price": price}}`
    };

    console.log('Connecting to Google Gemini Live...');

    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    console.log('Connecting to Google Gemini Live via WebSocket...');
    
    const ws = new WebSocket(wsUrl);
    let isConnected = false;

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('Gemini Live WebSocket connection opened');
        isConnected = true;
        
        // Send initial setup message
        const setupMessage = {
          setup: {
            model: 'models/gemini-2.0-flash-exp',
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck'
                  }
                }
              }
            },
            systemInstruction: {
              parts: [
                {
                  text: `You are a helpful voice AI assistant for a grocery shopping app called Grocery Assist. Your role is to help users locate products from grocery stores in Costa Rica (MaxiPali, MasxMenos, Walmart, and Automercado).`
                },
                {
                  text: `When a user asks about a product: 1. Acknowledge their request 2. Tell them you're searching across all stores 3. Provide information about which stores have the product and their prices 4. Recommend the best price if multiple stores carry it 5. Ask if they want to add it to their grocery list`
                },
                {
                  text: `Be conversational, friendly, and helpful. Keep responses concise and natural. Always mention the store name and price when discussing products. Prices are in Costa Rican Colones.`
                }
              ]
            }
          }
        };
        
        ws.send(JSON.stringify(setupMessage));
        console.log('Sent setup message to Gemini Live');
        
        // Wait a bit for the server to process setup before allowing audio
        setTimeout(() => {
          console.log('Gemini Live is ready to receive audio');
          if (onReady) {
            onReady();
          }
        }, 500);
        
        resolve({
          session: ws,
          isReady: () => ws.readyState === WebSocket.OPEN && isConnected,
          disconnect: () => {
            console.log('Disconnecting Gemini Live WebSocket');
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          },
          sendAudio: (audioData: ArrayBuffer) => {
            if (ws.readyState === WebSocket.OPEN) {
              // Convert ArrayBuffer to base64
              const uint8Array = new Uint8Array(audioData);
              let binary = '';
              const chunkSize = 0x8000; // 32KB chunks to avoid call stack size exceeded
              
              for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
              }
              
              const base64Audio = btoa(binary);
              
              const audioMessage = {
                realtime_input: {
                  media_chunks: [{
                    data: base64Audio,
                    mime_type: 'audio/webm;codecs=opus'
                  }]
                }
              };
              
              ws.send(JSON.stringify(audioMessage));
              console.log('Sent audio chunk:', audioData.byteLength, 'bytes');
            } else {
              console.warn('WebSocket not open, cannot send audio');
            }
          },
        });
      };

      ws.onmessage = async (event) => {
        try {
          let data;
          
          // Check if the data is a Blob (binary data)
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            data = JSON.parse(text);
          } else {
            // Handle as text
            data = JSON.parse(event.data);
          }
          
          console.log('Gemini message:', data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing Gemini message:', error, 'Raw data:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('Gemini WebSocket error:', error);
        const err = new Error('WebSocket connection error');
        onError(err);
        if (!isConnected) {
          reject(err);
        }
      };

      ws.onclose = (event) => {
        console.log('Gemini WebSocket closed:', event.code, event.reason);
        if (!isConnected) {
          reject(new Error('WebSocket connection closed before establishing'));
        }
      };
    });    
    return {
      session,
      disconnect: () => {
        console.log('Disconnecting Gemini Live session');
        session.close();
      },
      sendAudio: (audioData: ArrayBuffer) => {
        // Send audio data to Gemini
        session.send({ audio: audioData });
      },
    };
  } catch (error) {
    console.error('Error connecting to Gemini Live:', error);
    throw error;
  }
}

/**
 * Search for products and return results for voice agent
 */
export async function searchProductsForVoiceAgent(query: string): Promise<string> {
  try {
    console.log(`Voice agent searching for: ${query}`);
    
    // Search across all stores
    const [maxipaliResults, masxmenosResults, walmartResults, automercadoResults] = await Promise.allSettled([
      searchMaxiPaliProducts({ query, page: 1, pageSize: 3 }),
      searchMasxMenosProducts({ query, page: 1, pageSize: 3 }),
      searchWalmartProducts({ query, page: 1, pageSize: 3 }),
      searchAutomercadoProducts({ query, page: 1, pageSize: 3 }),
    ]);

    const results: Array<{ store: string; products: Product[] }> = [];

    if (maxipaliResults.status === 'fulfilled' && maxipaliResults.value.products.length > 0) {
      results.push({ store: 'MaxiPali', products: maxipaliResults.value.products.slice(0, 2) });
    }
    if (masxmenosResults.status === 'fulfilled' && masxmenosResults.value.products.length > 0) {
      results.push({ store: 'MasxMenos', products: masxmenosResults.value.products.slice(0, 2) });
    }
    if (walmartResults.status === 'fulfilled' && walmartResults.value.products.length > 0) {
      results.push({ store: 'Walmart', products: walmartResults.value.products.slice(0, 2) });
    }
    if (automercadoResults.status === 'fulfilled' && automercadoResults.value.products.length > 0) {
      results.push({ store: 'Automercado', products: automercadoResults.value.products.slice(0, 2) });
    }

    if (results.length === 0) {
      return `I couldn't find "${query}" in any of our stores. Could you try a different search term?`;
    }

    // Format results for voice response
    let response = `I found "${query}" in the following stores: `;
    const storeResults: string[] = [];
    let bestPrice = Infinity;
    let bestStore = '';

    results.forEach(({ store, products }) => {
      if (products.length > 0) {
        const product = products[0];
        const price = product.price;
        storeResults.push(`${store} for ${price.toLocaleString()} colones`);
        
        if (price < bestPrice) {
          bestPrice = price;
          bestStore = store;
        }
      }
    });

    response += storeResults.join(', ');
    
    if (bestStore) {
      response += `. ${bestStore} has the best price. Would you like me to add it to your grocery list?`;
    }

    return response;
  } catch (error) {
    console.error('Error searching products for voice agent:', error);
    return `I encountered an error while searching for "${query}". Please try again.`;
  }
}