# Stripe Webhook Setup Guide

This guide explains how to set up Stripe webhooks to automatically update payment status in your Supabase database when users complete payments.

## 🎯 Why Webhooks?

Webhooks ensure that payment status is updated in your database **immediately** when a payment is completed, even if:
- The user closes the browser after payment
- The redirect fails
- The user doesn't visit the success page

## 📋 Setup Steps

### Step 1: Get Your Webhook Endpoint URL

Your webhook endpoint will be:
```
https://shop-assist.vercel.app/api/stripe-webhook
```

### Step 2: Create Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your endpoint URL: `https://shop-assist.vercel.app/api/stripe-webhook`
5. Click **Select events**
6. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.succeeded`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
7. Click **Add endpoint**
8. **Copy the Signing Secret** (starts with `whsec_...`)

### Step 3: Add Environment Variables to Vercel

Go to your [Vercel Dashboard](https://vercel.com/dashboard) → **shop-assist** → **Settings** → **Environment Variables**

Add these new variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_live_51SRyO7...` | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Step 2) | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Get from Supabase Dashboard | Production |

#### How to Get Supabase Service Role Key:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (⚠️ Keep this secret!)

### Step 4: Update Database Schema (If Needed)

Make sure your `user_payments` table has these columns:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_payments';

-- Add missing columns if needed
ALTER TABLE user_payments 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME')),
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT;
```

### Step 5: Redeploy Your App

After adding the environment variables:
1. Go to **Deployments** tab in Vercel
2. Click **Redeploy** on the latest deployment

### Step 6: Test the Webhook

#### Test with Stripe CLI (Recommended):

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Run: `stripe listen --forward-to localhost:3000/api/stripe-webhook`
3. Trigger a test event: `stripe trigger checkout.session.completed`
4. Check your database to see if the payment was recorded

#### Test with Real Payment (Test Mode):

1. Create test payment links in Stripe (Test mode)
2. Use test card: `4242 4242 4242 4242`
3. Complete a test payment
4. Check Stripe Dashboard → **Webhooks** → View logs
5. Check your Supabase `user_payments` table

## 🔄 How It Works

### Payment Flow:

1. **User clicks payment button** → Redirected to Stripe
2. **User completes payment** → Stripe processes payment
3. **Stripe sends webhook** → `POST /api/stripe-webhook`
4. **Webhook handler**:
   - Verifies webhook signature
   - Extracts customer email
   - Finds user in database
   - Updates `user_payments` table with `status = 'PAID'`
5. **User redirected** → `/payment-success` page
6. **Next login** → Payment check passes, no paywall!

### Webhook Events Handled:

- **`checkout.session.completed`**: When payment link checkout completes
- **`payment_intent.succeeded`**: When one-time payment succeeds
- **`customer.subscription.created`**: When subscription is created
- **`customer.subscription.updated`**: When subscription status changes
- **`customer.subscription.deleted`**: When subscription is cancelled
- **`invoice.payment_succeeded`**: When recurring payment succeeds

## 🧪 Testing Checklist

- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook secret added to Vercel environment variables
- [ ] Stripe secret key added to Vercel
- [ ] Supabase service role key added to Vercel
- [ ] App redeployed after adding env vars
- [ ] Test payment completed successfully
- [ ] Database updated with payment status
- [ ] User can log in without seeing paywall

## 🔍 Troubleshooting

### Webhook Not Receiving Events

1. Check Stripe Dashboard → **Webhooks** → View logs
2. Verify endpoint URL is correct
3. Check Vercel function logs
4. Ensure webhook secret is correct

### Database Not Updating

1. Check Vercel function logs for errors
2. Verify Supabase service role key is correct
3. Check database permissions
4. Verify user email matches Stripe customer email

### User Still Sees Paywall After Payment

1. Check `user_payments` table:
   ```sql
   SELECT u.email, up.status 
   FROM user_payments up
   JOIN auth.users u ON u.id = up.user_id;
   ```
2. Manually update if needed:
   ```sql
   UPDATE user_payments 
   SET status = 'PAID', updated_at = NOW()
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
   ```

## 🔒 Security Notes

- ⚠️ **Never commit** the webhook secret or service role key to Git
- ✅ Always verify webhook signatures
- ✅ Use service role key only in server-side code
- ✅ Keep all secrets in Vercel environment variables

## 📚 Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Supabase Service Role](https://supabase.com/docs/guides/api/api-keys)

## ✅ Success!

Once set up, payments will automatically update in your database, and users will have seamless access after payment!
