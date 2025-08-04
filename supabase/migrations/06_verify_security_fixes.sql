-- Verification Script for Security Fixes
-- Run this after applying the security migration to verify everything is correct

-- 1. Check that all tables exist and have RLS enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
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
ORDER BY tablename;

-- 2. Check column names in key tables
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (
    (table_name = 'automations' AND column_name IN ('created_by', 'user_id'))
    OR (table_name = 'automation_executions' AND column_name IN ('user_id', 'created_by'))
    OR (table_name = 'change_history' AND column_name IN ('changed_by', 'user_id', 'created_by'))
    OR (table_name = 'automation_reviews' AND column_name = 'user_id')
)
ORDER BY table_name, column_name;

-- 3. Check that views exist and don't have SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    definition LIKE '%SECURITY DEFINER%' as has_security_definer
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('change_history_view', 'user_roles_summary');

-- 4. Check RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
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
ORDER BY tablename, policyname;

-- 5. Check for any remaining references to auth.users in public views
SELECT 
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%auth.users%'
AND viewname NOT IN ('user_roles_summary'); -- This one is allowed as it uses proper RLS

-- If all checks pass, you should see:
-- 1. All tables with rowsecurity = true
-- 2. Correct column names (automations.created_by, automation_executions.user_id, etc.)
-- 3. Views without SECURITY DEFINER
-- 4. Multiple RLS policies for each table
-- 5. No views exposing auth.users (except user_roles_summary which is properly secured)