// Subscription management service
import { supabase } from '@/lib/supabase';

export interface SubscriptionInfo {
  status: string;
  payment_type: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/**
 * Get user's subscription information
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionInfo | null> {
  try {
    const { data, error } = await supabase
      .from('user_payments')
      .select('status, payment_type, stripe_subscription_id, stripe_customer_id, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Cancel subscription at period end (via API endpoint)
 * This calls the backend API which handles the Stripe cancellation
 */
export async function cancelSubscription(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Get the user's session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, message: 'Not authenticated' };
    }

    // Call the cancel subscription API endpoint
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ userId })
    });

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      return { 
        success: false, 
        message: `Server error: ${response.status} ${response.statusText}` 
      };
    }

    if (!response.ok) {
      console.error('Cancel subscription failed:', result);
      return { success: false, message: result.error || 'Failed to cancel subscription' };
    }

    // Check if the result indicates success
    if (result.success) {
      return { 
        success: true, 
        message: result.message || 'Subscription cancelled successfully' 
      };
    }

    return { success: true, message: 'Subscription cancelled successfully' };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, message: 'An error occurred while cancelling subscription' };
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
