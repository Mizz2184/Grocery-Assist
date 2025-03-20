import { GroceryList, GroceryListItem, mockGroceryLists } from '@/utils/productData';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types/store';

// Database types
type DbGroceryList = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  collaborators?: string[];
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
      .eq('created_by', userId);

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

    // Transform data to match application format
    return lists.map((list: DbGroceryList) => ({
      id: list.id,
      name: list.name,
      createdBy: list.created_by,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      items: items
        .filter((item: DbGroceryItem) => item.list_id === list.id)
        .map((item: DbGroceryItem) => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          addedBy: item.added_by,
          addedAt: item.added_at,
          checked: item.checked,
          productData: item.product_data
        }))
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

    // Transform data to match application format
    return {
      id: list.id,
      name: list.name,
      createdBy: list.created_by,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      items: items.map((item: DbGroceryItem) => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        addedBy: item.added_by,
        addedAt: item.added_at,
        checked: item.checked,
        productData: item.product_data
      }))
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
      const existingItemIndex = list.items.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex !== -1) {
        // Update quantity if product already exists
        list.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        const newItem: GroceryListItem = {
          id: uuidv4(),
          productId: product.id,
          quantity,
          addedBy: userId,
          addedAt: new Date().toISOString(),
          checked: false,
          productData: {
            id: product.id,
            name: product.name,
            brand: product.brand || 'Unknown',
            imageUrl: product.imageUrl,
            price: product.price,
            store: product.store,
            category: product.category
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
      .eq('product_id', product.id);

    if (checkError) {
      console.error('Error checking existing items:', checkError);
      // Fall back to localStorage
      return addProductToLocalList(listId, userId, product, quantity);
    }

    // Store the product data in case we need it later
    const { error: productError } = await supabase
      .from('products')
      .upsert({
        id: product.id,
        name: product.name,
        brand: product.brand || 'Unknown',
        image_url: product.imageUrl,
        price: product.price,
        store: product.store,
        category: product.category
      }, { onConflict: 'id' });
      
    if (productError) {
      console.error('Error storing product data:', productError);
      // Continue anyway - this is not critical
    }

    if (existingItems && existingItems.length > 0) {
      // Update existing item quantity
      const existingItem = existingItems[0];
      const newQuantity = existingItem.quantity + quantity;
      
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({ quantity: newQuantity })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating item quantity:', updateError);
        // Fall back to localStorage
        return addProductToLocalList(listId, userId, product, quantity);
      }
    } else {
      // Add new item
      const newItemId = uuidv4();
      const now = new Date().toISOString();
      
      const { error: insertError } = await supabase
        .from('grocery_items')
        .insert({
          id: newItemId,
          list_id: listId,
          product_id: product.id,
          quantity: quantity,
          added_by: userId,
          added_at: now,
          checked: false,
          product_data: {
            id: product.id,
            name: product.name,
            brand: product.brand || 'Unknown',
            imageUrl: product.imageUrl,
            price: product.price,
            store: product.store,
            category: product.category
          }
        });

      if (insertError) {
        console.error('Error adding new item:', insertError);
        // Fall back to localStorage
        return addProductToLocalList(listId, userId, product, quantity);
      }
    }

    // Get updated list
    const updatedList = await getGroceryListById(listId);
    return { success: true, list: updatedList };
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
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    if (listIndex === -1) {
      return Promise.resolve({ success: false, message: 'Grocery list not found' });
    }
    
    const list = localLists[listIndex];
    const existingItemIndex = list.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex !== -1) {
      // Update quantity if product already exists
      list.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      const newItem: GroceryListItem = {
        id: uuidv4(),
        productId: product.id,
        quantity,
        addedBy: userId,
        addedAt: new Date().toISOString(),
        checked: false,
        productData: {
          id: product.id,
          name: product.name,
          brand: product.brand || 'Unknown',
          imageUrl: product.imageUrl,
          price: product.price,
          store: product.store,
          category: product.category
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
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // For now, store the list in localStorage for anonymous users
    // and mock the database behavior
    if (!supabase.auth.getUser() || userId.startsWith('mock-')) {
      console.log('Creating list for anonymous/mock user in local storage');
      const newList = {
        id,
        name,
        createdBy: userId, 
        createdAt: now,
        items: [],
        collaborators: []
      };
      
      // Store in local storage
      const existingLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      localStorage.setItem('grocery_lists', JSON.stringify([...existingLists, newList]));
      
      return newList;
    }
    
    // For authenticated users, use Supabase
    const { error } = await supabase
      .from('grocery_lists')
      .insert({
        id,
        name,
        created_by: userId,
        created_at: now,
        collaborators: []
      });

    if (error) {
      console.error('Error creating grocery list:', error);
      
      // Fallback to local storage if Supabase fails
      const newList = {
        id,
        name,
        createdBy: userId,
        createdAt: now,
        items: [],
        collaborators: []
      };
      
      // Store in local storage
      const existingLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      localStorage.setItem('grocery_lists', JSON.stringify([...existingLists, newList]));
      
      return newList;
    }

    return {
      id,
      name,
      createdBy: userId,
      createdAt: now,
      items: [],
      collaborators: []
    };
  } catch (error) {
    console.error('Error in createGroceryList:', error);
    return null;
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