-- DATABASE HEALTH VERIFICATION SCRIPT
-- Run this script to verify all database components are working correctly
-- This script is safe to run multiple times

-- ============================================
-- COMPREHENSIVE DATABASE HEALTH CHECK
-- ============================================

BEGIN;

-- Create comprehensive verification function
CREATE OR REPLACE FUNCTION public.comprehensive_database_health_check()
RETURNS TABLE(
    check_category text,
    check_name text,
    status text,
    details text,
    recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- 1. Check RLS Status on Core Tables
    RETURN QUERY
    WITH rls_check AS (
        SELECT 
            t.tablename,
            CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public'
        AND t.tablename IN ('users', 'automations', 'automation_reviews', 'automation_likes', 'automation_executions', 'public_shares')
    )
    SELECT 
        'Security'::text,
        'RLS Status'::text,
        CASE WHEN COUNT(*) FILTER (WHERE rls_status = 'ENABLED') = 6 THEN 'PASS' ELSE 'FAIL' END::text,
        'RLS enabled on ' || COUNT(*) FILTER (WHERE rls_status = 'ENABLED') || '/6 core tables'::text,
        CASE WHEN COUNT(*) FILTER (WHERE rls_status = 'ENABLED') < 6 THEN 'Enable RLS on missing tables' ELSE 'Good' END::text
    FROM rls_check;

    -- 2. Check Critical RPC Functions
    RETURN QUERY
    WITH function_check AS (
        SELECT proname
        FROM pg_proc
        WHERE proname IN (
            'get_user_automation_stats',
            'get_automation_engagement', 
            'get_trending_automations',
            'track_automation_download',
            'track_automation_view',
            'verify_database_setup'
        )
    )
    SELECT 
        'Functions'::text,
        'RPC Functions'::text,
        CASE WHEN COUNT(*) >= 6 THEN 'PASS' ELSE 'FAIL' END::text,
        'Found ' || COUNT(*) || '/6 required functions'::text,
        CASE WHEN COUNT(*) < 6 THEN 'Run master consolidation migration' ELSE 'Good' END::text
    FROM function_check;

    -- 3. Check Table Structure and Required Columns
    RETURN QUERY
    WITH column_check AS (
        SELECT 
            table_name,
            COUNT(*) as column_count
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'automations'
        AND column_name IN ('id', 'title', 'description', 'steps', 'created_by', 'is_public', 'likes_count', 'downloads_count', 'views_count', 'execution_count', 'average_rating', 'rating_count')
    )
    SELECT 
        'Schema'::text,
        'Automation Table Structure'::text,
        CASE WHEN column_count >= 12 THEN 'PASS' ELSE 'FAIL' END::text,
        'Has ' || column_count || '/12 required columns'::text,
        CASE WHEN column_count < 12 THEN 'Run master consolidation migration to add missing columns' ELSE 'Good' END::text
    FROM column_check;

    -- 4. Check RLS Policies
    RETURN QUERY
    WITH policy_check AS (
        SELECT COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'automations', 'automation_reviews', 'automation_likes', 'automation_executions', 'public_shares')
    )
    SELECT 
        'Security'::text,
        'RLS Policies'::text,
        CASE WHEN policy_count >= 15 THEN 'PASS' ELSE 'FAIL' END::text,
        'Found ' || policy_count || ' policies across core tables'::text,
        CASE WHEN policy_count < 15 THEN 'Run master consolidation migration to create policies' ELSE 'Good' END::text
    FROM policy_check;

    -- 5. Check Triggers
    RETURN QUERY
    WITH trigger_check AS (
        SELECT COUNT(*) as trigger_count
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE c.relname IN ('automation_likes', 'automation_reviews')
        AND t.tgname LIKE 'trigger_%'
    )
    SELECT 
        'Automation'::text,
        'Count Update Triggers'::text,
        CASE WHEN trigger_count >= 2 THEN 'PASS' ELSE 'FAIL' END::text,
        'Found ' || trigger_count || '/2 required triggers'::text,
        CASE WHEN trigger_count < 2 THEN 'Run master consolidation migration to create triggers' ELSE 'Good' END::text
    FROM trigger_check;

    -- 6. Test Function Execution (with error handling)
    RETURN QUERY
    SELECT 
        'Functions'::text,
        'Function Execution Test'::text,
        'TESTING'::text,
        'Testing function execution...'::text,
        'See individual function tests below'::text;

    -- Test get_user_automation_stats function
    BEGIN
        PERFORM public.get_user_automation_stats('00000000-0000-0000-0000-000000000000'::uuid);
        RETURN QUERY
        SELECT 
            'Functions'::text,
            'get_user_automation_stats'::text,
            'PASS'::text,
            'Function executes without error'::text,
            'Good'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'Functions'::text,
            'get_user_automation_stats'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text,
            'Check function definition'::text;
    END;

    -- Test get_automation_engagement function
    BEGIN
        PERFORM public.get_automation_engagement('00000000-0000-0000-0000-000000000000'::uuid);
        RETURN QUERY
        SELECT 
            'Functions'::text,
            'get_automation_engagement'::text,
            'PASS'::text,
            'Function executes without error'::text,
            'Good'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'Functions'::text,
            'get_automation_engagement'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text,
            'Check function definition'::text;
    END;

    -- Test get_trending_automations function
    BEGIN
        PERFORM public.get_trending_automations(5, '7 days');
        RETURN QUERY
        SELECT 
            'Functions'::text,
            'get_trending_automations'::text,
            'PASS'::text,
            'Function executes without error'::text,
            'Good'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'Functions'::text,
            'get_trending_automations'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text,
            'Check function definition'::text;
    END;

    -- 7. Check Permissions
    RETURN QUERY
    WITH permission_check AS (
        SELECT 
            COUNT(DISTINCT grantee) as role_count
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
        AND table_name IN ('automations', 'automation_reviews', 'automation_likes')
        AND grantee IN ('authenticated', 'anon')
    )
    SELECT 
        'Security'::text,
        'Table Permissions'::text,
        CASE WHEN role_count >= 2 THEN 'PASS' ELSE 'FAIL' END::text,
        'Permissions granted to ' || role_count || ' roles'::text,
        CASE WHEN role_count < 2 THEN 'Run master consolidation migration to grant permissions' ELSE 'Good' END::text
    FROM permission_check;

    -- 8. Data Integrity Check
    RETURN QUERY
    WITH integrity_check AS (
        SELECT 
            (SELECT COUNT(*) FROM public.automations WHERE created_by IS NULL) as orphaned_automations,
            (SELECT COUNT(*) FROM public.automation_reviews WHERE automation_id NOT IN (SELECT id FROM public.automations)) as orphaned_reviews
    )
    SELECT 
        'Data'::text,
        'Data Integrity'::text,
        CASE WHEN orphaned_automations = 0 AND orphaned_reviews = 0 THEN 'PASS' ELSE 'WARN' END::text,
        'Orphaned automations: ' || orphaned_automations || ', Orphaned reviews: ' || orphaned_reviews::text,
        CASE WHEN orphaned_automations > 0 OR orphaned_reviews > 0 THEN 'Clean up orphaned records' ELSE 'Good' END::text
    FROM integrity_check;

END;
$$;

COMMIT;

-- ============================================
-- INDIVIDUAL FUNCTION TESTS
-- ============================================

-- Create function to test individual RPC functions with real scenarios
CREATE OR REPLACE FUNCTION public.test_rpc_functions()
RETURNS TABLE(
    function_name text,
    test_scenario text,
    status text,
    result_details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    test_user_id uuid := '00000000-0000-0000-0000-000000000000';
    test_automation_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
    -- Test get_user_automation_stats
    BEGIN
        PERFORM public.get_user_automation_stats(test_user_id);
        RETURN QUERY
        SELECT 
            'get_user_automation_stats'::text,
            'Test with dummy user ID'::text,
            'PASS'::text,
            'Function executed successfully'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'get_user_automation_stats'::text,
            'Test with dummy user ID'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text;
    END;

    -- Test get_automation_engagement
    BEGIN
        PERFORM public.get_automation_engagement(test_automation_id);
        RETURN QUERY
        SELECT 
            'get_automation_engagement'::text,
            'Test with dummy automation ID'::text,
            'PASS'::text,
            'Function executed successfully'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'get_automation_engagement'::text,
            'Test with dummy automation ID'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text;
    END;

    -- Test get_trending_automations
    BEGIN
        PERFORM public.get_trending_automations(10, '7 days');
        RETURN QUERY
        SELECT 
            'get_trending_automations'::text,
            'Test with limit 10, 7 days window'::text,
            'PASS'::text,
            'Function executed successfully'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'get_trending_automations'::text,
            'Test with limit 10, 7 days window'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text;
    END;

    -- Test track_automation_download
    BEGIN
        PERFORM public.track_automation_download(test_automation_id);
        RETURN QUERY
        SELECT 
            'track_automation_download'::text,
            'Test with dummy automation ID'::text,
            'PASS'::text,
            'Function executed successfully'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'track_automation_download'::text,
            'Test with dummy automation ID'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text;
    END;

    -- Test track_automation_view
    BEGIN
        PERFORM public.track_automation_view(test_automation_id);
        RETURN QUERY
        SELECT 
            'track_automation_view'::text,
            'Test with dummy automation ID'::text,
            'PASS'::text,
            'Function executed successfully'::text;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'track_automation_view'::text,
            'Test with dummy automation ID'::text,
            'FAIL'::text,
            'Error: ' || SQLERRM::text;
    END;

END;
$$;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DATABASE VERIFICATION SCRIPT LOADED';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'To run comprehensive health check:';
    RAISE NOTICE 'SELECT * FROM comprehensive_database_health_check();';
    RAISE NOTICE '';
    RAISE NOTICE 'To test individual RPC functions:';
    RAISE NOTICE 'SELECT * FROM test_rpc_functions();';
    RAISE NOTICE '';
    RAISE NOTICE 'To run the built-in verification:';
    RAISE NOTICE 'SELECT * FROM verify_database_setup();';
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
END $$;