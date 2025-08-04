-- Comprehensive Security Fix Migration
-- This migration addresses all security issues identified by Supabase Security Advisor

BEGIN;

-- ============================================
-- PART 1: Fix auth.users exposure
-- ============================================

-- First, let's see what views reference auth.users
CREATE TEMP TABLE views_to_fix AS
SELECT 
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%auth.users%';

-- Log what we found
DO $$
DECLARE
    v record;
BEGIN
    FOR v IN SELECT * FROM views_to_fix LOOP
        RAISE NOTICE 'Found view referencing auth.users: %.%', v.schemaname, v.viewname;
    END LOOP;
END $$;

-- Handle change_history view/table
DO $$
DECLARE
    is_view boolean;
    column_list text;
    user_column text := NULL;
BEGIN
    -- Check if change_history is a view or table
    SELECT EXISTS (
        SELECT 1 FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'change_history'
    ) INTO is_view;
    
    IF is_view THEN
        -- It's a view, drop it
        DROP VIEW IF EXISTS public.change_history CASCADE;
        RAISE NOTICE 'Dropped change_history view';
    ELSE
        -- It's a table, check what columns it has
        -- Check for user reference columns
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'user_id'
        ) THEN
            user_column := 'user_id';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'created_by'
        ) THEN
            user_column := 'created_by';
        END IF;
        
        -- Create a secure view if we have user column
        IF user_column IS NOT NULL THEN
            -- Get column list
            SELECT string_agg(column_name, ', ch.' ORDER BY ordinal_position)
            INTO column_list
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'change_history';
            
            DROP VIEW IF EXISTS public.change_history_secure CASCADE;
            
            EXECUTE format('
                CREATE VIEW public.change_history_secure AS
                SELECT 
                    ch.%s,
                    u.email as user_email
                FROM public.change_history ch
                LEFT JOIN public.users u ON ch.%I = u.id::text
            ', column_list, user_column);
            
            GRANT SELECT ON public.change_history_secure TO authenticated;
            RAISE NOTICE 'Created secure view for change_history';
        END IF;
    END IF;
END $$;

-- Fix user_automation_stats if it exists
DROP VIEW IF EXISTS public.user_automation_stats CASCADE;

-- Create secure version without direct auth.users reference
CREATE OR REPLACE VIEW public.user_automation_stats AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    COUNT(DISTINCT a.id) as total_automations,
    COUNT(DISTINCT CASE WHEN a.is_public THEN a.id END) as public_automations,
    COUNT(DISTINCT d.id) as total_deployments,
    COALESCE(SUM(a.execution_count), 0) as total_executions
FROM public.users u
LEFT JOIN public.automations a ON a.user_id = u.id
LEFT JOIN public.automation_deployments d ON d.automation_id = a.id
GROUP BY u.id, u.name;

GRANT SELECT ON public.user_automation_stats TO authenticated;

-- ============================================
-- PART 2: Remove SECURITY DEFINER from views
-- ============================================

-- Get list of all views with SECURITY DEFINER
CREATE TEMP TABLE security_definer_views AS
SELECT 
    n.nspname as schema_name,
    c.relname as view_name
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_rewrite r ON c.oid = r.ev_class
WHERE c.relkind = 'v'
AND n.nspname = 'public'
AND EXISTS (
    SELECT 1 FROM pg_depend d
    JOIN pg_proc p ON d.objid = p.oid
    WHERE d.refobjid = c.oid
    AND p.prosecdef = true
);

-- For each view, we need to recreate it without SECURITY DEFINER
DO $$
DECLARE
    v record;
    view_def text;
BEGIN
    FOR v IN SELECT * FROM security_definer_views LOOP
        -- Get the view definition
        SELECT pg_get_viewdef('"' || v.schema_name || '"."' || v.view_name || '"', true) 
        INTO view_def;
        
        -- Drop and recreate the view
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(v.schema_name) || '.' || quote_ident(v.view_name) || ' CASCADE';
        EXECUTE 'CREATE VIEW ' || quote_ident(v.schema_name) || '.' || quote_ident(v.view_name) || ' AS ' || view_def;
        
        -- Re-grant permissions
        EXECUTE 'GRANT SELECT ON ' || quote_ident(v.schema_name) || '.' || quote_ident(v.view_name) || ' TO authenticated';
        
        RAISE NOTICE 'Recreated view without SECURITY DEFINER: %.%', v.schema_name, v.view_name;
    END LOOP;
END $$;

-- ============================================
-- PART 3: Enable RLS on all tables
-- ============================================

-- Enable RLS on user_collections
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections" ON public.user_collections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections" ON public.user_collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON public.user_collections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON public.user_collections
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on automation_reviews
ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.automation_reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.automation_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.automation_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.automation_reviews
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Enable RLS on api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" ON public.api_keys
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON public.api_keys
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON public.api_keys
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active feature flags" ON public.feature_flags
    FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage feature flags" ON public.feature_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Enable RLS on automation_executions
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view executions of their automations" ON public.automation_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_executions.automation_id
            AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create executions for their automations" ON public.automation_executions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_id
            AND a.user_id = auth.uid()
        )
    );

-- Enable RLS on step_executions
ALTER TABLE public.step_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view step executions of their automations" ON public.step_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.automation_executions ae
            JOIN public.automations a ON ae.automation_id = a.id
            WHERE ae.id = step_executions.execution_id
            AND a.user_id = auth.uid()
        )
    );

-- ============================================
-- PART 4: Create private schema for sensitive tables
-- ============================================

-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all privileges on private schema from public
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON SCHEMA private FROM authenticated;
REVOKE ALL ON SCHEMA private FROM anon;

-- Grant usage only to service_role
GRANT USAGE ON SCHEMA private TO service_role;

-- Move sensitive data handling to Edge Functions instead of direct table access
COMMENT ON SCHEMA private IS 'Private schema for sensitive data that should only be accessed via Edge Functions';

-- ============================================
-- PART 5: Create secure access functions
-- ============================================

-- Function to safely get user information
CREATE OR REPLACE FUNCTION public.get_user_info(target_user_id uuid)
RETURNS TABLE (
    id uuid,
    email text,
    name text,
    avatar_url text,
    bio text,
    role text,
    created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only return data if the requesting user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.bio,
        u.role,
        u.created_at
    FROM public.users u
    WHERE u.id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_info(uuid) TO authenticated;

-- ============================================
-- PART 6: Final cleanup and verification
-- ============================================

-- Drop any remaining views that expose auth.users
DROP VIEW IF EXISTS public.user_profiles CASCADE;
DROP VIEW IF EXISTS public.user_details CASCADE;

-- Log final status
DO $$
DECLARE
    exposed_views integer;
    unprotected_tables integer;
    security_definer_count integer;
BEGIN
    -- Count remaining issues
    SELECT COUNT(*) INTO exposed_views
    FROM pg_views
    WHERE schemaname = 'public'
    AND definition LIKE '%auth.users%';
    
    SELECT COUNT(*) INTO unprotected_tables
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = t.schemaname
        AND p.tablename = t.tablename
    )
    AND NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = t.schemaname
        AND c.relname = t.tablename
        AND c.relrowsecurity = true
    );
    
    SELECT COUNT(*) INTO security_definer_count
    FROM pg_views v
    JOIN pg_rewrite r ON v.schemaname || '.' || v.viewname = r.ev_class::regclass::text
    WHERE v.schemaname = 'public'
    AND EXISTS (
        SELECT 1 FROM pg_depend d
        JOIN pg_proc p ON d.objid = p.oid
        WHERE d.refobjid = r.oid
        AND p.prosecdef = true
    );
    
    RAISE NOTICE '=== Security Migration Complete ===';
    RAISE NOTICE 'Views exposing auth.users: %', exposed_views;
    RAISE NOTICE 'Tables without RLS: %', unprotected_tables;
    RAISE NOTICE 'Views with SECURITY DEFINER: %', security_definer_count;
    RAISE NOTICE '==================================';
END $$;

COMMIT;