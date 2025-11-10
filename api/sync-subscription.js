// API endpoint to manually sync subscription data from Stripe to Supabase
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log(`Syncing subscription for: ${email}`);

    // Get user from Supabase
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'Customer not found in Stripe' });
    }

    const customer = customers.data[0];
    console.log(`Found Stripe customer: ${customer.id}`);

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 1,
      status: 'all'
    });

    let paymentData = {
      user_id: userData.id,
      status: 'PAID',
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString()
    };

    // Check if user has an active subscription
    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      console.log(`Found subscription: ${subscription.id}, status: ${subscription.status}`);

      paymentData = {
        ...paymentData,
        payment_type: 'SUBSCRIPTION',
        stripe_subscription_id: subscription.id,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        status: subscription.status === 'active' ? 'PAID' : subscription.status.toUpperCase(),
        amount: subscription.items.data[0]?.price?.unit_amount / 100 || 4.99,
        currency: subscription.currency || 'usd'
      };
    } else {
      // Check for one-time payments (lifetime)
      const payments = await stripe.paymentIntents.list({
        customer: customer.id,
        limit: 10
      });

      const successfulPayment = payments.data.find(p => p.status === 'succeeded');
      
      if (successfulPayment) {
        console.log(`Found one-time payment: ${successfulPayment.id}`);
        paymentData = {
          ...paymentData,
          payment_type: 'LIFETIME',
          amount: successfulPayment.amount / 100,
          currency: successfulPayment.currency
        };
      } else {
        return res.status(404).json({ error: 'No payments found for this customer' });
      }
    }

    // Update or insert payment record
    const { data: updatedData, error: updateError } = await supabase
      .from('user_payments')
      .upsert(paymentData, {
        onConflict: 'user_id'
      })
      .select();

    if (updateError) {
      console.error('Error updating database:', updateError);
      return res.status(500).json({ error: 'Failed to update database', details: updateError.message });
    }

    console.log('Successfully synced subscription data');

    return res.status(200).json({
      success: true,
      message: 'Subscription synced successfully',
      data: updatedData[0]
    });

  } catch (error) {
    console.error('Error syncing subscription:', error);
    return res.status(500).json({ 
      error: 'Failed to sync subscription',
      details: error.message 
    });
  }
}
