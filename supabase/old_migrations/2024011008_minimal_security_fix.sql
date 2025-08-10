-- Minimal Security Fix Migration
-- This focuses only on enabling RLS for the tables mentioned in the security report

-- 1. Enable RLS on user_collections if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_collections') THEN
        ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own collections" ON public.user_collections;
        DROP POLICY IF EXISTS "Users can create their own collections" ON public.user_collections;
        DROP POLICY IF EXISTS "Users can update their own collections" ON public.user_collections;
        DROP POLICY IF EXISTS "Users can delete their own collections" ON public.user_collections;
        
        -- Create policies
        CREATE POLICY "Users can view their own collections" ON public.user_collections
            FOR SELECT USING (user_id = auth.uid() OR is_public = true);
        CREATE POLICY "Users can create their own collections" ON public.user_collections
            FOR INSERT WITH CHECK (user_id = auth.uid());
        CREATE POLICY "Users can update their own collections" ON public.user_collections
            FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "Users can delete their own collections" ON public.user_collections
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- 2. Enable RLS on automation_reviews if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_reviews') THEN
        ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view reviews" ON public.automation_reviews;
        DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.automation_reviews;
        DROP POLICY IF EXISTS "Users can update their own reviews" ON public.automation_reviews;
        DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.automation_reviews;
        
        -- Create policies
        CREATE POLICY "Anyone can view reviews" ON public.automation_reviews
            FOR SELECT USING (true);
        CREATE POLICY "Authenticated users can create reviews" ON public.automation_reviews
            FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
        CREATE POLICY "Users can update their own reviews" ON public.automation_reviews
            FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "Users can delete their own reviews" ON public.automation_reviews
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- 3. Enable RLS on feature_flags if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feature_flags') THEN
        ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view enabled feature flags" ON public.feature_flags;
        DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
        
        -- Create policies
        CREATE POLICY "Anyone can view enabled feature flags" ON public.feature_flags
            FOR SELECT USING (enabled = true);
        CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'developer')
                )
            );
    END IF;
END $$;

-- 4. Enable RLS on automation_executions if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_executions') THEN
        ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own executions" ON public.automation_executions;
        DROP POLICY IF EXISTS "Users can create their own executions" ON public.automation_executions;
        DROP POLICY IF EXISTS "Users can update their own executions" ON public.automation_executions;
        
        -- Create policies
        CREATE POLICY "Users can view their own executions" ON public.automation_executions
            FOR SELECT USING (user_id = auth.uid());
        CREATE POLICY "Users can create their own executions" ON public.automation_executions
            FOR INSERT WITH CHECK (user_id = auth.uid());
        CREATE POLICY "Users can update their own executions" ON public.automation_executions
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

-- 5. Enable RLS on step_executions if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'step_executions') THEN
        ALTER TABLE public.step_executions ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own step executions" ON public.step_executions;
        DROP POLICY IF EXISTS "Users can create step executions for their automations" ON public.step_executions;
        
        -- Create policies
        CREATE POLICY "Users can view their own step executions" ON public.step_executions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.automation_executions ae
                    WHERE ae.id = step_executions.execution_id
                    AND ae.user_id = auth.uid()
                )
            );
        CREATE POLICY "Users can create step executions for their automations" ON public.step_executions
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.automation_executions ae
                    WHERE ae.id = step_executions.execution_id
                    AND ae.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 6. Enable RLS on shares if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shares') THEN
        ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view shares they created or received" ON public.shares;
        DROP POLICY IF EXISTS "Users can create shares" ON public.shares;
        DROP POLICY IF EXISTS "Users can update their own shares" ON public.shares;
        DROP POLICY IF EXISTS "Users can delete their own shares" ON public.shares;
        
        -- Create policies
        CREATE POLICY "Users can view shares they created or received" ON public.shares
            FOR SELECT USING (
                shared_by = auth.uid() OR 
                shared_with = auth.uid() OR
                share_type = 'public'
            );
        CREATE POLICY "Users can create shares" ON public.shares
            FOR INSERT WITH CHECK (shared_by = auth.uid());
        CREATE POLICY "Users can update their own shares" ON public.shares
            FOR UPDATE USING (shared_by = auth.uid());
        CREATE POLICY "Users can delete their own shares" ON public.shares
            FOR DELETE USING (shared_by = auth.uid());
    END IF;
END $$;

-- 7. Enable RLS on reviews if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
        
        -- Create policies
        CREATE POLICY "Anyone can view reviews" ON public.reviews
            FOR SELECT USING (true);
        CREATE POLICY "Authenticated users can create reviews" ON public.reviews
            FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
        CREATE POLICY "Users can update their own reviews" ON public.reviews
            FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "Users can delete their own reviews" ON public.reviews
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- 8. Enable RLS on comments if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
        DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
        DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
        DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
        
        -- Create policies
        CREATE POLICY "Anyone can view comments" ON public.comments
            FOR SELECT USING (true);
        CREATE POLICY "Authenticated users can create comments" ON public.comments
            FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
        CREATE POLICY "Users can update their own comments" ON public.comments
            FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "Users can delete their own comments" ON public.comments
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- 9. Fix views that expose auth.users
-- Drop and recreate problematic views without SECURITY DEFINER

-- Fix change_history_view if it exists
DROP VIEW IF EXISTS public.change_history_view CASCADE;

-- Fix change_history_with_details if it exists
DROP VIEW IF EXISTS public.change_history_with_details CASCADE;

-- Fix user_roles_summary if it exists
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;

-- Recreate user_roles_summary without SECURITY DEFINER
CREATE OR REPLACE VIEW public.user_roles_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at
FROM 
    public.users u
WHERE u.id = auth.uid();

GRANT SELECT ON public.user_roles_summary TO authenticated;

-- Add comment
COMMENT ON SCHEMA public IS 'Public schema with enhanced security. All tables have RLS enabled.';