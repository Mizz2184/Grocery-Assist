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
    // This will be a server call to check if the user has paid
    // For now, we'll check local storage to persist payment status for demo
    const paymentStatus = localStorage.getItem(`payment_status_${userId}`);
    return paymentStatus === 'paid';
  } catch (error) {
    console.error('Error checking payment status:', error);
    return false;
  }
};

// Mark a user as paid (locally)
export const markUserAsPaid = (userId: string): void => {
  localStorage.setItem(`payment_status_${userId}`, 'paid');
};

// In a real implementation, you would verify the payment server-side
// using webhooks from Stripe and update a user_payments table in your database 