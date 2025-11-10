# Sync Subscription from Stripe to Supabase

## Problem
User subscription data from Stripe is not being updated in the Supabase database. Users don't see:
- Correct plan type (Monthly vs Lifetime)
- Cancel subscription button
- Next billing date

## Solution: Manual Sync Tool

I've created a sync tool that fetches subscription data from Stripe and updates Supabase.

### Method 1: Use the Web Tool (Easiest)

1. **Deploy the changes** (push to GitHub, Vercel will auto-deploy)
2. **Open the sync tool**: `https://shop-assist.vercel.app/sync-subscription-tool.html`
3. **Enter user email**: `Holyteeshop@gmail.com`
4. **Click "Sync Subscription"**
5. **Wait for success message**
6. **User refreshes their browser** - should now see correct info

### Method 2: Use API Directly (cURL)

```bash
curl -X POST https://shop-assist.vercel.app/api/sync-subscription \
  -H "Content-Type: application/json" \
  -d '{"email":"Holyteeshop@gmail.com"}'
```

### Method 3: Use API in Browser Console

1. Open your app in browser
2. Press F12 to open DevTools
3. Go to Console tab
4. Run this code:

```javascript
fetch('/api/sync-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'Holyteeshop@gmail.com' })
})
.then(r => r.json())
.then(data => console.log(data));
```

## What the Sync Tool Does

1. **Searches Stripe** for customer by email
2. **Gets subscription data**:
   - Subscription ID
   - Payment type (SUBSCRIPTION or LIFETIME)
   - Current period end date
   - Cancellation status
   - Amount and currency
3. **Updates Supabase** `user_payments` table with all the data
4. **Returns success** with synced data

## Expected Result

After syncing, the database will have:

```json
{
  "user_id": "uuid",
  "status": "PAID",
  "payment_type": "SUBSCRIPTION",
  "stripe_customer_id": "cus_xxx",
  "stripe_subscription_id": "sub_xxx",
  "current_period_end": "2025-12-10T00:00:00.000Z",
  "cancel_at_period_end": false,
  "amount": 4.99,
  "currency": "usd"
}
```

## Verify in App

After syncing, user should see in Profile page:
- ✅ **Plan Type**: "Monthly Subscription"
- ✅ **Status**: "PAID"
- ✅ **Next Billing Date**: Correct date from Stripe
- ✅ **Cancel Subscription** button visible

## Troubleshooting

### Error: "Customer not found in Stripe"
- Check if email matches exactly in Stripe Dashboard
- User might not have completed payment yet

### Error: "No payments found for this customer"
- User hasn't made any payments
- Check Stripe Dashboard for payment status

### Error: "User not found in database"
- Email doesn't exist in Supabase auth.users
- User needs to sign up first

### Sync succeeds but app still shows wrong info
- User needs to refresh browser (Ctrl+F5)
- Check browser console for errors
- Verify data in Supabase directly

## Check Data in Supabase

Run this query in Supabase SQL Editor:

```sql
SELECT 
  u.email,
  up.status,
  up.payment_type,
  up.stripe_subscription_id,
  up.current_period_end,
  up.cancel_at_period_end,
  up.amount
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email = 'Holyteeshop@gmail.com';
```

## Sync Multiple Users

If you need to sync multiple users, you can run the sync for each:

```javascript
const emails = [
  'user1@example.com',
  'user2@example.com',
  'Holyteeshop@gmail.com'
];

for (const email of emails) {
  const response = await fetch('/api/sync-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await response.json();
  console.log(email, data);
}
```

## Why Wasn't This Automatic?

The webhook should handle this automatically, but it only works for:
- **New payments** made after webhook setup
- **Subscription updates** after webhook setup

For existing customers who paid before the webhook was configured, you need to manually sync.

## Prevent Future Issues

### ✅ Ensure Webhook is Active

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/) → **Developers** → **Webhooks**
2. Verify endpoint exists: `https://shop-assist.vercel.app/api/stripe-webhook`
3. Check that these events are enabled:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `payment_intent.succeeded`

### ✅ Test Webhook

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click "Send test webhook"
3. Select `customer.subscription.updated`
4. Check if it succeeds

### ✅ Monitor Webhook Logs

Check Vercel function logs to see if webhooks are being received:
1. Go to Vercel Dashboard
2. Select your project
3. Go to **Logs**
4. Filter for `/api/stripe-webhook`

## Quick Fix for Holyteeshop@gmail.com

**Immediate fix:**

1. Deploy the code (already pushed to GitHub)
2. Wait for Vercel to deploy (2-3 minutes)
3. Open: `https://shop-assist.vercel.app/sync-subscription-tool.html`
4. Enter: `Holyteeshop@gmail.com`
5. Click "Sync Subscription"
6. Tell user to refresh their browser
7. Done! ✅

## Files Created

- `api/sync-subscription.js` - API endpoint to sync subscription
- `sync-subscription-tool.html` - Web UI for syncing
- `vercel.json` - Updated with new route
- This guide

## Security Note

The sync endpoint doesn't require authentication (for admin use), but it only reads from Stripe and updates the database. Consider adding admin authentication if needed.
