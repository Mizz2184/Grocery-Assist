import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types/store';
import { searchMaxiPaliProducts } from '@/lib/services';

// Function to search for a product by barcode
export const searchProductByBarcode = async (barcode: string): Promise<{ 
  success: boolean; 
  product?: Product; 
  message?: string 
}> => {
  try {
    // First check our local database (Supabase)
    const { data: localProduct, error: localError } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();
    
    if (localProduct && !localError) {
      console.log('Found product in local database:', localProduct);
      return { 
        success: true, 
        product: {
          id: localProduct.id,
          name: localProduct.name,
          brand: localProduct.brand,
          imageUrl: localProduct.image_url,
          price: localProduct.price,
          store: localProduct.store,
          category: localProduct.category,
          barcode: barcode
        }
      };
    }
    
    // Try MaxiPali API search
    console.log('Searching MaxiPali API for barcode:', barcode);
    try {
      const maxiPaliResults = await searchMaxiPaliProducts({ query: barcode });
      
      if (maxiPaliResults && maxiPaliResults.products && maxiPaliResults.products.length > 0) {
        // Find exact match by barcode if available
        const exactMatch = maxiPaliResults.products.find(p => 
          p.sku === barcode || p.id === barcode || (p.barcode && p.barcode === barcode)
        );
        
        const productToUse = exactMatch || maxiPaliResults.products[0];
        console.log('Found product in MaxiPali API:', productToUse);
        
        // Store in our database for future use
        await supabase.from('products').upsert({
          id: productToUse.id,
          name: productToUse.name,
          brand: productToUse.brand || 'Unknown',
          image_url: productToUse.imageUrl,
          price: productToUse.price,
          store: 'MaxiPali',
          category: productToUse.category || 'Unknown',
          barcode: barcode
        }, { onConflict: 'id' });
        
        return { 
          success: true, 
          product: {
            ...productToUse,
            barcode: barcode
          } 
        };
      }
    } catch (maxiPaliError) {
      console.error('MaxiPali API search error:', maxiPaliError);
      // Continue to other methods if this fails
    }
    
    // If not found locally or in MaxiPali, try external APIs
    // Using Open Food Facts API as an example
    console.log('Searching Open Food Facts API for barcode:', barcode);
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.status === 1) { // Product found
      console.log('Found product in Open Food Facts:', data.product.product_name);
      const product: Product = {
        id: `openfoodfacts-${barcode}`,
        name: data.product.product_name || 'Unknown Product',
        brand: data.product.brands || 'Unknown Brand',
        imageUrl: data.product.image_url,
        price: 0, // Price not available from Open Food Facts
        store: 'Unknown',
        category: data.product.categories_tags ? data.product.categories_tags[0]?.replace('en:', '') : 'Unknown',
        barcode: barcode
      };
      
      // Store in our database for future use
      await supabase.from('products').upsert({
        id: product.id,
        name: product.name,
        brand: product.brand,
        image_url: product.imageUrl,
        barcode: barcode,
        price: 0, // Will need to be updated manually
        store: product.store,
        category: product.category
      }, { onConflict: 'id' });
      
      return { success: true, product };
    }
    
    // Try the UPC database API as backup
    // Note: You might need to register for an API key for a production app
    console.log('Searching UPC database for barcode:', barcode);
    try {
      const upcResponse = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
      const upcData = await upcResponse.json();
      
      if (upcData.items && upcData.items.length > 0) {
        console.log('Found product in UPC database:', upcData.items[0].title);
        const item = upcData.items[0];
        const product: Product = {
          id: `upcitemdb-${barcode}`,
          name: item.title || 'Unknown Product',
          brand: item.brand || 'Unknown Brand',
          imageUrl: item.images?.[0] || '',
          price: item.lowest_recorded_price || 0,
          store: 'Unknown',
          category: item.category || 'Unknown',
          barcode: barcode
        };
        
        // Store in our database for future use
        await supabase.from('products').upsert({
          id: product.id,
          name: product.name,
          brand: product.brand,
          image_url: product.imageUrl,
          barcode: barcode,
          price: product.price,
          store: product.store,
          category: product.category
        }, { onConflict: 'id' });
        
        return { success: true, product };
      }
    } catch (upcError) {
      console.error('UPC database lookup error:', upcError);
      // Continue to next method if this fails
    }
    
    // If we still don't have a product, just create a placeholder
    console.log('Creating placeholder for barcode:', barcode);
    const placeholderProduct: Product = {
      id: `placeholder-${barcode}`,
      name: 'Unknown Product',
      brand: 'Unknown Brand',
      imageUrl: '',
      price: 0,
      store: 'Unknown',
      category: 'Unknown',
      barcode: barcode
    };
    
    // Store placeholder in our database
    await supabase.from('products').upsert({
      id: placeholderProduct.id,
      name: placeholderProduct.name,
      brand: placeholderProduct.brand,
      image_url: placeholderProduct.imageUrl,
      barcode: barcode,
      price: placeholderProduct.price,
      store: placeholderProduct.store,
      category: placeholderProduct.category
    }, { onConflict: 'id' });
    
    return { 
      success: false, 
      product: placeholderProduct,
      message: 'Product not found. Created a placeholder that you can edit.' 
    };
  } catch (error) {
    console.error('Error searching product by barcode:', error);
    return { 
      success: false, 
      message: 'Failed to search for product by barcode.' 
    };
  }
}; 