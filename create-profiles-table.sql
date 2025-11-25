-- Create profiles table for user information and notifications

-- Step 1: Drop existing profiles table if it has wrong structure
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Create profiles table with correct structure
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to view all profiles (needed for collaborator lookup)
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Step 5: Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Step 7: Backfill existing users into profiles table
INSERT INTO profiles (id, email, full_name)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'full_name', email) as full_name
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Step 8: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Add helpful comments
COMMENT ON TABLE profiles IS 'User profile information for the application';
COMMENT ON COLUMN profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN profiles.email IS 'User email address from auth.users';
COMMENT ON COLUMN profiles.full_name IS 'User full name or display name';
