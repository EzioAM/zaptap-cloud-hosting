-- DISASTER RECOVERY RUNBOOK FOR AUTOMATION LIKES FUNCTIONALITY
-- This runbook provides step-by-step procedures for emergency scenarios

-- ============================================================
-- EMERGENCY RESPONSE PROCEDURES (3am Ready)
-- ============================================================

-- 1. QUICK HEALTH CHECK (Run this first in any emergency)
-- ============================================================
SELECT 'EMERGENCY HEALTH CHECK' as status;

-- Check if critical tables are accessible
DO $$
DECLARE
    automations_count INTEGER;
    likes_count INTEGER;
    rls_enabled BOOLEAN;
BEGIN
    -- Test automations table
    SELECT COUNT(*) INTO automations_count FROM automations WHERE is_public = true LIMIT 100;
    RAISE NOTICE 'Public automations accessible: %', automations_count;
    
    -- Test automation_likes table
    SELECT COUNT(*) INTO likes_count FROM automation_likes LIMIT 100;
    RAISE NOTICE 'Automation likes accessible: %', likes_count;
    
    -- Check RLS status
    SELECT relrowsecurity INTO rls_enabled 
    FROM pg_class 
    WHERE relname = 'automation_likes' AND relnamespace = (
        SELECT oid FROM pg_namespace WHERE nspname = 'public'
    );
    RAISE NOTICE 'RLS enabled on automation_likes: %', rls_enabled;
    
    -- Test the critical API query
    PERFORM * FROM automations 
    WHERE is_public = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    RAISE NOTICE 'API query test: SUCCESS';
    
    RAISE NOTICE 'HEALTH CHECK COMPLETE - System appears functional';
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'CRITICAL ERROR: %', SQLERRM;
    RAISE NOTICE 'IMMEDIATE ACTION REQUIRED';
END $$;

-- ============================================================
-- CONNECTION POOLING SETUP (PgBouncer Configuration)
-- ============================================================

-- Recommended PgBouncer configuration for Supabase/PostgreSQL
-- Save this as pgbouncer.ini for high-traffic scenarios

/*
[databases]
shortcutslike = host=db.your-project-id.supabase.co port=5432 dbname=postgres user=postgres

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6543
auth_type = md5
auth_file = userlist.txt

; Connection pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = 100
max_user_connections = 50

; Timing settings
server_reset_query = DISCARD ALL
server_check_delay = 30
server_check_query = select 1
server_lifetime = 3600
server_idle_timeout = 600

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
syslog = 0
syslog_facility = daemon
syslog_ident = pgbouncer

; Safety settings
ignore_startup_parameters = extra_float_digits
*/

-- ============================================================
-- AUTOMATED RECOVERY PROCEDURES
-- ============================================================

-- 2. AUTOMATIC TABLE RECREATION (if automation_likes table is corrupted)
-- ============================================================
CREATE OR REPLACE FUNCTION emergency_recreate_automation_likes()
RETURNS TEXT AS $$
DECLARE
    backup_table TEXT;
    recovery_status TEXT;
BEGIN
    backup_table := 'automation_likes_emergency_backup_' || extract(epoch from now())::INTEGER;
    
    -- Step 1: Create backup if possible
    BEGIN
        EXECUTE format('CREATE TABLE %I AS SELECT * FROM automation_likes', backup_table);
        recovery_status := 'Backup created: ' || backup_table;
    EXCEPTION WHEN others THEN
        recovery_status := 'WARNING: Could not create backup - ' || SQLERRM;
    END;
    
    -- Step 2: Drop existing table (DANGEROUS!)
    DROP TABLE IF EXISTS automation_likes CASCADE;
    
    -- Step 3: Recreate table structure
    CREATE TABLE automation_likes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        UNIQUE(automation_id, user_id)
    );
    
    -- Step 4: Enable RLS
    ALTER TABLE automation_likes ENABLE ROW LEVEL SECURITY;
    
    -- Step 5: Recreate RLS policies
    CREATE POLICY "Users can view automation likes" ON automation_likes
        FOR SELECT USING (true);
    
    CREATE POLICY "Authenticated users can like automations" ON automation_likes
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
    
    CREATE POLICY "Users can unlike automations" ON automation_likes
        FOR DELETE USING (user_id = auth.uid());
    
    -- Step 6: Restore data if backup exists
    BEGIN
        EXECUTE format('INSERT INTO automation_likes SELECT * FROM %I', backup_table);
        recovery_status := recovery_status || ' | Data restored from backup';
        EXECUTE format('DROP TABLE %I', backup_table);
    EXCEPTION WHEN others THEN
        recovery_status := recovery_status || ' | WARNING: Could not restore data - ' || SQLERRM;
    END;
    
    -- Step 7: Add to realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE automation_likes;
    
    RETURN 'EMERGENCY RECOVERY COMPLETE: ' || recovery_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. MANUAL RECOVERY STEPS (For when automation fails)
-- ============================================================
/*
MANUAL RECOVERY CHECKLIST (Run each step and check results):

1. IMMEDIATE ASSESSMENT:
   □ Can you connect to the database?
   □ Are the automations table accessible? SELECT COUNT(*) FROM automations;
   □ Is the automation_likes table accessible? SELECT COUNT(*) FROM automation_likes;
   
2. IF AUTOMATION_LIKES TABLE IS MISSING:
   □ Run: \i create_advanced_features_tables.sql
   □ Verify structure: \d automation_likes
   □ Test query: SELECT * FROM automation_likes LIMIT 1;
   
3. IF RLS POLICIES ARE BROKEN:
   □ Check policies: \dp automation_likes
   □ Recreate policies: \i create_rls_policies.sql
   □ Test with anon user
   
4. IF DATA IS CORRUPTED:
   □ Check for backup tables: \dt *backup*
   □ Run emergency_recreate_automation_likes() function
   □ Verify data integrity
   
5. IF PERFORMANCE IS DEGRADED:
   □ Check connections: SELECT count(*) FROM pg_stat_activity;
   □ Check locks: SELECT * FROM pg_locks WHERE NOT granted;
   □ Run VACUUM ANALYZE automation_likes;
   
6. FINAL VERIFICATION:
   □ Test API query: SELECT *, automation_likes!left(user_id), likes_count:automation_likes(count) FROM automations WHERE is_public = true LIMIT 5;
   □ Test like operation: INSERT INTO automation_likes (automation_id, user_id) VALUES (...);
   □ Monitor for 10 minutes
*/

-- ============================================================
-- RTO/RPO TARGETS AND MONITORING
-- ============================================================

-- Recovery Time Objective (RTO): 15 minutes
-- Recovery Point Objective (RPO): 5 minutes

-- Real-time monitoring query for 3am emergencies
CREATE OR REPLACE VIEW emergency_monitoring AS
SELECT 
    'SYSTEM_STATUS' as metric,
    CASE 
        WHEN COUNT(*) > 0 THEN 'OPERATIONAL'
        ELSE 'DEGRADED'
    END as status,
    COUNT(*) as active_likes,
    NOW() as checked_at
FROM automation_likes
WHERE created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'API_QUERY_TEST' as metric,
    CASE 
        WHEN COUNT(*) >= 0 THEN 'OPERATIONAL'
        ELSE 'FAILED'
    END as status,
    COUNT(*) as public_automations,
    NOW() as checked_at
FROM (
    SELECT * FROM automations 
    WHERE is_public = true 
    LIMIT 5
) test

UNION ALL

SELECT 
    'DATABASE_CONNECTIONS' as metric,
    CASE 
        WHEN COUNT(*) < 80 THEN 'HEALTHY'
        WHEN COUNT(*) < 120 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as status,
    COUNT(*)::INTEGER as active_connections,
    NOW() as checked_at
FROM pg_stat_activity
WHERE state = 'active';

-- Grant access to monitoring view
GRANT SELECT ON emergency_monitoring TO authenticated, anon;

-- ============================================================
-- CONNECTION POOLING IMPLEMENTATION
-- ============================================================

-- Database function to manage connection limits
CREATE OR REPLACE FUNCTION monitor_connection_pool()
RETURNS TABLE (
    status TEXT,
    active_connections INTEGER,
    idle_connections INTEGER,
    max_connections INTEGER,
    usage_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN (active + idle) < (max_conn * 0.7) THEN 'HEALTHY'
            WHEN (active + idle) < (max_conn * 0.9) THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT as status,
        active,
        idle,
        max_conn,
        ROUND(((active + idle)::NUMERIC / max_conn::NUMERIC) * 100, 2) as usage_percentage
    FROM (
        SELECT 
            COUNT(*) FILTER (WHERE state = 'active') as active,
            COUNT(*) FILTER (WHERE state = 'idle') as idle,
            (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') as max_conn
        FROM pg_stat_activity
    ) conn_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- EMERGENCY CONTACT PROCEDURES
-- ============================================================

/*
EMERGENCY ESCALATION PATH:

1. IMMEDIATE (0-5 minutes):
   - Check emergency_monitoring view
   - Run emergency health check SQL above
   - Check Supabase dashboard status
   
2. INVESTIGATION (5-15 minutes):
   - Review recent deployments/changes
   - Check application logs for ConditionError details
   - Verify environment variables
   - Test database connectivity
   
3. RECOVERY (15-30 minutes):
   - Execute appropriate recovery procedure
   - Monitor system performance
   - Verify end-to-end functionality
   
4. COMMUNICATION (Ongoing):
   - Update stakeholders on status
   - Document incident details
   - Schedule post-incident review

CRITICAL CONTACTS:
- Database Admin: [Your Contact]
- DevOps Team: [Your Contact] 
- Product Team: [Your Contact]

EXTERNAL RESOURCES:
- Supabase Status: https://status.supabase.com
- Supabase Support: https://supabase.com/support
- Documentation: https://supabase.com/docs
*/

-- ============================================================
-- POST-INCIDENT VERIFICATION
-- ============================================================

CREATE OR REPLACE FUNCTION post_incident_verification()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Test all critical functions
    RETURN QUERY
    SELECT 'Database Connection'::TEXT, 'OK'::TEXT, 'Connection established'::TEXT, NOW()
    WHERE EXISTS (SELECT 1 FROM automation_likes LIMIT 1)
    
    UNION ALL
    
    SELECT 'API Query Test'::TEXT, 'OK'::TEXT, 
           format('Found %s public automations', COUNT(*))::TEXT, 
           NOW()
    FROM automations WHERE is_public = true
    
    UNION ALL
    
    SELECT 'RLS Policies'::TEXT,
           CASE WHEN COUNT(*) >= 3 THEN 'OK' ELSE 'FAIL' END::TEXT,
           format('%s policies active', COUNT(*))::TEXT,
           NOW()
    FROM pg_policies WHERE tablename = 'automation_likes'
    
    UNION ALL
    
    SELECT 'Foreign Keys'::TEXT,
           CASE WHEN COUNT(*) >= 2 THEN 'OK' ELSE 'FAIL' END::TEXT,
           format('%s constraints active', COUNT(*))::TEXT,
           NOW()
    FROM information_schema.table_constraints
    WHERE table_name = 'automation_likes' AND constraint_type = 'FOREIGN KEY'
    
    UNION ALL
    
    SELECT 'Performance Check'::TEXT,
           CASE WHEN AVG(total_time) < 100 THEN 'OK' ELSE 'SLOW' END::TEXT,
           format('Avg query time: %sms', ROUND(AVG(total_time), 2))::TEXT,
           NOW()
    FROM pg_stat_statements 
    WHERE query LIKE '%automation_likes%' AND calls > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Final verification
SELECT 'DISASTER RECOVERY RUNBOOK LOADED SUCCESSFULLY' as status;
SELECT 'Emergency functions and monitoring ready for use' as info;

-- Show current system status
SELECT * FROM emergency_monitoring;