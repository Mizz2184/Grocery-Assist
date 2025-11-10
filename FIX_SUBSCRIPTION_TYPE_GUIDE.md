# Fix Subscription Type for Monthly Subscribers

## Problem
User `Holyteeshop@gmail.com` has a $4.99 monthly subscription but the app shows "Lifetime Access" instead of "Monthly Subscription" and doesn't show the cancel button.

## Root Cause
The `payment_type` in the database is incorrectly set to `LIFETIME` instead of `SUBSCRIPTION`, or the subscription data is missing.

## Solution

### Step 1: Check Current Status in Supabase

Run this in **Supabase SQL Editor**:

```sql
SELECT 
  u.email,
  up.status,
  up.payment_type,
  up.amount,
  up.stripe_customer_id,
  up.stripe_subscription_id,
  up.current_period_end,
  up.cancel_at_period_end
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email = 'Holyteeshop@gmail.com';
```

### Step 2: Get Subscription Details from Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Customers**
3. Search for `Holyteeshop@gmail.com`
4. Click on the customer
5. Find the **Subscriptions** section
6. Copy the **Subscription ID** (starts with `sub_`)
7. Note the **Current period end** date

### Step 3: Update Database with Correct Information

Run this in **Supabase SQL Editor** (replace values as needed):

```sql
UPDATE user_payments 
SET 
  payment_type = 'SUBSCRIPTION',
  amount = 4.99,
  currency = 'usd',
  stripe_subscription_id = 'sub_XXXXX',  -- Replace with actual subscription ID from Stripe
  current_period_end = '2025-12-10 00:00:00+00',  -- Replace with actual date from Stripe
  cancel_at_period_end = false,
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'Holyteeshop@gmail.com');
```

### Step 4: Verify the Fix

```sql
SELECT 
  u.email,
  up.status,
  up.payment_type,
  up.amount,
  up.stripe_customer_id,
  up.stripe_subscription_id,
  up.current_period_end,
  up.cancel_at_period_end
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email = 'Holyteeshop@gmail.com';
```

You should see:
- `payment_type`: `SUBSCRIPTION`
- `amount`: `4.99`
- `stripe_subscription_id`: `sub_XXXXX`
- `current_period_end`: A future date

### Step 5: Test in the App

1. Log in as `Holyteeshop@gmail.com`
2. Go to **Profile** page
3. You should now see:
   - **Plan Type**: "Monthly Subscription"
   - **Next Billing Date**: The date from Stripe
   - **Cancel Subscription** button

## Why This Happened

This issue occurs when:

1. **Manual payment marking**: If you manually marked the user as paid using `markUserAsPaid()`, it doesn't include subscription details
2. **Missing webhook data**: If the Stripe webhook wasn't set up when the user subscribed
3. **Payment link misconfiguration**: If the payment link was set up as a one-time payment instead of a subscription

## Prevent This in the Future

### ✅ Ensure Webhook is Set Up

The webhook at `/api/stripe-webhook` automatically captures:
- Subscription ID
- Payment type (SUBSCRIPTION vs LIFETIME)
- Current period end
- Amount and currency

### ✅ Use Stripe Payment Links Correctly

When creating payment links in Stripe:
- **Monthly Plan**: Set as "Recurring" subscription
- **Lifetime Plan**: Set as "One-time" payment

### ✅ Don't Manually Mark Users as Paid

Instead of using `markUserAsPaid()`, let the webhook handle it automatically when users complete payment through Stripe.

## Quick Fix Script

If you have multiple users with this issue, run:

```sql
-- Find all users with LIFETIME type but have subscription IDs
SELECT 
  u.email,
  up.payment_type,
  up.stripe_subscription_id
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
WHERE up.payment_type = 'LIFETIME' 
  AND up.stripe_subscription_id IS NOT NULL;

-- These should be SUBSCRIPTION type, not LIFETIME
-- Update them:
UPDATE user_payments 
SET payment_type = 'SUBSCRIPTION'
WHERE payment_type = 'LIFETIME' 
  AND stripe_subscription_id IS NOT NULL;
```

## Verification Checklist

- [ ] Checked user's subscription in Stripe Dashboard
- [ ] Updated `payment_type` to `SUBSCRIPTION`
- [ ] Added `stripe_subscription_id`
- [ ] Set `current_period_end` date
- [ ] Set `amount` to `4.99`
- [ ] Verified in database
- [ ] Tested in app - shows "Monthly Subscription"
- [ ] Tested in app - shows "Cancel Subscription" button
- [ ] Cancel button works correctly

## Need Help?

If you're still having issues:
1. Check if the webhook is receiving events from Stripe
2. Verify the Stripe subscription is actually active
3. Make sure the customer email in Stripe matches the user email in your database
