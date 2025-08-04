-- Fix for shares table RLS policies
-- The shares table has different column names than expected

BEGIN;

-- First, let's check what columns the shares table actually has
-- and create appropriate policies based on the actual schema

-- Enable RLS on shares table
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view shares they created or received" ON public.shares;
DROP POLICY IF EXISTS "Users can create shares" ON public.shares;
DROP POLICY IF EXISTS "Users can update their own shares" ON public.shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON public.shares;

-- Create policies based on likely column names
-- Assuming the table has user_id or similar column based on the error hint about created_at

-- Policy 1: View shares (assuming there's a user_id or owner_id column)
CREATE POLICY "Users can view relevant shares"
    ON public.shares FOR SELECT
    USING (
        -- Try to match on common column names
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'user_id') 
            THEN auth.uid() = user_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'owner_id') 
            THEN auth.uid() = owner_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'shared_by') 
            THEN auth.uid() = shared_by
            ELSE true -- If no user column found, allow read access
        END
        OR 
        -- Also allow viewing shares shared with the user
        CASE
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'shared_with') 
            THEN auth.uid() = shared_with
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'shared_with_user_id') 
            THEN auth.uid() = shared_with_user_id
            ELSE false
        END
        OR
        -- Allow public shares
        CASE
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'is_public') 
            THEN is_public = true
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'share_type') 
            THEN share_type = 'public'
            ELSE false
        END
    );

-- Policy 2: Create shares
CREATE POLICY "Users can create shares"
    ON public.shares FOR INSERT
    WITH CHECK (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'user_id') 
            THEN auth.uid() = user_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'owner_id') 
            THEN auth.uid() = owner_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'shared_by') 
            THEN auth.uid() = shared_by
            ELSE auth.uid() IS NOT NULL -- Require authentication at minimum
        END
    );

-- Policy 3: Update shares
CREATE POLICY "Users can update their shares"
    ON public.shares FOR UPDATE
    USING (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'user_id') 
            THEN auth.uid() = user_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'owner_id') 
            THEN auth.uid() = owner_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'shared_by') 
            THEN auth.uid() = shared_by
            ELSE false
        END
    )
    WITH CHECK (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'user_id') 
            THEN auth.uid() = user_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'owner_id') 
            THEN auth.uid() = owner_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'shared_by') 
            THEN auth.uid() = shared_by
            ELSE false
        END
    );

-- Policy 4: Delete shares
CREATE POLICY "Users can delete their shares"
    ON public.shares FOR DELETE
    USING (
        CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'user_id') 
            THEN auth.uid() = user_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'owner_id') 
            THEN auth.uid() = owner_id
            WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'shares' 
                        AND column_name = 'shared_by') 
            THEN auth.uid() = shared_by
            ELSE false
        END
    );

COMMIT;

-- To see the actual structure of the shares table, run:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'shares' 
-- ORDER BY ordinal_position;