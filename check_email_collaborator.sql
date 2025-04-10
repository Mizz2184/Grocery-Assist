-- Create a function to check if an email is a collaborator for a list
CREATE OR REPLACE FUNCTION check_email_collaborator(list_id UUID, email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  collab_list TEXT[];
  normalized_email TEXT;
BEGIN
  -- Get the collaborators array
  SELECT collaborators INTO collab_list 
  FROM grocery_lists 
  WHERE id = list_id;
  
  -- Normalize the email
  normalized_email := LOWER(TRIM(email));
  
  -- Check if the normalized email is in the array
  RETURN normalized_email = ANY(collab_list);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
