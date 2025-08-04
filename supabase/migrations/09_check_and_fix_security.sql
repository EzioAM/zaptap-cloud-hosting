-- Check and Fix Security Issues
-- This migration first checks what exists in the database, then applies fixes

-- 1. First, let's see what tables exist and their RLS status
DO $$
DECLARE
    table_record RECORD;
BEGIN
    RAISE NOTICE 'Checking tables and RLS status...';
    
    FOR table_record IN 
        SELECT 
            tablename,
            NOT rowsecurity as needs_rls
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
            'comments'
        )
    LOOP
        RAISE NOTICE 'Table: %, Needs RLS: %', table_record.tablename, table_record.needs_rls;
        
        -- Enable RLS if needed
        IF table_record.needs_rls THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
            RAISE NOTICE 'Enabled RLS on %', table_record.tablename;
        END IF;
    END LOOP;
END $$;

-- 2. Check column structure of change_history if it exists
DO $$
DECLARE
    has_table_name boolean := false;
    has_user_id boolean := false;
    has_changed_by boolean := false;
    has_feature boolean := false;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'change_history') THEN
        -- Check which columns exist
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'table_name'
        ) INTO has_table_name;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'user_id'
        ) INTO has_user_id;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'changed_by'
        ) INTO has_changed_by;
        
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'feature'
        ) INTO has_feature;
        
        RAISE NOTICE 'change_history columns - table_name: %, user_id: %, changed_by: %, feature: %', 
            has_table_name, has_user_id, has_changed_by, has_feature;
            
        -- Enable RLS on change_history
        ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
        
        -- Create appropriate policies based on column structure
        IF has_user_id THEN
            DROP POLICY IF EXISTS "Users can view their own change history" ON public.change_history;
            CREATE POLICY "Users can view their own change history" ON public.change_history
                FOR SELECT USING (user_id = auth.uid());
        ELSIF has_changed_by THEN
            DROP POLICY IF EXISTS "Users can view their own change history" ON public.change_history;
            CREATE POLICY "Users can view their own change history" ON public.change_history
                FOR SELECT USING (changed_by = auth.uid());
        END IF;
    END IF;
END $$;

-- 3. Create basic RLS policies for each table that exists

-- user_collections policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_collections') THEN
        DROP POLICY IF EXISTS "Users can manage their collections" ON public.user_collections;
        CREATE POLICY "Users can manage their collections" ON public.user_collections
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- automation_reviews policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_reviews') THEN
        DROP POLICY IF EXISTS "Public read reviews" ON public.automation_reviews;
        DROP POLICY IF EXISTS "Users manage own reviews" ON public.automation_reviews;
        
        CREATE POLICY "Public read reviews" ON public.automation_reviews
            FOR SELECT USING (true);
        CREATE POLICY "Users manage own reviews" ON public.automation_reviews
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- feature_flags policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'feature_flags') THEN
        DROP POLICY IF EXISTS "Public read enabled flags" ON public.feature_flags;
        CREATE POLICY "Public read enabled flags" ON public.feature_flags
            FOR SELECT USING (enabled = true);
    END IF;
END $$;

-- automation_executions policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_executions') THEN
        DROP POLICY IF EXISTS "Users manage own executions" ON public.automation_executions;
        CREATE POLICY "Users manage own executions" ON public.automation_executions
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- step_executions policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'step_executions') THEN
        DROP POLICY IF EXISTS "Users view own step executions" ON public.step_executions;
        CREATE POLICY "Users view own step executions" ON public.step_executions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.automation_executions ae
                    WHERE ae.id = step_executions.execution_id
                    AND ae.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- shares policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shares') THEN
        DROP POLICY IF EXISTS "Users manage shares" ON public.shares;
        CREATE POLICY "Users manage shares" ON public.shares
            FOR ALL USING (
                shared_by = auth.uid() OR 
                shared_with = auth.uid()
            );
    END IF;
END $$;

-- reviews policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        DROP POLICY IF EXISTS "Public read all reviews" ON public.reviews;
        DROP POLICY IF EXISTS "Users manage own reviews" ON public.reviews;
        
        CREATE POLICY "Public read all reviews" ON public.reviews
            FOR SELECT USING (true);
        CREATE POLICY "Users manage own reviews" ON public.reviews
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- comments policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        DROP POLICY IF EXISTS "Public read all comments" ON public.comments;
        DROP POLICY IF EXISTS "Users manage own comments" ON public.comments;
        
        CREATE POLICY "Public read all comments" ON public.comments
            FOR SELECT USING (true);
        CREATE POLICY "Users manage own comments" ON public.comments
            FOR ALL USING (user_id = auth.uid());
    END IF;
END $$;

-- 4. Drop problematic views
DROP VIEW IF EXISTS public.change_history_view CASCADE;
DROP VIEW IF EXISTS public.change_history_with_details CASCADE;
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;

-- 5. Final status check
DO $$
DECLARE
    table_record RECORD;
    total_tables integer := 0;
    rls_enabled integer := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== Final RLS Status ===';
    
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
        RAISE NOTICE 'Table: % - RLS: %', 
            rpad(table_record.tablename, 25), 
            CASE WHEN table_record.has_rls THEN '✓ ENABLED' ELSE '✗ DISABLED' END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Summary: % of % tables have RLS enabled', rls_enabled, total_tables;
END $$;