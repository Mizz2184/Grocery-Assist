import { GroceryList, GroceryListItem, mockGroceryLists } from '@/utils/productData';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types/store';
import { getProductStore, STORE } from '@/utils/storeUtils';

// Database types
type DbGroceryList = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  collaborators?: string[];
};

type DbGroceryItem = {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  checked: boolean;
  product_data?: Product;
  created_at: string;
};

// Get user's grocery lists
export const getUserGroceryLists = async (userId: string): Promise<GroceryList[]> => {
  try {
    console.log('Fetching grocery lists for user:', userId);
    
    // Check if we have lists in localStorage (for anonymous users or fallback)
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const userLocalLists = localLists.filter((list: GroceryList) => list.createdBy === userId);
    
    // If we have local lists or we're using a mock user, return those
    if (userLocalLists.length > 0 || userId.startsWith('mock-')) {
      console.log('Using local lists for user', userId, userLocalLists.length, 'lists found');
      return userLocalLists;
    }
    
    // Otherwise, try to fetch from Supabase
    console.log('Fetching lists from Supabase for user:', userId);
    
    // Get lists owned by the user
    const { data: ownedLists, error: ownedListsError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('user_id', userId);
      
    if (ownedListsError) {
      console.error('Error fetching owned grocery lists:', ownedListsError);
      // Return local lists as fallback
      return userLocalLists;
    }
    
    console.log('Owned lists fetched:', ownedLists?.length || 0);
    
    // Get lists where user is a collaborator 
    let sharedLists = [];
    try {
      const { data: shared, error: sharedListsError } = await supabase
        .from('grocery_lists')
        .select('*')
        .contains('collaborators', [userId]);
      
      if (!sharedListsError && shared) {
        sharedLists = shared;
        console.log('Shared lists fetched:', shared?.length || 0);
      } else if (sharedListsError) {
        console.error('Error fetching shared lists:', sharedListsError);
      }
    } catch (sharedError) {
      console.error('Error fetching shared lists:', sharedError);
    }
    
    // Combine owned and shared lists
    const lists = [...(ownedLists || []), ...sharedLists];
    console.log('Total lists fetched:', lists?.length || 0);
    
    if (!lists || lists.length === 0) {
      console.log('No lists found in database, returning empty array');
      return [];
    }

    // Fetch items for all lists
    console.log('Fetching items for lists:', lists.map(l => l.id));
    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .in('list_id', lists.map(list => list.id));

    if (itemsError) {
      console.error('Error fetching grocery items:', itemsError);
      return [];
    }
    
    console.log('Items fetched:', items?.length || 0);
    
    // Transform data to match application format - using type assertion to fix type issues
    const result = lists.map((list: DbGroceryList) => {
      // Map items with correct structure
      const listItems = items
        .filter((item: DbGroceryItem) => item.list_id === list.id)
        .map((item: DbGroceryItem) => {
          // Ensure product_data has the required properties with proper type assertions
          const productData = item.product_data as any || {};
          
          // Debug information about the product we're processing
          console.log(`Processing item ${item.id} for list ${list.id}, product_id: ${item.product_id}`);
          
          if (productData && productData.store) {
            console.log(`Item ${item.id} store information: ${productData.store}`);
          } else {
            console.log(`Item ${item.id} has no store information`);
          }
          
          // Add missing required properties if needed
          if (productData && !productData.image && productData.imageUrl) {
            productData.image = productData.imageUrl;
          }
          
          if (productData && !productData.prices) {
            const storeId = productData.store 
              ? productData.store.toLowerCase().replace(/\s+/g, '')  // Convert "MaxiPali" to "maxipali"
              : 'unknown';
              
            productData.prices = [
              {
                storeId: storeId,
                price: productData.price || 0,
                currency: '₡',
                date: new Date().toISOString()
              }
            ];
            
            console.log(`Added prices array with storeId: ${storeId}`);
          }
          
          return {
            id: item.id,
            productId: item.product_id,
            quantity: item.quantity,
            addedBy: userId,
            addedAt: new Date().toISOString(),
            checked: item.checked || false,
            productData: productData as any // Use type assertion
          };
        });
        
      console.log(`List ${list.id} has ${listItems.length} items`);
      
      return {
        id: list.id,
        name: list.name,
        createdBy: list.user_id,
        createdAt: list.created_at,
        collaborators: list.collaborators || [],
        items: listItems
      } as GroceryList; // Type assertion to fix compatibility issue
    });
    
    console.log('Transformed lists:', result.length);
    return result;
  } catch (error) {
    console.error('Error in getUserGroceryLists:', error);
    
    // Fallback to localStorage if Supabase fails
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const userLocalLists = localLists.filter((list: GroceryList) => list.createdBy === userId);
    console.log('Falling back to localStorage, found', userLocalLists.length, 'lists');
    return userLocalLists;
  }
};

// Get a grocery list by ID
export const getGroceryListById = async (
  listId: string, 
  userId: string = 'unknown'
): Promise<GroceryList | undefined> => {
  try {
    // Fetch list from database
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
          addedBy: userId,
          addedAt: new Date().toISOString(),
          checked: item.checked,
          // Use user's product data if available, otherwise use embedded product_data
          productData: userProduct || item.product_data
        };
      })
    };
  } catch (error) {
    console.error('Error in getGroceryListById:', error);
    return undefined;
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
    // Ensure product has store information properly set using our utility function
    const originalStore = product.store;
    
    // Get the normalized store value (for proper grouping)
    product.store = getProductStore(product);
    
    // Log the store detection for debugging
    console.log(`addProductToGroceryList: Product ${product.id} store detection - Original: ${originalStore}, Normalized: ${product.store}`);
    
    // Add some store-specific validation
    if (product.store === 'Walmart' && originalStore && originalStore.toLowerCase().includes('maxi')) {
      console.warn(`Potential store mismatch detected! Product has Walmart attributes but MaxiPali name: ${product.id}. Will use Walmart.`);
    }
    
    if (product.store === 'MaxiPali' && originalStore && originalStore.toLowerCase().includes('walmart')) {
      console.warn(`Potential store mismatch detected! Product has MaxiPali attributes but Walmart name: ${product.id}. Will use MaxiPali.`);
    }
    
    // Check if the user already has this product in any list
    const lists = await getUserGroceryLists(userId);
    const targetList = lists.find(list => list.id === listId);
    
    if (!targetList) {
      return { success: false, message: 'Grocery list not found' };
    }
    
    // Check if product already exists in the list by product ID and store
    const existingItem = targetList.items.find(item => {
      // First check if product IDs match
      if (item.productId === product.id) {
        // Now check if stores match using our normalized store detection
        const itemStore = getProductStore(item.productData);
        const newItemStore = getProductStore(product);
        
        console.log(`addProductToGroceryList: Comparing stores for duplicate check - List item: ${itemStore}, New item: ${newItemStore}`);
        
        // Check for exact match
        if (itemStore === newItemStore) {
          return true;
        }
        
        // Also check if both are the same store with different formatting
        const itemStoreLower = itemStore.toLowerCase();
        const newItemStoreLower = newItemStore.toLowerCase();
        
        // Check for MaxiPali vs MasxMenos special case - but avoid Walmart/MaxiPali confusion
        if (((itemStoreLower.includes('maxi') && newItemStoreLower.includes('maxi')) ||
            (itemStoreLower.includes('mas') && newItemStoreLower.includes('mas'))) &&
            !itemStoreLower.includes('walmart') && !newItemStoreLower.includes('walmart')) {
          
          // Both MaxiPali
          if (!itemStoreLower.includes('menos') && !newItemStoreLower.includes('menos')) {
            console.log(`addProductToGroceryList: Both items appear to be MaxiPali products`);
            return true;
          }
          
          // Both MasxMenos
          if (itemStoreLower.includes('menos') && newItemStoreLower.includes('menos')) {
            console.log(`addProductToGroceryList: Both items appear to be MasxMenos products`);
            return true;
          }
        }
      }
      
      return false;
    });
    
    if (existingItem) {
      console.log(`Product already exists in list (id: ${existingItem.id}), increasing quantity from ${existingItem.quantity} to ${existingItem.quantity + quantity}`);
      
      // Product exists, update quantity instead of adding a new item
      try {
        const { error } = await supabase
          .from('grocery_items')
          .update({ 
            quantity: existingItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);
          
        if (error) {
          console.error('Error updating item quantity in Supabase:', error);
          return { 
            success: false, 
            message: `Database error: ${error.message || 'Unknown error updating quantity'}`
          };
        }
        
        // Update in-memory list
        targetList.items = targetList.items.map(item => {
          if (item.id === existingItem.id) {
            return {
              ...item,
              quantity: item.quantity + quantity
            };
          }
          return item;
        });
        
        return { 
          success: true, 
          message: 'Updated quantity in list',
          list: targetList
        };
      } catch (updateError) {
        console.error('Error updating quantity:', updateError);
        return { 
          success: false, 
          message: updateError instanceof Error ? updateError.message : 'Unknown error updating quantity'
        };
      }
    }
    
    // Try to insert into Supabase first
    const itemId = uuidv4();
    const now = new Date().toISOString();
    
    // Make sure product_data has correct store information
    const productData = { ...product };
    
    // Log the store information for debugging
    console.log(`Adding product to list with store: ${productData.store}`);
    
    // First, verify user has access to this list
    try {
      const { data: listData, error: listError } = await supabase
        .from('grocery_lists')
        .select('user_id, collaborators')
        .eq('id', listId)
        .single();
        
      if (listError) {
        console.error('Error fetching list permissions:', listError);
        
        // Check if it's a not found error or another type of error
        if (listError.code === 'PGRST116') {
          console.log('List not found, might be a new list');
          // Continue with insertion for new lists
        } else {
          return { success: false, message: 'Could not verify list access permissions' };
        }
      } else if (listData) {
        // Check if user is owner or collaborator
        const isOwner = listData.user_id === userId;
        const isCollaborator = Array.isArray(listData.collaborators) && 
                              listData.collaborators.includes(userId);
                              
        if (!isOwner && !isCollaborator) {
          console.error('User does not have permission to add items to this list');
          return { success: false, message: 'You do not have permission to add items to this list' };
        }
      }
    } catch (permError) {
      console.error('Error checking permissions:', permError);
      // Continue with insertion anyway, better user experience than failing
      console.log('Continuing despite permission check error');
    }
    
    // Create the item with only essential fields
    const itemData = {
      id: itemId,
      list_id: listId,
      product_id: product.id,
      quantity: quantity || 1,
      checked: false,
      product_data: productData,
      created_at: now
    };

    console.log('Inserting item with data:', itemData);
    
    // Log to verify user is authenticated
    const { data: authData } = await supabase.auth.getSession();
    console.log('Auth session:', authData?.session ? 'Authenticated' : 'Not authenticated');
    
    // If we're not authenticated, try to refresh the session
    if (!authData?.session) {
      console.log('No auth session found, attempting to refresh');
      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Error refreshing session:', refreshError);
          return { success: false, message: 'Authentication error: Not authenticated' };
        }
      } catch (authError) {
        console.error('Error during auth refresh:', authError);
      }
    }
    
    // First try to use direct insert
    const { error: insertError } = await supabase
      .from('grocery_items')
      .insert(itemData);

    // If there's any error, return the error
    if (insertError) {
      console.error('Database error when adding product to list:', insertError);
      return { 
        success: false, 
        message: `Database error: ${insertError.message || 'Unknown error'}. Please try again or contact support.` 
      };
    }

    // Return success with the updated list
    // Update in-memory list for immediate UI feedback
    targetList.items.push({
      id: itemId,
      productId: product.id,
      quantity: quantity,
      addedBy: userId,
      addedAt: now,
      checked: false,
      productData: {
        ...product,
        // Ensure these required fields are present with default values if missing
        brand: product.brand || 'Unknown',
        image: product.imageUrl || product.image || '',
        barcode: product.barcode || '',
        category: product.category || 'Other',
        prices: product.prices || []
      } as any // Use type assertion to handle the type mismatch
    });
    
    return { 
      success: true, 
      message: 'Added to list successfully',
      list: targetList
    };
  } catch (error) {
    console.error('Error in addProductToGroceryList:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Create a new grocery list
 * @param userId 
 * @param name 
 * @returns 
 */
export const createGroceryList = async (userId: string, name: string): Promise<GroceryList> => {
  console.log(`Creating grocery list "${name}" for user ${userId}`);
  
  // Generate a new UUID for the list
  const listId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Create the list object
  const newList: GroceryList = {
    id: listId,
    name,
    createdBy: userId,
    createdAt: now,
    items: [],
    collaborators: []
  };
  
  try {
    // Insert into database
    const { error } = await supabase
      .from('grocery_lists')
      .insert({
        id: listId,
        name,
        user_id: userId,
        created_at: now,
        collaborators: []
      });
      
    if (error) {
      console.error('Error creating grocery list in database:', error);
      throw new Error('Failed to create grocery list in database');
    }
    
    return newList;
  } catch (error) {
    console.error('Error in createGroceryList:', error);
    throw new Error('Failed to create grocery list');
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
    // First remove from localStorage if present
    try {
      const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      let itemFound = false;
      
      // Update all lists that might contain this item
      const updatedLists = localLists.map((list: GroceryList) => {
        const initialLength = list.items.length;
        list.items = list.items.filter(item => item.id !== itemId);
        
        // Check if we found and removed the item
        if (list.items.length < initialLength) {
          itemFound = true;
        }
        
        return list;
      });
      
      // Save updated lists back to localStorage
      localStorage.setItem('grocery_lists', JSON.stringify(updatedLists));
      
      if (itemFound) {
        console.log(`Item ${itemId} removed from localStorage`);
      }
    } catch (localStorageError) {
      console.error('Error updating localStorage:', localStorageError);
      // Continue with database deletion even if localStorage update fails
    }
    
    // Then remove from database
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
    console.log(`Getting shared grocery list: listId=${listId}, userId=${userId}`);
    
    // First get user email for checking collaborator access
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user data:', userError);
      return undefined;
    }
    
    const userEmail = userData?.user?.email?.toLowerCase();
    console.log(`User email for collaborator check: ${userEmail}`);
    
    // Fetch list
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError) {
      console.error('Error fetching grocery list:', listError, listId);
      return undefined;
    }
    
    console.log('List data retrieved:', {
      id: list.id,
      name: list.name,
      owner: list.user_id,
      collaborators: list.collaborators
    });
    
    // Check if user has access to this list (owner or collaborator)
    const isOwner = list.user_id === userId;
    
    // Check if user's email is in the collaborators list
    const isCollaborator = list.collaborators && 
      Array.isArray(list.collaborators) && 
      userEmail && 
      list.collaborators.some((email: string) => 
        typeof email === 'string' && email.toLowerCase() === userEmail
      );
    
    console.log(`Access check: isOwner=${isOwner}, isCollaborator=${isCollaborator}`);
    
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
    
    console.log(`Retrieved ${items?.length || 0} items for the grocery list`);
    
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

    // Get the owner's user information to display who shared the list
    let ownerName = "Unknown";
    try {
      const { data: ownerData, error: ownerError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', list.user_id)
        .single();
        
      if (!ownerError && ownerData) {
        ownerName = ownerData.name || ownerData.email || "Unknown";
      }
    } catch (ownerError) {
      console.error('Error fetching owner info:', ownerError);
    }

    // Transform data to match application format
    const result = {
      id: list.id,
      name: list.name,
      createdBy: ownerName,
      createdAt: list.created_at,
      collaborators: list.collaborators || [],
      isShared: !isOwner,
      items: items.map((item: DbGroceryItem) => {
        // Look up product in user's product database first
        const userProduct = productMap.get(item.product_id);
        
        return {
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          addedBy: userId,
          addedAt: new Date().toISOString(),
          checked: item.checked,
          // Use user's product data if available, otherwise use embedded product_data
          productData: userProduct || item.product_data
        };
      })
    };
    
    console.log(`Successfully returning shared list with ${result.items.length} items`);
    return result;
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
    console.log(`Normalized email: ${normalizedEmail}`);
    
    // Step 1: Get the list data with minimal fields
    try {
      const { data: listData, error: listError } = await supabase
        .from('grocery_lists')
        .select('id, user_id, name, collaborators')
        .eq('id', listId)
        .single();
      
      if (listError || !listData) {
        console.error('Error fetching list:', listError);
        return handleCollaboratorWithLocalStorage(listId, normalizedEmail);
      }
      
      console.log('List data retrieved:', {
        id: listData.id,
        createdBy: listData.user_id,
        collaborators: listData.collaborators
      });
      
      // Step 2: Check permission
      const isOwner = listData.user_id === userId;
      console.log(`Is user the owner? ${isOwner}, list.user_id=${listData.user_id}, userId=${userId}`);
      
      if (!isOwner) {
        console.error('User does not have permission to modify this list');
        return false;
      }
      
      // Step 3: Handle collaborators
      let collaborators = Array.isArray(listData.collaborators) ? 
        [...listData.collaborators] : [];
      
      console.log('Current collaborators:', collaborators);
      
      // Don't add if already present
      if (collaborators.includes(normalizedEmail)) {
        console.log('Email already in collaborators list');
        return true;
      }
      
      // Step 4: Try to find the user by email to ensure they exist
      // Even if we don't find them, we'll still add the email to the collaborators array
      // but this will help us know if we need to send an invitation
      let collaboratorExists = false;
      let collaboratorId = null;
      try {
        // Check in the public users table
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', normalizedEmail)
          .limit(1);
          
        collaboratorExists = !usersError && users && users.length > 0;
        if (collaboratorExists && users && users.length > 0) {
          collaboratorId = users[0].id;
        }
        console.log(`User with email ${normalizedEmail} found in public.users: ${collaboratorExists}, id: ${collaboratorId}`);
      } catch (userError) {
        console.error('Error checking if user exists:', userError);
        // Continue anyway, we'll still add the email
      }
      
      // Add the new collaborator
      collaborators.push(normalizedEmail);
      console.log('New collaborators array:', collaborators);
      
      // Step 5: Update the list with the new collaborators
      const { error: updateError } = await supabase
        .from('grocery_lists')
        .update({ collaborators })
        .eq('id', listId);
        
      if (updateError) {
        console.error('Error updating collaborators:', updateError);
        return handleCollaboratorWithLocalStorage(listId, normalizedEmail);
      }
      
      // Step 6: Create a notification for the new collaborator
      try {
        // Get current user's profile to include in notification
        const { data: { user } } = await supabase.auth.getUser();
        const senderName = user?.user_metadata?.full_name || user?.email || 'Someone';
        
        console.log('Creating notification with sender:', senderName);
        
        // Create notification in the database
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_email: normalizedEmail,
            type: 'share_invitation',
            content: `${senderName} shared a grocery list with you: "${listData.name}"`,
            metadata: {
              listId: listId,
              listName: listData.name,
              senderId: userId,
              senderName: senderName
            },
            is_read: false,
            created_at: new Date().toISOString()
          });
          
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        } else {
          console.log('Created notification for collaborator');
        }
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue anyway, the collaborator was already added
      }
      
      // Step 7: Try to send an invitation email
      try {
        await sendCollaboratorInvite(userId, listId, listData.name, normalizedEmail);
        console.log('Sent invitation email');
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Continue anyway, the collaborator was already added
      }
      
      // Update localStorage for immediate UI updates
      updateLocalStorageCollaborators(listId, normalizedEmail);
      
      console.log('Successfully added collaborator');
      return true;
    } catch (error) {
      console.error('Error in database operations:', error);
      return handleCollaboratorWithLocalStorage(listId, normalizedEmail);
    }
  } catch (error) {
    console.error('Error in addCollaborator:', error);
    return handleCollaboratorWithLocalStorage(listId, collaboratorEmail.trim().toLowerCase());
  }
};

// Helper function to handle collaborator updates in localStorage
function handleCollaboratorWithLocalStorage(listId: string, email: string): boolean {
  try {
    console.log('Using localStorage fallback for collaborator update');
    // Update localStorage for immediate UI updates
    return updateLocalStorageCollaborators(listId, email);
  } catch (error) {
    console.error('Error updating collaborators in localStorage:', error);
    return false;
  }
}

// Helper function to update collaborators in localStorage
function updateLocalStorageCollaborators(listId: string, email: string): boolean {
  try {
    console.log('Using localStorage for collaborator update:', { listId, email });
    
    // Normalize email
    const normalizedEmail = email.toLowerCase();
    
    const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const list = lists.find((l: GroceryList) => l.id === listId);
    
    if (!list) {
      console.error('List not found in localStorage');
      return false;
    }
    
    if (!list.collaborators) {
      list.collaborators = [];
    }
    
    // Check if email already exists (case insensitive)
    const emailExists = list.collaborators.some((e: string) => 
      typeof e === 'string' && e.toLowerCase() === normalizedEmail
    );
    
    console.log('Current collaborators:', list.collaborators);
    console.log('Email already exists:', emailExists);
    
    if (!emailExists) {
      list.collaborators.push(normalizedEmail);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
      console.log('Updated collaborators in localStorage:', list.collaborators);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating localStorage:', error);
    return false;
  }
}

// Remove a collaborator from a grocery list
export const removeCollaborator = async (userId: string, listId: string, collaboratorEmail: string): Promise<boolean> => {
  try {
    console.log(`===> Starting removeCollaborator: userId=${userId}, listId=${listId}, email=${collaboratorEmail}`);
    
    // Normalize the email address
    const normalizedEmail = collaboratorEmail.trim().toLowerCase();
    console.log(`===> Normalized email: ${normalizedEmail}`);
    
    // Try database operation first
    let databaseSuccess = false;
    
    try {
      // Check if user has permission to remove collaborators (must be the owner)
      const { data: list, error: fetchError } = await supabase
        .from('grocery_lists')
        .select('id, user_id, collaborators')
        .eq('id', listId)
        .single();
        
      if (fetchError) {
        console.error('===> Error fetching list:', fetchError);
      } else {
        console.log('===> List fetched successfully:', list);
        
        // Check if the user is the owner
        const isOwner = list.user_id === userId;
        console.log(`===> Is user the owner? ${isOwner}, list.user_id=${list.user_id}, userId=${userId}`);
        
        if (!isOwner) {
          console.error('===> User does not have permission to remove collaborators');
          return false;
        }
        
        // Current collaborators
        console.log('===> Current collaborators:', list.collaborators);
        
        // Ensure we have a valid collaborators array
        if (!Array.isArray(list.collaborators)) {
          console.log('===> Collaborators is not an array, initializing empty array');
          list.collaborators = [];
        }
        
        // Check if the email exists in the collaborators list
        const emailExists = list.collaborators.some(email => 
          typeof email === 'string' && email.toLowerCase() === normalizedEmail
        );
        
        if (!emailExists) {
          console.log(`===> Email ${normalizedEmail} not found in collaborators list`);
          return true; // Consider it "removed" since it's not there
        }
        
        // Get current collaborators and remove the email - use case-insensitive comparison
        const collaborators = list.collaborators.filter(email => 
          typeof email !== 'string' || email.toLowerCase() !== normalizedEmail
        );
        
        console.log('===> New collaborators array after removal:', collaborators);
        
        // Update the list with new collaborators
        const { error: updateError } = await supabase
          .from('grocery_lists')
          .update({ collaborators })
          .eq('id', listId);
          
        if (updateError) {
          console.error('===> Error updating collaborators in database:', updateError);
        } else {
          console.log('===> Successfully removed collaborator in database');
          databaseSuccess = true;
        }
      }
    } catch (dbError) {
      console.error('===> Database error in removeCollaborator:', dbError);
    }
    
    // Always update localStorage for immediate UI updates and fallback
    console.log('===> Attempting to update localStorage');
    try {
      removeCollaboratorFromLocalStorage(listId, normalizedEmail);
      console.log('===> Successfully removed collaborator in localStorage');
      
      return true; // Consider the operation successful if localStorage update worked
    } catch (localError) {
      console.error('===> Error updating localStorage:', localError);
      return databaseSuccess; // Return database result if localStorage failed
    }
  } catch (error) {
    console.error('===> Error in removeCollaborator:', error);
    return false;
  }
};

// Helper function to remove a collaborator from localStorage
function removeCollaboratorFromLocalStorage(listId: string, email: string): boolean {
  try {
    console.log(`===> removeCollaboratorFromLocalStorage: listId=${listId}, email=${email}`);
    
    const normalizedEmail = email.toLowerCase();
    console.log(`===> Normalized email for localStorage: ${normalizedEmail}`);
    
    const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    console.log(`===> Found ${lists.length} lists in localStorage`);
    
    const listIndex = lists.findIndex((list: any) => list.id === listId);
    console.log(`===> List index in localStorage: ${listIndex}`);
    
    if (listIndex === -1) {
      console.log('===> List not found in localStorage');
      return false;
    }
    
    const list = lists[listIndex];
    console.log(`===> Found list: ${list.name}`);
    
    if (!list.collaborators) {
      console.log('===> No collaborators array in list');
      list.collaborators = [];
      return true; // Nothing to remove
    }
    
    console.log(`===> Current collaborators: ${list.collaborators.join(', ')}`);
    
    // Filter out the email to remove - case insensitive comparison
    const originalLength = list.collaborators.length;
    list.collaborators = list.collaborators.filter((e: string) => {
      if (typeof e !== 'string') return true;
      return e.toLowerCase() !== normalizedEmail;
    });
    
    console.log(`===> New collaborators: ${list.collaborators.join(', ')}`);
    console.log(`===> Removed ${originalLength - list.collaborators.length} collaborator(s)`);
    
    // Update localStorage
    localStorage.setItem('grocery_lists', JSON.stringify(lists));
    console.log('===> Updated localStorage');
    
    return true;
  } catch (error) {
    console.error('===> Error updating collaborators in localStorage:', error);
    return false;
  }
}

// Send invite email to collaborator
export const sendCollaboratorInvite = async (
  userId: string,
  listId: string,
  listName: string,
  collaboratorEmail: string
): Promise<boolean> => {
  try {
    // Log the attempt
    console.log(`Sending invitation email to ${collaboratorEmail} for list ${listName} (${listId})`);
    
    // First, create a sharing link
    const shareUrl = `${window.location.origin}/shared-list/${listId}`;
    
    // Try to send email using Supabase Edge Functions if in production
    if (import.meta.env.PROD) {
      try {
        const { error } = await supabase.functions.invoke('send-collaborator-invite', {
          body: { 
            userId, 
            listId, 
            listName, 
            collaboratorEmail,
            shareUrl
          }
        });
        
        if (error) {
          console.error('Error invoking Edge Function:', error);
          throw new Error('Failed to send email via Edge Function');
        }
        
        return true;
      } catch (edgeFunctionError) {
        console.error('Edge Function error:', edgeFunctionError);
        // Continue to fallback method
      }
    }
    
    // Fallback: Store the invitation in the database
    try {
      // Get current user's details
      const { data: { user } } = await supabase.auth.getUser();
      const senderName = user?.user_metadata?.full_name || user?.email || 'Someone';
      
      // Store invitation in database
      const { error: insertError } = await supabase
        .from('invitations')
        .insert({
          sender_id: userId,
          sender_name: senderName,
          recipient_email: collaboratorEmail,
          list_id: listId,
          list_name: listName,
          share_url: shareUrl,
          created_at: new Date().toISOString(),
          status: 'pending'
        });
        
      if (insertError) {
        console.error('Error storing invitation:', insertError);
        throw new Error('Failed to store invitation');
      }
      
      console.log('Stored invitation in database');
      return true;
    } catch (dbError) {
      console.error('Database error:', dbError);
    }
    
    // As a last resort, display a message that user can manually share
    console.log(`Unable to send invitation. Share this URL manually: ${shareUrl}`);
    return false;
  } catch (error) {
    console.error('Error sending invite email:', error);
    return false;
  }
};

// Helper function to update a list in the database
const updateListInDatabase = async (list: GroceryList, userId: string) => {
  try {
    // Check if the list exists
    const { data: existingList, error: listCheckError } = await supabase
      .from('grocery_lists')
      .select('id')
      .eq('id', list.id)
      .single();
      
    if (listCheckError && listCheckError.code !== 'PGRST116') {
      // If the error is not "row not found", it's a more serious error
      console.error('Error checking if list exists:', listCheckError);
      return { success: false, message: 'Database connection error' };
    }
    
    // Check if we need to create the list or update it
    const listExists = !!existingList;
    
    if (!listExists) {
      // Create the list - without updated_at since it doesn't exist in schema
      const { error: createError } = await supabase
        .from('grocery_lists')
        .insert({
          id: list.id,
          name: list.name,
          user_id: userId,
          created_at: list.createdAt,
          collaborators: list.collaborators || []
        });
        
      if (createError) {
        console.error('Error creating list in database:', createError);
        return { success: false, message: 'Failed to create list in database' };
      }
    } else {
      // Update the list - without updated_at since it doesn't exist in schema
      const { error: updateError } = await supabase
        .from('grocery_lists')
        .update({
          name: list.name,
          collaborators: list.collaborators || []
        })
        .eq('id', list.id);
        
      if (updateError) {
        console.error('Error updating list in database:', updateError);
        return { success: false, message: 'Failed to update list in database' };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating list in database:', error);
    return { success: false, message: 'An error occurred while updating the list' };
  }
};

/**
 * Sync a grocery list to the database
 * @param list 
 * @param userId 
 * @returns 
 */
export const syncGroceryListToDatabase = async (list: GroceryList, userId: string): Promise<{ success: boolean; message?: string }> => {
  console.log(`Syncing grocery list "${list.name}" to database for user ${userId}`);
  
  try {
    // Update the list in the database
    const updateResult = await updateListInDatabase(list, userId);
    if (!updateResult.success) {
      return updateResult;
    }
    
    // Now sync all items
    // First, get existing items to determine which to create/update/delete
    const { data: existingItems, error: itemsError } = await supabase
      .from('grocery_items')
      .select('id')
      .eq('list_id', list.id);
      
    if (itemsError) {
      console.error('Error fetching existing items:', itemsError);
      return { success: false, message: 'Failed to fetch existing items' };
    }
    
    // Create a set of existing item IDs for quick lookup
    const existingItemIds = new Set((existingItems || []).map(item => item.id));
    
    // Process each item in the list
    for (const item of list.items) {
      // Check if this item exists
      const itemExists = existingItemIds.has(item.id);
      
      if (!itemExists) {
        // Create the item
        const { error: createItemError } = await supabase
          .from('grocery_items')
          .insert({
            id: item.id,
            list_id: list.id,
            product_id: item.productId,
            quantity: item.quantity,
            checked: item.checked,
            product_data: item.productData || {},
            user_id: userId,
            created_at: item.addedAt || new Date().toISOString()
          });
          
        if (createItemError) {
          console.error('Error creating item in database:', createItemError);
          // Continue with other items
        }
      } else {
        // Update the item
        const { error: updateItemError } = await supabase
          .from('grocery_items')
          .update({
            quantity: item.quantity,
            checked: item.checked,
            product_data: item.productData || {},
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
          
        if (updateItemError) {
          console.error('Error updating item in database:', updateItemError);
          // Continue with other items
        }
        
        // Remove this ID from the set
        existingItemIds.delete(item.id);
      }
    }
    
    // Delete any items that exist in the database but not in the list
    if (existingItemIds.size > 0) {
      const itemsToDelete = Array.from(existingItemIds);
      
      const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .in('id', itemsToDelete);
        
      if (deleteError) {
        console.error('Error deleting items from database:', deleteError);
        // Continue anyway
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error syncing grocery list to database:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
};

/**
 * Renames a grocery list and syncs to database
 * @param listId The ID of the list to rename
 * @param userId The user ID who owns the list
 * @param newName The new name for the list
 * @returns Success status
 */
export const renameGroceryList = async (
  listId: string,
  userId: string,
  newName: string
): Promise<boolean> => {
  try {
    // Update in local state first
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    if (listIndex === -1) {
      console.error('List not found in localStorage');
      return false;
    }
    
    // Update name
    localLists[listIndex].name = newName;
    localStorage.setItem('grocery_lists', JSON.stringify(localLists));
    
    // Skip database sync for mock users
    if (userId.startsWith('mock-')) {
      return true;
    }
    
    // Update in database
    const { error } = await supabase
      .from('grocery_lists')
      .update({ name: newName })
      .eq('id', listId);
      
    if (error) {
      console.error('Error renaming list in database:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in renameGroceryList:', error);
    return false;
  }
};

/**
 * Deletes a grocery list and all its items
 * @param listId The ID of the list to delete
 * @param userId The user ID who owns the list
 * @returns Success status
 */
export const deleteGroceryList = async (
  listId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Remove from local state first
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const updatedLists = localLists.filter((list: GroceryList) => list.id !== listId);
    localStorage.setItem('grocery_lists', JSON.stringify(updatedLists));
    
    // Skip database sync for mock users
    if (userId.startsWith('mock-')) {
      return true;
    }
    
    // Delete from database - items will be deleted automatically due to ON DELETE CASCADE
    const { error } = await supabase
      .from('grocery_lists')
      .delete()
      .eq('id', listId);
      
    if (error) {
      console.error('Error deleting list from database:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteGroceryList:', error);
    return false;
  }
};

/**
 * Updates a grocery list with new items and saves to database
 * @param listId The ID of the list to update
 * @param userId The user ID who owns the list
 * @param items The new items for the list
 * @returns Success status and updated list
 */
export const updateGroceryListItems = async (
  listId: string,
  userId: string,
  items: GroceryListItem[]
): Promise<{ success: boolean; list?: GroceryList }> => {
  try {
    // Update in local state first
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    if (listIndex === -1) {
      console.error('List not found in localStorage');
      return { success: false };
    }
    
    // Update items
    localLists[listIndex].items = items;
    localStorage.setItem('grocery_lists', JSON.stringify(localLists));
    
    // Skip database sync for mock users
    if (userId.startsWith('mock-')) {
      return { success: true, list: localLists[listIndex] };
    }
    
    // Sync to database
    const result = await syncGroceryListToDatabase(localLists[listIndex], userId);
    return result;
  } catch (error) {
    console.error('Error in updateGroceryListItems:', error);
    return { success: false };
  }
};

/**
 * Updates a grocery list item with provided changes
 * @param listId The ID of the list containing the item 
 * @param itemId The ID of the item to update
 * @param userId The user ID making the changes
 * @param updates The changes to apply to the item
 * @returns Success status and updated item
 */
export const updateListItem = async (
  listId: string,
  itemId: string,
  userId: string,
  updates: Partial<GroceryListItem>
): Promise<{ success: boolean; item?: any; message?: string }> => {
  console.log(`Updating item ${itemId} in list ${listId} for user ${userId}`, updates);

  try {
    // Convert from GroceryListItem format to database format
    const dbUpdates: any = {};
    
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.checked !== undefined) dbUpdates.checked = updates.checked;
    if (updates.productData !== undefined) dbUpdates.product_data = updates.productData;

    console.log('Database updates:', dbUpdates);
    
    // Update the item in the database
    const { data, error } = await supabase
      .from('grocery_items')
      .update(dbUpdates)
      .eq('id', itemId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating item in database:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    return { success: true, item: data };
  } catch (error) {
    console.error('Error in updateListItem:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};