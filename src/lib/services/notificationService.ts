import { supabase } from '@/utils/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export type NotificationType = 
  | 'list_shared' 
  | 'item_added' 
  | 'item_checked' 
  | 'list_updated' 
  | 'collaborator_added';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
  expires_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  list_shared: boolean;
  item_added: boolean;
  item_checked: boolean;
  list_updated: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new notification for a user
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<Notification | null> => {
  try {

    // Check if user has this notification type enabled
    const preferences = await getNotificationPreferences(userId);

    if (preferences && !preferences[type]) {

      return null;
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: data || {},
        read: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating notification:', error);
      return null;
    }

    return notification;
  } catch (error) {
    console.error('💥 Error in createNotification:', error);
    return null;
  }
};

/**
 * Get all notifications for a user
 */
export const getUserNotifications = async (
  userId: string,
  unreadOnly: boolean = false
): Promise<Notification[]> => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return [];
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return 0;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return false;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return false;
  }
};

/**
 * Delete all notifications for a user
 */
export const deleteAllNotifications = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAllNotifications:', error);
    return false;
  }
};

/**
 * Get notification preferences for a user
 */
export const getNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no preferences exist, create default ones
      if (error.code === 'PGRST116') {
        return await createDefaultNotificationPreferences(userId);
      }
      console.error('Error fetching notification preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getNotificationPreferences:', error);
    return null;
  }
};

/**
 * Create default notification preferences for a user
 */
export const createDefaultNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .insert({
        user_id: userId,
        email_notifications: true,
        push_notifications: true,
        list_shared: true,
        item_added: true,
        item_checked: false,
        list_updated: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createDefaultNotificationPreferences:', error);
    return null;
  }
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  userId: string,
  preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .update(preferences)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateNotificationPreferences:', error);
    return false;
  }
};

/**
 * Subscribe to real-time notifications
 */
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void
): RealtimeChannel => {

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {

        onNotification(payload.new as Notification);
      }
    )
    .subscribe((status) => {

    });

  return channel;
};

/**
 * Unsubscribe from notifications
 */
export const unsubscribeFromNotifications = async (channel: RealtimeChannel): Promise<void> => {
  await supabase.removeChannel(channel);
};

/**
 * Request browser push notification permission
 */
export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

/**
 * Show browser notification
 */
export const showBrowserNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    });
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
  }
};

/**
 * Subscribe to push notifications (Web Push API)
 */
export const subscribeToPushNotifications = async (
  userId: string
): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return false;
    }

    const permission = await requestPushPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission denied');
      return false;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    // Note: You'll need to generate VAPID keys and configure this
    // For now, this is a placeholder

    return true;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
};
