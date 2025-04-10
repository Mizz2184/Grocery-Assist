// Stripe configuration
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_PUBLISHABLE_KEY } from './stripe/stripe-client';

// Load Stripe with the publishable key
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Utility function to format price for Stripe (convert to cents)
export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

// Utility function to format displayable amount from Stripe (convert from cents)
export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100;
}; 