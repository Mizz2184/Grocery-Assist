// Stripe client for client-side interactions
// Publishable key is safe to use on the client side
export const STRIPE_PUBLISHABLE_KEY = 'pk_live_51R79AbGPu5qL5mf2hM8Iou4LHV55JSSOzXFSDkP3OMDIghcufH2qWw2WRUUhNimptir1vARlpiaC8qVxbcyKIl6f00f6RVhpF2';

// Direct payment link that can be used for checkout
export const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/aEUfZTbgNgJGd0s000';

// App subscription price
export const APP_PRICE = 19.99;

// Check if a user has paid for access
export const checkUserPaymentStatus = async (userId: string): Promise<boolean> => {
  try {
    // Check both localStorage and sessionStorage for payment status
    const localPaymentStatus = localStorage.getItem(`payment_status_${userId}`);
    const sessionPaymentStatus = sessionStorage.getItem(`payment_status_${userId}`);
    
    // If either storage has the payment status, return true
    if (localPaymentStatus === 'paid' || sessionPaymentStatus === 'paid') {
      return true;
    }
    
    // In a real implementation, you would make an API call to your backend
    // to verify the payment status with Stripe
    return false;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};

// Mark a user as paid (locally)
export const markUserAsPaid = (userId: string): void => {
  // Store payment status in both localStorage and sessionStorage
  localStorage.setItem(`payment_status_${userId}`, 'paid');
  sessionStorage.setItem(`payment_status_${userId}`, 'paid');
  
  // In a real implementation, you would:
  // 1. Verify the payment with Stripe webhooks
  // 2. Update a user_payments table in your database
  // 3. Update the user's subscription status in your user management system
};

// Clear payment status (useful for testing or if payment needs to be reset)
export const clearPaymentStatus = (userId: string): void => {
  localStorage.removeItem(`payment_status_${userId}`);
  sessionStorage.removeItem(`payment_status_${userId}`);
};

// In a real implementation, you would verify the payment server-side
// using webhooks from Stripe and update a user_payments table in your database 