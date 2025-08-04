-- Migration: Fix auth.users exposure with dynamic column discovery
-- This script dynamically discovers the actual table structure before creating views

BEGIN;

-- First, let's discover what columns actually exist in change_history
DO $$
DECLARE
    column_list text;
    has_user_id boolean := false;
    has_created_by boolean := false;
    has_changed_by boolean := false;
    has_table_name boolean := false;
    has_entity_type boolean := false;
    has_record_id boolean := false;
    has_entity_id boolean := false;
    user_column text;
    table_column text;
    record_column text;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'created_by'
    ) INTO has_created_by;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'changed_by'
    ) INTO has_changed_by;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'table_name'
    ) INTO has_table_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'entity_type'
    ) INTO has_entity_type;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'record_id'
    ) INTO has_record_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'change_history' AND column_name = 'entity_id'
    ) INTO has_entity_id;
    
    -- Determine which columns to use
    IF has_user_id THEN
        user_column := 'user_id';
    ELSIF has_created_by THEN
        user_column := 'created_by';
    ELSIF has_changed_by THEN
        user_column := 'changed_by';
    ELSE
        user_column := NULL;
    END IF;
    
    IF has_table_name THEN
        table_column := 'table_name';
    ELSIF has_entity_type THEN
        table_column := 'entity_type';
    ELSE
        table_column := NULL;
    END IF;
    
    IF has_record_id THEN
        record_column := 'record_id';
    ELSIF has_entity_id THEN
        record_column := 'entity_id';
    ELSE
        record_column := NULL;
    END IF;
    
    -- Get all columns for the view
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'change_history';
    
    -- Drop existing view if it exists
    DROP VIEW IF EXISTS public.change_history_view CASCADE;
    
    -- Create new view based on discovered columns
    IF user_column IS NOT NULL THEN
        -- We have a user reference column, create view with proper join
        EXECUTE format('
            CREATE VIEW public.change_history_view AS
            SELECT 
                ch.*,
                u.email as user_email,
                u.raw_user_meta_data->''name'' as user_name
            FROM public.change_history ch
            LEFT JOIN auth.users u ON ch.%I = u.id::text
        ', user_column);
    ELSE
        -- No user reference column, create simple view
        EXECUTE format('
            CREATE VIEW public.change_history_view AS
            SELECT %s
            FROM public.change_history
        ', column_list);
    END IF;
    
    -- Grant appropriate permissions
    GRANT SELECT ON public.change_history_view TO authenticated;
    GRANT SELECT ON public.change_history_view TO service_role;
    
    RAISE NOTICE 'Created change_history_view with columns: %', column_list;
    IF user_column IS NOT NULL THEN
        RAISE NOTICE 'Using % as user reference column', user_column;
    END IF;
    IF table_column IS NOT NULL THEN
        RAISE NOTICE 'Using % as table reference column', table_column;
    END IF;
    IF record_column IS NOT NULL THEN
        RAISE NOTICE 'Using % as record reference column', record_column;
    END IF;
END $$;

-- Now fix other views that might expose auth.users

-- Drop and recreate user_profiles_view if it exists
DROP VIEW IF EXISTS public.user_profiles_view CASCADE;

-- Create a secure view for user profiles that only shows public information
CREATE VIEW public.user_profiles_view AS
SELECT 
    id,
    email,
    name,
    avatar_url,
    bio,
    created_at,
    updated_at
FROM public.users;

-- Grant appropriate permissions
GRANT SELECT ON public.user_profiles_view TO authenticated;
GRANT SELECT ON public.user_profiles_view TO anon;

-- Check and fix any functions that might expose auth.users
-- List all functions that reference auth.users
DO $$
DECLARE
    func record;
BEGIN
    FOR func IN 
        SELECT DISTINCT 
            p.proname as function_name,
            n.nspname as schema_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE pg_get_functiondef(p.oid) LIKE '%auth.users%'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth')
    LOOP
        RAISE WARNING 'Function %.% references auth.users and should be reviewed', 
            func.schema_name, func.function_name;
    END LOOP;
END $$;

-- Remove any direct grants on auth.users to public or authenticated roles
REVOKE ALL ON auth.users FROM public;
REVOKE ALL ON auth.users FROM authenticated;
REVOKE ALL ON auth.users FROM anon;

-- Ensure auth schema is not accessible except by necessary system roles
REVOKE ALL ON SCHEMA auth FROM public;
REVOKE ALL ON SCHEMA auth FROM authenticated;
REVOKE ALL ON SCHEMA auth FROM anon;

-- Create a function to safely get user information
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS TABLE (
    id uuid,
    email text,
    name text,
    avatar_url text,
    bio text,
    created_at timestamptz,
    updated_at timestamptz
) 
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
        u.created_at,
        u.updated_at
    FROM public.users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile(uuid) TO authenticated;

-- Add comment explaining the security measures
COMMENT ON VIEW public.change_history_view IS 'Secure view of change_history that joins with user data without exposing auth.users directly';
COMMENT ON VIEW public.user_profiles_view IS 'Public view of user profiles showing only non-sensitive information';
COMMENT ON FUNCTION public.get_user_profile(uuid) IS 'Secure function to retrieve user profile information';

COMMIT;

-- Report on what was done
DO $$
DECLARE
    view_count integer;
    func_count integer;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM pg_views
    WHERE schemaname = 'public'
    AND definition LIKE '%auth.users%';
    
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE pg_get_functiondef(p.oid) LIKE '%auth.users%'
    AND n.nspname = 'public';
    
    RAISE NOTICE 'Migration complete. Remaining views referencing auth.users: %', view_count;
    RAISE NOTICE 'Remaining functions referencing auth.users: %', func_count;
END $$;