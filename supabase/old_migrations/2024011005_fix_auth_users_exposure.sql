-- Fix views exposing auth.users data
-- This script recreates views without direct auth.users references

-- Drop the existing problematic view
DROP VIEW IF EXISTS public.change_history_with_details CASCADE;

-- Check which user column exists in change_history table and create view accordingly
DO $$
DECLARE
    has_changed_by boolean;
    has_user_id boolean;
    has_created_by boolean;
BEGIN
    -- Check for different possible user column names
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'change_history' 
        AND column_name = 'changed_by'
    ) INTO has_changed_by;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'change_history' 
        AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'change_history' 
        AND column_name = 'created_by'
    ) INTO has_created_by;
    
    -- Create view based on which column exists
    IF has_changed_by THEN
        EXECUTE '
        CREATE VIEW public.change_history_with_details AS
        SELECT 
            ch.id,
            ch.table_name,
            ch.record_id,
            ch.action,
            ch.changed_by as user_id,
            ch.changed_at,
            ch.old_data,
            ch.new_data,
            u.email as changed_by_email,
            u.name as changed_by_name
        FROM 
            public.change_history ch
            LEFT JOIN public.users u ON ch.changed_by = u.id';
    ELSIF has_user_id THEN
        EXECUTE '
        CREATE VIEW public.change_history_with_details AS
        SELECT 
            ch.id,
            ch.table_name,
            ch.record_id,
            ch.action,
            ch.user_id,
            ch.changed_at,
            ch.old_data,
            ch.new_data,
            u.email as changed_by_email,
            u.name as changed_by_name
        FROM 
            public.change_history ch
            LEFT JOIN public.users u ON ch.user_id = u.id';
    ELSIF has_created_by THEN
        EXECUTE '
        CREATE VIEW public.change_history_with_details AS
        SELECT 
            ch.id,
            ch.table_name,
            ch.record_id,
            ch.action,
            ch.created_by as user_id,
            ch.changed_at,
            ch.old_data,
            ch.new_data,
            u.email as changed_by_email,
            u.name as changed_by_name
        FROM 
            public.change_history ch
            LEFT JOIN public.users u ON ch.created_by = u.id';
    ELSE
        -- No user reference column found, create view without user join
        EXECUTE '
        CREATE VIEW public.change_history_with_details AS
        SELECT 
            ch.id,
            ch.table_name,
            ch.record_id,
            ch.action,
            NULL::uuid as user_id,
            ch.changed_at,
            ch.old_data,
            ch.new_data,
            NULL::text as changed_by_email,
            NULL::text as changed_by_name
        FROM 
            public.change_history ch';
    END IF;
END $$;

-- Grant appropriate permissions
GRANT SELECT ON public.change_history_with_details TO authenticated;

-- Add comment explaining the view
COMMENT ON VIEW public.change_history_with_details IS 'View showing change history with user details from public.users table (not auth.users)';