-- Create helper function to get user ID by email

-- Step 1: Create function to get user ID by email
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

-- Step 2: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO authenticated;

-- Step 3: Add helpful comment
COMMENT ON FUNCTION get_user_id_by_email IS 'Get user UUID by email address from profiles or auth.users table';
