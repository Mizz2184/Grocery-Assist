-- Fix subscription type for Holyteeshop@gmail.com
-- This user has a $4.99 monthly subscription, not a lifetime deal

-- First, check current status
SELECT 
  u.email,
  up.status,
  up.payment_type,
  up.amount,
  up.stripe_customer_id,
  up.stripe_subscription_id,
  up.current_period_end,
  up.cancel_at_period_end,
  up.created_at,
  up.updated_at
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email = 'Holyteeshop@gmail.com';

-- Update to SUBSCRIPTION type with correct amount
UPDATE user_payments 
SET 
  payment_type = 'SUBSCRIPTION',
  amount = 4.99,
  currency = 'usd',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'Holyteeshop@gmail.com');

-- Verify the update
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

-- If stripe_subscription_id is missing, we need to get it from Stripe Dashboard
-- Check if we need to add the subscription ID:
-- UPDATE user_payments 
-- SET stripe_subscription_id = 'sub_XXXXX'  -- Replace with actual subscription ID from Stripe
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'Holyteeshop@gmail.com');
