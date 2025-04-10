-- Create user_payments table
CREATE TABLE IF NOT EXISTS public.user_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NONE', 'PENDING', 'PAID')),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_payments_user_id ON public.user_payments(user_id);

-- Enable RLS
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own payment records" ON public.user_payments;
DROP POLICY IF EXISTS "Users can view their own payment records" ON public.user_payments;
DROP POLICY IF EXISTS "Users can update their own payment records" ON public.user_payments;
DROP POLICY IF EXISTS "Admin can manage all payment records" ON public.user_payments;

-- Fix the RLS policies to use the correct auth.uid() conversion
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

-- Admin or service role policy for admin operations
CREATE POLICY "Service role can manage all payment records"
  ON public.user_payments FOR ALL TO service_role
  USING (true);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update the updated_at column on update
DROP TRIGGER IF EXISTS update_user_payments_updated_at ON public.user_payments;
CREATE TRIGGER update_user_payments_updated_at
BEFORE UPDATE ON public.user_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for clarity
COMMENT ON TABLE public.user_payments IS 'Stores user payment status and session IDs';
COMMENT ON COLUMN public.user_payments.status IS 'Payment status: NONE (no payment initiated), PENDING (payment in progress), PAID (payment completed)';
COMMENT ON COLUMN public.user_payments.session_id IS 'Payment processor session ID (e.g., Stripe)'; 