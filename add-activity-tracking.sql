-- Add Activity Tracking for Grocery Lists and Items
-- Run this in your Supabase SQL Editor

-- Create activity log table to track item additions and deletions
CREATE TABLE IF NOT EXISTS public.grocery_list_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('item_added', 'item_deleted', 'item_checked', 'item_unchecked', 'list_created')),
  item_name TEXT,
  item_id UUID,
  product_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_list_id ON public.grocery_list_activity(list_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON public.grocery_list_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON public.grocery_list_activity(created_at DESC);

-- Enable RLS
ALTER TABLE public.grocery_list_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity log
CREATE POLICY "Users can view activity for their lists"
  ON public.grocery_list_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl
      WHERE gl.id = list_id
      AND (gl.user_id = auth.uid() OR auth.jwt()->>'email' = ANY(gl.collaborators))
    )
  );

CREATE POLICY "Users can insert activity for their lists"
  ON public.grocery_list_activity FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grocery_lists gl
      WHERE gl.id = list_id
      AND (gl.user_id = auth.uid() OR auth.jwt()->>'email' = ANY(gl.collaborators))
    )
  );

-- Grant permissions
GRANT ALL ON public.grocery_list_activity TO authenticated;

-- Create function to automatically log list creation
CREATE OR REPLACE FUNCTION log_list_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.grocery_list_activity (
    list_id,
    user_id,
    action,
    metadata
  ) VALUES (
    NEW.id,
    NEW.user_id,
    'list_created',
    jsonb_build_object('list_name', NEW.name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for list creation
DROP TRIGGER IF EXISTS trigger_log_list_creation ON public.grocery_lists;
CREATE TRIGGER trigger_log_list_creation
  AFTER INSERT ON public.grocery_lists
  FOR EACH ROW
  EXECUTE FUNCTION log_list_creation();

-- Verify setup
SELECT 'Activity tracking setup complete!' as status;
SELECT COUNT(*) as activity_log_columns FROM information_schema.columns 
WHERE table_name = 'grocery_list_activity' AND table_schema = 'public';
