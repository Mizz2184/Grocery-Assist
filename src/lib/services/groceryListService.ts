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
    // Get lists owned by the user
    const { data: ownedLists, error: ownedListsError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('created_by', userId);
      
    if (ownedListsError) {
      console.error('Error fetching owned grocery lists:', ownedListsError);
      // Return local lists as fallback
      return userLocalLists;
    }
    
    // Get user's email for checking shared lists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user email:', userError);
      // Continue with owned lists only
      const lists = [...(ownedLists || [])];
      // Rest of processing...
    }
    
    // Get the user's email
    const userEmail = userData?.email;
    
    // Get lists where user is a collaborator by checking if their email is in the collaborators array
    let sharedLists = [];
    if (userEmail) {
      const { data: shared, error: sharedListsError } = await supabase
        .from('grocery_lists')
        .select('*')
        .contains('collaborators', [userEmail]);
      
      if (sharedListsError) {
        console.error('Error fetching shared grocery lists:', sharedListsError);
      } else {
        sharedLists = shared || [];
      }
    }
    
    // Combine owned and shared lists
    const lists = [...(ownedLists || []), ...sharedLists];
    
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
      createdBy: list.created_by,
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
      .eq('user_id', list.created_by);
      
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
      createdBy: list.created_by,
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
    // First, try to save to Supabase
    const productData = {
      id: product.id,
      name: product.name,
      brand: product.brand || 'Unknown',
      image: product.imageUrl || '', // Convert imageUrl to image
      barcode: product.barcode || product.ean || '',
      category: product.category || 'Other',
      prices: [{ // Convert single price to prices array
        storeId: product.store?.toLowerCase() || 'unknown',
        price: product.price,
        currency: '₡',
        date: new Date().toISOString()
      }]
    };

    // Check if product already exists in user_products
    const { data: existingProduct } = await supabase
      .from('user_products')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', product.id)
      .single();

    if (!existingProduct) {
      // Save product to user_products table
      const { error: productError } = await supabase
        .from('user_products')
        .insert({
          user_id: userId,
          product_id: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          image_url: product.imageUrl,
          store: product.store?.trim(),
          category: product.category
        });

      if (productError) {
        console.error('Error saving product to user_products:', productError);
        // Continue with localStorage as fallback
      }
    }

    // Check if item already exists in grocery_items
    const { data: existingItem } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId)
      .eq('product_id', product.id)
      .single();

    if (existingItem) {
      // Update quantity if item exists
      const { error: updateError } = await supabase
        .from('grocery_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Error updating item quantity in Supabase:', updateError);
        // Continue with localStorage as fallback
      }
    } else {
      // Insert new item
      const { error: insertError } = await supabase
        .from('grocery_items')
        .insert({
          list_id: listId,
          user_id: userId,
          product_id: product.id,
          quantity,
          checked: false
        });

      if (insertError) {
        console.error('Error inserting item into Supabase:', insertError);
        // Continue with localStorage as fallback
      }
    }

    // Update localStorage as fallback and for immediate UI updates
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
        productData: productData
      };
      list.items.push(newItem);
    }
    
    // Update localStorage
    localStorage.setItem('grocery_lists', JSON.stringify(localLists));
    
    return Promise.resolve({ success: true, list });
  } catch (error) {
    console.error('Error adding product to list:', error);
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
        created_by: userId,
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

// Add this new function to handle item deletion
export const deleteGroceryListItem = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting item from Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteGroceryListItem:', error);
    return false;
  }
};

// Get grocery list by ID with permission check
export const getSharedGroceryListById = async (userId: string, listId: string): Promise<GroceryList | undefined> => {
  try {
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
    
    // Check if user has access to this list (owner or collaborator)
    const isOwner = list.created_by === userId;
    const isCollaborator = list.collaborators && list.collaborators.includes(userId);
    
    if (!isOwner && !isCollaborator) {
      console.error('User does not have access to this list');
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
    return {
      id: list.id,
      name: list.name,
      createdBy: list.created_by,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      isShared: isOwner ? false : true,
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
    console.error('Error in getSharedGroceryListById:', error);
    return undefined;
  }
};

// Add a collaborator to a grocery list
export const addCollaborator = async (userId: string, listId: string, collaboratorEmail: string): Promise<boolean> => {
  try {
    console.log(`Starting addCollaborator: userId=${userId}, listId=${listId}, email=${collaboratorEmail}`);
    
    // Normalize the email address
    const normalizedEmail = collaboratorEmail.trim().toLowerCase();
    
    // Step 1: Get the list data
    const { data: listData, error: listError } = await supabase
      .from('grocery_lists')
      .select('id, created_by, collaborators')
      .eq('id', listId)
      .single();
    
    if (listError || !listData) {
      console.error('Error fetching list:', listError);
      return false;
    }
    
    console.log('List data retrieved:', {
      id: listData.id,
      createdBy: listData.created_by,
      collaborators: listData.collaborators
    });
    
    // Step 2: Check permission
    const isOwner = listData.created_by === userId;
    if (!isOwner) {
      console.error('User does not have permission to modify this list');
      return false;
    }
    
    // Step 3: Handle collaborators
    let collaborators = Array.isArray(listData.collaborators) ? 
      [...listData.collaborators] : [];
    
    // Don't add if already present
    if (collaborators.includes(normalizedEmail)) {
      console.log('Email already in collaborators list');
      return true;
    }
    
    // Add the new collaborator
    collaborators.push(normalizedEmail);
    console.log('New collaborators array:', collaborators);
    
    // Step 4: Update the list with the new collaborators
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ collaborators })
      .eq('id', listId);
      
    if (updateError) {
      console.error('Error updating collaborators:', updateError);
      return false;
    }
    
    console.log('Successfully added collaborator');
    return true;
  } catch (error) {
    console.error('Error in addCollaborator:', error);
    return false;
  }
};

// Remove a collaborator from a grocery list
export const removeCollaborator = async (userId: string, listId: string, collaboratorEmail: string): Promise<boolean> => {
  try {
    // Check if user has permission to remove collaborators (must be the owner)
    const { data: list, error: fetchError } = await supabase
      .from('grocery_lists')
      .select('id, created_by, collaborators')
      .eq('id', listId)
      .eq('created_by', userId)
      .single();
      
    if (fetchError) {
      console.error('Error fetching list or user does not have permission:', fetchError);
      return false;
    }
    
    // Get current collaborators and remove the email
    const collaborators = (list.collaborators || []).filter(email => email !== collaboratorEmail);
    
    // Update the list with new collaborators
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ collaborators })
      .eq('id', listId);
      
    if (updateError) {
      console.error('Error updating collaborators:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in removeCollaborator:', error);
    return false;
  }
};

// Send invite email to collaborator
export const sendCollaboratorInvite = async (
  userId: string,
  listId: string,
  listName: string,
  collaboratorEmail: string
): Promise<boolean> => {
  try {
    // This would typically connect to a server-side function
    // For now, we'll just log the attempt and return success
    console.log(`[INVITE EMAIL] Would send email to ${collaboratorEmail} for list ${listName} (${listId})`);
    
    // In a real implementation, you would call a server function:
    // const { error } = await supabase.functions.invoke('send-collaborator-invite', {
    //   body: { userId, listId, listName, collaboratorEmail }
    // });
    
    // For now, we'll return true to indicate success
    return true;
  } catch (error) {
    console.error('Error sending invite email:', error);
    return false;
  }
};