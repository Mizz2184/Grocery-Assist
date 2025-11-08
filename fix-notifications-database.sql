-- Complete Notifications System Fix
-- Run this ENTIRE script in your Supabase SQL Editor

-- First, create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('list_shared', 'item_added', 'item_checked', 'list_updated', 'collaborator_added')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  list_shared BOOLEAN DEFAULT TRUE,
  item_added BOOLEAN DEFAULT TRUE,
  item_checked BOOLEAN DEFAULT FALSE,
  list_updated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" 
  ON public.notifications FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" 
  ON public.notifications FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Notification Preferences Policies
CREATE POLICY "Users can view their own preferences" 
  ON public.notification_preferences FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences" 
  ON public.notification_preferences FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences" 
  ON public.notification_preferences FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Push Subscriptions Policies
CREATE POLICY "Users can view their own subscriptions" 
  ON public.push_subscriptions FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own subscriptions" 
  ON public.push_subscriptions FOR ALL TO authenticated 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get user ID by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_uuid;
END;
$$;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;
GRANT ALL ON public.push_subscriptions TO authenticated;

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Verify everything was created
SELECT 'Notifications table created' as status, COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'notifications' AND table_schema = 'public';

SELECT 'Notification preferences table created' as status, COUNT(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'notification_preferences' AND table_schema = 'public';

SELECT 'Functions created' as status, COUNT(*) as function_count
FROM pg_proc 
WHERE proname IN ('get_user_id_by_email', 'cleanup_old_notifications', 'mark_all_notifications_read');

SELECT 'Setup complete!' as message;
