-- Function to verify ALL unverified emails
-- Run this in the Supabase SQL editor
CREATE OR REPLACE FUNCTION public.verify_all_emails(admin_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_verified INTEGER;
BEGIN
  -- Simple security check
  IF admin_key != 'masterAdmin123' THEN
    RAISE EXCEPTION 'Invalid admin key';
  END IF;
  
  -- Update all unverified users
  WITH updated AS (
    UPDATE auth.users
    SET email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE email_confirmed_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO count_verified FROM updated;
  
  -- Create a table for manual admin tasks if it doesn't exist
  -- This is used as a fallback verification method
  CREATE TABLE IF NOT EXISTS public._manual_admin_tasks (
    id SERIAL PRIMARY KEY,
    task_name TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  
  -- Insert a record to track this operation
  INSERT INTO public._manual_admin_tasks (task_name)
  VALUES ('verify_all_emails_' || NOW());
  
  RETURN TRUE;
END;
$$;

-- Grant execution permission to all roles
GRANT EXECUTE ON FUNCTION public.verify_all_emails(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_all_emails(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_all_emails(TEXT) TO service_role;

-- For emergency use without functions, run this SQL directly:
-- UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL; 