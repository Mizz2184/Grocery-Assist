-- IMPORTANT: Run this in the Supabase SQL editor to set up all required tables and functions

-- First, create a function to safely create the user_payments table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_user_payments_if_not_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_payments'
  ) THEN
    -- Create the table
    CREATE TABLE public.user_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'NONE',
      session_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;
    
    -- Allow users to see their own payment records
    CREATE POLICY "Users can view their own payment records"
      ON public.user_payments
      FOR SELECT
      USING (auth.uid() = user_id);
    
    -- Allow users to insert their own payment records
    CREATE POLICY "Users can insert their own payment records"
      ON public.user_payments
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    -- Allow users to update their own payment records
    CREATE POLICY "Users can update their own payment records"
      ON public.user_payments
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to update auth.users directly
CREATE OR REPLACE FUNCTION public.verify_email_directly(
  target_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find the user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  -- If user not found
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
  
  -- Update the auth.users table to mark email as confirmed
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = target_user_id
  AND email_confirmed_at IS NULL;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant proper permissions to the functions
GRANT EXECUTE ON FUNCTION public.create_user_payments_if_not_exists() TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_payments_if_not_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_payments_if_not_exists() TO service_role;

GRANT EXECUTE ON FUNCTION public.verify_email_directly(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_email_directly(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_email_directly(TEXT) TO service_role;

-- Run the function to create the table
SELECT create_user_payments_if_not_exists();

-- Verify email for any existing unverified users (ONLY FOR DEVELOPMENT)
-- Comment this out in production
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL; 