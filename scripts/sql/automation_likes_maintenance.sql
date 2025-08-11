-- Automation Likes Database Maintenance Script
-- This script handles database administration tasks for the likes functionality

-- ===== BACKUP AND DISASTER RECOVERY =====

-- 1. Create backup of automation_likes data
CREATE TABLE IF NOT EXISTS automation_likes_backup AS 
SELECT * FROM automation_likes WHERE 1=2; -- Create structure only

-- Function to backup likes data with retention policy
CREATE OR REPLACE FUNCTION backup_automation_likes()
RETURNS TEXT AS $$
DECLARE
    backup_name TEXT;
    rows_backed_up INTEGER;
BEGIN
    -- Generate backup name with timestamp
    backup_name := 'automation_likes_backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- Create backup table
    EXECUTE format('CREATE TABLE %I AS SELECT * FROM automation_likes', backup_name);
    
    -- Get count of backed up rows
    EXECUTE format('SELECT COUNT(*) FROM %I', backup_name) INTO rows_backed_up;
    
    -- Add comment with backup info
    EXECUTE format('COMMENT ON TABLE %I IS ''Backup created on %s with %s rows''', 
                   backup_name, now(), rows_backed_up);
    
    RETURN format('Backup created: %s with %s rows', backup_name, rows_backed_up);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore from backup
CREATE OR REPLACE FUNCTION restore_automation_likes(backup_table TEXT)
RETURNS TEXT AS $$
DECLARE
    rows_restored INTEGER;
    current_count INTEGER;
BEGIN
    -- Check if backup table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = backup_table) THEN
        RAISE EXCEPTION 'Backup table % does not exist', backup_table;
    END IF;
    
    -- Get current count
    SELECT COUNT(*) INTO current_count FROM automation_likes;
    
    -- Clear current data (be careful!)
    TRUNCATE automation_likes;
    
    -- Restore from backup
    EXECUTE format('INSERT INTO automation_likes SELECT * FROM %I', backup_table);
    
    -- Get restored count
    GET DIAGNOSTICS rows_restored = ROW_COUNT;
    
    RETURN format('Restored %s rows from %s (previously had %s rows)', 
                  rows_restored, backup_table, current_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== USER MANAGEMENT AND ACCESS CONTROL =====

-- Create role for automation likes management
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'automation_likes_manager') THEN
        CREATE ROLE automation_likes_manager;
        
        -- Grant necessary permissions
        GRANT SELECT, INSERT, DELETE ON automation_likes TO automation_likes_manager;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO automation_likes_manager;
        
        -- Grant RLS bypass for administration
        GRANT automation_likes_manager TO postgres;
    END IF;
END $$;

-- Create read-only role for analytics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'automation_analytics_reader') THEN
        CREATE ROLE automation_analytics_reader;
        
        -- Grant read-only access
        GRANT SELECT ON automations, automation_likes TO automation_analytics_reader;
    END IF;
END $$;

-- ===== PERFORMANCE MONITORING AND ALERTING =====

-- Function to get automation likes statistics
CREATE OR REPLACE FUNCTION get_automation_likes_stats()
RETURNS TABLE (
    metric TEXT,
    value BIGINT,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_likes'::TEXT, COUNT(*)::BIGINT, 'Total number of likes in system'::TEXT
    FROM automation_likes
    
    UNION ALL
    
    SELECT 'unique_users'::TEXT, COUNT(DISTINCT user_id)::BIGINT, 'Number of users who have liked automations'::TEXT
    FROM automation_likes
    
    UNION ALL
    
    SELECT 'unique_automations'::TEXT, COUNT(DISTINCT automation_id)::BIGINT, 'Number of automations that have been liked'::TEXT
    FROM automation_likes
    
    UNION ALL
    
    SELECT 'avg_likes_per_automation'::TEXT, 
           COALESCE(AVG(like_count)::BIGINT, 0), 
           'Average likes per automation'::TEXT
    FROM (
        SELECT automation_id, COUNT(*) as like_count 
        FROM automation_likes 
        GROUP BY automation_id
    ) sub
    
    UNION ALL
    
    SELECT 'avg_likes_per_user'::TEXT,
           COALESCE(AVG(like_count)::BIGINT, 0),
           'Average likes per user'::TEXT
    FROM (
        SELECT user_id, COUNT(*) as like_count 
        FROM automation_likes 
        GROUP BY user_id
    ) sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious like patterns (potential spam/abuse)
CREATE OR REPLACE FUNCTION detect_like_anomalies()
RETURNS TABLE (
    anomaly_type TEXT,
    user_id UUID,
    automation_id UUID,
    count BIGINT,
    severity TEXT
) AS $$
BEGIN
    -- Users with unusually high like activity (potential bots)
    RETURN QUERY
    SELECT 'high_volume_user'::TEXT, 
           al.user_id, 
           NULL::UUID, 
           COUNT(*)::BIGINT,
           CASE WHEN COUNT(*) > 100 THEN 'HIGH' ELSE 'MEDIUM' END::TEXT
    FROM automation_likes al
    WHERE al.created_at > now() - interval '24 hours'
    GROUP BY al.user_id
    HAVING COUNT(*) > 20
    
    UNION ALL
    
    -- Automations receiving unusual like spikes
    SELECT 'like_spike'::TEXT,
           NULL::UUID,
           al.automation_id,
           COUNT(*)::BIGINT,
           CASE WHEN COUNT(*) > 50 THEN 'HIGH' ELSE 'MEDIUM' END::TEXT
    FROM automation_likes al
    WHERE al.created_at > now() - interval '1 hour'
    GROUP BY al.automation_id
    HAVING COUNT(*) > 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== DATABASE MAINTENANCE =====

-- Function to clean up orphaned likes (referential integrity check)
CREATE OR REPLACE FUNCTION cleanup_orphaned_likes()
RETURNS TEXT AS $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Clean up likes for deleted automations
    WITH deleted_likes AS (
        DELETE FROM automation_likes al
        WHERE NOT EXISTS (
            SELECT 1 FROM automations a WHERE a.id = al.automation_id
        )
        RETURNING *
    )
    SELECT COUNT(*) INTO orphaned_count FROM deleted_likes;
    
    RETURN format('Cleaned up %s orphaned likes', orphaned_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to recompute like counts (data integrity check)
CREATE OR REPLACE FUNCTION verify_like_counts()
RETURNS TABLE (
    automation_id UUID,
    stored_count BIGINT,
    actual_count BIGINT,
    difference BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH like_counts AS (
        SELECT 
            a.id as automation_id,
            COALESCE(a.likes_count, 0) as stored_count,
            COUNT(al.id) as actual_count
        FROM automations a
        LEFT JOIN automation_likes al ON al.automation_id = a.id
        WHERE a.is_public = true
        GROUP BY a.id, a.likes_count
    )
    SELECT 
        lc.automation_id,
        lc.stored_count,
        lc.actual_count,
        (lc.actual_count - lc.stored_count) as difference
    FROM like_counts lc
    WHERE lc.stored_count != lc.actual_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== HIGH AVAILABILITY AND FAILOVER =====

-- Function to check automation_likes table health
CREATE OR REPLACE FUNCTION check_automation_likes_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT,
    action_required BOOLEAN
) AS $$
BEGIN
    -- Check table exists and is accessible
    RETURN QUERY
    SELECT 'table_accessibility'::TEXT,
           CASE WHEN EXISTS (SELECT 1 FROM automation_likes LIMIT 1) 
                THEN 'OK'::TEXT 
                ELSE 'ERROR'::TEXT 
           END,
           'Table exists and is readable'::TEXT,
           false;
    
    -- Check RLS is enabled
    RETURN QUERY
    SELECT 'row_level_security'::TEXT,
           CASE WHEN (
               SELECT relrowsecurity 
               FROM pg_class 
               WHERE relname = 'automation_likes' AND relnamespace = (
                   SELECT oid FROM pg_namespace WHERE nspname = 'public'
               )
           ) THEN 'OK'::TEXT ELSE 'WARNING'::TEXT END,
           'RLS status check'::TEXT,
           NOT (
               SELECT relrowsecurity 
               FROM pg_class 
               WHERE relname = 'automation_likes' AND relnamespace = (
                   SELECT oid FROM pg_namespace WHERE nspname = 'public'
               )
           );
    
    -- Check foreign key constraints
    RETURN QUERY
    SELECT 'foreign_keys'::TEXT,
           CASE WHEN COUNT(*) >= 2 THEN 'OK'::TEXT ELSE 'ERROR'::TEXT END,
           format('%s foreign key constraints found', COUNT(*))::TEXT,
           COUNT(*) < 2
    FROM information_schema.table_constraints
    WHERE table_name = 'automation_likes' 
    AND constraint_type = 'FOREIGN KEY';
    
    -- Check unique constraint
    RETURN QUERY
    SELECT 'unique_constraint'::TEXT,
           CASE WHEN COUNT(*) >= 1 THEN 'OK'::TEXT ELSE 'ERROR'::TEXT END,
           format('%s unique constraints found', COUNT(*))::TEXT,
           COUNT(*) < 1
    FROM information_schema.table_constraints
    WHERE table_name = 'automation_likes' 
    AND constraint_type = 'UNIQUE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== MONITORING QUERIES AND ALERT THRESHOLDS =====

-- View for monitoring automation likes activity
CREATE OR REPLACE VIEW automation_likes_monitoring AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as daily_likes,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT automation_id) as unique_automations,
    AVG(COUNT(*)) OVER (
        ORDER BY DATE(created_at) 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as seven_day_avg
FROM automation_likes
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Alert thresholds (customize based on your application's normal usage)
CREATE OR REPLACE FUNCTION check_like_activity_alerts()
RETURNS TABLE (
    alert_type TEXT,
    current_value BIGINT,
    threshold BIGINT,
    severity TEXT
) AS $$
BEGIN
    -- Alert if daily likes drop significantly below average
    RETURN QUERY
    WITH recent_activity AS (
        SELECT 
            COUNT(*) as today_likes,
            (SELECT AVG(daily_likes) FROM automation_likes_monitoring WHERE date >= CURRENT_DATE - interval '7 days') as avg_likes
        FROM automation_likes 
        WHERE created_at::date = CURRENT_DATE
    )
    SELECT 'low_activity'::TEXT,
           ra.today_likes,
           (ra.avg_likes * 0.5)::BIGINT,
           'WARNING'::TEXT
    FROM recent_activity ra
    WHERE ra.today_likes < (ra.avg_likes * 0.5)
    
    UNION ALL
    
    -- Alert if likes spike unusually high
    SELECT 'high_activity'::TEXT,
           ra.today_likes,
           (ra.avg_likes * 3)::BIGINT,
           'INFO'::TEXT
    FROM recent_activity ra
    WHERE ra.today_likes > (ra.avg_likes * 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== CAPACITY PLANNING =====

-- Function to estimate storage growth
CREATE OR REPLACE FUNCTION estimate_likes_storage_growth()
RETURNS TABLE (
    metric TEXT,
    current_value TEXT,
    projected_30_days TEXT,
    projected_90_days TEXT
) AS $$
DECLARE
    current_size BIGINT;
    daily_growth BIGINT;
    row_size BIGINT := 64; -- Estimated bytes per row
BEGIN
    -- Get current table size
    SELECT pg_total_relation_size('automation_likes') INTO current_size;
    
    -- Calculate daily growth rate
    SELECT COALESCE(AVG(daily_likes), 0)::BIGINT * row_size INTO daily_growth
    FROM automation_likes_monitoring
    WHERE date >= CURRENT_DATE - interval '7 days';
    
    RETURN QUERY
    SELECT 'table_size'::TEXT,
           pg_size_pretty(current_size),
           pg_size_pretty(current_size + (daily_growth * 30)),
           pg_size_pretty(current_size + (daily_growth * 90))
    
    UNION ALL
    
    SELECT 'row_count'::TEXT,
           (SELECT COUNT(*)::TEXT FROM automation_likes),
           (SELECT COUNT(*) + (daily_growth / row_size * 30))::TEXT FROM automation_likes,
           (SELECT COUNT(*) + (daily_growth / row_size * 90))::TEXT FROM automation_likes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_automation_likes_stats() TO authenticated;
GRANT SELECT ON automation_likes_monitoring TO authenticated;

-- Comment on maintenance functions
COMMENT ON FUNCTION backup_automation_likes() IS 'Creates timestamped backup of automation_likes table';
COMMENT ON FUNCTION restore_automation_likes(TEXT) IS 'Restores automation_likes from backup table';
COMMENT ON FUNCTION cleanup_orphaned_likes() IS 'Removes likes for deleted automations';
COMMENT ON FUNCTION check_automation_likes_health() IS 'Comprehensive health check for likes functionality';
COMMENT ON FUNCTION detect_like_anomalies() IS 'Detects suspicious like patterns for spam prevention';

SELECT 'Automation likes maintenance functions created successfully!' as result;