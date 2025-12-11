-- Fix Stripe Payment Sync Issue
-- This script ensures the database is properly configured to receive webhook events from Stripe
-- Run this in your Supabase SQL Editor

-- Step 1: Ensure the get_user_id_by_email function exists
CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Try to get from profiles table first
  SELECT id INTO user_uuid
  FROM profiles
  WHERE email = user_email
  LIMIT 1;
  
  -- If not found in profiles, try auth.users
  IF user_uuid IS NULL THEN
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
  END IF;
  
  RETURN user_uuid;
END;
$$;

-- Grant execute permission to service role (for webhooks)
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO authenticated;

-- Step 2: Ensure user_payments table exists with all required columns
CREATE TABLE IF NOT EXISTS public.user_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NONE', 'PENDING', 'PAID', 'CANCELLED')),
  session_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  payment_type TEXT CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME')),
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'usd',
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Step 3: Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Add stripe_customer_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_payments' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE user_payments ADD COLUMN stripe_customer_id TEXT;
  END IF;

  -- Add stripe_subscription_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_payments' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE user_payments ADD COLUMN stripe_subscription_id TEXT;
  END IF;

  -- Add payment_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_payments' AND column_name = 'payment_type') THEN
    ALTER TABLE user_payments ADD COLUMN payment_type TEXT CHECK (payment_type IN ('SUBSCRIPTION', 'LIFETIME'));
  END IF;

  -- Add amount if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_payments' AND column_name = 'amount') THEN
    ALTER TABLE user_payments ADD COLUMN amount DECIMAL(10, 2);
  END IF;

  -- Add currency if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_payments' AND column_name = 'currency') THEN
    ALTER TABLE user_payments ADD COLUMN currency TEXT DEFAULT 'usd';
  END IF;

  -- Add current_period_end if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_payments' AND column_name = 'current_period_end') THEN
    ALTER TABLE user_payments ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add cancel_at_period_end if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_payments' AND column_name = 'cancel_at_period_end') THEN
    ALTER TABLE user_payments ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Step 4: Update status check constraint to include CANCELLED
ALTER TABLE user_payments DROP CONSTRAINT IF EXISTS user_payments_status_check;
ALTER TABLE user_payments ADD CONSTRAINT user_payments_status_check 
  CHECK (status IN ('NONE', 'PENDING', 'PAID', 'CANCELLED'));

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON public.user_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_stripe_customer ON user_payments(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_stripe_subscription ON user_payments(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_payments_status ON user_payments(status);

-- Step 6: Enable RLS
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop and recreate RLS policies
DROP POLICY IF EXISTS "Users can insert their own payment records" ON public.user_payments;
DROP POLICY IF EXISTS "Users can view their own payment records" ON public.user_payments;
DROP POLICY IF EXISTS "Users can update their own payment records" ON public.user_payments;
DROP POLICY IF EXISTS "Service role can manage all payment records" ON public.user_payments;

-- Allow authenticated users to insert their own payment records
CREATE POLICY "Users can insert their own payment records"
  ON public.user_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Allow authenticated users to view their own payment records
CREATE POLICY "Users can view their own payment records"
  ON public.user_payments FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Allow authenticated users to update their own payment records
CREATE POLICY "Users can update their own payment records"
  ON public.user_payments FOR UPDATE TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Service role policy for webhook operations
CREATE POLICY "Service role can manage all payment records"
  ON public.user_payments FOR ALL TO service_role
  USING (true);

-- Step 8: Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add trigger to update the updated_at column
DROP TRIGGER IF EXISTS update_user_payments_updated_at ON public.user_payments;
CREATE TRIGGER update_user_payments_updated_at
BEFORE UPDATE ON public.user_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Verify the setup
SELECT 
  'Table Schema' as check_type,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_payments'
ORDER BY ordinal_position;

-- Step 11: Check if the function exists
SELECT 
  'Function Check' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_user_id_by_email';

-- Comments for clarity
COMMENT ON TABLE public.user_payments IS 'Stores user payment status and Stripe data';
COMMENT ON COLUMN public.user_payments.status IS 'Payment status: NONE, PENDING, PAID, or CANCELLED';
COMMENT ON COLUMN public.user_payments.payment_type IS 'Type of payment: SUBSCRIPTION or LIFETIME';
COMMENT ON FUNCTION get_user_id_by_email IS 'Get user UUID by email address - used by Stripe webhooks';
