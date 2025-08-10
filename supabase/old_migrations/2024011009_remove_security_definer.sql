-- Remove SECURITY DEFINER from views
-- This script recreates views without SECURITY DEFINER to prevent privilege escalation

-- 1. Fix user_roles_summary view
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;

CREATE OR REPLACE VIEW public.user_roles_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    COUNT(DISTINCT a.id) as automation_count,
    COUNT(DISTINCT d.id) as deployment_count
FROM 
    public.users u
    LEFT JOIN public.automations a ON a.user_id = u.id
    LEFT JOIN public.deployments d ON d.user_id = u.id
WHERE 
    -- Only show data that the current user has access to
    u.id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'developer')
    )
GROUP BY 
    u.id, u.email, u.name, u.role, u.created_at;

-- Grant appropriate permissions
GRANT SELECT ON public.user_roles_summary TO authenticated;

-- 2. Ensure change_history_with_details doesn't use SECURITY DEFINER
-- (Already fixed in previous migration, but let's ensure it's correct)
DROP VIEW IF EXISTS public.change_history_with_details CASCADE;

CREATE OR REPLACE VIEW public.change_history_with_details AS
SELECT 
    ch.id,
    ch.table_name,
    ch.record_id,
    ch.action,
    ch.changed_by,
    ch.changed_at,
    ch.old_data,
    ch.new_data,
    u.email as changed_by_email,
    u.name as changed_by_name
FROM 
    public.change_history ch
    LEFT JOIN public.users u ON ch.changed_by = u.id
WHERE 
    -- Only show change history for records the user can access
    ch.changed_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'developer')
    );

-- Grant appropriate permissions
GRANT SELECT ON public.change_history_with_details TO authenticated;

-- Add comments
COMMENT ON VIEW public.user_roles_summary IS 'Summary of user roles and activity counts - uses RLS instead of SECURITY DEFINER';
COMMENT ON VIEW public.change_history_with_details IS 'Change history with user details - uses RLS instead of SECURITY DEFINER';