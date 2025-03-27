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
    console.log('Searching store APIs for EAN:', ean);
    
    // Try MaxiPali first
    try {
      console.log('Trying MaxiPali for EAN:', ean);
      
      // STEP 1: Try MaxiPali direct catalog search API first
      try {
        console.log('Trying direct catalog search API with EAN:', ean);
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
          console.log('Found products in catalog search:', response.data.length);
          
          const product = response.data[0];
          console.log('Selected product:', product.productName);
          
          // Extract price and ensure it's a number
          const rawPrice = product.items?.[0]?.sellers?.[0]?.commertialOffer?.Price;
          const price = safeParsePrice(rawPrice);
          
          console.log('Price information:', {
            rawPrice,
            processedPrice: price,
            type: typeof price
          });
          
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
          
          console.log('Final product object:', finalProduct);
          return { success: true, product: finalProduct };
        } else {
          console.log('No products found in catalog search, trying next method');
        }
      } catch (catalogError) {
        console.error('Catalog search API error:', catalogError);
      }
      
      // STEP 2: Try the general search term API
      try {
        console.log('Trying product search API with EAN:', ean);
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
        
        console.log('MaxiPali API response status:', response.status);
        
        // Check if we got any products
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log('Found products in search:', response.data.length);
          
          // Find exact match by EAN if possible
          const productsData = response.data as MaxiPaliProductData[];
          const exactMatch = productsData.find(item => 
            item.ean === ean || item.id === ean || item.sku === ean
          );
          
          const productData = exactMatch || productsData[0];
          console.log('Using product:', productData.name);
          
          // Ensure price is a number
          const productPrice = safeParsePrice(productData.price);
          
          console.log('Price information:', {
            rawPrice: productData.price,
            processedPrice: productPrice,
            type: typeof productPrice
          });
          
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
          
          console.log('Final product object:', product);
          return { success: true, product };
        } else {
          console.log('No products found in search API, trying proxy API');
        }
      } catch (searchApiError) {
        console.error('Search API error:', searchApiError);
      }
      
      // STEP 3: Try our proxy API
      try {
        console.log('Trying proxy API for EAN:', ean);
        const proxyResponse = await axios.get(`/api/proxy/maxipali/barcode/${ean}`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          timeout: 15000
        });
        
        console.log('Proxy API response status:', proxyResponse.status);
        
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
          
          console.log('Price information:', {
            rawPrice: productData.price,
            processedPrice: productPrice,
            type: typeof productPrice
          });
          
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
          
          console.log('Final product object from proxy:', product);
          return { success: true, product };
        }
      } catch (proxyError) {
        console.error('Proxy API error:', proxyError);
      }
      
      // STEP 4: Try the general search as a final fallback
      try {
        console.log('Trying general MaxiPali search with EAN as query:', ean);
        const maxiPaliResults = await searchMaxiPaliProducts({ query: ean });
        
        if (maxiPaliResults && maxiPaliResults.products && maxiPaliResults.products.length > 0) {
          console.log('Found products in general search:', maxiPaliResults.products.length);
          
          // Find exact match by EAN if available
          const exactMatch = maxiPaliResults.products.find(p => 
            p.sku === ean || p.id === ean || (p.ean && p.ean === ean) || p.barcode === ean
          );
          
          const productToUse = exactMatch || maxiPaliResults.products[0];
          console.log('Using product from general search:', productToUse.name);
          
          // Ensure price is a number
          const price = safeParsePrice(productToUse.price);
          
          console.log('Price information:', {
            rawPrice: productToUse.price,
            processedPrice: price,
            type: typeof price
          });
          
          // Create a product with the parsed price
          const product = {
            ...productToUse,
            price: price,
            barcode: ean,
            ean: ean
          };
          
          console.log('Final product object from general search:', product);
          return { success: true, product };
        } else {
          console.log('No products found in general search');
        }
      } catch (searchError) {
        console.error('MaxiPali API search error:', searchError);
      }
    } catch (maxiPaliError) {
      console.error('All MaxiPali API attempts failed:', maxiPaliError);
      
      // If MaxiPali failed, try MasxMenos
      try {
        console.log('Trying MasxMenos API for EAN:', ean);
        const masxMenosResponse = await axios.get(`/api/proxy/masxmenos/barcode/${ean}`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          },
          timeout: 15000 // 15 second timeout
        });
        
        console.log('MasxMenos API response status:', masxMenosResponse.status);
        
        // Check if the response contains data
        if (masxMenosResponse.data) {
          const productData = masxMenosResponse.data as MaxiPaliProductData;
          const errorData = masxMenosResponse.data as MaxiPaliErrorResponse;
          
          // Check if the response contains an error
          if (errorData.error) {
            console.error('MasxMenos API returned an error:', errorData.error);
            throw new Error(errorData.details || 'API error');
          }
          
          // Check if we have all required data
          if (!productData.name) {
            console.error('Invalid product data from MasxMenos API:', productData);
            throw new Error('Invalid product data received from API');
          }
          
          // Ensure price is a number
          const productPrice = safeParsePrice(productData.price);
          
          console.log('MasxMenos price information:', {
            rawPrice: productData.price,
            processedPrice: productPrice,
            type: typeof productPrice
          });
          
          const product: Product = {
            id: productData.id || `masxmenos-${ean}`,
            name: productData.name,
            brand: productData.brand || 'Unknown',
            imageUrl: productData.imageUrl || productData.image || '',
            price: productPrice,
            store: 'MasxMenos',
            category: productData.category || 'Grocery',
            barcode: ean,
            ean: ean,
            sku: productData.sku || ''
          };
          
          console.log('Final product object from MasxMenos:', product);
          return { success: true, product };
        }
      } catch (masxMenosError) {
        console.error('MasxMenos API error:', masxMenosError);
      }
    }
    
    // If no product was found in any API, return failure
    console.warn('Product not found in any API for EAN:', ean);
    return { 
      success: false, 
      message: "Producto no encontrado. Por favor, intente con otro código EAN." 
    };
  } catch (error) {
    console.error('Error searching product by EAN:', error);
    
    return { 
      success: false,
      message: `Error al buscar producto: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
};

// Legacy function - Using proxy API
export async function findByBarcode(barcode: string): Promise<Product | null> {
  try {
    console.log(`Searching for product with EAN: ${barcode}`);
    const response = await axios.get(`/api/proxy/maxipali/barcode/${barcode}`);
    
    console.log("API response:", response.data);

    if (response.data) {
      // Type assertion to MaxiPaliProductData
      const productData = response.data as MaxiPaliProductData;
      
      // Ensure price is a number for display
      const price = safeParsePrice(productData.price);
      console.log(`Parsed price: ${price}`);
      
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
      console.log('Trying fallback API...');
      const altResponse = await axios.get('/api/fallback/product', {
        params: { ean: barcode }
      });
      
      if (altResponse.data) {
        console.log('Fallback API response:', altResponse.data);
        
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