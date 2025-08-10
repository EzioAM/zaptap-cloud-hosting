-- Fix Function Search Path Security Warnings
-- Generated on 2025-08-04
-- Sets search_path for all functions to prevent SQL injection attacks

BEGIN;

-- ============================================
-- Part 1: Developer/Admin Functions
-- ============================================

-- get_table_columns
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS TABLE(column_name text, data_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.column_name::text,
        c.data_type::text
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' 
    AND c.table_name = p_table_name
    ORDER BY c.ordinal_position;
END;
$$;

-- get_rls_status
CREATE OR REPLACE FUNCTION public.get_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::text as table_name,
        c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    ORDER BY c.relname;
END;
$$;

-- exec_sql (dangerous function - should be restricted)
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Only allow admins to execute arbitrary SQL
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'service_role')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can execute SQL';
    END IF;
    
    EXECUTE sql;
END;
$$;

-- execute_sql (alias for exec_sql)
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Delegate to exec_sql
    PERFORM public.exec_sql(sql);
END;
$$;

-- ============================================
-- Part 2: User Management Functions
-- ============================================

-- get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id;
    
    RETURN COALESCE(user_role, 'user');
END;
$$;

-- user_has_permission
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id uuid, permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id;
    
    -- Define permission mapping
    CASE permission
        WHEN 'admin' THEN
            RETURN user_role IN ('admin', 'service_role');
        WHEN 'developer' THEN
            RETURN user_role IN ('admin', 'developer', 'service_role');
        WHEN 'user' THEN
            RETURN true; -- All authenticated users have user permission
        ELSE
            RETURN false;
    END CASE;
END;
$$;

-- set_developer_role_for_email
CREATE OR REPLACE FUNCTION public.set_developer_role_for_email(email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Only admins can set developer role
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can set developer role';
    END IF;
    
    UPDATE public.users
    SET role = 'developer'
    WHERE users.email = set_developer_role_for_email.email;
END;
$$;

-- grant_developer_access
CREATE OR REPLACE FUNCTION public.grant_developer_access(target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Only admins can grant developer access
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can grant developer access';
    END IF;
    
    UPDATE public.users
    SET role = 'developer'
    WHERE email = target_email;
    
    -- Log the change
    PERFORM public.log_developer_access_change(target_email, 'grant');
END;
$$;

-- log_developer_access_change
CREATE OR REPLACE FUNCTION public.log_developer_access_change(target_email text, action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    INSERT INTO public.developer_access_logs (
        changed_by,
        target_email,
        action,
        created_at
    ) VALUES (
        auth.uid(),
        target_email,
        action,
        now()
    );
END;
$$;

-- ============================================
-- Part 3: Automation Statistics Functions
-- ============================================

-- get_user_automation_stats
CREATE OR REPLACE FUNCTION public.get_user_automation_stats(p_user_id uuid)
RETURNS TABLE(
    total_automations bigint,
    total_runs bigint,
    successful_runs bigint,
    failed_runs bigint,
    total_time_saved integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT a.id) as total_automations,
        COUNT(ae.id) as total_runs,
        COUNT(ae.id) FILTER (WHERE ae.status = 'completed') as successful_runs,
        COUNT(ae.id) FILTER (WHERE ae.status = 'failed') as failed_runs,
        COALESCE(SUM(ae.execution_time_ms)::integer / 1000, 0) as total_time_saved
    FROM public.automations a
    LEFT JOIN public.automation_executions ae ON ae.automation_id = a.id
    WHERE a.created_by = p_user_id;
END;
$$;

-- get_user_automation_stats_fast (optimized version)
CREATE OR REPLACE FUNCTION public.get_user_automation_stats_fast(p_user_id uuid)
RETURNS TABLE(
    total_automations bigint,
    total_runs bigint,
    successful_runs bigint,
    failed_runs bigint,
    total_time_saved integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Use materialized view or summary table if available
    RETURN QUERY
    SELECT * FROM public.get_user_automation_stats(p_user_id);
END;
$$;

-- get_automation_engagement
CREATE OR REPLACE FUNCTION public.get_automation_engagement(p_automation_id uuid)
RETURNS TABLE(
    likes_count bigint,
    downloads_count integer,
    executions_count bigint,
    user_has_liked boolean
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE((SELECT COUNT(*) FROM public.automation_likes WHERE automation_id = p_automation_id), 0)::bigint,
        COALESCE((SELECT downloads_count FROM public.automations WHERE id = p_automation_id), 0),
        COALESCE((SELECT COUNT(*) FROM public.automation_executions WHERE automation_id = p_automation_id), 0)::bigint,
        COALESCE((SELECT EXISTS(SELECT 1 FROM public.automation_likes WHERE automation_id = p_automation_id AND user_id = auth.uid())), false);
END;
$$;

-- get_trending_automations
CREATE OR REPLACE FUNCTION public.get_trending_automations(
    p_limit integer DEFAULT 10,
    p_time_window interval DEFAULT '7 days'
)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    category text,
    created_by uuid,
    created_at timestamptz,
    likes_count bigint,
    downloads_count integer,
    views_count integer,
    is_public boolean,
    tags text[]
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.category,
        a.created_by,
        a.created_at,
        COALESCE((SELECT COUNT(*) FROM public.automation_likes al WHERE al.automation_id = a.id), 0)::bigint as likes_count,
        COALESCE(a.downloads_count, 0),
        COALESCE(a.views_count, 0),
        a.is_public,
        a.tags
    FROM public.automations a
    WHERE a.is_public = true
        AND a.created_at >= NOW() - p_time_window
    ORDER BY 
        (COALESCE(a.downloads_count, 0) * 2 + 
         COALESCE(a.views_count, 0) + 
         COALESCE((SELECT COUNT(*) FROM public.automation_likes al WHERE al.automation_id = a.id), 0) * 3) DESC,
        a.created_at DESC
    LIMIT p_limit;
END;
$$;

-- get_popular_automations
CREATE OR REPLACE FUNCTION public.get_popular_automations(p_limit integer DEFAULT 10)
RETURNS TABLE(
    id uuid,
    title text,
    description text,
    category text,
    created_by uuid,
    likes_count bigint,
    downloads_count integer
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.category,
        a.created_by,
        COALESCE((SELECT COUNT(*) FROM public.automation_likes al WHERE al.automation_id = a.id), 0)::bigint as likes_count,
        COALESCE(a.downloads_count, 0)
    FROM public.automations a
    WHERE a.is_public = true
    ORDER BY 
        COALESCE(a.downloads_count, 0) DESC,
        likes_count DESC
    LIMIT p_limit;
END;
$$;

-- ============================================
-- Part 4: Tracking Functions
-- ============================================

-- track_automation_view
CREATE OR REPLACE FUNCTION public.track_automation_view(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.automations
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

-- track_automation_download
CREATE OR REPLACE FUNCTION public.track_automation_download(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.automations
    SET downloads_count = COALESCE(downloads_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

-- increment_automation_execution_count
CREATE OR REPLACE FUNCTION public.increment_automation_execution_count(p_automation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.automations
    SET execution_count = COALESCE(execution_count, 0) + 1
    WHERE id = p_automation_id;
END;
$$;

-- increment_share_access_count
CREATE OR REPLACE FUNCTION public.increment_share_access_count(p_share_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    UPDATE public.public_shares
    SET access_count = COALESCE(access_count, 0) + 1
    WHERE id = p_share_id;
END;
$$;

-- ============================================
-- Part 5: Utility Functions
-- ============================================

-- handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- update_automation_likes_count
CREATE OR REPLACE FUNCTION public.update_automation_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.automations
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = NEW.automation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.automations
        SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
        WHERE id = OLD.automation_id;
    END IF;
    RETURN NULL;
END;
$$;

-- update_comment_likes_count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.comments
        SET likes_count = COALESCE(likes_count, 0) + 1
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.comments
        SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0)
        WHERE id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$;

-- ============================================
-- Part 6: Analytics Functions
-- ============================================

-- get_daily_execution_stats
CREATE OR REPLACE FUNCTION public.get_daily_execution_stats(p_days integer DEFAULT 30)
RETURNS TABLE(
    day date,
    total_executions bigint,
    successful_executions bigint,
    failed_executions bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(ae.created_at) as day,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE ae.status = 'completed') as successful_executions,
        COUNT(*) FILTER (WHERE ae.status = 'failed') as failed_executions
    FROM public.automation_executions ae
    WHERE ae.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY DATE(ae.created_at)
    ORDER BY day DESC;
END;
$$;

-- get_step_execution_stats
CREATE OR REPLACE FUNCTION public.get_step_execution_stats(p_automation_id uuid)
RETURNS TABLE(
    step_type text,
    total_executions bigint,
    avg_duration_ms numeric,
    success_rate numeric
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        se.step_type,
        COUNT(*) as total_executions,
        AVG(se.duration_ms)::numeric as avg_duration_ms,
        (COUNT(*) FILTER (WHERE se.status = 'completed')::numeric / COUNT(*)::numeric * 100) as success_rate
    FROM public.step_executions se
    JOIN public.automation_executions ae ON ae.id = se.execution_id
    WHERE ae.automation_id = p_automation_id
    GROUP BY se.step_type
    ORDER BY total_executions DESC;
END;
$$;

-- get_automation_trends
CREATE OR REPLACE FUNCTION public.get_automation_trends(p_days integer DEFAULT 30)
RETURNS TABLE(
    day date,
    new_automations bigint,
    new_users bigint,
    total_executions bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '1 day' * (p_days - 1),
            CURRENT_DATE,
            INTERVAL '1 day'
        )::date AS day
    )
    SELECT 
        ds.day,
        COALESCE(COUNT(DISTINCT a.id), 0) as new_automations,
        COALESCE(COUNT(DISTINCT u.id), 0) as new_users,
        COALESCE(COUNT(DISTINCT ae.id), 0) as total_executions
    FROM date_series ds
    LEFT JOIN public.automations a ON DATE(a.created_at) = ds.day
    LEFT JOIN public.users u ON DATE(u.created_at) = ds.day
    LEFT JOIN public.automation_executions ae ON DATE(ae.created_at) = ds.day
    GROUP BY ds.day
    ORDER BY ds.day DESC;
END;
$$;

-- ============================================
-- Part 7: Change History Functions
-- ============================================

-- get_change_statistics
CREATE OR REPLACE FUNCTION public.get_change_statistics()
RETURNS TABLE(
    total_changes bigint,
    changes_today bigint,
    changes_this_week bigint,
    most_changed_table text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total_changes,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as changes_today,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as changes_this_week
        FROM public.change_history
    ),
    top_table AS (
        SELECT table_name
        FROM public.change_history
        GROUP BY table_name
        ORDER BY COUNT(*) DESC
        LIMIT 1
    )
    SELECT 
        stats.total_changes,
        stats.changes_today,
        stats.changes_this_week,
        top_table.table_name
    FROM stats, top_table;
END;
$$;

-- revert_change
CREATE OR REPLACE FUNCTION public.revert_change(p_change_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_change public.change_history;
BEGIN
    -- Only admins can revert changes
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'developer')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins and developers can revert changes';
    END IF;
    
    -- Get the change record
    SELECT * INTO v_change
    FROM public.change_history
    WHERE id = p_change_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Change not found';
    END IF;
    
    -- Revert based on operation
    CASE v_change.operation
        WHEN 'INSERT' THEN
            EXECUTE format('DELETE FROM %I WHERE id = %L', v_change.table_name, v_change.record_id);
        WHEN 'UPDATE' THEN
            -- This would require storing old_data, which should be implemented
            RAISE EXCEPTION 'Update reversion not implemented';
        WHEN 'DELETE' THEN
            -- This would require storing the deleted data
            RAISE EXCEPTION 'Delete reversion not implemented';
    END CASE;
    
    -- Mark as reverted
    UPDATE public.change_history
    SET reverted_at = now(),
        reverted_by = auth.uid()
    WHERE id = p_change_id;
END;
$$;

-- ============================================
-- Part 8: Cleanup Functions
-- ============================================

-- cleanup_expired_shares
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Delete expired public shares
    DELETE FROM public.public_shares
    WHERE expires_at < now()
    AND expires_at IS NOT NULL;
    
    -- Deactivate old shares
    UPDATE public.public_shares
    SET is_active = false
    WHERE created_at < now() - INTERVAL '90 days'
    AND is_active = true;
END;
$$;

-- cleanup_old_executions
CREATE OR REPLACE FUNCTION public.cleanup_old_executions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Delete execution records older than 90 days
    DELETE FROM public.step_executions
    WHERE execution_id IN (
        SELECT id FROM public.automation_executions
        WHERE created_at < now() - INTERVAL '90 days'
    );
    
    DELETE FROM public.automation_executions
    WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- update_execution_summary
CREATE OR REPLACE FUNCTION public.update_execution_summary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Update automation execution count
    IF NEW.status = 'completed' THEN
        UPDATE public.automations
        SET 
            execution_count = COALESCE(execution_count, 0) + 1,
            last_executed_at = NEW.created_at
        WHERE id = NEW.automation_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- Part 9: Sharing Functions
-- ============================================

-- get_shareable_automation
CREATE OR REPLACE FUNCTION public.get_shareable_automation(p_share_code text)
RETURNS TABLE(
    automation_id uuid,
    title text,
    description text,
    steps jsonb,
    category text
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Increment access count
    UPDATE public.public_shares
    SET access_count = COALESCE(access_count, 0) + 1
    WHERE share_code = p_share_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
    
    -- Return automation data
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.steps,
        a.category
    FROM public.automations a
    JOIN public.public_shares ps ON ps.automation_id = a.id
    WHERE ps.share_code = p_share_code
    AND ps.is_active = true
    AND (ps.expires_at IS NULL OR ps.expires_at > now());
END;
$$;

-- ============================================
-- Part 10: Verification Function
-- ============================================

-- verify_rls_enabled (already exists but update for consistency)
CREATE OR REPLACE FUNCTION public.verify_rls_enabled()
RETURNS TABLE(
    table_name text,
    rls_enabled boolean
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.relname::text as table_name,
        c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE '_prisma%'
    ORDER BY c.relname;
END;
$$;

COMMIT;