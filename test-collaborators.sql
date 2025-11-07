-- Test script to check if collaborators field exists and has data
-- Run this in Supabase SQL Editor to check your grocery_lists table

-- 1. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'grocery_lists'
ORDER BY ordinal_position;

-- 2. Check if any lists have collaborators
SELECT id, name, user_id, collaborators, created_at
FROM public.grocery_lists
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count lists with collaborators
SELECT 
  COUNT(*) as total_lists,
  COUNT(CASE WHEN collaborators IS NOT NULL AND array_length(collaborators, 1) > 0 THEN 1 END) as lists_with_collaborators
FROM public.grocery_lists;
