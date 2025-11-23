/**
 * Stripe to Supabase Payment Sync Script
 * 
 * This script scans all paid customers in Stripe and ensures they have
 * corresponding user accounts and payment records in Supabase.
 * 
 * Usage:
 *   node sync-stripe-payments.js
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Statistics
const stats = {
  totalCustomers: 0,
  activeSubscriptions: 0,
  oneTimePayments: 0,
  usersCreated: 0,
  usersExisting: 0,
  paymentsCreated: 0,
  paymentsUpdated: 0,
  errors: 0
};

async function syncStripeToSupabase() {
  console.log('\n🔄 Starting Stripe to Supabase sync...\n');
  console.log('='.repeat(60));

  try {
    // Fetch all customers from Stripe
    console.log('📥 Fetching customers from Stripe...');
    const customers = await stripe.customers.list({
      limit: 100,
      expand: ['data.subscriptions']
    });

    stats.totalCustomers = customers.data.length;
    console.log(`✅ Found ${stats.totalCustomers} customers in Stripe\n`);

    // Get all existing users from Supabase
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Error fetching Supabase users:', listError);
      return;
    }

    const existingUserEmails = new Set(existingUsers.users.map(u => u.email));
    console.log(`📊 Found ${existingUsers.users.length} existing users in Supabase\n`);
    console.log('='.repeat(60));

    // Process each customer
    for (const customer of customers.data) {
      try {
        await processCustomer(customer, existingUserEmails, existingUsers.users);
      } catch (error) {
        console.error(`❌ Error processing customer ${customer.id}:`, error.message);
        stats.errors++;
      }
    }

    // Print summary
    printSummary();

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

async function processCustomer(customer, existingUserEmails, existingUsers) {
  const email = customer.email;
  
  if (!email) {
    console.log(`⚠️  Customer ${customer.id} has no email, skipping...`);
    return;
  }

  console.log(`\n👤 Processing: ${email}`);
  console.log(`   Customer ID: ${customer.id}`);

  // Check if customer has active subscriptions
  const subscriptions = customer.subscriptions?.data || [];
  const activeSubscription = subscriptions.find(sub => 
    sub.status === 'active' || sub.status === 'trialing'
  );

  // Check if customer has any successful payments
  let hasSuccessfulPayment = false;
  try {
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 1
    });
    hasSuccessfulPayment = charges.data.some(charge => charge.paid);
  } catch (error) {
    console.log(`   ⚠️  Could not fetch charges: ${error.message}`);
  }

  // Determine if this customer should have access
  const shouldHaveAccess = activeSubscription || hasSuccessfulPayment;

  if (!shouldHaveAccess) {
    console.log(`   ⏭️  No active subscription or payment, skipping...`);
    return;
  }

  // Determine payment type
  let paymentType = 'ONE_TIME';
  let subscriptionId = null;
  let currentPeriodEnd = null;

  if (activeSubscription) {
    paymentType = 'SUBSCRIPTION';
    subscriptionId = activeSubscription.id;
    try {
      currentPeriodEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
    } catch (error) {
      console.log(`   ⚠️  Invalid period end date, using null`);
      currentPeriodEnd = null;
    }
    stats.activeSubscriptions++;
    console.log(`   💳 Active subscription: ${subscriptionId}`);
    console.log(`   📅 Period ends: ${currentPeriodEnd || 'N/A'}`);
  } else {
    stats.oneTimePayments++;
    console.log(`   💰 One-time payment`);
  }

  // Check if user exists in Supabase
  let userId;
  const existingUser = existingUsers.find(u => u.email === email);

  if (existingUser) {
    userId = existingUser.id;
    stats.usersExisting++;
    console.log(`   ✅ User exists in Supabase: ${userId}`);
  } else {
    // Create user in Supabase
    console.log(`   👤 Creating new user in Supabase...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true,
      user_metadata: {
        full_name: customer.name || '',
        created_via: 'stripe_sync',
        stripe_customer_id: customer.id
      }
    });

    if (createError) {
      console.error(`   ❌ Error creating user:`, createError.message);
      stats.errors++;
      return;
    }

    userId = newUser.user.id;
    stats.usersCreated++;
    console.log(`   ✅ User created: ${userId}`);
  }

  // Check if payment record exists
  const { data: existingPayment } = await supabase
    .from('user_payments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Create or update payment record
  const paymentData = {
    user_id: userId,
    status: 'PAID',
    payment_type: paymentType,
    stripe_customer_id: customer.id,
    stripe_subscription_id: subscriptionId,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: activeSubscription?.cancel_at_period_end || false,
    updated_at: new Date().toISOString()
  };

  if (!existingPayment) {
    try {
      paymentData.created_at = new Date().toISOString();
    } catch (error) {
      console.log(`   ⚠️  Error creating timestamp, using current time`);
      paymentData.created_at = new Date().toISOString();
    }
  }

  const { error: upsertError } = await supabase
    .from('user_payments')
    .upsert(paymentData, {
      onConflict: 'user_id'
    });

  if (upsertError) {
    console.error(`   ❌ Error upserting payment:`, upsertError.message);
    stats.errors++;
    return;
  }

  if (existingPayment) {
    stats.paymentsUpdated++;
    console.log(`   ✅ Payment record updated`);
  } else {
    stats.paymentsCreated++;
    console.log(`   ✅ Payment record created`);
  }

  console.log(`   🎊 User ${email} is synced and can access the app!`);
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SYNC SUMMARY\n');
  console.log('='.repeat(60));
  console.log(`\nStripe Customers:`);
  console.log(`  Total customers scanned:     ${stats.totalCustomers}`);
  console.log(`  Active subscriptions:        ${stats.activeSubscriptions}`);
  console.log(`  One-time payments:           ${stats.oneTimePayments}`);
  console.log(`\nSupabase Users:`);
  console.log(`  Users created:               ${stats.usersCreated}`);
  console.log(`  Users already existed:       ${stats.usersExisting}`);
  console.log(`\nPayment Records:`);
  console.log(`  Payment records created:     ${stats.paymentsCreated}`);
  console.log(`  Payment records updated:     ${stats.paymentsUpdated}`);
  console.log(`\nErrors:                        ${stats.errors}`);
  console.log('\n' + '='.repeat(60));
  
  if (stats.errors === 0) {
    console.log('\n✅ Sync completed successfully!\n');
  } else {
    console.log('\n⚠️  Sync completed with errors. Check logs above.\n');
  }
}

// Run the sync
syncStripeToSupabase().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
