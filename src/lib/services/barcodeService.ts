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

// Function to search for a product by EAN - use proxy endpoints only to avoid CORS
export const searchProductByBarcode = async (ean: string): Promise<{ 
  success: boolean; 
  product?: Product; 
  message?: string 
}> => {
  try {
    console.log(`🔍 Searching for barcode: ${ean}`);

    // STEP 1: Try MaxiPali proxy endpoint
    try {
      console.log('Trying MaxiPali proxy...');
      const proxyResponse = await axios.get(`/api/proxy/maxipali/barcode/${ean}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      if (proxyResponse.data && (proxyResponse.data as any).name) {
        const productData = proxyResponse.data as MaxiPaliProductData;
        const productPrice = safeParsePrice(productData.price);

        const product: Product = {
          id: productData.id || `maxipali-${ean}`,
          name: productData.name,
          brand: productData.brand || 'MaxiPali',
          imageUrl: productData.imageUrl || productData.image || '',
          price: productPrice,
          currency: 'CRC',
          store: 'MaxiPali',
          barcode: ean
        };

        console.log('✅ Found in MaxiPali:', {
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl ? 'Yes' : 'No',
          barcode: product.barcode
        });
        return { success: true, product };
      }
    } catch (proxyError: any) {
      const status = proxyError.response?.status;
      if (status === 404) {
        console.log('MaxiPali: Product not found (404)');
      } else {
        console.log('MaxiPali proxy failed:', status || proxyError.message);
      }
    }
    
    // STEP 2: Try Walmart proxy endpoint
    try {
      console.log('Trying Walmart proxy...');
      const walmartResponse = await axios.get<WalmartApiResponse>(`/api/proxy/walmart/barcode/${ean}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      if (walmartResponse.data && walmartResponse.data.success && walmartResponse.data.product) {
        const product = walmartResponse.data.product;
        
        if (product.name && product.id) {
          const finalProduct: Product = {
            id: product.id,
            name: product.name,
            brand: product.brand || 'Walmart',
            imageUrl: product.imageUrl || '',
            price: typeof product.price === 'number' ? product.price : safeParsePrice(product.price),
            currency: 'CRC',
            store: 'Walmart',
            barcode: ean
          };

          console.log('✅ Found in Walmart:', {
            name: finalProduct.name,
            price: finalProduct.price,
            imageUrl: finalProduct.imageUrl ? 'Yes' : 'No',
            barcode: finalProduct.barcode
          });
          return { success: true, product: finalProduct };
        }
      }
    } catch (walmartError: any) {
      const status = walmartError.response?.status;
      if (status === 404) {
        console.log('Walmart: Product not found (404)');
      } else {
        console.log('Walmart proxy failed:', status || walmartError.message);
      }
    }

    // STEP 3: Try MasxMenos proxy endpoint
    try {
      console.log('Trying MasxMenos proxy...');
      const masxmenosResponse = await axios.get(`/api/proxy/masxmenos/barcode/${ean}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      if (masxmenosResponse.data && (masxmenosResponse.data as any).name) {
        const productData = masxmenosResponse.data as MaxiPaliProductData;
        const productPrice = safeParsePrice(productData.price);

        const product: Product = {
          id: productData.id || `masxmenos-${ean}`,
          name: productData.name,
          brand: productData.brand || 'MasxMenos',
          imageUrl: productData.imageUrl || '',
          price: productPrice,
          currency: 'CRC',
          store: 'MasxMenos',
          barcode: ean
        };

        console.log('✅ Found in MasxMenos:', {
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl ? 'Yes' : 'No',
          barcode: product.barcode
        });
        return { success: true, product };
      }
    } catch (masxmenosError: any) {
      const status = masxmenosError.response?.status;
      if (status === 404) {
        console.log('MasxMenos: Product not found (404)');
      } else {
        console.log('MasxMenos proxy failed:', status || masxmenosError.message);
      }
    }

    // If we reach here, we didn't find a product
    console.log('❌ Product not found in any store');
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
        currency: 'CRC',
        imageUrl: productData.imageUrl || productData.image || '',
        store: 'MaxiPali' as const,
        barcode: barcode
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
          currency: 'CRC',
          imageUrl: productData.imageUrl || productData.image || '',
          store: 'MaxiPali' as const,
          barcode: barcode
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