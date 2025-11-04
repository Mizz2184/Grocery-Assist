-- Reset and Setup Supabase Database
-- This will DROP existing tables and recreate them with the correct schema
-- WARNING: This will delete all existing data!

-- Drop existing tables (CASCADE will also drop dependent objects)
DROP TABLE IF EXISTS public.grocery_items CASCADE;
DROP TABLE IF EXISTS public.grocery_lists CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.user_payments CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.create_user_payments_if_not_exists() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create grocery_lists table with user_id (not created_by)
CREATE TABLE public.grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collaborators TEXT[] DEFAULT '{}'::TEXT[]
);

-- Create products table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  price FLOAT,
  store TEXT,
  category TEXT,
  barcode TEXT
);

-- Create grocery_items table with relationship to grocery_lists
CREATE TABLE public.grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  checked BOOLEAN DEFAULT FALSE,
  product_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_payments table
CREATE TABLE public.user_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('NONE', 'PENDING', 'PAID')),
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_grocery_lists_user_id ON public.grocery_lists(user_id);
CREATE INDEX idx_grocery_items_list_id ON public.grocery_items(list_id);
CREATE INDEX idx_user_payments_user_id ON public.user_payments(user_id);

-- Enable RLS
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

-- Grocery Lists Policies
CREATE POLICY "Allow insert for authenticated users" 
  ON public.grocery_lists FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can view their own lists or collaborations" 
  ON public.grocery_lists FOR SELECT TO authenticated 
  USING (
    user_id = auth.uid() OR 
    auth.jwt()->>'email' = ANY(collaborators)
  );

CREATE POLICY "Users can update their own lists or collaborations" 
  ON public.grocery_lists FOR UPDATE TO authenticated 
  USING (
    user_id = auth.uid() OR 
    auth.jwt()->>'email' = ANY(collaborators)
  );

CREATE POLICY "Only owners can delete lists" 
  ON public.grocery_lists FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Grocery Items Policies
CREATE POLICY "Allow insert for authenticated users" 
  ON public.grocery_items FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can view items in their lists" 
  ON public.grocery_items FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl 
      WHERE gl.id = list_id AND 
      (gl.user_id = auth.uid() OR auth.jwt()->>'email' = ANY(gl.collaborators))
    )
  );

CREATE POLICY "Users can update items in their lists" 
  ON public.grocery_items FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl 
      WHERE gl.id = list_id AND 
      (gl.user_id = auth.uid() OR auth.jwt()->>'email' = ANY(gl.collaborators))
    )
  );

CREATE POLICY "Users can delete items in their lists" 
  ON public.grocery_items FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl 
      WHERE gl.id = list_id AND 
      (gl.user_id = auth.uid() OR auth.jwt()->>'email' = ANY(gl.collaborators))
    )
  );

-- Products Policies
CREATE POLICY "Allow insert for authenticated users" 
  ON public.products FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Products are publicly readable" 
  ON public.products FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their products" 
  ON public.products FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY "Users can delete their products" 
  ON public.products FOR DELETE TO authenticated 
  USING (true);

-- User Payments Policies
CREATE POLICY "Users can insert their own payment records"
  ON public.user_payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
  
CREATE POLICY "Users can view their own payment records"
  ON public.user_payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
  
CREATE POLICY "Users can update their own payment records"
  ON public.user_payments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Create function for user_payments (for backward compatibility)
CREATE OR REPLACE FUNCTION public.create_user_payments_if_not_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Table already exists from above, this is just for compatibility
  RETURN TRUE;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_grocery_lists_updated_at
BEFORE UPDATE ON public.grocery_lists
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grocery_items_updated_at
BEFORE UPDATE ON public.grocery_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_payments_updated_at
BEFORE UPDATE ON public.user_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'Tables created: grocery_lists, grocery_items, products, user_payments';
  RAISE NOTICE 'All RLS policies and triggers have been set up.';
END $$;
