// Stripe Webhook Handler for Vercel Serverless Functions
// This endpoint receives payment events from Stripe and updates the database

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
);

// Webhook endpoint secret from Stripe
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  
  const customerEmail = session.customer_email || session.customer_details?.email;
  
  if (!customerEmail) {
    console.error('No customer email found in session');
    return;
  }

  // Get user by email using RPC function
  const { data: userId, error: userError } = await supabase
    .rpc('get_user_id_by_email', { user_email: customerEmail });

  if (userError || !userId) {
    console.error('User not found:', customerEmail, userError);
    return;
  }

  // Determine payment type (subscription or one-time)
  const isSubscription = session.mode === 'subscription';
  const paymentType = isSubscription ? 'SUBSCRIPTION' : 'LIFETIME';

  // Get current period end for subscriptions
  let currentPeriodEnd = null;
  if (isSubscription && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  }

  // Update or insert payment record
  const { error: paymentError } = await supabase
    .from('user_payments')
    .upsert({
      user_id: userId,
      status: 'PAID',
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription || null,
      payment_type: paymentType,
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (paymentError) {
    console.error('Error updating payment status:', paymentError);
  } else {
    console.log(`Payment status updated for user: ${customerEmail}`);
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  
  // Payment intents from payment links include customer info
  if (paymentIntent.customer) {
    const customer = await stripe.customers.retrieve(paymentIntent.customer);
    
    if (customer.email) {
      // Get user by email using RPC function
      const { data: userId, error: userError } = await supabase
        .rpc('get_user_id_by_email', { user_email: customer.email });

      if (!userError && userId) {
        // Update payment status
        await supabase
          .from('user_payments')
          .upsert({
            user_id: userId,
            status: 'PAID',
            stripe_customer_id: paymentIntent.customer,
            payment_type: 'LIFETIME',
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
        
        console.log(`Payment recorded for user: ${customer.email}`);
      }
    }
  }
}

// Handle subscription updates
async function handleSubscriptionUpdate(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer);
  
  if (customer.email) {
    const { data: userId } = await supabase
      .rpc('get_user_id_by_email', { user_email: customer.email });

    if (userId) {
      await supabase
        .from('user_payments')
        .upsert({
          user_id: userId,
          status: subscription.status === 'active' ? 'PAID' : 'PENDING',
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          payment_type: 'SUBSCRIPTION',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      console.log(`Subscription updated for user: ${customer.email}`);
    }
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer);
  
  if (customer.email) {
    const { data: userId } = await supabase
      .rpc('get_user_id_by_email', { user_email: customer.email });

    if (userId) {
      await supabase
        .from('user_payments')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      console.log(`Subscription cancelled for user: ${customer.email}`);
    }
  }
}

// Handle successful invoice payment (for recurring subscriptions)
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    await handleSubscriptionUpdate(subscription);
  }
}
