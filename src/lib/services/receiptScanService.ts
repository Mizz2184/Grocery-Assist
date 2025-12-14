import { GoogleGenerativeAI } from '@google/generative-ai';
import { Product } from '@/lib/types/store';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export interface ScannedProduct {
  name: string;
  barcode?: string;
  quantity?: number;
  price?: number;
}

export interface ReceiptScanResult {
  products: ScannedProduct[];
  totalAmount?: number;
  storeName?: string;
  date?: string;
}

export const scanReceipt = async (imageFile: File): Promise<ReceiptScanResult> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const imageData = await fileToGenerativePart(imageFile);

    const prompt = `Analyze this grocery receipt image and extract the following information in JSON format.
    
    IMPORTANT: Each product line has a barcode number (13 digits starting with 7). Extract these barcodes carefully.
    
    Return JSON in this exact format:
    {
      "products": [
        {
          "name": "product name (cleaned up, readable)",
          "barcode": "13-digit barcode number",
          "quantity": number (default 1 if not specified),
          "price": number (if visible)
        }
      ],
      "totalAmount": number (if visible),
      "storeName": "store name (if visible)",
      "date": "date (if visible)"
    }

    Rules:
    - Extract ALL grocery items from the receipt
    - For each item, find the associated 13-digit barcode (usually starts with 7)
    - Clean up product names (remove extra spaces, codes)
    - If quantity is not specified, use 1
    - Ignore non-grocery items like taxes, bags, service charges
    - Return ONLY valid JSON, no additional text or markdown`;

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const text = response.text();

    let jsonText = text;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      const directMatch = text.match(/\{[\s\S]*\}/);
      if (directMatch) {
        jsonText = directMatch[0];
      }
    }

    const receiptData: ReceiptScanResult = JSON.parse(jsonText);
    
    receiptData.products = receiptData.products.filter(p => {
      if (!p.barcode || p.barcode.length < 8) {
        console.warn(`Invalid barcode for product ${p.name}: ${p.barcode}`);
        return false;
      }
      return true;
    });

    return receiptData;
  } catch (error) {
    console.error('Error scanning receipt:', error);
    throw new Error('Failed to scan receipt. Please try again with a clearer image.');
  }
};

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const matchProductsByBarcode = async (
  scannedProducts: ScannedProduct[],
  userId: string
): Promise<Array<{ scannedProduct: ScannedProduct; matchedProduct: Product | null }>> => {
  const { searchMaxiPaliProducts, searchWalmartProducts, searchMasxMenosProducts } = await import('@/lib/services');
  
  console.log(`🚀 Starting parallel search for ${scannedProducts.length} products...`);
  
  // Search all products in parallel for maximum speed
  const searchPromises = scannedProducts.map(async (scannedProduct) => {
    let matchedProduct: Product | null = null;

    if (scannedProduct.name) {
      try {
        console.log(`🔍 Searching by name: "${scannedProduct.name}"`);
        
        // Try all stores in parallel, use the first one that returns results
        const [maxiPaliResults, walmartResults, masxMenosResults] = await Promise.allSettled([
          searchMaxiPaliProducts({ query: scannedProduct.name, page: 1, pageSize: 5 }),
          searchWalmartProducts({ query: scannedProduct.name, page: 1, pageSize: 5 }),
          searchMasxMenosProducts({ query: scannedProduct.name, page: 1, pageSize: 5 })
        ]);

        // Check MaxiPali results
        if (maxiPaliResults.status === 'fulfilled' && 
            maxiPaliResults.value?.products && 
            maxiPaliResults.value.products.length > 0) {
          matchedProduct = maxiPaliResults.value.products[0];
          console.log(`✅ Found by name in MaxiPali: "${matchedProduct.name}" - ₡${matchedProduct.price}`);
        }
        // Check Walmart results if MaxiPali didn't find it
        else if (walmartResults.status === 'fulfilled' && 
                 walmartResults.value?.products && 
                 walmartResults.value.products.length > 0) {
          matchedProduct = walmartResults.value.products[0];
          console.log(`✅ Found by name in Walmart: "${matchedProduct.name}" - ₡${matchedProduct.price}`);
        }
        // Check MasxMenos results if others didn't find it
        else if (masxMenosResults.status === 'fulfilled' && 
                 masxMenosResults.value?.products && 
                 masxMenosResults.value.products.length > 0) {
          matchedProduct = masxMenosResults.value.products[0];
          console.log(`✅ Found by name in MasxMenos: "${matchedProduct.name}" - ₡${matchedProduct.price}`);
        }
      } catch (error) {
        console.error(`Error searching by name for "${scannedProduct.name}":`, error);
      }
    }

    if (!matchedProduct) {
      console.warn(`❌ No product found for: ${scannedProduct.name}`);
    }

    return { scannedProduct, matchedProduct };
  });

  // Wait for all searches to complete
  const results = await Promise.all(searchPromises);

  console.log(`📊 Receipt scan complete: ${results.filter(r => r.matchedProduct).length}/${results.length} products matched`);
  return results;
};
