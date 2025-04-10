// Stripe client for client-side interactions
// Publishable key is safe to use on the client side
import { 
  checkUserPaymentStatus as dbCheckUserPaymentStatus,
  setUserPaymentPending as dbSetUserPaymentPending,
  setUserPaid as dbSetUserPaid,
  getPaymentSessionId as dbGetPaymentSessionId,
  PAYMENT_STATUS
} from '@/lib/services/userService';

// Use import.meta.env for Vite environment variables
// This will be replaced at build time with the actual value
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';

// Direct payment link that can be used for checkout
export const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/test_placeholder';

// App subscription price
export const APP_PRICE = 19.99;

// Check if a user has paid for access
export const checkUserPaymentStatus = async (userId: string): Promise<boolean> => {
  try {
    return await dbCheckUserPaymentStatus(userId);
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};

// Mark a user as having a pending payment
export const markUserPaymentPending = async (userId: string, sessionId: string): Promise<void> => {
  try {
    await dbSetUserPaymentPending(userId, sessionId);
    // For backwards compatibility during transition
    const pendingData = {
      sessionId,
      timestamp: Date.now()
    };
    localStorage.setItem(`payment_pending_${userId}`, JSON.stringify(pendingData));
    console.log('Set pending payment status for user:', userId, 'with session:', sessionId);
  } catch (error) {
    console.error('Error marking payment as pending:', error);
  }
};

// Mark a user as paid
export const markUserAsPaid = async (userId: string): Promise<void> => {
  try {
    await dbSetUserPaid(userId);
    // For backwards compatibility during transition
    localStorage.removeItem(`payment_pending_${userId}`);
    localStorage.setItem(`payment_status_${userId}`, PAYMENT_STATUS.PAID);
    console.log('Set paid status for user:', userId);
  } catch (error) {
    console.error('Error marking user as paid:', error);
  }
};

// Clear payment status (useful for testing or if payment needs to be reset)
export const clearPaymentStatus = async (userId: string): Promise<void> => {
  try {
    // Set status to NONE in the database
    await dbSetUserPaid(userId);
    // For backwards compatibility during transition
    localStorage.removeItem(`payment_status_${userId}`);
    localStorage.removeItem(`payment_pending_${userId}`);
    console.log('Cleared payment status for user:', userId);
  } catch (error) {
    console.error('Error clearing payment status:', error);
  }
};

// Get the current payment session ID for a user
export const getPaymentSessionId = async (userId: string): Promise<string | null> => {
  try {
    const dbSessionId = await dbGetPaymentSessionId(userId);
    if (dbSessionId) {
      return dbSessionId;
    }
    
    // Fall back to localStorage for backwards compatibility during transition
    try {
      const pendingPayment = localStorage.getItem(`payment_pending_${userId}`);
      if (pendingPayment) {
        const pendingData = JSON.parse(pendingPayment);
        return pendingData.sessionId || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  } catch (error) {
    console.error('Error getting payment session ID:', error);
    return null;
  }
};

// In a real implementation, you would verify the payment server-side
// using webhooks from Stripe and update a user_payments table in your database 