import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Keep original endpoint for backwards compatibility
app.post('/api/proxy/maxipali/search', async (req, res) => {
  try {
    const { query, page = 1, pageSize = 49 } = req.body;
    console.log('Received search request (proxy endpoint):', { query, page, pageSize });
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
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
    const filteredProducts = transformedData.products.filter(p => p.price > 0);
    console.log(`Filtered from ${transformedData.products.length} to ${filteredProducts.length} products with price > 0`);
    transformedData.products = filteredProducts;
    transformedData.total = filteredProducts.length;

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
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // Use VTEX catalog API (simpler and more reliable than GraphQL)
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const searchQuery = query || '';
    
    console.log('Calling MasxMenos catalog API with query:', searchQuery);
    
    // Call the MasxMenos catalog API
    const apiResponse = await axios.get('https://www.masxmenos.cr/api/catalog_system/pub/products/search', {
      params: {
        ft: searchQuery,
        _from: from,
        _to: to
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.masxmenos.cr',
        'Referer': 'https://www.masxmenos.cr/',
      },
      timeout: 15000
    });

    // Log the raw response for debugging
    console.log('MasxMenos API response status:', apiResponse.status);
    console.log(`Found ${apiResponse.data?.length || 0} MasxMenos products`);
    
    // Transform catalog API response to match GraphQL format expected by frontend
    const products = (apiResponse.data || []).map(product => ({
      cacheId: product.productId,
      productId: product.productId,
      productName: product.productName,
      brand: product.brand || '',
      brandId: product.brandId,
      linkText: product.linkText,
      productReference: product.productReference,
      categoryId: product.categoryId,
      link: product.link,
      description: product.description || '',
      categories: product.categories || [],
      items: product.items || [],
      translationInfo: {
        originalName: product.productName || '',
        originalBrand: product.brand || '',
        originalDescription: product.description || '',
        isTranslated: false
      }
    }));
    
    // Return in GraphQL-like format for compatibility with frontend
    return res.json({
      data: {
        productSearch: {
          products: products,
          recordsFiltered: products.length
        }
      }
    });
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

    // Use VTEX catalog API to search by EAN
    console.log('Searching MasxMenos by EAN:', ean);
    
    const apiResponse = await axios.get('https://www.masxmenos.cr/api/catalog_system/pub/products/search', {
      params: {
        ft: ean,
        _from: 0,
        _to: 10
      },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.masxmenos.cr',
        'Referer': 'https://www.masxmenos.cr/',
      },
      timeout: 10000
    });

    // Check if we got any products
    if (apiResponse.data && apiResponse.data.length > 0) {
      const product = apiResponse.data[0];
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

// Walmart API proxy endpoint
app.post('/api/proxy/walmart/search', async (req, res) => {
  try {
    const { query, page = 1, pageSize = 49 } = req.body;
    console.log('Received Walmart search request:', { query, page, pageSize });
    
    // Initialize searchData variable at the top level
    let searchData = [];
    
    // Try path-based search first
    try {
      console.log(`Attempting path-based search for: ${query}`);
      const pathSearchResponse = await axios.get(`https://www.walmart.co.cr/api/catalog_system/pub/products/search/${encodeURIComponent(query)}`, {
        params: {
          '_from': (page - 1) * pageSize,
          '_to': (page * pageSize) - 1
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Origin': 'https://www.walmart.co.cr',
          'Referer': 'https://www.walmart.co.cr/'
        },
        timeout: 15000
      });
      
      console.log(`Path-based Walmart search response status: ${pathSearchResponse.status}`);
      
      if (pathSearchResponse.data && pathSearchResponse.data.length > 0) {
        console.log(`Path-based search found ${pathSearchResponse.data.length} Walmart products`);
        searchData = pathSearchResponse.data;
      } else {
        console.log('Path-based Walmart search returned no results, trying ft search');
      }
    } catch (pathError) {
      console.error('Walmart path-based search error:', pathError.message);
      console.error('Response status:', pathError.response?.status);
      console.error('Response data:', pathError.response?.data);
      // Continue to next search method
    }
    
    // If path search returned no results, try ft parameter search
    if (searchData.length === 0) {
      try {
        console.log(`Attempting Walmart ft parameter search for: ${query}`);
        const ftSearchResponse = await axios.get('https://www.walmart.co.cr/api/catalog_system/pub/products/search', {
          params: {
            'ft': query,
            '_from': (page - 1) * pageSize,
            '_to': (page * pageSize) - 1
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Origin': 'https://www.walmart.co.cr',
            'Referer': 'https://www.walmart.co.cr/'
          },
          timeout: 15000
        });
        
        console.log(`ft-based Walmart search response status: ${ftSearchResponse.status}`);
        
        if (ftSearchResponse.data && ftSearchResponse.data.length > 0) {
          console.log(`ft parameter search found ${ftSearchResponse.data.length} Walmart products`);
          searchData = ftSearchResponse.data;
        } else {
          console.log('ft parameter Walmart search returned no results');
        }
      } catch (ftError) {
        console.error('Walmart ft parameter search error:', ftError.message);
        console.error('Response status:', ftError.response?.status);
        console.error('Response data:', ftError.response?.data);
      }
    }
    
    // If both path and ft search failed, try an alternative approach with intelligent search
    if (searchData.length === 0) {
      try {
        console.log(`Attempting intelligent search for Walmart with query: ${query}`);
        const intelligentSearchResponse = await axios.get(`https://www.walmart.co.cr/api/io/_v/api/intelligent-search/product_search/productSearch`, {
          params: {
            term: query,
            count: pageSize,
            page: page
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Origin': 'https://www.walmart.co.cr',
            'Referer': 'https://www.walmart.co.cr/'
          },
          timeout: 15000
        });
        
        if (intelligentSearchResponse.data?.products && intelligentSearchResponse.data.products.length > 0) {
          console.log(`Intelligent search found ${intelligentSearchResponse.data.products.length} Walmart products`);
          
          // Convert intelligent search format to catalog search format
          const validProducts = intelligentSearchResponse.data.products.filter(p => {
            // Only include products with valid prices
            const hasPrice = p.price && parseFloat(p.price) > 0;
            return hasPrice;
          });
          
          console.log(`Filtered to ${validProducts.length} Walmart products with valid prices`);
          
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
          console.log('Intelligent search for Walmart returned no results');
        }
      } catch (intelligentError) {
        console.error('Walmart intelligent search error:', intelligentError.message);
        console.error('Response status:', intelligentError.response?.status);
        console.error('Response data:', intelligentError.response?.data);
      }
    }
    
    // Transform response to match our format
    const transformedData = {
      products: (searchData || []).map(p => {
        const price = p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 
                     p.items?.[0]?.sellers?.[0]?.commertialOffer?.ListPrice || 0;
        
        return {
          id: p.productId || `walmart-api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: p.productName,
          brand: p.brand || 'Walmart',
          price: price,
          imageUrl: p.items?.[0]?.images?.[0]?.imageUrl || '',
          store: 'Walmart',
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
    const filteredProducts = transformedData.products.filter(p => p.price > 0);
    console.log(`Filtered from ${transformedData.products.length} to ${filteredProducts.length} Walmart products with price > 0`);
    transformedData.products = filteredProducts;
    transformedData.total = filteredProducts.length;

    console.log(`Found ${transformedData.products.length} Walmart products from API`);
    if (transformedData.products.length > 0) {
      console.log('First Walmart product:', transformedData.products[0]);
    } else {
      console.log('WARNING: No Walmart products were returned after all search attempts');
    }
    
    return res.json(transformedData);
  } catch (error) {
    console.error('Error in Walmart search:', error.message);
    console.error('Full error details:', {
      status: error.response?.status,
      data: error.response?.data?.message || error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    return res.status(500).json({
      error: 'Search failed',
      details: error.message,
      products: [],
      total: 0,
      page: parseInt(req.body.page || 1),
      pageSize: parseInt(req.body.pageSize || 49),
      hasMore: false
    });
  }
});

// Walmart barcode lookup endpoint
app.get('/api/proxy/walmart/barcode/:ean', async (req, res) => {
  try {
    const { ean } = req.params;
    console.log(`Received Walmart barcode lookup request for EAN: ${ean}`);
    
    // Walmart API URL for barcode search
    const url = 'https://www.walmart.co.cr/api/catalog_system/pub/products/search';
    const fullUrl = `${url}?fq=ean:${encodeURIComponent(ean)}`;
    console.log(`Sending request to Walmart API for barcode: ${fullUrl}`);
    
    const response = await axios.get(fullUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Origin': 'https://www.walmart.co.cr',
        'Referer': 'https://www.walmart.co.cr/'
      },
      timeout: 15000
    });
    
    console.log(`Walmart barcode API returned status: ${response.status}`);
    console.log(`Walmart barcode API returned ${response.data ? response.data.length : 0} results`);
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      const product = response.data[0];
      console.log(`Found product by barcode: ${product.productName}`);
      
      const price = product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 
                   product.items?.[0]?.sellers?.[0]?.commertialOffer?.ListPrice || 0;
      
      const transformedProduct = {
        id: product.productId,
        name: product.productName,
        brand: product.brand || 'Walmart',
        price: price,
        imageUrl: product.items?.[0]?.images?.[0]?.imageUrl || '',
        store: 'Walmart',
        category: product.categories && product.categories[0] ? product.categories[0].split('/').pop() : 'Grocery',
        sku: product.items?.[0]?.itemId || '',
        barcode: product.items?.[0]?.ean || ean,
        inStock: true
      };
      
      console.log('Transformed product from barcode:', transformedProduct);
      return res.json({ success: true, product: transformedProduct });
    } else {
      console.log(`No products found for barcode ${ean} in Walmart`);
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
  } catch (error) {
    console.error(`Error in Walmart barcode lookup for ${req.params.ean}:`, error.message);
    console.error('Full error details:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });
    return res.status(500).json({
      success: false,
      message: 'Barcode lookup failed',
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

// Add Stripe API integration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe payment endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', description } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }
    
    console.log(`Creating payment intent for amount: ${amount} ${currency}`);
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: description || 'Grocery purchase',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`Payment intent created with id: ${paymentIntent.id}`);
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});