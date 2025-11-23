// API endpoint to cancel Stripe subscription
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with secret key
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials:', { 
    hasUrl: !!supabaseUrl, 
    hasKey: !!supabaseKey 
  });
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if services are initialized
    if (!stripe) {
      console.error('Stripe not initialized - missing STRIPE_SECRET_KEY');
      return res.status(500).json({ error: 'Server configuration error: Stripe not initialized' });
    }

    if (!supabase) {
      console.error('Supabase not initialized - missing credentials');
      return res.status(500).json({ error: 'Server configuration error: Supabase not initialized' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { userId } = req.body;

    // Verify the user is cancelling their own subscription
    if (user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden: Cannot cancel another user\'s subscription' });
    }

    // Get user's subscription info from database
    const { data: paymentData, error: paymentError } = await supabase
      .from('user_payments')
      .select('stripe_subscription_id, stripe_customer_id, payment_type, status')
      .eq('user_id', userId)
      .single();

    if (paymentError || !paymentData) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Check if user has a subscription (not lifetime)
    if (paymentData.payment_type !== 'SUBSCRIPTION') {
      return res.status(400).json({ error: 'User does not have an active subscription to cancel' });
    }

    if (!paymentData.stripe_subscription_id) {
      return res.status(400).json({ error: 'No Stripe subscription ID found' });
    }

    // Cancel the subscription at period end in Stripe
    const subscription = await stripe.subscriptions.update(
      paymentData.stripe_subscription_id,
      {
        cancel_at_period_end: true
      }
    );

    console.log('Stripe cancellation successful:', {
      subscriptionId: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end
    });

    // Update database to reflect cancellation
    const updateData = {
      cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    };

    // Only add current_period_end if it exists and is valid
    if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
      updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
    }

    console.log('Attempting database update with data:', updateData);

    const { data: updateResult, error: updateError } = await supabase
      .from('user_payments')
      .update(updateData)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('Error updating database:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      // Still return success since Stripe cancellation worked
      // The webhook will sync the data later
      return res.status(200).json({
        success: true,
        message: 'Subscription cancelled in Stripe. Database sync pending.',
        current_period_end: subscription.current_period_end,
        warning: 'Database update failed but cancellation is active'
      });
    }

    console.log('Database update successful:', updateResult);

    return res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      current_period_end: subscription.current_period_end
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ 
      error: 'Failed to cancel subscription',
      details: error.message 
    });
  }
}
