import axios from 'axios';
import { Product } from '@/lib/types/store';
import { searchMaxiPaliProducts } from '@/lib/services';

// Define interfaces for API responses
interface MaxiPaliProductData {
  id?: string;
  name: string;
  brand?: string;
  price: number | string;
  image?: string;
  imageUrl?: string;
  category?: string;
  ean?: string;
  sku?: string;
  matchConfidence?: string;
  [key: string]: any; // Allow other properties
}

interface MaxiPaliErrorResponse {
  error?: string;
  details?: string;
  message?: string;
  [key: string]: any;
}

// Add interface for Walmart API response
interface WalmartApiResponse {
  success: boolean;
  product?: {
    id: string;
    name: string;
    brand?: string;
    price: number;
    imageUrl?: string;
    store: string;
    category?: string;
    sku?: string;
    barcode?: string;
    inStock?: boolean;
  };
  message?: string;
}

// Helper function to safely parse price values
const safeParsePrice = (price: any): number => {
  if (typeof price === 'number') {
    return isNaN(price) ? 0 : price;
  }
  
  if (typeof price === 'string') {
    // Remove any non-numeric characters except for decimal point
    const cleanedPrice = price.replace(/[^\d.]/g, '');
    const parsedPrice = parseFloat(cleanedPrice);
    return isNaN(parsedPrice) ? 0 : parsedPrice;
  }
  
  return 0;
};

// Function to search for a product by EAN - use MaxiPali or MasxMenos API data
export const searchProductByBarcode = async (ean: string): Promise<{ 
  success: boolean; 
  product?: Product; 
  message?: string 
}> => {
  try {

    // Try MaxiPali first
    try {

      // STEP 1: Try MaxiPali direct catalog search API first
      try {

        const response = await axios.get(
          `https://www.maxipali.co.cr/api/catalog_system/pub/products/search`,
          {
            params: {
              'fq': `alternateIds_RefId:${ean}`,
              '_from': 0,
              '_to': 5
            },
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              'Origin': 'https://www.maxipali.co.cr',
              'Referer': 'https://www.maxipali.co.cr/',
            },
            timeout: 15000 // 15 second timeout
          }
        );
        
        // Check if we got any products
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {

          const product = response.data[0];

          // Extract price and ensure it's a number
          const rawPrice = product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price;
          const price = safeParsePrice(rawPrice);

          const finalProduct: Product = {
            id: product.productId || `maxipali-${ean}`,
            name: product.productName,
            brand: product.brand || 'MaxiPali',
            imageUrl: product.items?.[0]?.images?.[0]?.imageUrl || '',
            price: price,
            store: 'MaxiPali',
            category: product.categories && product.categories[0] ? product.categories[0].split('/').pop() : 'Grocery',
            barcode: ean,
            ean: ean,
            sku: product.items?.[0]?.itemId || ean
          };

          return { success: true, product: finalProduct };
        } else {

        }
      } catch (catalogError) {
        console.error('Catalog search API error:', catalogError);
      }
      
      // STEP 2: Try the general search term API
      try {

        const response = await axios.get(
          `https://www.maxipali.co.cr/api/catalog/products/search?term=${ean}`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              'Origin': 'https://www.maxipali.co.cr',
              'Referer': 'https://www.maxipali.co.cr/',
            },
            timeout: 15000 // 15 second timeout
          }
        );

        // Check if we got any products
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {

          // Find exact match by EAN if possible
          const productsData = response.data as MaxiPaliProductData[];
          const exactMatch = productsData.find(item => 
            item.ean === ean || item.id === ean || item.sku === ean
          );
          
          const productData = exactMatch || productsData[0];

          // Ensure price is a number
          const productPrice = safeParsePrice(productData.price);

          const product: Product = {
            id: productData.id || `maxipali-${ean}`,
            name: productData.name,
            brand: productData.brand || 'MaxiPali',
            imageUrl: productData.image || productData.imageUrl || '',
            price: productPrice,
            store: 'MaxiPali',
            category: productData.category || 'Grocery',
            barcode: ean,
            ean: ean,
            sku: productData.sku || ean
          };

          return { success: true, product };
        } else {

        }
      } catch (searchApiError) {
        console.error('Search API error:', searchApiError);
      }
      
      // STEP 3: Try our proxy API
      try {

        const proxyResponse = await axios.get(`/api/proxy/maxipali/barcode/${ean}`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          timeout: 15000
        });

        // Check if the response contains data
        if (proxyResponse.data) {
          const productData = proxyResponse.data as MaxiPaliProductData;
          const errorData = proxyResponse.data as MaxiPaliErrorResponse;
          
          // Check if the response contains an error
          if (errorData.error) {
            console.error('API returned an error:', errorData.error);
            throw new Error(errorData.details || 'API error');
          }
          
          // Check if we have all required data
          if (!productData.name) {
            console.error('Invalid product data from API:', productData);
            throw new Error('Invalid product data received from API');
          }
          
          // Ensure price is a number
          const productPrice = safeParsePrice(productData.price);

          const product: Product = {
            id: productData.id || `proxy-${ean}`,
            name: productData.name,
            brand: productData.brand || 'Unknown',
            imageUrl: productData.imageUrl || productData.image || '',
            price: productPrice,
            store: 'MaxiPali',
            category: productData.category || 'Grocery',
            barcode: ean,
            ean: ean,
            sku: productData.sku || ''
          };

          return { success: true, product };
        }
      } catch (proxyError) {
        console.error('Proxy API error:', proxyError);
      }
      
      // STEP 4: Try the general search as a final fallback
      try {

        const maxiPaliResults = await searchMaxiPaliProducts({ query: ean });
        
        if (maxiPaliResults && maxiPaliResults.products && maxiPaliResults.products.length > 0) {

          // Find exact match by EAN if available
          const exactMatch = maxiPaliResults.products.find(p => 
            p.sku === ean || p.id === ean || (p.ean && p.ean === ean) || p.barcode === ean
          );
          
          const productToUse = exactMatch || maxiPaliResults.products[0];

          // Ensure price is a number
          const price = safeParsePrice(productToUse.price);

          // Create a product with the parsed price
          const product = {
            ...productToUse,
            price: price,
            barcode: ean,
            ean: ean
          };

          return { success: true, product };
        } else {

        }
      } catch (searchError) {
        console.error('MaxiPali API search error:', searchError);
      }
    } catch (maxiPaliError) {
      console.error('All MaxiPali API attempts failed:', maxiPaliError);
    }
    
    // Try Walmart if MaxiPali failed
    try {

      const walmartResponse = await axios.get<WalmartApiResponse>(`/api/proxy/walmart/barcode/${ean}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      if (walmartResponse.data && walmartResponse.data.success && walmartResponse.data.product) {

        // Ensure we have a valid product
        const product = walmartResponse.data.product;
        
        // Validate essential fields
        if (!product.name || !product.id) {
          console.error('Invalid product data from Walmart API:', product);
          throw new Error('Invalid product data received from Walmart API');
        }
        
        // Construct the product object
        const finalProduct: Product = {
          id: product.id,
          name: product.name,
          brand: product.brand || 'Walmart',
          imageUrl: product.imageUrl || '',
          price: typeof product.price === 'number' ? product.price : safeParsePrice(product.price),
          store: 'Walmart',
          category: product.category || 'Grocery',
          barcode: ean,
          ean: ean,
          sku: product.sku || ''
        };

        return { success: true, product: finalProduct };
      } else {

      }
    } catch (walmartError) {
      console.error('Walmart API error:', walmartError);
    }

    // If we reach here, we didn't find a product
    return { 
      success: false, 
      message: 'Product not found with barcode: ' + ean 
    };
  } catch (error) {
    console.error('Error searching for product by barcode:', error);
    return { 
      success: false, 
      message: 'Error searching for product: ' + (error instanceof Error ? error.message : String(error))
    };
  }
};

// Legacy function - Using proxy API
export async function findByBarcode(barcode: string): Promise<Product | null> {
  try {

    const response = await axios.get(`/api/proxy/maxipali/barcode/${barcode}`);

    if (response.data) {
      // Type assertion to MaxiPaliProductData
      const productData = response.data as MaxiPaliProductData;
      
      // Ensure price is a number for display
      const price = safeParsePrice(productData.price);

      return {
        id: productData.id || `default-${barcode}`,
        name: productData.name,
        brand: productData.brand || 'Unknown',
        price: price,
        imageUrl: productData.imageUrl || productData.image || '',
        store: 'MaxiPali' as const,
        barcode: barcode,
        ean: barcode,
        category: productData.category || 'Uncategorized'
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('Error finding product by barcode:', error);
    
    // If primary API failed, try the alternative API
    try {

      const altResponse = await axios.get('/api/fallback/product', {
        params: { ean: barcode }
      });
      
      if (altResponse.data) {

        // Type assertion to MaxiPaliProductData
        const productData = altResponse.data as MaxiPaliProductData;
        
        // Ensure price is a number for display
        const price = safeParsePrice(productData.price);
        
        return {
          id: productData.id || `fallback-${barcode}`,
          name: productData.name,
          brand: productData.brand || 'Unknown',
          price: price,
          imageUrl: productData.imageUrl || productData.image || '',
          store: 'MaxiPali' as const,
          barcode: barcode,
          ean: barcode,
          category: productData.category || 'Uncategorized'
        };
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
    }
    
    // If original error has response data, it might contain useful error info
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw new Error('Product not found. Please try again or search by name.');
  }
} 