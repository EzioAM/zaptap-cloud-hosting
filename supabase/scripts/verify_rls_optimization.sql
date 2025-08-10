-- Verification Script: Check RLS Optimization Results
-- Run this after applying the migration to verify changes

-- ============================================
-- 1. Check for remaining unoptimized auth functions
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%auth.uid()%' 
    AND qual NOT LIKE '%(select auth.uid())%'
  )
  OR (
    with_check LIKE '%auth.uid()%'
    AND with_check NOT LIKE '%(select auth.uid())%'
  )
ORDER BY tablename, policyname;

-- ============================================
-- 2. Check for duplicate policies (same table and operation)
-- ============================================

WITH policy_counts AS (
    SELECT 
        tablename,
        cmd,
        COUNT(*) as policy_count,
        STRING_AGG(policyname, ', ') as policy_names
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
)
SELECT * FROM policy_counts
ORDER BY tablename, cmd;

-- ============================================
-- 3. Verify indexes exist for foreign keys
-- ============================================

SELECT 
    t.relname AS table_name,
    a.attname AS column_name,
    CASE 
        WHEN i.indkey IS NOT NULL THEN 'Indexed'
        ELSE 'NOT INDEXED'
    END AS index_status
FROM pg_class t
JOIN pg_attribute a ON t.oid = a.attrelid
LEFT JOIN pg_index i ON t.oid = i.indrelid 
    AND a.attnum = ANY(i.indkey)
WHERE t.relnamespace = 'public'::regnamespace
    AND t.relkind = 'r'
    AND a.attname LIKE '%_id'
    AND NOT a.attisdropped
ORDER BY 
    CASE WHEN i.indkey IS NULL THEN 0 ELSE 1 END,
    t.relname, 
    a.attname;

-- ============================================
-- 4. Performance check: Estimate row counts for policy evaluation
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    LENGTH(qual) as qual_complexity,
    LENGTH(with_check) as check_complexity
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY qual_complexity DESC, check_complexity DESC
LIMIT 20;

-- ============================================
-- 5. Check for tables missing RLS entirely
-- ============================================

SELECT 
    c.relname AS table_name,
    CASE 
        WHEN c.relrowsecurity THEN 'RLS Enabled'
        ELSE 'RLS DISABLED'
    END AS rls_status,
    COUNT(p.policyname) AS policy_count
FROM pg_class c
LEFT JOIN pg_policies p ON c.relname = p.tablename 
    AND p.schemaname = 'public'
WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
    AND c.relname NOT IN ('schema_migrations', 'supabase_migrations')
GROUP BY c.relname, c.relrowsecurity
ORDER BY rls_status, table_name;