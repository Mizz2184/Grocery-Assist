-- Add foreign key relationship between grocery_lists and profiles

-- Step 1: Check if the foreign key already exists
DO $$ 
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'grocery_lists_user_id_fkey' 
        AND table_name = 'grocery_lists'
    ) THEN
        ALTER TABLE grocery_lists DROP CONSTRAINT grocery_lists_user_id_fkey;
    END IF;
END $$;

-- Step 2: Add the foreign key constraint
ALTER TABLE grocery_lists
ADD CONSTRAINT grocery_lists_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Step 3: Verify the constraint was created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'grocery_lists'
    AND tc.constraint_name = 'grocery_lists_user_id_fkey';

-- Step 4: Add helpful comment
COMMENT ON CONSTRAINT grocery_lists_user_id_fkey ON grocery_lists 
IS 'Foreign key relationship to profiles table for creator information';
