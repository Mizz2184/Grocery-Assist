-- Function to manually confirm a user by email
-- Run this in your Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.admin_confirm_user(
  target_email TEXT,
  admin_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  is_confirmed BOOLEAN;
BEGIN
  -- Simple security check (in production, use a more secure method)
  IF admin_key != 'dev123456' THEN
    RAISE EXCEPTION 'Invalid admin key';
  END IF;
  
  -- Find the user
  SELECT id, email_confirmed_at IS NOT NULL 
  INTO user_id, is_confirmed
  FROM auth.users
  WHERE email = target_email;
  
  -- If user not found
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- If already confirmed
  IF is_confirmed THEN
    RETURN TRUE;
  END IF;
  
  -- Update the user to confirm email
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_confirm_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_user(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_confirm_user(TEXT, TEXT) TO service_role; 