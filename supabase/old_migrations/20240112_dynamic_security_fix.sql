-- Dynamic Security Fix Migration
-- This migration dynamically checks your database schema and applies appropriate fixes

-- Start transaction
BEGIN;

-- Create a function to safely check if a column exists
CREATE OR REPLACE FUNCTION column_exists(
    p_table_name text,
    p_column_name text,
    p_schema_name text DEFAULT 'public'
) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = p_schema_name
        AND table_name = p_table_name
        AND column_name = p_column_name
    );
END;
$$ LANGUAGE plpgsql;

-- 1. Drop problematic views
DROP VIEW IF EXISTS public.change_history_view CASCADE;
DROP VIEW IF EXISTS public.change_history_with_details CASCADE;
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;
DROP VIEW IF EXISTS public.user_automation_stats CASCADE;

-- 2. Handle user_collections table
DO $$
DECLARE
    table_exists boolean;
    has_is_public boolean;
    has_user_id boolean;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'user_collections'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'user_collections table exists, checking columns...';
        
        -- Check column existence
        has_is_public := column_exists('user_collections', 'is_public');
        has_user_id := column_exists('user_collections', 'user_id');
        
        RAISE NOTICE '  - has user_id column: %', has_user_id;
        RAISE NOTICE '  - has is_public column: %', has_is_public;
        
        -- Add missing columns if needed
        IF NOT has_is_public THEN
            RAISE NOTICE '  - Adding is_public column...';
            ALTER TABLE public.user_collections 
            ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
        END IF;
        
        -- Enable RLS
        ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '  - RLS enabled';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own collections" ON public.user_collections;
        DROP POLICY IF EXISTS "Users can create their own collections" ON public.user_collections;
        DROP POLICY IF EXISTS "Users can update their own collections" ON public.user_collections;
        DROP POLICY IF EXISTS "Users can delete their own collections" ON public.user_collections;
        
        -- Create appropriate policies based on column existence
        IF has_user_id THEN
            -- Now we know is_public exists (either originally or we just added it)
            CREATE POLICY "Users can view their own collections" ON public.user_collections
                FOR SELECT USING (user_id = auth.uid() OR is_public = true);
            
            CREATE POLICY "Users can create their own collections" ON public.user_collections
                FOR INSERT WITH CHECK (user_id = auth.uid());
            
            CREATE POLICY "Users can update their own collections" ON public.user_collections
                FOR UPDATE USING (user_id = auth.uid());
            
            CREATE POLICY "Users can delete their own collections" ON public.user_collections
                FOR DELETE USING (user_id = auth.uid());
            
            RAISE NOTICE '  - RLS policies created';
        ELSE
            RAISE WARNING '  - No user_id column found, skipping policies';
        END IF;
    ELSE
        RAISE NOTICE 'user_collections table does not exist, creating it...';
        
        -- Create the table with full schema
        CREATE TABLE public.user_collections (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            automation_ids UUID[] DEFAULT '{}',
            is_public BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view their own collections" ON public.user_collections
            FOR SELECT USING (user_id = auth.uid() OR is_public = true);
        
        CREATE POLICY "Users can create their own collections" ON public.user_collections
            FOR INSERT WITH CHECK (user_id = auth.uid());
        
        CREATE POLICY "Users can update their own collections" ON public.user_collections
            FOR UPDATE USING (user_id = auth.uid());
        
        CREATE POLICY "Users can delete their own collections" ON public.user_collections
            FOR DELETE USING (user_id = auth.uid());
        
        RAISE NOTICE '  - Table created with RLS policies';
    END IF;
END $$;

-- 3. Handle automation_reviews table
DO $$
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'automation_reviews'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'automation_reviews table exists, enabling RLS...';
        
        ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;
        
        -- Drop and recreate policies
        DROP POLICY IF EXISTS "Anyone can view reviews" ON public.automation_reviews;
        DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.automation_reviews;
        DROP POLICY IF EXISTS "Users can update their own reviews" ON public.automation_reviews;
        DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.automation_reviews;
        
        CREATE POLICY "Anyone can view reviews" ON public.automation_reviews
            FOR SELECT USING (true);
        
        CREATE POLICY "Authenticated users can create reviews" ON public.automation_reviews
            FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
        
        CREATE POLICY "Users can update their own reviews" ON public.automation_reviews
            FOR UPDATE USING (user_id = auth.uid());
        
        CREATE POLICY "Users can delete their own reviews" ON public.automation_reviews
            FOR DELETE USING (user_id = auth.uid());
        
        RAISE NOTICE '  - RLS enabled with policies';
    ELSE
        RAISE NOTICE 'automation_reviews table does not exist, skipping...';
    END IF;
END $$;

-- 4. Handle feature_flags table
DO $$
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'feature_flags'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'feature_flags table exists, enabling RLS...';
        
        ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
        
        -- Drop and recreate policies
        DROP POLICY IF EXISTS "Anyone can view enabled feature flags" ON public.feature_flags;
        DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;
        
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
        
        RAISE NOTICE '  - RLS enabled with policies';
    ELSE
        RAISE NOTICE 'feature_flags table does not exist, skipping...';
    END IF;
END $$;

-- 5. Handle automation_executions table
DO $$
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'automation_executions'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'automation_executions table exists, enabling RLS...';
        
        ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
        
        -- Drop and recreate policies
        DROP POLICY IF EXISTS "Users can view their own executions" ON public.automation_executions;
        DROP POLICY IF EXISTS "Users can create their own executions" ON public.automation_executions;
        DROP POLICY IF EXISTS "Users can update their own executions" ON public.automation_executions;
        
        CREATE POLICY "Users can view their own executions" ON public.automation_executions
            FOR SELECT USING (user_id = auth.uid());
        
        CREATE POLICY "Users can create their own executions" ON public.automation_executions
            FOR INSERT WITH CHECK (user_id = auth.uid());
        
        CREATE POLICY "Users can update their own executions" ON public.automation_executions
            FOR UPDATE USING (user_id = auth.uid());
        
        RAISE NOTICE '  - RLS enabled with policies';
    ELSE
        RAISE NOTICE 'automation_executions table does not exist, skipping...';
    END IF;
END $$;

-- 6. Handle step_executions table
DO $$
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'step_executions'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'step_executions table exists, enabling RLS...';
        
        ALTER TABLE public.step_executions ENABLE ROW LEVEL SECURITY;
        
        -- Drop and recreate policies
        DROP POLICY IF EXISTS "Users can view their own step executions" ON public.step_executions;
        DROP POLICY IF EXISTS "Users can create step executions for their automations" ON public.step_executions;
        
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
        
        RAISE NOTICE '  - RLS enabled with policies';
    ELSE
        RAISE NOTICE 'step_executions table does not exist, skipping...';
    END IF;
END $$;

-- 7. Handle shares table
DO $$
DECLARE
    table_exists boolean;
    has_share_type boolean;
    has_shared_by boolean;
    has_shared_with boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'shares'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'shares table exists, checking columns...';
        
        -- Check columns
        has_share_type := column_exists('shares', 'share_type');
        has_shared_by := column_exists('shares', 'shared_by');
        has_shared_with := column_exists('shares', 'shared_with');
        
        ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view shares they created or received" ON public.shares;
        DROP POLICY IF EXISTS "Users can create shares" ON public.shares;
        DROP POLICY IF EXISTS "Users can update their own shares" ON public.shares;
        DROP POLICY IF EXISTS "Users can delete their own shares" ON public.shares;
        
        -- Create appropriate policies
        IF has_shared_by AND has_shared_with THEN
            IF has_share_type THEN
                CREATE POLICY "Users can view shares they created or received" ON public.shares
                    FOR SELECT USING (
                        shared_by = auth.uid() OR 
                        shared_with = auth.uid() OR
                        share_type = 'public'
                    );
            ELSE
                CREATE POLICY "Users can view shares they created or received" ON public.shares
                    FOR SELECT USING (
                        shared_by = auth.uid() OR 
                        shared_with = auth.uid()
                    );
            END IF;
            
            CREATE POLICY "Users can create shares" ON public.shares
                FOR INSERT WITH CHECK (shared_by = auth.uid());
            
            CREATE POLICY "Users can update their own shares" ON public.shares
                FOR UPDATE USING (shared_by = auth.uid());
            
            CREATE POLICY "Users can delete their own shares" ON public.shares
                FOR DELETE USING (shared_by = auth.uid());
            
            RAISE NOTICE '  - RLS enabled with policies';
        ELSE
            RAISE WARNING '  - Missing required columns, creating basic policy';
            CREATE POLICY "Basic shares access" ON public.shares
                FOR ALL USING (true);
        END IF;
    ELSE
        RAISE NOTICE 'shares table does not exist, skipping...';
    END IF;
END $$;

-- 8. Handle reviews table
DO $$
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'reviews'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'reviews table exists, enabling RLS...';
        
        ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
        
        -- Drop and recreate policies
        DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
        
        CREATE POLICY "Anyone can view reviews" ON public.reviews
            FOR SELECT USING (true);
        
        CREATE POLICY "Authenticated users can create reviews" ON public.reviews
            FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
        
        CREATE POLICY "Users can update their own reviews" ON public.reviews
            FOR UPDATE USING (user_id = auth.uid());
        
        CREATE POLICY "Users can delete their own reviews" ON public.reviews
            FOR DELETE USING (user_id = auth.uid());
        
        RAISE NOTICE '  - RLS enabled with policies';
    ELSE
        RAISE NOTICE 'reviews table does not exist, skipping...';
    END IF;
END $$;

-- 9. Handle comments table
DO $$
DECLARE
    table_exists boolean;
    has_user_id boolean;
    has_automation_id boolean;
    has_entity_type boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'comments'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'comments table exists, checking structure...';
        
        -- Check which type of comments table this is
        has_user_id := column_exists('comments', 'user_id');
        has_automation_id := column_exists('comments', 'automation_id');
        has_entity_type := column_exists('comments', 'entity_type');
        
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
        DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
        DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
        DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
        DROP POLICY IF EXISTS "Anyone can view comments on public automations" ON public.comments;
        
        -- Create appropriate policies
        IF has_automation_id AND NOT has_entity_type THEN
            -- This is automation_comments table structure
            RAISE NOTICE '  - Detected automation_comments structure';
            
            CREATE POLICY "Anyone can view comments on public automations" ON public.comments
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.automations a
                        WHERE a.id = comments.automation_id
                        AND (a.is_public = true OR a.created_by = auth.uid())
                    )
                );
            
            CREATE POLICY "Authenticated users can create comments" ON public.comments
                FOR INSERT WITH CHECK (
                    auth.role() = 'authenticated' AND 
                    user_id = auth.uid() AND
                    EXISTS (
                        SELECT 1 FROM public.automations a
                        WHERE a.id = comments.automation_id
                        AND (a.is_public = true OR a.created_by = auth.uid())
                    )
                );
        ELSE
            -- Generic comments structure
            RAISE NOTICE '  - Using generic comments policies';
            
            CREATE POLICY "Anyone can view comments" ON public.comments
                FOR SELECT USING (true);
            
            CREATE POLICY "Authenticated users can create comments" ON public.comments
                FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
        END IF;
        
        -- These policies work for both structures
        CREATE POLICY "Users can update their own comments" ON public.comments
            FOR UPDATE USING (user_id = auth.uid());
        
        CREATE POLICY "Users can delete their own comments" ON public.comments
            FOR DELETE USING (user_id = auth.uid());
        
        RAISE NOTICE '  - RLS enabled with policies';
    ELSE
        RAISE NOTICE 'comments table does not exist, skipping...';
    END IF;
END $$;

-- 10. Handle change_history table (feature tracking version)
DO $$
DECLARE
    table_exists boolean;
    has_user_id boolean;
    has_feature boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'change_history'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'change_history table exists, checking structure...';
        
        has_user_id := column_exists('change_history', 'user_id');
        has_feature := column_exists('change_history', 'feature');
        
        IF has_feature THEN
            RAISE NOTICE '  - Detected feature tracking structure';
            
            ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
            
            -- Drop existing policies
            DROP POLICY IF EXISTS "Users can view their own change history" ON public.change_history;
            DROP POLICY IF EXISTS "Users can create their own change history" ON public.change_history;
            DROP POLICY IF EXISTS "Admins can view all change history" ON public.change_history;
            
            -- Create policies for feature tracking
            CREATE POLICY "Users can view their own change history" ON public.change_history
                FOR SELECT USING (user_id = auth.uid());
            
            CREATE POLICY "Users can create their own change history" ON public.change_history
                FOR INSERT WITH CHECK (user_id = auth.uid());
            
            CREATE POLICY "Admins can view all change history" ON public.change_history
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.users 
                        WHERE id = auth.uid() 
                        AND role IN ('admin', 'developer')
                    )
                );
            
            RAISE NOTICE '  - RLS enabled with feature tracking policies';
        ELSE
            RAISE NOTICE '  - Unknown structure, enabling basic RLS';
            ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
        END IF;
    ELSE
        RAISE NOTICE 'change_history table does not exist, skipping...';
    END IF;
END $$;

-- 11. Create safe views
DO $$
BEGIN
    -- Only create views if the tables and columns exist
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'change_history') 
       AND column_exists('change_history', 'user_id') 
       AND column_exists('change_history', 'feature') THEN
        
        RAISE NOTICE 'Creating change_history_view for feature tracking...';
        
        CREATE OR REPLACE VIEW public.change_history_view AS
        SELECT 
            ch.id,
            ch.user_id,
            ch.feature,
            ch.description,
            ch.status,
            ch.created_at,
            ch.updated_at,
            u.email as user_email,
            u.name as user_name
        FROM 
            public.change_history ch
            LEFT JOIN public.users u ON ch.user_id = u.id
        WHERE ch.user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'developer')
        );
        
        GRANT SELECT ON public.change_history_view TO authenticated;
    END IF;
    
    -- Create user_roles_summary
    RAISE NOTICE 'Creating user_roles_summary view...';
    
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
END $$;

-- 12. Create indexes for existing tables/columns
DO $$
BEGIN
    -- Create indexes only if table and column exist
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_collections')
       AND column_exists('user_collections', 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON public.user_collections(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_reviews')
       AND column_exists('automation_reviews', 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_automation_reviews_user_id ON public.automation_reviews(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_reviews')
       AND column_exists('automation_reviews', 'automation_id') THEN
        CREATE INDEX IF NOT EXISTS idx_automation_reviews_automation_id ON public.automation_reviews(automation_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_executions')
       AND column_exists('automation_executions', 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_automation_executions_user_id ON public.automation_executions(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'change_history')
       AND column_exists('change_history', 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_change_history_user_id ON public.change_history(user_id);
    END IF;
END $$;

-- 13. Final summary
DO $$
DECLARE
    table_record RECORD;
    total_tables integer := 0;
    rls_enabled integer := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '=== SECURITY FIX MIGRATION COMPLETE ===';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Final RLS Status:';
    
    FOR table_record IN 
        SELECT 
            tablename,
            rowsecurity as has_rls
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'user_collections',
            'automation_reviews', 
            'feature_flags',
            'automation_executions',
            'step_executions',
            'shares',
            'reviews',
            'comments',
            'change_history'
        )
        ORDER BY tablename
    LOOP
        total_tables := total_tables + 1;
        IF table_record.has_rls THEN
            rls_enabled := rls_enabled + 1;
        END IF;
        RAISE NOTICE '  %-25s : %', 
            table_record.tablename, 
            CASE WHEN table_record.has_rls THEN '✓ RLS ENABLED' ELSE '✗ RLS DISABLED' END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Summary: % of % tables have RLS enabled', rls_enabled, total_tables;
    RAISE NOTICE '';
    RAISE NOTICE 'Please check Supabase Security Advisor to verify all issues are resolved.';
    RAISE NOTICE '========================================';
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS column_exists(text, text, text);

-- Commit transaction
COMMIT;