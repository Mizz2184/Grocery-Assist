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
};

type DbGroceryItem = {
  id: string;
  list_id: string;
  product_id: string;
  quantity: number;
  checked: boolean;
  product_data?: Product;
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
    // Ensure product has store information properly set
    if (product.store) {
      // Normalize store property for consistency
      const storeName = String(product.store).trim().toLowerCase();
      
      // Check for Walmart first to prevent false positives
      if (storeName === 'walmart' || storeName.includes('walmart')) {
        product.store = 'Walmart';
      } else if (storeName === 'maxipali' || storeName.includes('maxipali')) {
        product.store = 'MaxiPali';
      } else if (storeName === 'masxmenos' || storeName.includes('masxmenos') || storeName.includes('mas x menos')) {
        product.store = 'MasxMenos';
      }
    } else {
      // If store is missing, try to detect from product ID or name
      const productId = String(product.id || '').toLowerCase();
      const productName = String(product.name || '').toLowerCase();
      
      // Check for Walmart first to prevent false positives
      if (productId.includes('walmart') || productName.includes('walmart')) {
        product.store = 'Walmart';
      } else if (productId.includes('maxipali') || productName.includes('maxipali')) {
        product.store = 'MaxiPali';
      } else if (productId.includes('masxmenos') || productName.includes('masxmenos') || productName.includes('mas x menos')) {
        product.store = 'MasxMenos';
      } else {
        product.store = 'Unknown';
      }
    }
    
    // Log the store detection for debugging
    console.log(`Detected store for product (${product.id}): ${product.store}`);
    
    // Check if the user already has this product in any list
    const lists = await getUserGroceryLists(userId);
    const targetList = lists.find(list => list.id === listId);
    
    if (!targetList) {
      return { success: false, message: 'Grocery list not found' };
    }
    
    // Try to insert into Supabase first
    const itemId = uuidv4();
    const now = new Date().toISOString();
    
    // Make sure product_data has correct store information
    const productData = { ...product };
    
    // Ensure store property is always set correctly
    if (!productData.store) {
      const productId = product.id?.toLowerCase() || '';
      const productName = product.name?.toLowerCase() || '';
      
      // Check for Walmart first to prevent false positives
      if (productId.includes('walmart') || productName.includes('walmart')) {
        productData.store = 'Walmart';
      } else if (productId.includes('maxipali') || productName.includes('maxipali')) {
        productData.store = 'MaxiPali';
      } else if (productId.includes('masxmenos') || productId.includes('masxmenos')) {
        productData.store = 'MasxMenos';
      } else {
        productData.store = 'Unknown';
      }
    }
    
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
      product_data: productData
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

    // If there's any error, fall back to localStorage
    if (insertError) {
      console.log('Database error detected, falling back to localStorage:', insertError);
      
      // Fall back to localStorage for now as a temporary workaround
      const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
      const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
      
      if (listIndex !== -1) {
        const list = localLists[listIndex];
        const existingItemIndex = list.items.findIndex(item => item.productId === product.id);
        
        if (existingItemIndex >= 0) {
          // Update quantity of existing item
          list.items[existingItemIndex].quantity += quantity;
        } else {
          // Add new item
          list.items.push({
            id: itemId,
            productId: product.id,
            quantity: quantity,
            addedBy: userId,
            addedAt: new Date().toISOString(),
            checked: false,
            productData: productData
          });
        }
        
        localStorage.setItem('grocery_lists', JSON.stringify(localLists));
        
        return { 
          success: true, 
          message: 'Added to list (using local storage)',
          list: list
        };
      }
      
      console.error('Error adding item to list:', insertError);
      return { success: false, message: `Database error: ${insertError.message || 'Unknown error'}` };
    }

    // Always update localStorage for immediate UI updates and fallback
    const localLists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const listIndex = localLists.findIndex((list: GroceryList) => list.id === listId);
    
    if (listIndex === -1) {
      return { 
        success: true, 
        message: 'Added to list (local only)',
        list: targetList
      };
    }
    
    const list = localLists[listIndex];
    const existingItemIndex = list.items.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      list.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item with normalized store information
      list.items.push({
        id: itemId,
        productId: product.id,
        quantity: quantity,
        addedBy: userId,
        addedAt: now,
        checked: false,
        productData: productData
      });
    }
    
    localStorage.setItem('grocery_lists', JSON.stringify(localLists));
    
    return { 
      success: true, 
      message: 'Added to list successfully',
      list: list
    };
  } catch (error) {
    console.error('Error in addProductToGroceryList:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
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
    
    // Only insert fields we know exist in the database
    const listData = {
      id: newListId,
      user_id: userId,
      name,
      created_at: now,
      collaborators: []
    };
    
    // Try to insert into Supabase, handle errors gracefully
    let databaseSuccess = false;
    try {
      const { error: insertError } = await supabase
        .from('grocery_lists')
        .insert(listData);
  
      if (insertError) {
        console.error('Error creating grocery list in Supabase:', insertError);
      } else {
        databaseSuccess = true;
      }
    } catch (dbError) {
      console.error('Database error during list creation:', dbError);
    }
    
    // If database operation failed, fall back to localStorage
    if (!databaseSuccess) {
      console.log('Falling back to localStorage for list creation');
    }
    
    // Always add to localStorage for immediate UI updates
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
    const isOwner = list.user_id === userId;
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
      createdBy: list.user_id,
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
          addedBy: userId,
          addedAt: new Date().toISOString(),
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
      
      // Step 4: Try to find the user by email to ensure they exist
      // Even if we don't find them, we'll still add the email to the collaborators array
      // but this will help us know if we need to send an invitation
      let collaboratorExists = false;
      try {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id')
          .eq('email', normalizedEmail)
          .limit(1);
          
        collaboratorExists = !usersError && users && users.length > 0;
        console.log(`User with email ${normalizedEmail} exists: ${collaboratorExists}`);
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
        
        // Create notification in the database
        await supabase
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
          
        console.log('Created notification for collaborator');
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
    const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const list = lists.find((l: GroceryList) => l.id === listId);
    
    if (!list) {
      console.error('List not found in localStorage');
      return false;
    }
    
    if (!list.collaborators) {
      list.collaborators = [];
    }
    
    if (!list.collaborators.includes(email)) {
      list.collaborators.push(email);
      localStorage.setItem('grocery_lists', JSON.stringify(lists));
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
        
        // Get current collaborators and remove the email
        const collaborators = Array.isArray(list.collaborators) 
          ? list.collaborators.filter(email => email !== normalizedEmail)
          : [];
        
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
    
    // Filter out the email to remove
    const originalLength = list.collaborators.length;
    list.collaborators = list.collaborators.filter((e: string) => e !== email);
    
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