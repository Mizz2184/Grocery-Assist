-- Update user_payments table schema to support webhook data
-- Run this in Supabase SQL Editor

-- First, check current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_payments'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
ALTER TABLE user_payments 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME')),
ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd',
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_payments_stripe_customer 
ON user_payments(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_payments_stripe_subscription 
ON user_payments(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_payments_status 
ON user_payments(status);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_payments'
ORDER BY ordinal_position;

-- Sample query to check payment data
SELECT 
  u.email,
  up.status,
  up.payment_type,
  up.amount,
  up.currency,
  up.stripe_customer_id,
  up.stripe_subscription_id,
  up.created_at,
  up.updated_at
FROM user_payments up
JOIN auth.users u ON u.id = up.user_id
ORDER BY up.updated_at DESC
LIMIT 10;
