# Complete Setup Guide: Stripe Webhook + Supabase User Creation

This guide will help you connect Stripe payments to automatically create users in your Supabase database.

## 🎯 What This Does

When a user purchases a subscription:
1. ✅ User enters their email in Stripe checkout (no account needed)
2. ✅ Completes payment
3. ✅ **Webhook automatically creates user in Supabase**
4. ✅ User can log in with that email (Google OAuth or email/password)
5. ✅ Payment record is saved in `user_payments` table

## 📋 Step-by-Step Setup

### Step 1: Get Supabase Service Role Key

This key allows the webhook to create users automatically.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Find the **service_role** key (⚠️ NOT the anon key!)
5. Click **Reveal** and copy it
6. It starts with `eyJhbG...`

### Step 2: Get Stripe Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your webhook URL:
   - **Local testing**: `http://localhost:8080/api/stripe-webhook`
   - **Production**: `https://your-domain.com/api/stripe-webhook`
5. Click **Select events** and choose:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
6. Click **Add endpoint**
7. Click on the webhook you just created
8. Click **Reveal** next to **Signing secret**
9. Copy the secret (starts with `whsec_...`)

### Step 3: Create .env File

Create a `.env` file in your project root:

```bash
# Copy from .env.example
cp .env.example .env
```

Then fill in these values:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxx  # From Stripe Dashboard → API Keys
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # From Step 2 above

# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co  # From Supabase → Settings → API
VITE_SUPABASE_ANON_KEY=eyJhbGxxx  # From Supabase → Settings → API (anon public)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGxxx  # From Step 1 above (service_role)
```

### Step 4: Configure Supabase Database

Make sure your `user_payments` table exists with these columns:

```sql
-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS user_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_type TEXT CHECK (payment_type IN ('SUBSCRIPTION', 'ONE_TIME')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_session_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_stripe_subscription_id ON user_payments(stripe_subscription_id);
```

### Step 5: Enable Google OAuth (Optional)

If you want users to log in with Google:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://xxxxx.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase

### Step 6: Test Locally

1. Start your server:
```bash
npm run server
```

2. In another terminal, use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:8080/api/stripe-webhook
```

3. Trigger a test event:
```bash
stripe trigger checkout.session.completed
```

4. Check your Supabase dashboard:
   - Go to **Authentication** → **Users**
   - You should see a new user created!
   - Go to **Table Editor** → **user_payments**
   - You should see a payment record!

### Step 7: Deploy to Production

#### For Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from your `.env` file:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Redeploy your app

#### Update Stripe Webhook URL:

1. Go back to Stripe Dashboard → **Webhooks**
2. Edit your webhook endpoint
3. Change URL to: `https://your-vercel-app.vercel.app/api/stripe-webhook`
4. Save

## 🔄 How Users Log In After Purchase

### Option 1: Password Reset Flow (Recommended)

After a user purchases:

1. User goes to your login page
2. Clicks **"Forgot Password?"**
3. Enters the email they used in Stripe
4. Receives password reset email from Supabase
5. Sets their password
6. Logs in!

### Option 2: Magic Link (Passwordless)

1. User goes to login page
2. Enters email
3. Clicks "Send Magic Link"
4. Receives email with login link
5. Clicks link and is logged in!

### Option 3: Google OAuth

If you enabled Google OAuth:

1. User clicks "Sign in with Google"
2. Selects the same email used in Stripe
3. Logged in automatically!

## 🧪 Testing Checklist

- [ ] `.env` file created with all keys
- [ ] `user_payments` table exists in Supabase
- [ ] Stripe webhook endpoint created
- [ ] Webhook secret added to `.env`
- [ ] Service role key added to `.env`
- [ ] Server running (`npm run server`)
- [ ] Test payment completed
- [ ] New user appears in Supabase Auth
- [ ] Payment record in `user_payments` table
- [ ] User can log in with that email

## 🔍 Troubleshooting

### Webhook not receiving events

**Check Stripe Dashboard:**
- Go to **Developers** → **Webhooks**
- Click on your endpoint
- Check **Recent events** tab
- Look for errors

**Common issues:**
- ❌ Wrong webhook URL
- ❌ Webhook secret mismatch
- ❌ Server not running
- ❌ Firewall blocking requests

### User not created in Supabase

**Check server logs:**
```bash
# You should see:
# "Checkout session completed: cs_xxxxx"
# "New user created: user-id-xxxxx"
# "Payment record created/updated for user: user-id-xxxxx"
```

**Common issues:**
- ❌ Service role key not set
- ❌ Service role key is wrong
- ❌ Supabase URL is wrong
- ❌ Email already exists (check Auth → Users)

### User can't log in

**Check Supabase Auth:**
1. Go to **Authentication** → **Users**
2. Find the user by email
3. Check if `email_confirmed_at` is set
4. If not, click user → **Send password recovery**

**Enable email confirmation:**
The webhook automatically confirms emails, but you can verify:
```javascript
// In server.js webhook handler:
email_confirm: true  // This should be present
```

## 📧 Email Templates

You may want to customize Supabase email templates:

1. Go to Supabase → **Authentication** → **Email Templates**
2. Customize:
   - **Confirm signup** (if you disable auto-confirm)
   - **Reset password** (for password recovery)
   - **Magic Link** (for passwordless login)

## 🔒 Security Best Practices

- ✅ Never commit `.env` file to Git
- ✅ Use different keys for development and production
- ✅ Keep service role key secret (server-side only)
- ✅ Verify webhook signatures (already implemented)
- ✅ Use HTTPS in production
- ✅ Enable RLS (Row Level Security) on Supabase tables

## 📚 Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Service Role](https://supabase.com/docs/guides/api/api-keys)

## ✅ Success!

Once everything is set up:
1. User purchases subscription → User automatically created in Supabase
2. User receives payment confirmation email from Stripe
3. User can log in with password reset, magic link, or Google OAuth
4. User has full access to the app!

🎉 **Your payment system is now fully automated!**
