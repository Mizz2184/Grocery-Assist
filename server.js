import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

app.use(cors());
app.use(express.json());

// Keep original endpoint for backwards compatibility
app.post('/api/proxy/maxipali/search', async (req, res) => {
  try {
    const { query, page = 1, pageSize = 49 } = req.body;
    console.log('Received search request (proxy endpoint):', { query, page, pageSize });
    
    // Simplify search query - take first word if multi-word query
    // MaxiPali API frequently fails with complex queries
    const simplifiedQuery = query.split(' ')[0];
    console.log(`Using simplified query: "${simplifiedQuery}" (from original: "${query}")`);
    
    let searchData = [];
    
    // Try path-based search first
    try {
      console.log(`Attempting path-based search for: ${simplifiedQuery}`);
      const pathSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search/${encodeURIComponent(simplifiedQuery)}`, {
        params: {
          '_from': (page - 1) * pageSize,
          '_to': (page * pageSize) - 1
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Origin': 'https://www.maxipali.co.cr',
          'Referer': 'https://www.maxipali.co.cr/'
        },
        timeout: 15000
      });
      
      if (pathSearchResponse.data && pathSearchResponse.data.length > 0) {
        console.log(`Path-based search found ${pathSearchResponse.data.length} products`);
        searchData = pathSearchResponse.data;
      } else {
        console.log('Path-based search returned no results, trying ft search');
      }
    } catch (pathError) {
      console.error('Path-based search error:', pathError.message);
      // Continue to next search method
    }
    
    // If path search returned no results, try ft parameter search
    if (searchData.length === 0) {
      try {
        console.log(`Attempting ft parameter search for: ${simplifiedQuery}`);
        const ftSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search`, {
          params: {
            'ft': simplifiedQuery,
            '_from': (page - 1) * pageSize,
            '_to': (page * pageSize) - 1
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Origin': 'https://www.maxipali.co.cr',
            'Referer': 'https://www.maxipali.co.cr/'
          },
          timeout: 15000
        });
        
        if (ftSearchResponse.data && ftSearchResponse.data.length > 0) {
          console.log(`ft parameter search found ${ftSearchResponse.data.length} products`);
          searchData = ftSearchResponse.data;
        } else {
          console.log('ft parameter search returned no results');
        }
      } catch (ftError) {
        console.error('ft parameter search error:', ftError.message);
        // Continue to next search method
      }
    }
    
    // Final attempt - use intelligent search API
    if (searchData.length === 0) {
      try {
        console.log(`Attempting intelligent search for: ${simplifiedQuery}`);
        const intelligentSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/io/_v/api/intelligent-search/product_search/productSearch`, {
          params: {
            term: simplifiedQuery,
            count: pageSize,
            page: page
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Origin': 'https://www.maxipali.co.cr',
            'Referer': 'https://www.maxipali.co.cr/'
          },
          timeout: 15000
        });
        
        if (intelligentSearchResponse.data?.products && intelligentSearchResponse.data.products.length > 0) {
          console.log(`Intelligent search found ${intelligentSearchResponse.data.products.length} products`);
          
          // Log price data for troubleshooting
          const priceSamples = intelligentSearchResponse.data.products.slice(0, 3).map(p => ({
            name: p.productName,
            rawPrice: p.price,
            rawPriceType: typeof p.price,
            parsedPrice: parseFloat(p.price) || 0
          }));
          console.log('Sample price data:', priceSamples);
          
          // Convert intelligent search format to catalog search format
          const validProducts = intelligentSearchResponse.data.products.filter(p => {
            // Only include products with valid prices
            const hasPrice = p.price && parseFloat(p.price) > 0;
            return hasPrice;
          });
          
          console.log(`Filtered to ${validProducts.length} products with valid prices`);
          
          // Map valid products to the expected format
          searchData = validProducts.map(p => ({
            productId: p.productId,
            productName: p.productName,
            brand: p.brand,
            items: [{
              itemId: p.sku || '',
              ean: p.ean || '',
              images: [{imageUrl: p.image || ''}],
              sellers: [{
                commertialOffer: {
                  Price: parseFloat(p.price) || 0,
                  ListPrice: parseFloat(p.listPrice) || 0
                }
              }]
            }]
          }));
        } else {
          console.log('Intelligent search returned no results');
        }
      } catch (intelligentError) {
        console.error('Intelligent search error:', intelligentError.message);
      }
    }

    // Transform response to match our format
    const transformedData = {
      products: (searchData || []).map(p => {
        const price = p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 
                     p.items?.[0]?.sellers?.[0]?.commertialOffer?.ListPrice || 0;
        
        console.log(`Product ${p.productName} price:`, price);
        
        return {
          id: p.productId,
          name: p.productName,
          brand: p.brand,
          price: price,
          imageUrl: p.items?.[0]?.images?.[0]?.imageUrl || '',
          store: 'MaxiPali',
          category: p.categories && p.categories[0] ? p.categories[0].split('/').pop() : 'Grocery',
          sku: p.items?.[0]?.itemId || '',
          barcode: p.items?.[0]?.ean || '',
          inStock: true
        };
      }),
      total: searchData?.length || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      hasMore: (searchData?.length || 0) === pageSize
    };

    // Filter out products with zero price
    transformedData.products = transformedData.products.filter(p => p.price > 0);
    transformedData.total = transformedData.products.length;

    console.log(`Found ${transformedData.products.length} products from API`);
    return res.json(transformedData);
  } catch (error) {
    console.error('Error in MaxiPali search:', error.message, error.response?.status, error.response?.data);
    return res.status(500).json({
      error: 'Search failed',
      details: error.message
    });
  }
});

app.get('/api/proxy/maxipali/barcode/:ean', async (req, res) => {
  try {
    const { ean } = req.params;
    console.log('Received EAN lookup request:', ean);

    if (!ean || ean.trim() === '') {
      return res.status(400).json({
        error: 'Invalid EAN',
        details: 'EAN parameter cannot be empty'
      });
    }

    // Try direct product search first - using a more reliable endpoint
    try {
      console.log(`Attempting direct search with EAN: ${ean}`);
      const directSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search`, {
        params: {
          'fq': `alternateIds_RefId:${ean}`,
          '_from': 0,
          '_to': 1
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Origin': 'https://www.maxipali.co.cr',
          'Referer': 'https://www.maxipali.co.cr/',
        },
        timeout: 10000 // 10 second timeout
      });

      if (directSearchResponse.data && directSearchResponse.data.length > 0) {
        const product = directSearchResponse.data[0];
        
        // Extract price and ensure it's a number
        const rawPrice = product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price;
        const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice || 0);
        
        console.log('Direct search price data:', {
          rawPrice,
          rawPriceType: typeof rawPrice,
          convertedPrice: price,
          convertedPriceType: typeof price
        });
        
        const responseData = {
          id: product.productId,
          name: product.productName,
          brand: product.brand || 'Unknown',
          price: price,
          imageUrl: product.items?.[0]?.images?.[0]?.imageUrl || '',
          store: 'MaxiPali',
          ean: ean,
          category: product.categories && product.categories[0] ? product.categories[0].split('/').pop() : 'Grocery'
        };
        
        console.log('Sending direct search product data:', responseData);
        return res.json(responseData);
      } else {
        console.log('No results from direct search, proceeding to alternative search');
      }
    } catch (directSearchError) {
      console.error('Direct search failed:', {
        message: directSearchError.message,
        status: directSearchError.response?.status,
        data: directSearchError.response?.data
      });
      // Continue to alternative search without throwing
    }

    // Try second search method - using free text search
    try {
      console.log(`Attempting free text search with EAN: ${ean}`);
      const freeTextResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search`, {
        params: {
          'ft': ean
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Origin': 'https://www.maxipali.co.cr',
          'Referer': 'https://www.maxipali.co.cr/',
        },
        timeout: 10000 // 10 second timeout
      });

      if (freeTextResponse.data && freeTextResponse.data.length > 0) {
        const product = freeTextResponse.data[0];
        
        // Extract price and ensure it's a number
        const rawPrice = product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price;
        const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice || 0);
        
        console.log('Free text search price data:', {
          rawPrice,
          rawPriceType: typeof rawPrice,
          convertedPrice: price,
          convertedPriceType: typeof price
        });
        
        const responseData = {
          id: product.productId,
          name: product.productName,
          brand: product.brand || 'Unknown',
          price: price,
          imageUrl: product.items?.[0]?.images?.[0]?.imageUrl || '',
          store: 'MaxiPali',
          ean: ean,
          category: product.categories && product.categories[0] ? product.categories[0].split('/').pop() : 'Grocery'
        };
        
        console.log('Sending free text search product data:', responseData);
        return res.json(responseData);
      } else {
        console.log('No results from free text search, proceeding to alternative search');
      }
    } catch (freeTextError) {
      console.error('Free text search failed:', {
        message: freeTextError.message,
        status: freeTextError.response?.status,
        data: freeTextError.response?.data
      });
      // Continue to final search method without throwing
    }

    // Try intelligent search API as final method
    try {
      console.log(`Attempting intelligent search with EAN: ${ean}`);
      const altSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/io/_v/api/intelligent-search/product_search/productSearch`, {
        params: {
          term: ean,
          count: 20, // Get more results to find better matches
          page: 1
        },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Origin': 'https://www.maxipali.co.cr',
          'Referer': 'https://www.maxipali.co.cr/',
        },
        timeout: 10000 // 10 second timeout
      });

      if (!altSearchResponse.data?.products?.length) {
        return res.status(404).json({
          error: 'Product not found',
          details: `No product found with EAN: ${ean}`
        });
      }

      // Look for exact matches of EAN in product properties
      console.log(`Found ${altSearchResponse.data.products.length} possible matches`);
      
      // Try to find a better match by looking at product specifications if available
      let bestMatch = null;
      let matchScore = 0;
      
      for (const product of altSearchResponse.data.products) {
        console.log(`Checking product: ${product.productName}`);
        
        let currentScore = 0;
        
        // Check if EAN appears in product name
        if (product.productName.includes(ean)) {
          currentScore += 5;
          console.log(`  EAN found in name: +5 points`);
        }
        
        // Check if we have specifications that contain the EAN
        if (product.specificationGroups) {
          for (const group of product.specificationGroups) {
            for (const spec of group.specifications || []) {
              if (spec.value === ean) {
                currentScore += 50;
                console.log(`  Exact EAN match in specifications: +50 points`);
              }
            }
          }
        }
        
        if (currentScore > matchScore) {
          matchScore = currentScore;
          bestMatch = product;
          console.log(`  New best match: ${product.productName} with score ${currentScore}`);
        }
      }
      
      // If we don't have a good match, use the first product but with a note
      const product = bestMatch || altSearchResponse.data.products[0];
      
      // Extract price and ensure it's a number
      const rawPrice = product.price;
      const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice || 0);
      
      console.log('Intelligent search price data:', {
        rawPrice,
        rawPriceType: typeof rawPrice,
        convertedPrice: price,
        convertedPriceType: typeof price
      });
      
      const transformedData = {
        id: product.productId,
        name: product.productName || 'Unknown Product',
        brand: product.brand || 'Unknown',
        price: price,
        imageUrl: product.items?.[0]?.images?.[0]?.imageUrl || '',
        store: 'MaxiPali',
        ean: ean,
        category: 'Grocery',
        matchConfidence: matchScore > 0 ? 'high' : 'low'
      };

      console.log('Sending intelligent search transformed data:', transformedData);
      return res.json(transformedData);
    } catch (altSearchError) {
      console.error('Intelligent search failed:', {
        message: altSearchError.message,
        status: altSearchError.response?.status,
        data: altSearchError.response?.data
      });
      
      // Return a 404 if all search methods failed
      return res.status(404).json({
        error: 'Product not found',
        details: `Failed to find product with EAN: ${ean}`,
        message: 'Product lookup failed with all available methods'
      });
    }
  } catch (error) {
    console.error('EAN lookup error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    // Return appropriate status code based on the error
    const statusCode = error.response?.status || 500;
    
    res.status(statusCode).json({ 
      error: 'Failed to lookup product',
      details: error.message,
      status: statusCode
    });
  }
});

// API endpoint without mock data
app.get('/api/maxipali/search', async (req, res) => {
  const { query, page = 1, pageSize = 50 } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  console.log(`Searching MaxiPali for "${query}"`);
  
  try {
    // Get data from the API
    const searchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search/${encodeURIComponent(query)}`, {
      params: {
        _from: (page - 1) * pageSize,
        _to: (page * pageSize) - 1
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.maxipali.co.cr',
        'Referer': 'https://www.maxipali.co.cr/',
      },
      timeout: 10000 // 10 second timeout
    });

    // Transform response to match our format
    const transformedData = {
      products: (searchResponse.data || []).map(p => ({
        id: p.productId,
        name: p.productName,
        brand: p.brand,
        price: p.items[0]?.sellers[0]?.commertialOffer?.Price || 0,
        imageUrl: p.items[0]?.images[0]?.imageUrl || '',
        store: 'MaxiPali',
        category: p.categories && p.categories[0] ? p.categories[0].split('/').pop() : 'Grocery',
        sku: p.items[0]?.itemId || '',
        barcode: p.items[0]?.ean || '',
        inStock: true
      })),
      total: searchResponse.data?.length || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      hasMore: false
    };

    console.log(`Found ${transformedData.products.length} products from API`);
    return res.json(transformedData);
  } catch (error) {
    console.error('Error with API:', error.message);
    
    // Return error instead of mock data
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch products from API',
      details: error.message,
      status: error.response?.status || 500,
      serverMessage: error.response?.data?.message || 'Unknown error'
    });
  }
});

app.post('/api/proxy/masxmenos/search', async (req, res) => {
  try {
    const { query, variables, page = 1, pageSize = 49 } = req.body;
    console.log('Received MasxMenos search request:', { query, page, pageSize });
    
    // Build the GraphQL URL with variables
    const url = 'https://www.masxmenos.cr/_v/segment/graphql/v1';
    const params = new URLSearchParams({
      workspace: 'master',
      maxAge: 'short',
      appsEtag: 'remove',
      domain: 'store',
      locale: 'es-CR',
      __bindingId: 'f682d719-102f-4a96-b340-dfdf524c216c',
      operationName: 'productSearchV3',
      variables: '{}',
    });
    
    // Add the GraphQL extensions with the search query
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    
    const searchQuery = query || '';
    
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '9177ba6f883473505dc99fcf2b679a6e270af6320a157f0798b92efeab98d5d3',
        sender: 'vtex.store-resources@0.x',
        provider: 'vtex.search-graphql@0.x'
      },
      variables: btoa(JSON.stringify({
        hideUnavailableItems: false,
        skusFilter: 'ALL',
        simulationBehavior: 'default',
        installmentCriteria: 'MAX_WITHOUT_INTEREST',
        productOriginVtex: true,
        map: 'ft',
        query: searchQuery,
        orderBy: 'OrderByScoreDESC',
        from: from,
        to: to,
        selectedFacets: [],
        operator: 'or',
        fuzzy: '0.7',
        searchState: null,
        facetsBehavior: 'Static',
        categoryTreeBehavior: 'default',
        withFacets: true,
        fullText: searchQuery,
        priceRange: null,
        advertisementOptions: {
          showSponsored: false,
          sponsoredCount: 0,
          advertisementPlacement: 'top_search',
          repeatSponsoredProducts: false
        }
      }))
    };
    
    params.append('extensions', JSON.stringify(extensions));
    
    const fullUrl = `${url}?${params.toString()}`;
    
    // Call the MasxMenos API
    const apiResponse = await axios.get(fullUrl, {
        headers: {
          'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Origin': 'https://www.masxmenos.cr',
          'Referer': 'https://www.masxmenos.cr/',
      },
      timeout: 15000 // Increased timeout to 15 seconds for larger result sets
    });

    // Add translation information to the response
    const products = apiResponse.data?.data?.productSearch?.products || [];
    const translatedProducts = products.map(product => {
      const item = product.items && product.items.length > 0 ? product.items[0] : null;
      const productName = product.productName || '';
      const brand = product.brand || '';
      const description = product.description || '';
      
      // Add translation information
      product.translationInfo = {
        originalName: productName,
        originalBrand: brand,
        originalDescription: description,
        isTranslated: false
      };
      
      return product;
    });
    
    apiResponse.data.data.productSearch.products = translatedProducts;
    
    // Return the modified API response data
    return res.json(apiResponse.data);
  } catch (error) {
    console.error('MasxMenos search API error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch MasxMenos products',
      details: error.message,
      status: error.response?.status || 500,
      serverMessage: error.response?.data?.message || 'Unknown error'
    });
  }
});

// Create a proxy endpoint for getting MasxMenos product by barcode
app.get('/api/proxy/masxmenos/barcode/:ean', async (req, res) => {
  try {
    const { ean } = req.params;
    console.log('Received MasxMenos EAN lookup request:', ean);

    if (!ean || ean.trim() === '') {
      return res.status(400).json({
        error: 'Invalid EAN',
        details: 'EAN parameter cannot be empty'
      });
    }

    // Build the GraphQL URL with variables to search by EAN
    const url = 'https://www.masxmenos.cr/_v/segment/graphql/v1';
    const params = new URLSearchParams({
      workspace: 'master',
      maxAge: 'short',
      appsEtag: 'remove',
      domain: 'store',
      locale: 'es-CR',
      __bindingId: 'f682d719-102f-4a96-b340-dfdf524c216c',
      operationName: 'productSearchV3',
      variables: '{}',
    });
    
    // Add the GraphQL extensions with the EAN search
    const extensions = {
      persistedQuery: {
        version: 1,
        sha256Hash: '9177ba6f883473505dc99fcf2b679a6e270af6320a157f0798b92efeab98d5d3',
        sender: 'vtex.store-resources@0.x',
        provider: 'vtex.search-graphql@0.x'
      },
      variables: btoa(JSON.stringify({
        hideUnavailableItems: false,
        skusFilter: 'ALL',
        simulationBehavior: 'default',
        installmentCriteria: 'MAX_WITHOUT_INTEREST',
        productOriginVtex: true,
        map: 'ft',
        query: ean,
        orderBy: 'OrderByScoreDESC',
        from: 0,
        to: 10,
        selectedFacets: [],
        operator: 'and',
        fuzzy: '0',
        searchState: null,
        facetsBehavior: 'Static',
        categoryTreeBehavior: 'default',
        withFacets: false
      }))
    };
    
    params.append('extensions', JSON.stringify(extensions));
    
    const fullUrl = `${url}?${params.toString()}`;
    
    // Call the MasxMenos API
    const apiResponse = await axios.get(fullUrl, {
        headers: {
          'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.masxmenos.cr',
        'Referer': 'https://www.masxmenos.cr/',
      },
      timeout: 10000 // 10 second timeout
    });

    // Check if we got any products
    if (apiResponse.data?.data?.productSearch?.products?.length > 0) {
      const product = apiResponse.data.data.productSearch.products[0];
      const item = product.items && product.items.length > 0 ? product.items[0] : null;
      
      // If no item found, return error
      if (!item) {
        return res.status(404).json({
          error: 'Product not found',
          details: `No product found with EAN: ${ean}`
        });
      }
      
      // Find exact match by EAN
      const exactMatch = product.items.find(item => item.ean === ean);
      const matchedItem = exactMatch || item;
      
      // Get price from the first seller's offer
      const seller = matchedItem?.sellers && matchedItem.sellers.length > 0 ? matchedItem.sellers[0] : null;
      const price = seller?.commertialOffer?.Price || 0;
      
      // Get the first image URL
      const imageUrl = matchedItem?.images && matchedItem.images.length > 0 
        ? matchedItem.images[0].imageUrl 
        : '';
      
      // Format the response
      const responseData = {
        id: product.productId,
        name: product.productName,
        brand: product.brand || 'Unknown',
        price: price,
        imageUrl: imageUrl,
        store: 'MasxMenos',
        ean: ean,
        category: product.categories && product.categories.length > 0 
          ? product.categories[0].split('/').filter(Boolean).pop() || 'Grocery'
          : 'Grocery'
      };
      
      console.log('Sending MasxMenos product data:', responseData);
      return res.json(responseData);
    } else {
      return res.status(404).json({
        error: 'Product not found',
        details: `No product found with EAN: ${ean}`
      });
    }
  } catch (error) {
    console.error('MasxMenos EAN search failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return res.status(error.response?.status || 500).json({
      error: 'Failed to search for MasxMenos product',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express app for Vercel
export default app;