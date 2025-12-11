# Stripe Payment Sync Fix Guide

## Problem
Users who pay through the Stripe payment link are not being recognized as paid when they log in. The app keeps redirecting them back to the payment screen.

## Root Cause
The Stripe webhook was trying to query the `auth.users` table directly, which requires special permissions that the webhook doesn't have. This caused the webhook to fail silently when trying to match the customer's email to a user in the database.

## Solution Applied

### 1. Fixed Webhook User Lookup (✅ COMPLETED)
Updated `api/stripe-webhook.js` to use the `get_user_id_by_email()` RPC function instead of directly querying `auth.users`. This function has the proper security permissions to access user data.

**Changes made:**
- `handleCheckoutSessionCompleted()` - Now uses RPC function
- `handlePaymentIntentSucceeded()` - Now uses RPC function  
- `handleSubscriptionUpdate()` - Now uses RPC function
- `handleSubscriptionDeleted()` - Now uses RPC function

### 2. Database Setup Required (⚠️ ACTION NEEDED)

You need to run the SQL migration script in your Supabase dashboard to ensure:
- The `get_user_id_by_email()` function exists with proper permissions
- The `user_payments` table has all required columns for Stripe data
- Row Level Security (RLS) policies are correctly configured

**Steps:**
1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to the SQL Editor
4. Open and run the file: `fix-stripe-payment-sync.sql`
5. Verify no errors appear

### 3. Stripe Webhook Configuration (⚠️ ACTION NEEDED)

Ensure your Stripe webhook is properly configured:

1. **Webhook URL**: Should point to your deployed webhook endpoint
   - Format: `https://your-domain.vercel.app/api/stripe-webhook`
   
2. **Webhook Events**: Subscribe to these events in Stripe Dashboard:
   - `checkout.session.completed` (most important for payment links)
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`

3. **Webhook Secret**: Verify it matches your `.env` file
   - Current value in `.env`: `whsec_u2wkrxBl9nftZ1UtLEYp0WE6INRvZ1fv`

### 4. Environment Variables Check

Your `.env` file contains:
```
STRIPE_SECRET_KEY=sk_live_51SRyO7Ls15YjqKLY...
STRIPE_WEBHOOK_SECRET=whsec_u2wkrxBl9nftZ1UtLEYp0WE6INRvZ1fv
VITE_STRIPE_LIFETIME_PRICE_ID=plink_1ScCGbLs15YjqKLYoHdvHMjD
VITE_STRIPE_LIFETIME_PAYMENT_LINK=https://buy.stripe.com/bJe28s5Vs2Mo5hi8rRgnK04
```

**Note**: The `VITE_STRIPE_LIFETIME_PRICE_ID` uses a payment link ID (`plink_`) which is correct for this implementation since you're using Stripe Payment Links.

## Testing the Fix

### For New Payments:
1. Create a new test user account
2. Go through the payment flow using the Stripe payment link
3. Complete the payment
4. Log out and log back in
5. Verify you're redirected to the home page (not the payment page)

### For Existing Users Who Already Paid:
If you have users who already paid but aren't recognized, you need to manually update their payment status:

```sql
-- Run this in Supabase SQL Editor
-- Replace 'user@example.com' with the actual user email

UPDATE user_payments
SET status = 'PAID',
    payment_type = 'LIFETIME',
    updated_at = NOW()
WHERE user_id = (
  SELECT get_user_id_by_email('user@example.com')
);
```

## Verification Steps

### 1. Check Webhook Logs in Stripe
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Check recent webhook attempts
4. Look for successful `checkout.session.completed` events
5. If you see failures, check the error messages

### 2. Check Database
Run this query in Supabase SQL Editor to see payment records:

```sql
SELECT 
  u.email,
  up.status,
  up.payment_type,
  up.amount,
  up.stripe_customer_id,
  up.created_at,
  up.updated_at
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
ORDER BY up.updated_at DESC
LIMIT 20;
```

### 3. Check Application Logs
When a user logs in, check the browser console for:
- "Payment status updated for user: [email]" (from webhook)
- Any errors related to payment checking

## Common Issues & Solutions

### Issue: Webhook still failing
**Solution**: 
- Verify the webhook secret matches between Stripe and `.env`
- Check that the webhook URL is correct and accessible
- Ensure you've deployed the updated webhook code to Vercel

### Issue: User not found in webhook
**Solution**:
- Verify the `get_user_id_by_email()` function exists (run the SQL script)
- Check that the user's email in Stripe matches their email in Supabase exactly
- Verify the user exists in the `auth.users` table

### Issue: Permission denied errors
**Solution**:
- Ensure RLS policies are correctly set up (run the SQL script)
- Verify the webhook is using the service role key, not the anon key

## Deployment Checklist

- [x] Updated webhook code in `api/stripe-webhook.js`
- [ ] Run `fix-stripe-payment-sync.sql` in Supabase
- [ ] Deploy updated code to Vercel
- [ ] Verify webhook URL in Stripe Dashboard
- [ ] Test with a new payment
- [ ] Update existing paid users if needed

## Support

If issues persist:
1. Check Stripe webhook logs for detailed error messages
2. Check Supabase logs for database errors
3. Check browser console for client-side errors
4. Verify all environment variables are correctly set in Vercel

## Files Modified

- `api/stripe-webhook.js` - Fixed user lookup logic
- `fix-stripe-payment-sync.sql` - Database migration script (NEW)
- `STRIPE-PAYMENT-FIX-GUIDE.md` - This guide (NEW)
