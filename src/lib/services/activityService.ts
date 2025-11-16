import { supabase } from '@/utils/supabaseClient';

export type ActivityAction = 
  | 'item_added' 
  | 'item_deleted' 
  | 'item_checked' 
  | 'item_unchecked' 
  | 'list_created';

export interface Activity {
  id: string;
  list_id: string;
  user_id: string;
  action: ActivityAction;
  item_name?: string;
  item_id?: string;
  product_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Log an activity for a grocery list
 */
export const logActivity = async (
  listId: string,
  userId: string,
  action: ActivityAction,
  itemName?: string,
  itemId?: string,
  productId?: string,
  metadata?: Record<string, any>
): Promise<Activity | null> => {
  try {

    const { data, error } = await supabase
      .from('grocery_list_activity')
      .insert({
        list_id: listId,
        user_id: userId,
        action,
        item_name: itemName,
        item_id: itemId,
        product_id: productId,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error logging activity:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('💥 Error in logActivity:', error);
    return null;
  }
};

/**
 * Get activity log for a grocery list
 */
export const getListActivity = async (
  listId: string,
  limit: number = 50
): Promise<Activity[]> => {
  try {
    const { data, error } = await supabase
      .from('grocery_list_activity')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getListActivity:', error);
    return [];
  }
};

/**
 * Get recent activity across all user's lists
 */
export const getUserActivity = async (
  userId: string,
  limit: number = 50
): Promise<Activity[]> => {
  try {
    const { data, error } = await supabase
      .from('grocery_list_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserActivity:', error);
    return [];
  }
};

/**
 * Format activity for display
 */
export const formatActivityMessage = (activity: Activity): string => {
  const time = new Date(activity.created_at).toLocaleString();
  
  switch (activity.action) {
    case 'item_added':
      return `Added "${activity.item_name}" at ${time}`;
    case 'item_deleted':
      return `Deleted "${activity.item_name}" at ${time}`;
    case 'item_checked':
      return `Checked "${activity.item_name}" at ${time}`;
    case 'item_unchecked':
      return `Unchecked "${activity.item_name}" at ${time}`;
    case 'list_created':
      return `List created at ${time}`;
    default:
      return `Activity at ${time}`;
  }
};
