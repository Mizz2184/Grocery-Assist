import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
dotenv.config();

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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
    
    // Use full query for better relevance
    const searchQuery = query.trim();
    
    // Extract keywords for relevance filtering
    const keywords = searchQuery.toLowerCase().split(' ').filter(word => word.length > 2);

    let searchData = [];
    
    // Try path-based search first
    try {

      const pathSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search/${encodeURIComponent(searchQuery)}`, {
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

        searchData = pathSearchResponse.data;
      } else {

      }
    } catch (pathError) {
      console.error('Path-based search error:', pathError.message);
      // Continue to next search method
    }
    
    // If path search returned no results, try ft parameter search
    if (searchData.length === 0) {
      try {

        const ftSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/catalog_system/pub/products/search`, {
          params: {
            'ft': searchQuery,
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

          searchData = ftSearchResponse.data;
        } else {

        }
      } catch (ftError) {
        console.error('ft parameter search error:', ftError.message);
        // Continue to next search method
      }
    }
    
    // Final attempt - use intelligent search API
    if (searchData.length === 0) {
      try {

        const intelligentSearchResponse = await axios.get(`https://www.maxipali.co.cr/api/io/_v/api/intelligent-search/product_search/productSearch`, {
          params: {
            term: searchQuery,
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

          // Log price data for troubleshooting
          const priceSamples = intelligentSearchResponse.data.products.slice(0, 3).map(p => ({
            name: p.productName,
            rawPrice: p.price,
            rawPriceType: typeof p.price,
            parsedPrice: parseFloat(p.price) || 0
          }));

          // Convert intelligent search format to catalog search format
          const validProducts = intelligentSearchResponse.data.products.filter(p => {
            // Only include products with valid prices
            const hasPrice = p.price && parseFloat(p.price) > 0;
            return hasPrice;
          });

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
        const listPrice = p.items?.[0]?.sellers?.[0]?.commertialOffer?.ListPrice || 0;
        
        // Detect if product is on sale (ListPrice > Price)
        const isOnSale = listPrice > 0 && price > 0 && listPrice > price;

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
          inStock: true,
          regularPrice: isOnSale ? listPrice : undefined,
          salePrice: isOnSale ? price : undefined,
          isOnSale: isOnSale
        };
      }),
      total: searchData?.length || 0,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      hasMore: (searchData?.length || 0) === pageSize
    };
    
    // Log sale products for debugging
    const saleProducts = transformedData.products.filter(p => p.isOnSale);
    if (saleProducts.length > 0) {
      console.log(`MaxiPali: Found ${saleProducts.length} products on sale`);
      console.log('Sample:', saleProducts.slice(0, 2).map(p => ({
        name: p.name,
        price: p.price,
        regularPrice: p.regularPrice
      })));
    }

    // Filter out products with zero price
    let filteredProducts = transformedData.products.filter(p => p.price > 0);
    
    // Apply relevance filtering - check if product name/brand/category contains search keywords
    if (keywords.length > 0) {
      filteredProducts = filteredProducts.filter(product => {
        const searchableText = `${product.name} ${product.brand || ''} ${product.category || ''}`.toLowerCase();
        // Product must contain at least one keyword to be relevant
        return keywords.some(keyword => searchableText.includes(keyword));
      });
    }

    transformedData.products = filteredProducts;
    transformedData.total = filteredProducts.length;

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

    if (!ean || ean.trim() === '') {
      return res.status(400).json({
        error: 'Invalid EAN',
        details: 'EAN parameter cannot be empty'
      });
    }

    // Try direct product search first - using a more reliable endpoint
    try {

      console.log(`🔍 MaxiPali: Searching for EAN ${ean} using alternateIds_RefId`);
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

      console.log(`📦 MaxiPali API returned ${directSearchResponse.data?.length || 0} results for ${ean}`);
      
      if (directSearchResponse.data && directSearchResponse.data.length > 0) {
        const product = directSearchResponse.data[0];
        const item = product.items?.[0];
        
        // CRITICAL: Validate that the returned product's EAN matches the requested EAN
        const itemEAN = item?.ean;
        console.log(`🔍 Validating EAN: requested=${ean}, returned=${itemEAN}`);
        
        if (!itemEAN || itemEAN !== ean) {
          console.log(`❌ EAN mismatch! Requested ${ean} but got ${itemEAN}. Skipping this result.`);
          // Don't return this product - it's not a match
        } else {
          // Extract price and ensure it's a number
          const rawPrice = item?.sellers?.[0]?.commertialOffer?.Price;
          const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice || 0);

          const responseData = {
            id: product.productId,
            name: product.productName,
            brand: product.brand || 'Unknown',
            price: price,
            imageUrl: item?.images?.[0]?.imageUrl || '',
            store: 'MaxiPali',
            barcode: itemEAN,
            ean: itemEAN,
            category: product.categories && product.categories[0] ? product.categories[0].split('/').pop() : 'Grocery'
          };

          console.log(`✅ MaxiPali direct search for ${ean}:`, {
            productId: product.productId,
            name: responseData.name,
            price: responseData.price,
            validatedEAN: itemEAN
          });

          return res.json(responseData);
        }
      } else {

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
      console.log(`🔍 MaxiPali: Trying free text search for ${ean}`);
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

      console.log(`📦 MaxiPali free text search returned ${freeTextResponse.data?.length || 0} results for ${ean}`);
      
      if (freeTextResponse.data && freeTextResponse.data.length > 0) {
        const product = freeTextResponse.data[0];
        const item = product.items?.[0];
        
        // CRITICAL: Validate that the returned product's EAN matches the requested EAN
        const itemEAN = item?.ean;
        console.log(`🔍 Free text - Validating EAN: requested=${ean}, returned=${itemEAN}`);
        
        if (!itemEAN || itemEAN !== ean) {
          console.log(`❌ Free text EAN mismatch! Requested ${ean} but got ${itemEAN}. Skipping.`);
          // Don't return this product - it's not a match
        } else {
          // Extract price and ensure it's a number
          const rawPrice = item?.sellers?.[0]?.commertialOffer?.Price;
          const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice || 0);

          const responseData = {
            id: product.productId,
            name: product.productName,
            brand: product.brand || 'Unknown',
            price: price,
            imageUrl: item?.images?.[0]?.imageUrl || '',
            store: 'MaxiPali',
            barcode: itemEAN,
            ean: itemEAN,
            category: product.categories && product.categories[0] ? product.categories[0].split('/').pop() : 'Grocery'
          };

          return res.json(responseData);
        }
      } else {

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

      // Try to find a better match by looking at product specifications if available
      let bestMatch = null;
      let matchScore = 0;
      
      for (const product of altSearchResponse.data.products) {

        let currentScore = 0;
        
        // Check if EAN appears in product name
        if (product.productName.includes(ean)) {
          currentScore += 5;

        }
        
        // Check if we have specifications that contain the EAN
        if (product.specificationGroups) {
          for (const group of product.specificationGroups) {
            for (const spec of group.specifications || []) {
              if (spec.value === ean) {
                currentScore += 50;

              }
            }
          }
        }
        
        if (currentScore > matchScore) {
          matchScore = currentScore;
          bestMatch = product;

        }
      }
      
      // If we don't have a good match, use the first product but with a note
      const product = bestMatch || altSearchResponse.data.products[0];
      const item = product.items?.[0];
      
      // CRITICAL: Validate that the returned product's EAN matches the requested EAN
      const itemEAN = item?.ean;
      console.log(`🔍 Intelligent search - Validating EAN: requested=${ean}, returned=${itemEAN}, matchScore=${matchScore}`);
      
      if (!itemEAN || itemEAN !== ean) {
        console.log(`❌ Intelligent search EAN mismatch! Requested ${ean} but got ${itemEAN}. Returning 404.`);
        return res.status(404).json({
          error: 'Product not found',
          details: `No product found with matching EAN: ${ean}`
        });
      }
      
      // Extract price and ensure it's a number
      const rawPrice = product.price;
      const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : (rawPrice || 0);
      
      const transformedData = {
        id: product.productId,
        name: product.productName || 'Unknown Product',
        brand: product.brand || 'Unknown',
        price: price,
        imageUrl: item?.images?.[0]?.imageUrl || '',
        store: 'MaxiPali',
        barcode: itemEAN,
        ean: itemEAN,
        category: 'Grocery',
        matchConfidence: matchScore > 0 ? 'high' : 'low'
      };

      console.log(`✅ MaxiPali barcode ${ean} found:`, {
        name: transformedData.name,
        price: transformedData.price,
        validatedEAN: itemEAN
      });

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
    console.log('Received MasxMenos search request:', { 
      query, 
      queryType: typeof query,
      queryLength: query?.length,
      queryTrimmed: query?.trim(),
      page, 
      pageSize,
      fullBody: req.body 
    });
    
    if (!query || typeof query !== 'string' || query.trim() === '') {
      console.error('MasxMenos search validation failed:', {
        hasQuery: !!query,
        queryType: typeof query,
        queryValue: query,
        queryTrimmed: query?.trim()
      });
      return res.status(400).json({ 
        error: 'Query parameter is required',
        received: { query, type: typeof query }
      });
    }
    
    // Extract keywords for relevance filtering
    const keywords = query.toLowerCase().trim().split(' ').filter(word => word.length > 2);
    
    // Use VTEX catalog API (simpler and more reliable than GraphQL)
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const searchQuery = query || '';

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
    
    // Apply relevance filtering - check if product name/brand contains search keywords
    let filteredProducts = products;
    if (keywords.length > 0) {
      filteredProducts = products.filter(product => {
        const searchableText = `${product.productName || ''} ${product.brand || ''}`.toLowerCase();
        // Product must contain at least one keyword to be relevant
        return keywords.some(keyword => searchableText.includes(keyword));
      });
    }
    
    // Log sale products for debugging
    const saleProducts = filteredProducts.filter(p => p.isOnSale);
    if (saleProducts.length > 0) {
      console.log(`MasxMenos: Found ${saleProducts.length} products on sale`);
      console.log('Sample:', saleProducts.slice(0, 2).map(p => ({
        name: p.productName,
        price: p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price,
        regularPrice: p.regularPrice
      })));
    }
    
    // Return in GraphQL-like format for compatibility with frontend
    return res.json({
      data: {
        productSearch: {
          products: filteredProducts,
          recordsFiltered: filteredProducts.length
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

    if (!ean || ean.trim() === '') {
      return res.status(400).json({
        error: 'Invalid EAN',
        details: 'EAN parameter cannot be empty'
      });
    }

    // Use VTEX catalog API to search by EAN

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
        barcode: matchedItem?.ean || ean,
        ean: matchedItem?.ean || ean,
        category: product.categories && product.categories.length > 0 
          ? product.categories[0].split('/').filter(Boolean).pop() || 'Grocery'
          : 'Grocery'
      };

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

// Automercado API proxy endpoint (Algolia)
app.post('/api/proxy/automercado/search', async (req, res) => {
  try {
    const { query, page = 1, pageSize = 30 } = req.body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    // Algolia API configuration for Automercado
    const algoliaUrl = 'https://fu5xfx7knl-dsn.algolia.net/1/indexes/*/queries';
    const algoliaAppId = 'FU5XFX7KNL';
    const algoliaApiKey = '113941a18a90ae0f17d602acd16f91b2';
    
    // Build the Algolia request - NO FILTERS for maximum real-time results
    // Algolia's search algorithm is smart enough to find relevant products
    const requestBody = {
      requests: [{
        indexName: 'Product_CatalogueV2',
        page: page - 1, // Algolia uses 0-based pages
        hitsPerPage: pageSize,
        query: query,
        getRankingInfo: true
        // NO facetFilters - let Algolia return all matching products
        // This ensures we get real-time data for ANY product search
      }]
    };

    // Call the Algolia API
    const apiResponse = await axios.post(algoliaUrl, requestBody, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': algoliaAppId,
        'X-Algolia-API-Key': algoliaApiKey,
        'X-Algolia-Agent': 'Algolia for JavaScript (4.24.0); Browser (lite)'
      },
      timeout: 15000
    });

    // Extract hits from Algolia response
    const hits = apiResponse.data?.results?.[0]?.hits || [];
    
    // Return the hits
    return res.json({
      hits: hits,
      total: apiResponse.data?.results?.[0]?.nbHits || 0,
      page: page,
      pageSize: pageSize
    });
  } catch (error) {
    console.error('Automercado search API error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch Automercado products',
      details: error.message,
      status: error.response?.status || 500,
      serverMessage: error.response?.data?.message || 'Unknown error'
    });
  }
});

// Automercado bulk scrape endpoint - retrieves all products
app.get('/api/proxy/automercado/scrape-all', async (req, res) => {
  try {
    const { page = 0, hitsPerPage = 1000 } = req.query;

    // Algolia API configuration for Automercado
    const algoliaUrl = 'https://fu5xfx7knl-dsn.algolia.net/1/indexes/*/queries';
    const algoliaAppId = 'FU5XFX7KNL';
    const algoliaApiKey = '113941a18a90ae0f17d602acd16f91b2';
    
    // Build the Algolia request for bulk retrieval
    const requestBody = {
      requests: [{
        indexName: 'Product_CatalogueV2',
        page: parseInt(page),
        hitsPerPage: parseInt(hitsPerPage),
        getRankingInfo: true,
        facets: [
          'categoryPageId',
          'storeDetail.*.hasInvontory',
          'storeDetail.*.basePrice',
          'storeDetail.*.amount'
        ],
        facetFilters: [
          [
            'categoryPageId:abarrotes',
            'categoryPageId:bebes-y-ninos',
            'categoryPageId:bebidas-y-licores',
            'categoryPageId:carnes-y-pescado',
            'categoryPageId:coleccionables',
            'categoryPageId:comidas-preparadas',
            'categoryPageId:congelados-y-refrigerados',
            'categoryPageId:cuidado-personal-y-belleza',
            'categoryPageId:frutas-y-verduras',
            'categoryPageId:lacteos-y-embutidos',
            'categoryPageId:limpieza-y-articulos-desechables',
            'categoryPageId:mascotas',
            'categoryPageId:panaderia-reposteria-y-tortillas',
            'categoryPageId:snack-y-golosina',
            'categoryPageId:tienda-y-hogar'
          ],
          ['storeDetail.06.hasInvontory:1']
        ],
        attributesToRetrieve: [
          'objectID',
          'name',
          'brand',
          'description',
          'slug',
          'unit',
          'categories',
          'categoryPageId',
          'storeDetail',
          'image',
          'images',
          'ecomDescription',
          'productNumber',
          'imageUrl',
          'supplier'
        ]
      }]
    };

    // Call the Algolia API
    const apiResponse = await axios.post(algoliaUrl, requestBody, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': algoliaAppId,
        'X-Algolia-API-Key': algoliaApiKey,
        'X-Algolia-Agent': 'Algolia for JavaScript (4.24.0); Browser (lite)'
      },
      timeout: 30000 // Longer timeout for bulk requests
    });

    const result = apiResponse.data?.results?.[0] || {};
    const hits = result.hits || [];
    const nbHits = result.nbHits || 0;
    const nbPages = result.nbPages || 0;

    // Return comprehensive data including pagination info
    return res.json({
      hits: hits,
      pagination: {
        page: parseInt(page),
        hitsPerPage: parseInt(hitsPerPage),
        totalHits: nbHits,
        totalPages: nbPages,
        hasMore: parseInt(page) < nbPages - 1
      },
      facets: result.facets || {},
      processingTimeMS: result.processingTimeMS || 0
    });
  } catch (error) {
    console.error('Automercado bulk scrape API error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    res.status(error.response?.status || 500).json({ 
      error: 'Failed to scrape Automercado products',
      details: error.message,
      status: error.response?.status || 500,
      serverMessage: error.response?.data?.message || 'Unknown error'
    });
  }
});

// Walmart API proxy endpoint
app.post('/api/proxy/walmart/search', async (req, res) => {
  try {
    const { query, page = 1, pageSize = 49 } = req.body;
    
    // Extract keywords for relevance filtering
    const keywords = query.toLowerCase().trim().split(' ').filter(word => word.length > 2);

    // Initialize searchData variable at the top level
    let searchData = [];
    
    // Try path-based search first
    try {

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

      if (pathSearchResponse.data && pathSearchResponse.data.length > 0) {

        searchData = pathSearchResponse.data;
      } else {

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

        if (ftSearchResponse.data && ftSearchResponse.data.length > 0) {

          searchData = ftSearchResponse.data;
        } else {

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

          // Convert intelligent search format to catalog search format
          const validProducts = intelligentSearchResponse.data.products.filter(p => {
            // Only include products with valid prices
            const hasPrice = p.price && parseFloat(p.price) > 0;
            return hasPrice;
          });

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
    let filteredProducts = transformedData.products.filter(p => p.price > 0);
    
    // Apply relevance filtering - check if product name/brand/category contains search keywords
    if (keywords.length > 0) {
      filteredProducts = filteredProducts.filter(product => {
        const searchableText = `${product.name} ${product.brand || ''} ${product.category || ''}`.toLowerCase();
        // Product must contain at least one keyword to be relevant
        return keywords.some(keyword => searchableText.includes(keyword));
      });
    }

    transformedData.products = filteredProducts;
    transformedData.total = filteredProducts.length;
    
    // Log sale products for debugging
    const saleProducts = filteredProducts.filter(p => p.isOnSale);
    if (saleProducts.length > 0) {
      console.log(`Walmart: Found ${saleProducts.length} products on sale`);
      console.log('Sample:', saleProducts.slice(0, 2).map(p => ({
        name: p.name,
        price: p.price,
        regularPrice: p.regularPrice
      })));
    }

    if (transformedData.products.length > 0) {

    } else {

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

    // Walmart API URL for barcode search
    const url = 'https://www.walmart.co.cr/api/catalog_system/pub/products/search';
    const fullUrl = `${url}?fq=ean:${encodeURIComponent(ean)}`;

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

    if (Array.isArray(response.data) && response.data.length > 0) {
      const product = response.data[0];

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

      return res.json({ success: true, product: transformedProduct });
    } else {

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

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: description || 'Grocery purchase',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler for payment events
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('🎉 Checkout session completed:', session.id);
        console.log('Session details:', JSON.stringify(session, null, 2));
        
        // Get customer email and metadata
        const customerEmail = session.customer_email || session.customer_details?.email;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const paymentType = subscriptionId ? 'SUBSCRIPTION' : 'ONE_TIME';
        
        console.log('📧 Customer email:', customerEmail);
        console.log('💳 Customer ID:', customerId);
        console.log('📅 Subscription ID:', subscriptionId);
        console.log('💰 Payment type:', paymentType);
        
        if (!customerEmail) {
          console.error('❌ No customer email found in session');
          break;
        }

        // Check if user exists in Supabase auth
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
          console.error('Error listing users:', listError);
          break;
        }

        let userId;
        const existingUser = existingUsers.users.find(u => u.email === customerEmail);

        if (existingUser) {
          // User already exists
          userId = existingUser.id;
          console.log('✅ User already exists:', userId);
        } else {
          // Create new user in Supabase Auth
          console.log('👤 Creating new user for email:', customerEmail);
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: customerEmail,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
              full_name: session.customer_details?.name || '',
              created_via: 'stripe_payment'
            }
          });

          if (createError) {
            console.error('❌ Error creating user:', createError);
            break;
          }

          userId = newUser.user.id;
          console.log('✅ New user created:', userId);
        }

        // Get subscription details if it's a subscription
        let currentPeriodEnd = null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }

        // Create or update payment record
        console.log('💾 Creating/updating payment record for user:', userId);
        const paymentData = {
          user_id: userId,
          status: 'PAID',
          payment_type: paymentType,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_session_id: session.id,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Payment data:', JSON.stringify(paymentData, null, 2));
        
        const { error: upsertError } = await supabase
          .from('user_payments')
          .upsert(paymentData, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          console.error('❌ Error upserting payment record:', upsertError);
        } else {
          console.log('✅ Payment record created/updated for user:', userId);
          console.log('🎊 User can now log in and access the app!');
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);

        // Update subscription details in database
        const { error: updateError } = await supabase
          .from('user_payments')
          .update({
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);

        // Mark subscription as cancelled in database
        const { error: deleteError } = await supabase
          .from('user_payments')
          .update({
            status: 'CANCELLED',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (deleteError) {
          console.error('Error marking subscription as cancelled:', deleteError);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Cancel subscription endpoint
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user's subscription info from database
    const { data: payment, error: fetchError } = await supabase
      .from('user_payments')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .eq('payment_type', 'SUBSCRIPTION')
      .single();

    if (fetchError || !payment) {
      console.error('Error fetching subscription:', fetchError);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (!payment.stripe_subscription_id) {
      return res.status(400).json({ error: 'No active Stripe subscription found' });
    }

    // Cancel the subscription at period end in Stripe
    const subscription = await stripe.subscriptions.update(
      payment.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    );

    // Update database to reflect cancellation
    const { error: updateError } = await supabase
      .from('user_payments')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating database:', updateError);
      return res.status(500).json({ error: 'Failed to update subscription status' });
    }

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      subscription: {
        id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});