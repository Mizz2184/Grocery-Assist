-- Create grocery_lists table
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  collaborators TEXT[] DEFAULT '{}'::TEXT[]
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
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
CREATE TABLE IF NOT EXISTS public.grocery_items (
  id UUID PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  added_by TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked BOOLEAN DEFAULT FALSE,
  product_data JSONB
);

-- Create row level security policies

-- Enable RLS
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to create lists and items
CREATE POLICY "Allow insert for authenticated users" 
  ON public.grocery_lists FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow insert for authenticated users" 
  ON public.grocery_items FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow insert for authenticated users" 
  ON public.products FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow users to see their own lists or lists they collaborate on
CREATE POLICY "Users can view their own lists or collaborations" 
  ON public.grocery_lists FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid()::text OR 
    auth.uid()::text = ANY(collaborators)
  );

-- Allow update on user's own lists or collaborations
CREATE POLICY "Users can update their own lists or collaborations" 
  ON public.grocery_lists FOR UPDATE TO authenticated 
  USING (
    created_by = auth.uid()::text OR 
    auth.uid()::text = ANY(collaborators)
  );

-- Allow delete only for list owners
CREATE POLICY "Only owners can delete lists" 
  ON public.grocery_lists FOR DELETE TO authenticated 
  USING (created_by = auth.uid()::text);

-- Allow users to see items in their lists
CREATE POLICY "Users can view items in their lists" 
  ON public.grocery_items FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl 
      WHERE gl.id = list_id AND 
      (gl.created_by = auth.uid()::text OR auth.uid()::text = ANY(gl.collaborators))
    )
  );

-- Allow users to update items in their lists
CREATE POLICY "Users can update items in their lists" 
  ON public.grocery_items FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl 
      WHERE gl.id = list_id AND 
      (gl.created_by = auth.uid()::text OR auth.uid()::text = ANY(gl.collaborators))
    )
  );

-- Allow users to delete items in their lists
CREATE POLICY "Users can delete items in their lists" 
  ON public.grocery_items FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl 
      WHERE gl.id = list_id AND 
      (gl.created_by = auth.uid()::text OR auth.uid()::text = ANY(gl.collaborators))
    )
  );

-- Products are publicly readable
CREATE POLICY "Products are publicly readable" 
  ON public.products FOR SELECT 
  USING (true);

-- Allow authenticated users to update/delete their products
CREATE POLICY "Users can update their products" 
  ON public.products FOR UPDATE TO authenticated 
  USING (true);

CREATE POLICY "Users can delete their products" 
  ON public.products FOR DELETE TO authenticated 
  USING (true); 