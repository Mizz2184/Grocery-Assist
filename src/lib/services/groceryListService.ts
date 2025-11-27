import { GroceryList, GroceryListItem, mockGroceryLists } from '@/utils/productData';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/utils/supabaseClient';
import { Product } from '@/lib/types/store';
import { getProductStore, STORE } from '@/utils/storeUtils';
import { createNotification } from '@/lib/services/notificationService';
import { logActivity } from '@/lib/services/activityService';

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

// Diagnostic log to check Supabase connection at module load time

// Get user's grocery lists
export const getUserGroceryLists = async (userId: string): Promise<GroceryList[]> => {
  try {
    // Get user's email for checking shared lists
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting user:', userError);
      return [];
    }
    
    const userEmail = user?.email;
    if (!userEmail) {
      console.error('User email not found');
      return [];
    }

    // Fetch all lists where user is either owner or collaborator
    const { data: allLists, error: listsError } = await supabase
      .from('grocery_lists')
      .select('*')
      .or(`user_id.eq.${userId},collaborators.cs.{${userEmail}}`);

    if (listsError) {
      console.error('Error fetching grocery lists:', listsError);
      return [];
    }

    // Fetch creator info separately for all unique user IDs
    const uniqueUserIds = [...new Set(allLists.map(list => list.user_id))];
    const { data: creators, error: creatorsError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', uniqueUserIds);

    if (creatorsError) {
      console.error('Error fetching creator profiles:', creatorsError);
      // Continue without creator info
    }

    // Create a map of user IDs to creator info
    const creatorMap = new Map();
    if (creators) {
      creators.forEach(creator => {
        creatorMap.set(creator.id, creator);
      });
    }

    // Fetch items for all lists
    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .in('list_id', allLists.map(list => list.id));

    if (itemsError) {
      console.error('Error fetching grocery items:', itemsError);
      return [];
    }

    // Transform data to match application format
    const result = allLists.map(list => {
      // Get list items
      const listItems = (items || [])
        .filter(item => item.list_id === list.id)
        .map(item => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity || 1,
          checked: item.checked || false,
          addedBy: item.user_id,
          addedAt: item.created_at,
          productData: item.product_data
        }));

      // Determine if user has edit permission
      const hasEditPermission = list.user_id === userId || 
        (Array.isArray(list.collaborators) && 
         list.collaborators.includes(userEmail));

      // Get creator info from the creator map
      const creator = creatorMap.get(list.user_id);
      const creatorEmail = creator?.email || list.user_id;
      const creatorName = creator?.full_name;

      return {
        id: list.id,
        name: list.name,
        createdBy: list.user_id,
        createdByEmail: creatorEmail,
        createdByName: creatorName,
        createdAt: list.created_at,
        collaborators: list.collaborators || [],
        hasEditPermission,
        items: listItems,
        ownerName: list.user_id === userId ? 'You' : 'Shared List'
      };
    });

    return result;
  } catch (error) {
    console.error('Error in getUserGroceryLists:', error);
    return [];
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
    // Extract quantity from product if it exists, otherwise use the parameter
    const actualQuantity = (product as any).quantity || quantity;
    
    // Ensure product has store information properly set using our utility function
    const originalStore = product.store;
    
    // Get the normalized store value (for proper grouping)
    product.store = getProductStore(product);
    
    // Log the store detection for debugging

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

            return true;
          }
          
          // Both MasxMenos
          if (itemStoreLower.includes('menos') && newItemStoreLower.includes('menos')) {

            return true;
          }
        }
      }
      
      return false;
    });
    
    if (existingItem) {

      // Product exists, update quantity instead of adding a new item
      try {
        const { error } = await supabase
          .from('grocery_items')
          .update({ 
            quantity: existingItem.quantity + actualQuantity,
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
              quantity: item.quantity + actualQuantity
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
    
    // Create the item with only essential fields
    const itemData = {
      id: itemId,
      list_id: listId,
      product_id: product.id,
      quantity: actualQuantity, // Use the quantity from product or parameter
      checked: false,
      product_data: {
        id: product.id,
        name: product.name,
        price: product.price,
        brand: product.brand,
        imageUrl: product.imageUrl,
        store: product.store || getProductStore(product),
        currency: product.currency || 'CRC'
      },
      created_at: now
    };

    // Insert the item into the database
    const { error: insertError } = await supabase
      .from('grocery_items')
      .insert(itemData);

    if (insertError) {
      console.error('Database error when adding product to list:', insertError);
      return { 
        success: false, 
        message: `Database error: ${insertError.message || 'Unknown error'}. Please try again or contact support.` 
      };
    }

    // Fetch the updated list to return
    const updatedList = await getGroceryListById(listId, userId);
    if (!updatedList) {
      return { 
        success: false, 
        message: 'Product was added but failed to fetch updated list' 
      };
    }

    // Log activity
    await logActivity(
      listId,
      userId,
      'item_added',
      product.name,
      itemId,
      product.id,
      {
        quantity: actualQuantity,
        store: product.store,
        price: product.price
      }
    );

    // Send notifications to collaborators
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Someone';
      const currentUserEmail = currentUser?.email;

      if (updatedList.collaborators && updatedList.collaborators.length > 0) {

        // For each collaborator email, find their user ID
        for (const collaboratorEmail of updatedList.collaborators) {

          // Skip if it's the current user
          if (collaboratorEmail === currentUserEmail) {

            continue;
          }
          
          // Use database function to get user ID from email

          const { data: userData, error: userError } = await supabase
            .rpc('get_user_id_by_email', { user_email: collaboratorEmail });

          if (!userError && userData) {

            const notificationResult = await createNotification(
              userData,
              'item_added',
              'Item added to shared list',
              `${userName} added ${product.name} to ${updatedList.name}`,
              {
                listId: listId,
                listName: updatedList.name,
                productId: product.id,
                productName: product.name,
                addedBy: userId
              }
            );

          } else {
            console.error(`❌ Could not find user ID for ${collaboratorEmail}:`, userError);
          }
        }
      } else {

      }
    } catch (notificationError) {
      console.error('💥 Error sending notifications:', notificationError);
      // Don't fail the operation if notifications fail
    }

    return { 
      success: true, 
      message: 'Added to list successfully',
      list: updatedList
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
 * Creates a new grocery list for a user
 * @param userId The ID of the user creating the list
 * @param name The name of the list
 * @returns The created grocery list
 */
export const createGroceryList = async (userId: string, name: string = 'New Grocery List'): Promise<GroceryList> => {
  const newListId = uuidv4();
  
  // Insert the new list
  const { data: list, error } = await supabase
    .from('grocery_lists')
    .insert({
      id: newListId,
      name: name,
      user_id: userId,
      collaborators: []
    })
    .select('id, name, user_id, collaborators, created_at')
    .single();

  if (error) {
    console.error('Error creating grocery list:', error);
    throw new Error('Failed to create grocery list');
  }

  if (!list) {
    throw new Error('Failed to create grocery list: No data returned');
  }

  // Return the list in the expected format
  return {
    id: list.id,
    name: list.name,
    createdBy: list.user_id,
    items: [],
    collaborators: list.collaborators || [],
    hasEditPermission: true,
    createdAt: list.created_at
  };
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
export const deleteGroceryListItem = async (
  itemId: string, 
  listId?: string, 
  userId?: string
): Promise<boolean> => {
  try {
    // Get item details before deletion for notification
    let itemName = 'an item';
    let listName = 'the list';
    let listCollaborators: string[] = [];
    
    if (listId && userId) {
      // Get the item details
      const { data: item } = await supabase
        .from('grocery_items')
        .select('product_data')
        .eq('id', itemId)
        .single();
      
      if (item?.product_data) {
        itemName = item.product_data.name || itemName;
      }
      
      // Get the list details
      const { data: list } = await supabase
        .from('grocery_lists')
        .select('name, collaborators')
        .eq('id', listId)
        .single();
      
      if (list) {
        listName = list.name;
        listCollaborators = list.collaborators || [];
      }
    }
    
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

    // Log activity
    if (listId && userId) {
      await logActivity(
        listId,
        userId,
        'item_deleted',
        itemName,
        itemId,
        undefined,
        {
          listName: listName
        }
      );
    }

    // Send notifications to collaborators
    if (listId && userId && listCollaborators.length > 0) {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const userName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Someone';
        const currentUserEmail = currentUser?.email;
        
        for (const collaboratorEmail of listCollaborators) {
          // Skip if it's the current user
          if (collaboratorEmail === currentUserEmail) continue;
          
          // Get collaborator user ID
          const { data: collaboratorUserId, error: userError } = await supabase
            .rpc('get_user_id_by_email', { user_email: collaboratorEmail });
          
          if (!userError && collaboratorUserId) {
            await createNotification(
              collaboratorUserId,
              'item_added',
              'Item removed from shared list',
              `${userName} removed ${itemName} from ${listName}`,
              {
                listId: listId,
                listName: listName,
                itemName: itemName,
                removedBy: userId
              }
            );
          }
        }
        
        // Also notify the list owner if current user is a collaborator
        const { data: list } = await supabase
          .from('grocery_lists')
          .select('user_id')
          .eq('id', listId)
          .single();
        
        if (list && list.user_id !== userId && list.user_id !== currentUserEmail) {
          await createNotification(
            list.user_id,
            'item_added',
            'Item removed from shared list',
            `${userName} removed ${itemName} from ${listName}`,
            {
              listId: listId,
              listName: listName,
              itemName: itemName,
              removedBy: userId
            }
          );
        }
      } catch (notificationError) {
        console.error('Error sending delete notifications:', notificationError);
        // Don't fail the deletion if notifications fail
      }
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
    // Validate listId format
    if (!listId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('Invalid list ID format:', listId);
      throw new Error('Invalid list ID format');
    }
    
    // Get user email for checking collaborator access
    let userEmail = "";
    let hasEditPermission = false;
    const isAnonymous = userId === 'anonymous';
    
    if (userId && !isAnonymous) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Error getting user data:', userError);
      } else {
        userEmail = userData?.user?.email?.toLowerCase() || "";

      }
    } else {

    }
    
    // Try direct connection to check if list exists

    try {
      // First check if we can connect to Supabase at all
      const { data: testData, error: testError } = await supabase
        .from('grocery_lists')
        .select('count')
        .limit(1);

      // Now try to get the specific list
      const { data: directCheck, error: directError } = await supabase
        .from('grocery_lists')
        .select('id, name, user_id, created_at, collaborators')
        .eq('id', listId);

      if (directCheck && directCheck.length > 0) {

      } else {

      }
    } catch (diagnosticError) {
      console.error('DIAGNOSTIC: Error during direct check:', diagnosticError);
    }

    // Fetch full list details from grocery_lists table - allow access to anyone with the link
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .maybeSingle();
      
    if (listError) {
      console.error('Error fetching grocery list:', listError);
      console.error('Error details:', JSON.stringify(listError));
      throw new Error('Could not load the grocery list. Database error: ' + listError.message);
    }
    
    if (!list) {
      console.error('Grocery list not found:', listId);
      
      // Check if the supabase instance is properly initialized


      throw new Error('The grocery list does not exist or may have been deleted.');
    }

    // Check if user is owner or collaborator for edit permissions
    const isOwner = !isAnonymous && userId === list.user_id;
    const isCollaborator = userEmail && list.collaborators && 
                          Array.isArray(list.collaborators) && 
                          list.collaborators.some(email => email.toLowerCase() === userEmail);
    
    hasEditPermission = isOwner || isCollaborator;

    // Fetch items for the list from grocery_items table

    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .eq('list_id', listId);

    if (itemsError) {
      console.error('Error fetching grocery items:', itemsError);
      throw new Error('Could not load grocery list items. Please try again.');
    }

    // Debug: Print the first item's structure if available
    if (items && items.length > 0) {

    }

    // Get the owner's user information to display who shared the list
    let ownerName = "Unknown";
    
    try {
      const { data: ownerData, error: ownerError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', list.user_id)
        .maybeSingle();
        
      if (!ownerError && ownerData) {
        ownerName = ownerData.full_name || ownerData.email || "Unknown";
      } else {
        // Fallback to auth user info if profile not found
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(list.user_id);
        if (!userError && userData && userData.user) {
          ownerName = userData.user.email || "Unknown";
        }
      }

    } catch (e) {
      console.error('Error getting owner name:', e);
    }
    
    // Transform DB list to application list format
    const result = {
      id: list.id,
      name: list.name,
      createdBy: ownerName,
      createdAt: list.created_at,
      isShared: true,
      hasEditPermission, // Added flag to indicate if the current user can edit
      collaborators: Array.isArray(list.collaborators) ? list.collaborators : [],
      items: (items || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity || 1,
        addedBy: list.user_id, // Use list owner as the adder
        addedAt: item.created_at || new Date().toISOString(),
        checked: item.checked || false,
        productData: item.product_data || {
          id: item.product_id,
          name: "Unknown Product",
          brand: "",
          image: "",
          barcode: "",
          category: "",
          prices: []
        }
      })),
    };

    return result;
  } catch (error) {
    console.error('Error getting shared grocery list:', error);
    throw error;
  }
};

// Update the addCollaborator function with a better verification step
export const addCollaborator = async (
  userId: string,
  listId: string,
  collaboratorEmail: string
): Promise<boolean> => {
  try {
    // First, verify the user has permission to add collaborators
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError) {
      console.error('Error fetching list:', listError);
      return false;
    }

    if (list.user_id !== userId) {
      console.error('User does not have permission to add collaborators');
      return false;
    }

    // Normalize email to lowercase
    collaboratorEmail = collaboratorEmail.toLowerCase();

    // Get current collaborators array or initialize it
    const currentCollaborators = Array.isArray(list.collaborators) ? list.collaborators : [];

    // Check if collaborator is already added
    if (currentCollaborators.includes(collaboratorEmail)) {

      return true;
    }

    // Add new collaborator
    const updatedCollaborators = [...currentCollaborators, collaboratorEmail];

    // Update the list with new collaborator
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ 
        collaborators: updatedCollaborators
      })
      .eq('id', listId);

    if (updateError) {
      console.error('Error updating collaborators:', updateError);
      return false;
    }

    // Send invitation email to collaborator
    try {
      await sendCollaboratorInvite(userId, listId, list.name, collaboratorEmail);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Continue even if email fails - the user has been added as a collaborator
    }

    return true;
  } catch (error) {
    console.error('Error in addCollaborator:', error);
    return false;
  }
};

// Helper function to handle collaborator updates in localStorage
function handleCollaboratorWithLocalStorage(listId: string, email: string): boolean {
  try {

    updateLocalStorageCollaborators(listId, email);
    return true;
  } catch (error) {
    console.error('Error updating localStorage:', error);
    return false;
  }
}

// Helper function to update collaborators in localStorage
function updateLocalStorageCollaborators(listId: string, email: string): boolean {
  try {

    // Normalize email
    const normalizedEmail = email.toLowerCase();
    
    const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');
    const list = lists.find((l: GroceryList) => l.id === listId);
    
    if (!list) {
      console.error('List not found in localStorage');
      return false;
    }
    
    // Initialize collaborators array if needed
    if (!list.collaborators) {
      list.collaborators = [];
    }
    
    // Ensure collaborators is an array of strings
    if (!Array.isArray(list.collaborators)) {
      console.warn('Collaborators was not an array, resetting to empty array');
      list.collaborators = [];
    }
    
    // Normalize existing collaborators
    list.collaborators = list.collaborators
      .filter(item => item !== null && item !== undefined)
      .map(item => String(item).toLowerCase());
    
    // Check if email already exists (case insensitive)
    const emailExists = list.collaborators.includes(normalizedEmail);

    if (!emailExists) {
      list.collaborators.push(normalizedEmail);
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

    // Normalize the email address
    const normalizedEmail = collaboratorEmail.trim().toLowerCase();

    // Try database operation first
    let databaseSuccess = false;
    
    try {
      // Check if user has permission to remove collaborators (must be the owner)
      const { data: list, error: fetchError } = await supabase
        .from('grocery_lists')
        .select('id, user_id, collaborators')
        .eq('id', listId)
        .maybeSingle();
        
      if (fetchError) {
        console.error('===> Error fetching list:', fetchError);
        return false;
      }
      
      if (!list) {
        console.error('===> List not found:', listId);
        return false;
      }

      // Check if the user is the owner
      const isOwner = list.user_id === userId;

      if (!isOwner) {
        console.error('===> User does not have permission to remove collaborators');
        return false;
      }
      
      // Current collaborators

      // Clean up the collaborators array 
      if (!Array.isArray(list.collaborators)) {

        list.collaborators = [];
      }
      
      // Clean and normalize all existing collaborators
      const collaborators = list.collaborators
        .filter(item => item !== null && item !== undefined && item !== '')
        .map(item => String(item).toLowerCase().trim());
      
      // Check if the email exists in the collaborators list 
      const emailExists = collaborators.includes(normalizedEmail);
      
      if (!emailExists) {

        return true; // Consider it "removed" since it's not there
      }
      
      // Remove the email - use normalized comparison
      const updatedCollaborators = collaborators.filter(email => 
        email !== normalizedEmail
      );

      // Update the list with new collaborators
      const { error: updateError } = await supabase
        .from('grocery_lists')
        .update({ collaborators: updatedCollaborators })
        .eq('id', listId);
        
      if (updateError) {
        console.error('===> Error updating collaborators in database:', updateError);
      } else {

        databaseSuccess = true;
      }
    } catch (dbError) {
      console.error('===> Database error in removeCollaborator:', dbError);
    }
    
    // Always update localStorage for immediate UI updates and fallback

    try {
      removeCollaboratorFromLocalStorage(listId, normalizedEmail);

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

    const normalizedEmail = email.toLowerCase();

    const lists = JSON.parse(localStorage.getItem('grocery_lists') || '[]');

    const listIndex = lists.findIndex((list: any) => list.id === listId);

    if (listIndex === -1) {

      return false;
    }
    
    const list = lists[listIndex];

    if (!list.collaborators) {

      list.collaborators = [];
      return true; // Nothing to remove
    }

    // Filter out the email to remove - case insensitive comparison
    const originalLength = list.collaborators.length;
    list.collaborators = list.collaborators.filter((e: string) => {
      if (typeof e !== 'string') return true;
      return e.toLowerCase() !== normalizedEmail;
    });

    // Update localStorage
    localStorage.setItem('grocery_lists', JSON.stringify(lists));

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

    // Create a sharing link
    const shareUrl = `${window.location.origin}/shared-list/${listId}`;

    // For now, just return true since we don't have email functionality
    return true;
  } catch (error) {
    console.error('Error in sendCollaboratorInvite:', error);
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
    // First verify user has permission to rename this list
    const { data: listData, error: listError } = await supabase
      .from('grocery_lists')
      .select('user_id')
      .eq('id', listId)
      .single();

    if (listError) {
      console.error('Error fetching list:', listError);
      return false;
    }

    if (listData.user_id !== userId) {
      console.error('User does not have permission to rename this list');
      return false;
    }

    // Update the list name in Supabase
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ name: newName })
      .eq('id', listId);

    if (updateError) {
      console.error('Error updating list name:', updateError);
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

  try {
    // Convert from GroceryListItem format to database format
    const dbUpdates: any = {};
    
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.checked !== undefined) dbUpdates.checked = updates.checked;
    if (updates.productData !== undefined) dbUpdates.product_data = updates.productData;

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

// Add this new function at the end of the file
export const verifyListExists = async (listId: string): Promise<boolean> => {
  try {

    // First check Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('grocery_lists')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.error('DIAGNOSTIC: Supabase connection test failed:', testError);
      return false;
    }
    
    // Now check if the specific list exists
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('id, name, user_id, created_at')
      .eq('id', listId)
      .maybeSingle();
      
    if (listError) {
      console.error('DIAGNOSTIC: Error checking list existence:', listError);
      return false;
    }
    
    if (list) {

      return true;
    } else {

      return false;
    }
  } catch (error) {
    console.error('DIAGNOSTIC: Error in verifyListExists:', error);
    return false;
  }
};

export const addItemToSharedList = async (listId: string, item: GroceryListItem): Promise<GroceryList> => {
  // Get the current user's ID from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: list, error: listError } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('id', listId)
    .single();

  if (listError) {
    console.error('Error fetching list:', listError);
    throw new Error('Failed to fetch list');
  }

  const { error: insertError } = await supabase
    .from('grocery_items')
    .insert([
      {
        ...item,
        list_id: listId,
      },
    ]);

  if (insertError) {
    console.error('Error inserting item:', insertError);
    throw new Error('Failed to add item to list');
  }

  return getSharedGroceryListById(user.id, listId);
};

/**
 * Add a collaborator to a grocery list and send notification
 */
export const addCollaboratorToList = async (
  listId: string,
  collaboratorEmail: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get the list
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      return { success: false, message: 'List not found' };
    }

    // Check if user is the owner
    if (list.user_id !== userId) {
      return { success: false, message: 'Only the list owner can add collaborators' };
    }

    // Check if collaborator is already added
    const collaborators = list.collaborators || [];
    if (collaborators.includes(collaboratorEmail)) {
      return { success: false, message: 'User is already a collaborator' };
    }

    // Add collaborator
    const updatedCollaborators = [...collaborators, collaboratorEmail];
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ collaborators: updatedCollaborators })
      .eq('id', listId);

    if (updateError) {
      console.error('Error adding collaborator:', updateError);
      return { success: false, message: 'Failed to add collaborator' };
    }

    // Get current user info
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const userName = currentUser?.user_metadata?.full_name || currentUser?.email || 'Someone';

    // Find the collaborator's user ID using the database function
    const { data: collaboratorUserId, error: userError } = await supabase
      .rpc('get_user_id_by_email', { user_email: collaboratorEmail });

    // Send notification if user exists
    if (!userError && collaboratorUserId) {
      await createNotification(
        collaboratorUserId,
        'list_shared',
        'List shared with you',
        `${userName} shared "${list.name}" with you`,
        {
          listId: listId,
          listName: list.name,
          sharedBy: userId,
          sharedByName: userName
        }
      );
    } else {

    }

    return { success: true, message: 'Collaborator added successfully' };
  } catch (error) {
    console.error('Error in addCollaboratorToList:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Remove a collaborator from a grocery list
 */
export const removeCollaboratorFromList = async (
  listId: string,
  collaboratorEmail: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get the list
    const { data: list, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('id', listId)
      .single();

    if (listError || !list) {
      return { success: false, message: 'List not found' };
    }

    // Check if user is the owner
    if (list.user_id !== userId) {
      return { success: false, message: 'Only the list owner can remove collaborators' };
    }

    // Remove collaborator
    const collaborators = list.collaborators || [];
    const updatedCollaborators = collaborators.filter(email => email !== collaboratorEmail);
    
    const { error: updateError } = await supabase
      .from('grocery_lists')
      .update({ collaborators: updatedCollaborators })
      .eq('id', listId);

    if (updateError) {
      console.error('Error removing collaborator:', updateError);
      return { success: false, message: 'Failed to remove collaborator' };
    }

    return { success: true, message: 'Collaborator removed successfully' };
  } catch (error) {
    console.error('Error in removeCollaboratorFromList:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};