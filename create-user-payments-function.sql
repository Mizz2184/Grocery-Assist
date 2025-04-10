-- Create a function that will check and create the user_payments table if needed
CREATE OR REPLACE FUNCTION public.create_user_payments_if_not_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  -- Check if the table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'user_payments'
  ) INTO table_exists;
  
  -- If table doesn't exist, create it
  IF NOT table_exists THEN
    -- Create the table
    CREATE TABLE public.user_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('NONE', 'PENDING', 'PAID')),
      session_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    );
    
    -- Create an index for faster lookups
    CREATE INDEX idx_user_payments_user_id ON public.user_payments(user_id);
    
    -- Enable RLS
    ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;
    
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
      
    -- Allow service role to manage all records
    CREATE POLICY "Service role can manage all payment records"
      ON public.user_payments FOR ALL TO service_role
      USING (true);
    
    -- Create function to update the updated_at timestamp
    EXECUTE '
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $BODY$
    BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
    END;
    $BODY$ LANGUAGE plpgsql;
    ';
    
    -- Add trigger to update the updated_at column on update
    CREATE TRIGGER update_user_payments_updated_at
    BEFORE UPDATE ON public.user_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    
    RETURN TRUE;
  END IF;
  
  -- Table already exists
  RETURN FALSE;
END;
$$; 