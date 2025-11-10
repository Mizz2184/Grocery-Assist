# 🎯 Stripe Payment Setup Guide

Complete guide to set up your Stripe paywall with **Monthly Subscription ($4.99/month)** and **Lifetime Deal ($69.99 one-time)**.

## ✅ What's Already Done

- ✅ Stripe API keys added to `.env.example`
- ✅ Payment page with dual pricing cards
- ✅ Paywall enabled (redirects unpaid users to `/payment`)
- ✅ Payment success page configured
- ✅ Database integration ready

## 📋 Next Steps - Create Payment Links in Stripe

### Step 1: Create Products in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** → **Add product**

#### Create Monthly Subscription Product

1. Click **Add product**
2. Fill in:
   - **Name**: `Grocery Assist Monthly`
   - **Description**: `Monthly subscription to Grocery Assist`
   - **Pricing**: 
     - Price: `$4.99`
     - Billing period: `Monthly`
     - Recurring: `Yes`
3. Click **Save product**
4. **Copy the Price ID** (starts with `price_`)

#### Create Lifetime Deal Product

1. Click **Add product** again
2. Fill in:
   - **Name**: `Grocery Assist Lifetime`
   - **Description**: `Lifetime access to Grocery Assist`
   - **Pricing**:
     - Price: `$69.99`
     - Billing period: `One time`
     - Recurring: `No`
3. Click **Save product**
4. **Copy the Price ID** (starts with `price_`)

### Step 2: Create Payment Links

#### Create Monthly Payment Link

1. Go to **Payment links** → **New**
2. Select your **Monthly Subscription** product
3. Configure:
   - **After payment**: `Redirect to a page`
   - **Success URL**: `https://shop-assist.vercel.app/payment-success`
   - **Allow promotion codes**: ✅ (recommended)
4. Click **Create link**
5. **Copy the payment link URL**

#### Create Lifetime Payment Link

1. Go to **Payment links** → **New**
2. Select your **Lifetime Access** product
3. Configure:
   - **After payment**: `Redirect to a page`
   - **Success URL**: `https://shop-assist.vercel.app/payment-success`
   - **Allow promotion codes**: ✅ (recommended)
4. Click **Create link**
5. **Copy the payment link URL**

**IMPORTANT:** Make sure the success URL matches your production domain!

### Step 3: Update Your .env File

Create a `.env` file in your project root with:

```bash
# Stripe Keys (already have these)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_51SRyO7Ls15YjqKLYhF7mJCIxfObltwRLPXd1tu76uOzprh1fLjjl9Rtu9LqB3ZOt94Bn6hzzaTtVRIlWnUfa192g00KuCsgFYM

# Monthly Subscription ($4.99/month)
VITE_STRIPE_MONTHLY_PRICE_ID=price_PASTE_YOUR_MONTHLY_PRICE_ID_HERE
VITE_STRIPE_MONTHLY_PAYMENT_LINK=https://buy.stripe.com/PASTE_YOUR_MONTHLY_LINK_HERE

# Lifetime Deal ($69.99 one-time)
VITE_STRIPE_LIFETIME_PRICE_ID=price_PASTE_YOUR_LIFETIME_PRICE_ID_HERE
VITE_STRIPE_LIFETIME_PAYMENT_LINK=https://buy.stripe.com/PASTE_YOUR_LIFETIME_LINK_HERE
```

## 🧪 Testing

### Test with Stripe Test Mode

1. Toggle to **Test mode** in Stripe Dashboard
2. Create test products and payment links
3. Use test card: `4242 4242 4242 4242`
4. Any future expiry date and CVC

### Test the Flow

1. Sign up for a new account
2. You'll be redirected to `/payment`
3. See both pricing options
4. Click either plan button
5. Complete payment on Stripe
6. Redirected to `/payment-success`
7. User can now access the app

## 🚀 Going Live

1. Switch Stripe to **Live mode**
2. Create live products and payment links
3. Update `.env` with live payment links
4. Deploy your app
5. Test with a real card (small amount)

## 📊 How It Works

1. **New User Signs Up** → Redirected to `/payment`
2. **User Selects Plan** → Redirected to Stripe payment link
3. **Payment Completes** → Redirected to `/payment-success`
4. **Database Updated** → User marked as paid in `user_payments` table
5. **Access Granted** → User can use the app

## 🔒 Security

- ✅ Publishable key safe to use in frontend
- ✅ Secret key never exposed to client
- ✅ Payment processing handled by Stripe
- ✅ No credit card data touches your servers

## ❓ Troubleshooting

**Payment links not working?**
- Verify URLs are correct in `.env`
- Check products are active in Stripe
- Ensure using correct mode (test/live)

**User not marked as paid?**
- Check `user_payments` table in Supabase
- Verify payment completed in Stripe Dashboard
- Check browser console for errors

**Paywall not showing?**
- Clear browser cache
- Check `PaymentRequired` component is enabled
- Verify user is logged in

## 📞 Need Help?

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

---

**Once you add the payment links to your `.env` file, your paywall is ready to go! 🎉**
