-- Database Verification Script for Likes Functionality
-- This script checks that all required tables and relationships exist
-- for the DiscoverScreen likes functionality

-- 1. Check if automations table exists and has expected structure
SELECT 'Testing automations table structure...' as test_stage;

-- Verify automations table exists with required columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'MISSING_TABLE: automations table does not exist';
    END IF;
    
    -- Check required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'id' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'MISSING_COLUMN: automations.id does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'is_public' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'MISSING_COLUMN: automations.is_public does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'title' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'MISSING_COLUMN: automations.title does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automations' AND column_name = 'created_at' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'MISSING_COLUMN: automations.created_at does not exist';
    END IF;
    
    RAISE NOTICE 'SUCCESS: automations table structure verified';
END
$$;

-- 2. Check if automation_likes table exists with proper structure
SELECT 'Testing automation_likes table structure...' as test_stage;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automation_likes' AND table_schema = 'public') THEN
        -- Create the automation_likes table if it doesn't exist
        RAISE NOTICE 'Creating automation_likes table...';
        
        CREATE TABLE IF NOT EXISTS public.automation_likes (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            
            -- Prevent duplicate likes
            UNIQUE(automation_id, user_id)
        );
        
        -- Enable Row Level Security
        ALTER TABLE public.automation_likes ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view automation likes" ON public.automation_likes
            FOR SELECT USING (true);

        CREATE POLICY "Authenticated users can like automations" ON public.automation_likes
            FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

        CREATE POLICY "Users can unlike automations" ON public.automation_likes
            FOR DELETE USING (user_id = auth.uid());
        
        -- Add to realtime publication
        ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_likes;
        
        RAISE NOTICE 'SUCCESS: automation_likes table created with RLS policies';
    ELSE
        RAISE NOTICE 'SUCCESS: automation_likes table already exists';
    END IF;
    
    -- Check required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automation_likes' AND column_name = 'automation_id' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'MISSING_COLUMN: automation_likes.automation_id does not exist';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'automation_likes' AND column_name = 'user_id' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'MISSING_COLUMN: automation_likes.user_id does not exist';
    END IF;
    
    RAISE NOTICE 'SUCCESS: automation_likes table structure verified';
END
$$;

-- 3. Test the exact query used by the API
SELECT 'Testing the likes join query...' as test_stage;

-- First, ensure we have some test data (only if no public automations exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.automations WHERE is_public = true LIMIT 1) THEN
        RAISE NOTICE 'No public automations found for testing. Please create some test data manually.';
    END IF;
END
$$;

-- Test the exact query from getPublicAutomations
SELECT 'Testing actual API query...' as test_stage;

-- This is the exact query that automationApi.ts uses
SELECT 
    *,
    automation_likes!left(user_id) as user_likes,
    likes_count:automation_likes(count) as total_likes
FROM automations
WHERE is_public = true
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verify foreign key relationships
SELECT 'Testing foreign key relationships...' as test_stage;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'automation_likes'
    AND tc.table_schema = 'public';

-- 5. Check RLS policies are in place
SELECT 'Testing RLS policies...' as test_stage;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'automation_likes' 
    AND schemaname = 'public';

-- 6. Test count functionality
SELECT 'Testing likes count calculation...' as test_stage;

SELECT 
    a.id,
    a.title,
    COALESCE(COUNT(al.id), 0) as manual_likes_count
FROM automations a
    LEFT JOIN automation_likes al ON al.automation_id = a.id
WHERE a.is_public = true
GROUP BY a.id, a.title
ORDER BY manual_likes_count DESC, a.created_at DESC
LIMIT 5;

-- 7. Test unique constraint
SELECT 'Testing unique constraint on automation_likes...' as test_stage;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'automation_likes' 
    AND schemaname = 'public';

SELECT 'Database verification completed successfully!' as result;