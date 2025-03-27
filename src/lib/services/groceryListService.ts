import { GroceryList, GroceryListItem, mockGroceryLists } from '@/utils/productData';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types/store';

// Database types
type DbGroceryList = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  collaborators?: string[];
  created_by?: string; // For backward compatibility
};

type DbGroceryItem = {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  added_by: string;
  added_at: string;
  checked: boolean;
  product_data?: Product;
};

// Get user's grocery lists
export const getUserGroceryLists = async (userId: string): Promise<GroceryList[]> => {
  try {
    // Check if we have lists in localStorage (for anonymous users or fallback)
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const userLocalLists = localLists.filter((list: GroceryList) => list.createdBy === userId);
    
    // If we have local lists or we're using a mock user, return those
    if (userLocalLists.length > 0 || userId.startsWith('mock-')) {
      console.log('Using local lists for user', userId);
      return userLocalLists;
    }
    
    // Otherwise, try to fetch from Supabase
    const { data: lists, error: listsError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('user_id', userId);

    if (listsError) {
      console.error('Error fetching grocery lists:', listsError);
      // Return local lists as fallback
      return userLocalLists;
    }
    
    if (!lists || lists.length === 0) {
      return [];
    }

    // Fetch items for all lists
    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .in('list_id', lists.map(list => list.id));

    if (itemsError) {
      console.error('Error fetching grocery items:', itemsError);
      return [];
    }
    
    // Fetch user's products from user_products table
    const { data: userProducts, error: productsError } = await supabase
      .from('user_products')
      .select('*')
      .eq('user_id', userId);
      
    if (productsError) {
      console.error('Error fetching user products:', productsError);
      // Continue without user products, using the embedded product_data
    }
    
    // Create a map of product_id to user product for quick lookup
    const productMap = new Map();
    if (userProducts && userProducts.length > 0) {
      userProducts.forEach(product => {
        productMap.set(product.product_id, {
          id: product.product_id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          imageUrl: product.image_url,
          store: product.store,
          category: product.category
        });
      });
    }

    // Transform data to match application format
    return lists.map((list: DbGroceryList) => ({
      id: list.id,
      name: list.name,
      createdBy: list.created_by || list.user_id,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      items: items
        .filter((item: DbGroceryItem) => item.list_id === list.id)
        .map((item: DbGroceryItem) => {
          // Look up product in user's product database first
          const userProduct = productMap.get(item.product_id);
          
          return {
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            addedBy: item.added_by,
            addedAt: item.added_at,
            checked: item.checked,
            // Use user's product data if available, otherwise use embedded product_data
            productData: userProduct || item.product_data
          };
        })
    }));
  } catch (error) {
    console.error('Error in getUserGroceryLists:', error);
    
    // Fallback to localStorage if Supabase fails
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    return localLists.filter((list: GroceryList) => list.createdBy === userId);
  }
};

// Get a grocery list by ID
export const getGroceryListById = async (listId: string): Promise<GroceryList | undefined> => {
  try {
    // Check localStorage first
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const localList = localLists.find((list: GroceryList) => list.id === listId);
    
    // If the list exists in localStorage, use that
    if (localList) {
      console.log('Using local list from localStorage');
      return localList;
    }
    
    // Otherwise, try to fetch from Supabase
    // Fetch list
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError) {
      console.error('Error fetching grocery list:', listError);
      return undefined;
    }

    // Fetch items for the list
    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId);

    if (itemsError) {
      console.error('Error fetching grocery items:', itemsError);
      return undefined;
    }
    
    // Fetch user's products from user_products table
    const { data: userProducts, error: productsError } = await supabase
      .from('user_products')
      .select('*')
      .eq('user_id', list.user_id);
      
    if (productsError) {
      console.error('Error fetching user products:', productsError);
      // Continue without user products, using the embedded product_data
    }
    
    // Create a map of product_id to user product for quick lookup
    const productMap = new Map();
    if (userProducts && userProducts.length > 0) {
      userProducts.forEach(product => {
        productMap.set(product.product_id, {
          id: product.product_id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          imageUrl: product.image_url,
          store: product.store,
          category: product.category
        });
      });
    }

    // Transform data to match application format
    return {
      id: list.id,
      name: list.name,
      createdBy: list.user_id,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      items: items.map((item: DbGroceryItem) => {
        // Look up product in user's product database first
        const userProduct = productMap.get(item.product_id);
        
        return {
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          addedBy: item.added_by,
          addedAt: item.added_at,
          checked: item.checked,
          // Use user's product data if available, otherwise use embedded product_data
          productData: userProduct || item.product_data
        };
      })
    };
  } catch (error) {
    console.error('Error in getGroceryListById:', error);
    
    // Try localStorage as fallback
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    return localLists.find((list: GroceryList) => list.id === listId);
  }
};

// Add product to grocery list
export const addProductToGroceryList = async (
  listId: string,
  userId: string,
  product: Product,
  quantity: number = 1
): Promise<{ success: boolean; message?: string; list?: GroceryList }> => {
  try {
    // Normalize store name for consistency
    let normalizedStore = product.store;
    if (normalizedStore?.includes('MaxiPali') || normalizedStore === 'MaxiPali') {
      normalizedStore = 'MaxiPali';
    } else if (normalizedStore?.includes('MasxMenos') || normalizedStore === 'MasxMenos') {
      normalizedStore = 'MasxMenos';
    }
    
    // Create a normalized product with consistent store name
    const normalizedProduct = {
      ...product,
      store: normalizedStore
    };
    
    console.log('Adding product to list with store:', normalizedStore);
    
    // Check if we're using localStorage (for anonymous users or mock users)
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    // If the list exists in localStorage or it's a mock user, use localStorage
    if (listIndex !== -1 || userId.startsWith('mock-')) {
      console.log('Using localStorage for adding product to list');
      
      if (listIndex === -1) {
        return { success: false, message: 'Grocery list not found' };
      }
      
      const list = localLists[listIndex];
      const existingItemIndex = list.items.findIndex(item => item.productId === normalizedProduct.id);
      
      if (existingItemIndex !== -1) {
        // Update quantity if product already exists
        list.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        const newItem: GroceryListItem = {
          id: uuidv4(),
          productId: normalizedProduct.id,
          quantity,
          addedBy: userId,
          addedAt: new Date().toISOString(),
          checked: false,
          productData: {
            id: normalizedProduct.id,
            name: normalizedProduct.name,
            brand: normalizedProduct.brand || 'Unknown',
            imageUrl: normalizedProduct.imageUrl,
            price: normalizedProduct.price,
            store: normalizedStore,
            category: normalizedProduct.category
          }
        };
        list.items.push(newItem);
      }
      
      // Update localStorage
      localStorage.setItem('grocery_lists', JSON.stringify(localLists));
      
      return { success: true, list };
    }
    
    // Otherwise, try to use Supabase
    // Check if product is already in the list
    const { data: existingItems, error: checkError } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId)
      .eq('product_id', normalizedProduct.id);

    if (checkError) {
      console.error('Error checking existing items:', checkError);
      // Fall back to localStorage
      return addProductToLocalList(listId, userId, normalizedProduct, quantity);
    }

    // Store the product data in the user_products table
    const { error: productError } = await supabase
      .from('user_products')
      .upsert({
        id: uuidv4(),
        user_id: userId,
        product_id: normalizedProduct.id,
        name: normalizedProduct.name,
        brand: normalizedProduct.brand || 'Unknown',
        image_url: normalizedProduct.imageUrl,
        price: normalizedProduct.price,
        store: normalizedStore,
        category: normalizedProduct.category || 'Grocery',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, product_id'
      });

    if (productError) {
      console.error('Error storing product data in user_products:', productError);
      // Continue anyway, as this is not critical for the grocery list
    }

    if (existingItems && existingItems.length > 0) {
      // Update quantity if product already exists
      const existingItem = existingItems[0];
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({ 
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating item quantity:', updateError);
        // Fall back to localStorage
        return addProductToLocalList(listId, userId, normalizedProduct, quantity);
      }
    } else {
      // Add new item
      const newItem = {
        id: uuidv4(),
        list_id: listId,
        product_id: normalizedProduct.id,
        quantity,
        added_by: userId,
        added_at: new Date().toISOString(),
        checked: false,
        product_data: {
          id: normalizedProduct.id,
          name: normalizedProduct.name,
          brand: normalizedProduct.brand || 'Unknown',
          imageUrl: normalizedProduct.imageUrl,
          price: normalizedProduct.price,
          store: normalizedStore,
          category: normalizedProduct.category
        }
      };

      const { error: insertError } = await supabase
        .from('grocery_items')
        .insert(newItem);

      if (insertError) {
        console.error('Error inserting new item:', insertError);
        // Fall back to localStorage
        return addProductToLocalList(listId, userId, normalizedProduct, quantity);
      }
    }

    // Get updated list to return
    const updatedList = await getGroceryListById(listId);
    return { 
      success: true, 
      list: updatedList 
    };
  } catch (error) {
    console.error('Error in addProductToGroceryList:', error);
    // Fall back to localStorage
    return addProductToLocalList(listId, userId, product, quantity);
  }
};

// Helper function to add product to local list (for fallback)
const addProductToLocalList = (
  listId: string, 
  userId: string, 
  product: Product, 
  quantity: number
): Promise<{ success: boolean; message?: string; list?: GroceryList }> => {
  try {
    // Normalize store name for consistency
    let normalizedStore = product.store;
    if (normalizedStore?.includes('MaxiPali') || normalizedStore === 'MaxiPali') {
      normalizedStore = 'MaxiPali';
    } else if (normalizedStore?.includes('MasxMenos') || normalizedStore === 'MasxMenos') {
      normalizedStore = 'MasxMenos';
    }
    
    // Create a normalized product with consistent store name
    const normalizedProduct = {
      ...product,
      store: normalizedStore
    };
    
    console.log('Adding product to local list with store:', normalizedStore);
    
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    if (listIndex === -1) {
      return Promise.resolve({ success: false, message: 'Grocery list not found' });
    }
    
    const list = localLists[listIndex];
    const existingItemIndex = list.items.findIndex(item => item.productId === normalizedProduct.id);
    
    if (existingItemIndex !== -1) {
      // Update quantity if product already exists
      list.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem: GroceryListItem = {
        id: uuidv4(),
        productId: normalizedProduct.id,
        quantity,
        addedBy: userId,
        addedAt: new Date().toISOString(),
        checked: false,
        productData: {
          id: normalizedProduct.id,
          name: normalizedProduct.name,
          brand: normalizedProduct.brand || 'Unknown',
          imageUrl: normalizedProduct.imageUrl,
          price: normalizedProduct.price,
          store: normalizedStore,
          category: normalizedProduct.category
        }
      };
      list.items.push(newItem);
    }
    
    // Update localStorage
    localStorage.setItem('grocery_lists', JSON.stringify(localLists));
    
    return Promise.resolve({ success: true, list });
  } catch (error) {
    console.error('Error adding product to local list:', error);
    return Promise.resolve({ success: false, message: 'Failed to add product to list' });
  }
};

// Create a new grocery list
export const createGroceryList = async (
  userId: string,
  name: string = 'My Grocery List'
): Promise<GroceryList | null> => {
  try {
    console.log(`Creating grocery list "${name}" for user ${userId}`);
    
    // If it's a mock user, just create the list in localStorage
    if (userId.startsWith('mock-')) {
      console.log('Creating list in localStorage for mock user');
      const newList: GroceryList = {
        id: uuidv4(),
        name,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        collaborators: [],
        items: []
      };
      
      // Add to existing lists
      const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      lists.push(newList);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
      
      return newList;
    }
    
    // Create the list in Supabase
    const newListId = uuidv4();
    const now = new Date().toISOString();
    
    // Insert new list
    const { error: insertError } = await supabase
      .from('grocery_lists')
      .insert({
        id: newListId,
        user_id: userId,
        name,
        created_at: now,
        collaborators: []
      });

    if (insertError) {
      console.error('Error creating grocery list in Supabase:', insertError);
      
      // Fall back to localStorage
      console.log('Falling back to localStorage for list creation');
      const newList: GroceryList = {
        id: newListId,
        name,
        createdBy: userId,
        createdAt: now,
        collaborators: [],
        items: []
      };
      
      // Add to existing lists
      const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      lists.push(newList);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
      
      return newList;
    }
    
    // Return the created list
    return {
      id: newListId,
      name,
      createdBy: userId,
      createdAt: now,
      collaborators: [],
      items: []
    };
  } catch (error) {
    console.error('Error in createGroceryList:', error);
    
    // Attempt to create in localStorage as a fallback
    try {
      const newList: GroceryList = {
        id: uuidv4(),
        name,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        collaborators: [],
        items: []
      };
      
      // Add to existing lists
      const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      lists.push(newList);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
      
      return newList;
    } catch (localError) {
      console.error('Error creating list in localStorage:', localError);
      return null;
    }
  }
};

// Get default list for user (create if none exists)
export const getOrCreateDefaultList = async (userId: string): Promise<GroceryList> => {
  try {
    // Try to find user's lists
    const userLists = await getUserGroceryLists(userId);
    
    // Return first list if exists
    if (userLists.length > 0) {
      return userLists[0];
    }
    
    // Create new list if none exists
    const newList = await createGroceryList(userId, 'Default Grocery List');
    if (!newList) {
      throw new Error('Failed to create default grocery list');
    }
    
    return newList;
  } catch (error) {
    console.error('Error in getOrCreateDefaultList:', error);
    
    // Fallback to local mock list if we can't create one in Supabase
    const mockList: GroceryList = {
      id: uuidv4(),
      name: 'Default Grocery List',
      createdBy: userId,
      createdAt: new Date().toISOString(),
      items: [],
      collaborators: []
    };
    
    return mockList;
  }
}; 