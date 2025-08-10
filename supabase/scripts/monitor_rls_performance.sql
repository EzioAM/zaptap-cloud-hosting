-- Performance Monitoring Script: Track RLS Query Performance
-- Run this before and after the migration to measure improvements

-- ============================================
-- 1. Create performance tracking table (run once)
-- ============================================

CREATE TABLE IF NOT EXISTS public.rls_performance_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    test_name text NOT NULL,
    table_name text NOT NULL,
    operation text NOT NULL,
    execution_time_ms numeric,
    row_count integer,
    test_timestamp timestamp with time zone DEFAULT now(),
    migration_status text CHECK (migration_status IN ('before', 'after'))
);

-- ============================================
-- 2. Performance Test Functions
-- ============================================

-- Test SELECT performance for automations table
CREATE OR REPLACE FUNCTION test_automations_select_performance()
RETURNS void AS $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    row_count integer;
    exec_time numeric;
BEGIN
    start_time := clock_timestamp();
    
    -- Simulate typical user query
    SELECT COUNT(*) INTO row_count
    FROM public.automations
    WHERE user_id = auth.uid() OR is_public = true;
    
    end_time := clock_timestamp();
    exec_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    INSERT INTO public.rls_performance_metrics 
        (test_name, table_name, operation, execution_time_ms, row_count, migration_status)
    VALUES 
        ('User automations query', 'automations', 'SELECT', exec_time, row_count, 'after');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test complex JOIN with RLS
CREATE OR REPLACE FUNCTION test_complex_rls_join_performance()
RETURNS void AS $$
DECLARE
    start_time timestamp;
    end_time timestamp;
    row_count integer;
    exec_time numeric;
BEGIN
    start_time := clock_timestamp();
    
    -- Complex query involving multiple tables with RLS
    SELECT COUNT(*) INTO row_count
    FROM public.automations a
    JOIN public.automation_versions av ON a.id = av.automation_id
    LEFT JOIN public.automation_analytics aa ON a.id = aa.automation_id
    WHERE a.user_id = auth.uid() OR a.is_public = true;
    
    end_time := clock_timestamp();
    exec_time := EXTRACT(MILLISECONDS FROM (end_time - start_time));
    
    INSERT INTO public.rls_performance_metrics 
        (test_name, table_name, operation, execution_time_ms, row_count, migration_status)
    VALUES 
        ('Complex join with RLS', 'multiple', 'JOIN', exec_time, row_count, 'after');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Run Performance Tests
-- ============================================

-- Execute all performance tests
DO $$
BEGIN
    -- Test 1: Simple SELECT queries
    PERFORM test_automations_select_performance();
    
    -- Test 2: Complex JOIN queries
    PERFORM test_complex_rls_join_performance();
    
    -- Test 3: Measure auth function overhead
    FOR i IN 1..10 LOOP
        PERFORM auth.uid();
    END LOOP;
    
    RAISE NOTICE 'Performance tests completed. Check rls_performance_metrics table for results.';
END;
$$;

-- ============================================
-- 4. Analyze Results
-- ============================================

-- Compare before/after migration performance
SELECT 
    test_name,
    table_name,
    operation,
    AVG(CASE WHEN migration_status = 'before' THEN execution_time_ms END) as avg_time_before_ms,
    AVG(CASE WHEN migration_status = 'after' THEN execution_time_ms END) as avg_time_after_ms,
    ROUND(
        ((AVG(CASE WHEN migration_status = 'before' THEN execution_time_ms END) - 
          AVG(CASE WHEN migration_status = 'after' THEN execution_time_ms END)) / 
         AVG(CASE WHEN migration_status = 'before' THEN execution_time_ms END)) * 100, 2
    ) as improvement_percentage
FROM public.rls_performance_metrics
GROUP BY test_name, table_name, operation
ORDER BY improvement_percentage DESC;

-- ============================================
-- 5. Check Query Plan Improvements
-- ============================================

-- Analyze query plan for a typical RLS query
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM public.automations
WHERE user_id = (SELECT auth.uid()) OR is_public = true
LIMIT 10;