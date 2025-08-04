-- Master security fixes migration
-- Run this script to apply all security fixes identified by Supabase Security Advisor
-- 
-- This script applies the following fixes:
-- 1. Removes auth.users exposure from views
-- 2. Removes SECURITY DEFINER from views
-- 3. Enables RLS on all public tables
-- 4. Secures sensitive tables (audit_logs, api_keys)

-- Run all migrations in order
\i 01_fix_auth_users_exposure.sql
\i 02_remove_security_definer.sql
\i 03_enable_rls_policies.sql
\i 04_secure_sensitive_tables.sql

-- Verify RLS is enabled on all tables
DO $$
DECLARE
    r RECORD;
    missing_rls TEXT := '';
BEGIN
    FOR r IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        AND NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
            AND c.relname = tablename
            AND c.relrowsecurity = true
        )
    LOOP
        missing_rls := missing_rls || r.schemaname || '.' || r.tablename || ', ';
    END LOOP;
    
    IF missing_rls != '' THEN
        RAISE WARNING 'Tables still missing RLS: %', rtrim(missing_rls, ', ');
    ELSE
        RAISE NOTICE 'All tables have RLS enabled successfully!';
    END IF;
END $$;