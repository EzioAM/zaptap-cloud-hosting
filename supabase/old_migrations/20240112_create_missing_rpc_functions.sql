-- Missing RPC Functions Migration
-- Generated on 2025-08-04T02:29:01.045Z
-- Run this in Supabase SQL Editor to create missing functions

BEGIN;

-- Function: exec_sql
-- WARNING: This function allows arbitrary SQL execution. Use with caution!
-- Only grant execute permission to admin/service roles
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Security check: only allow admin users
    IF auth.jwt() ->> 'role' NOT IN ('service_role', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admin users can execute SQL';
    END IF;
    
    -- Execute the query and return result as JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        -- Return error as JSON
        RETURN json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

-- Grant execute permission only to service role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- Function: execute_sql
-- WARNING: This function allows arbitrary SQL execution. Use with caution!
-- Only grant execute permission to admin/service roles
CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Security check: only allow admin users
    IF auth.jwt() ->> 'role' NOT IN ('service_role', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only admin users can execute SQL';
    END IF;
    
    -- Execute the query and return result as JSON
    EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION
    WHEN OTHERS THEN
        -- Return error as JSON
        RETURN json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$;

-- Grant execute permission only to service role
GRANT EXECUTE ON FUNCTION public.execute_sql(text) TO service_role;

-- Function: get_user_automation_stats
CREATE OR REPLACE FUNCTION public.get_user_automation_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'total_automations', COUNT(DISTINCT a.id),
        'total_executions', COALESCE(SUM(a.execution_count), 0),
        'total_shares', COUNT(DISTINCT s.id),
        'total_downloads', COALESCE(SUM(a.download_count), 0),
        'categories', json_agg(DISTINCT a.category)
    ) INTO stats
    FROM automations a
    LEFT JOIN public_shares s ON s.automation_id = a.id
    WHERE a.created_by = p_user_id;
    
    RETURN COALESCE(stats, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_automation_stats(uuid) TO authenticated;

-- Function: get_automation_engagement
CREATE OR REPLACE FUNCTION public.get_automation_engagement(p_automation_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    engagement json;
BEGIN
    SELECT json_build_object(
        'view_count', COALESCE(a.view_count, 0),
        'download_count', COALESCE(a.download_count, 0),
        'execution_count', COALESCE(a.execution_count, 0),
        'share_count', COUNT(DISTINCT s.id),
        'average_rating', COALESCE(AVG(r.rating), 0),
        'review_count', COUNT(DISTINCT r.id)
    ) INTO engagement
    FROM automations a
    LEFT JOIN public_shares s ON s.automation_id = a.id
    LEFT JOIN reviews r ON r.automation_id = a.id
    WHERE a.id = p_automation_id
    GROUP BY a.id, a.view_count, a.download_count, a.execution_count;
    
    RETURN COALESCE(engagement, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_automation_engagement(uuid) TO anon, authenticated;

-- Function: get_trending_automations
CREATE OR REPLACE FUNCTION public.get_trending_automations(
    p_limit integer DEFAULT 10,
    p_offset integer DEFAULT 0,
    p_category text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT 
            a.*,
            COALESCE(a.view_count, 0) + 
            COALESCE(a.download_count, 0) * 2 + 
            COALESCE(a.execution_count, 0) * 3 as trending_score
        FROM automations a
        WHERE 
            a.is_public = true AND
            (p_category IS NULL OR a.category = p_category)
        ORDER BY trending_score DESC, a.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) t;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_automations(integer, integer, text) TO anon, authenticated;

-- Function: track_automation_download
CREATE OR REPLACE FUNCTION public.track_automation_download(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE automations
    SET download_count = COALESCE(download_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_automation_download(uuid) TO anon, authenticated;

-- Function: track_automation_view
CREATE OR REPLACE FUNCTION public.track_automation_view(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE automations
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_automation_view(uuid) TO anon, authenticated;

-- Function: increment_automation_execution_count
CREATE OR REPLACE FUNCTION public.increment_automation_execution_count(automation_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE automations
    SET execution_count = COALESCE(execution_count, 0) + 1
    WHERE id = automation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_automation_execution_count(uuid) TO anon, authenticated;

-- Function: increment_share_access_count
CREATE OR REPLACE FUNCTION public.increment_share_access_count(p_share_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public_shares
    SET 
        access_count = COALESCE(access_count, 0) + 1,
        last_accessed_at = now()
    WHERE 
        id = p_share_id AND
        is_active = true AND
        expires_at > now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_share_access_count(text) TO anon, authenticated;

-- Function: get_table_columns
CREATE OR REPLACE FUNCTION public.get_table_columns(
    table_name text,
    schema_name text DEFAULT 'public'
)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'column_name', column_name,
            'data_type', data_type,
            'is_nullable', is_nullable,
            'column_default', column_default
        )
    )
    INTO result
    FROM information_schema.columns
    WHERE 
        table_schema = schema_name AND
        information_schema.columns.table_name = get_table_columns.table_name
    ORDER BY ordinal_position;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_columns(text, text) TO authenticated;

-- Function: get_rls_status
CREATE OR REPLACE FUNCTION public.get_rls_status()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'table_name', tablename,
            'rls_enabled', rowsecurity
        )
    )
    INTO result
    FROM pg_tables
    WHERE schemaname = 'public';
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rls_status() TO authenticated;

-- Function: revert_change
CREATE OR REPLACE FUNCTION public.revert_change(change_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    change_record record;
    result json;
BEGIN
    -- Get the change record
    SELECT * INTO change_record
    FROM change_history
    WHERE id = change_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Change not found or unauthorized');
    END IF;
    
    -- Apply the previous state
    -- This is a placeholder - actual implementation depends on your change tracking structure
    -- You would need to implement the logic to revert the specific change type
    
    -- Mark change as reverted
    UPDATE change_history
    SET 
        reverted_at = now(),
        reverted_by = auth.uid()
    WHERE id = change_id;
    
    RETURN json_build_object('success', true, 'change_id', change_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_change(uuid) TO authenticated;

-- Function: get_change_statistics
CREATE OR REPLACE FUNCTION public.get_change_statistics()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    stats json;
BEGIN
    SELECT json_build_object(
        'total_changes', COUNT(*),
        'changes_by_type', json_object_agg(change_type, type_count),
        'changes_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'changes_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'reverted_changes', COUNT(*) FILTER (WHERE reverted_at IS NOT NULL)
    )
    INTO stats
    FROM (
        SELECT 
            change_type,
            COUNT(*) as type_count
        FROM change_history
        WHERE user_id = auth.uid()
        GROUP BY change_type
    ) t;
    
    RETURN COALESCE(stats, '{}'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_change_statistics() TO authenticated;

-- Function: grant_developer_access
CREATE OR REPLACE FUNCTION public.grant_developer_access(user_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
    result json;
BEGIN
    -- Only allow service role to grant access
    IF auth.jwt() ->> 'role' NOT IN ('service_role', 'supabase_admin') THEN
        RETURN json_build_object('error', 'Unauthorized: Only admin users can grant developer access');
    END IF;
    
    -- Find user by email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN json_build_object('error', 'User not found');
    END IF;
    
    -- Update user metadata to include developer role
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        '{"role": "developer"}'::jsonb
    WHERE id = target_user_id;
    
    RETURN json_build_object(
        'success', true,
        'user_id', target_user_id,
        'email', user_email
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_developer_access(text) TO service_role;

COMMIT;
