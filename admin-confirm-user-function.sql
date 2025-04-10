-- Function to manually confirm a user by email (for development purposes only)
-- IMPORTANT: In production, replace 'dev123456' with a secure key stored in environment variables
-- and implement proper key rotation and secret management
CREATE OR REPLACE FUNCTION public.admin_confirm_user(target_email TEXT, admin_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  is_confirmed BOOLEAN;
BEGIN
  -- Simple security check - REPLACE THIS WITH A SECURE METHOD IN PRODUCTION
  -- DO NOT COMMIT ACTUAL KEYS TO VERSION CONTROL
  -- Use environment variables or a secure vault service
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