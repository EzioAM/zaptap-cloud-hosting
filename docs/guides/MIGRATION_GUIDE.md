# Supabase Migration Guide for Production Deployment

This guide ensures all necessary database functions and tables are properly deployed to production.

## Required Database Migrations

Run these migrations in order on your production Supabase instance:

### 1. Execution Tracking Tables
```sql
-- File: /supabase/migrations/20240103_create_execution_tracking.sql
-- This creates tables for tracking automation executions
```

### 2. Engagement Tracking
```sql
-- File: /supabase/migrations/20240103_add_engagement_tracking.sql
-- This adds engagement columns and functions for likes, downloads, and views
```

### 3. User Statistics Function
```sql
-- Create function to get user automation statistics
CREATE OR REPLACE FUNCTION get_user_automation_stats(p_user_id UUID)
RETURNS TABLE (
    total_automations BIGINT,
    total_runs BIGINT,
    successful_runs BIGINT,
    failed_runs BIGINT,
    total_time_saved BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT a.id) AS total_automations,
        COUNT(ae.id) AS total_runs,
        COUNT(CASE WHEN ae.status = 'success' THEN 1 END) AS successful_runs,
        COUNT(CASE WHEN ae.status = 'failed' THEN 1 END) AS failed_runs,
        COALESCE(SUM(ae.execution_time), 0) AS total_time_saved
    FROM automations a
    LEFT JOIN automation_executions ae ON a.id = ae.automation_id
    WHERE a.created_by = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

### 4. Trending Automations Function
```sql
-- Create function to get trending automations
CREATE OR REPLACE FUNCTION get_trending_automations(p_limit INT DEFAULT 10, p_time_window TEXT DEFAULT '7 days')
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    created_by UUID,
    likes_count INT,
    downloads_count INT,
    views_count INT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.category,
        a.created_by,
        a.likes_count,
        a.downloads_count,
        a.views_count,
        a.created_at
    FROM automations a
    WHERE a.is_public = true
    AND a.created_at >= NOW() - p_time_window::INTERVAL
    ORDER BY 
        (a.likes_count * 3 + a.downloads_count * 2 + a.views_count) DESC,
        a.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

### 5. Automation Engagement Function
```sql
-- Create function to get automation engagement with user context
CREATE OR REPLACE FUNCTION get_automation_engagement(p_automation_id UUID)
RETURNS TABLE (
    likes_count INT,
    downloads_count INT,
    executions_count BIGINT,
    user_has_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.likes_count,
        a.downloads_count,
        COUNT(ae.id)::BIGINT AS executions_count,
        EXISTS(
            SELECT 1 FROM automation_likes al 
            WHERE al.automation_id = p_automation_id 
            AND al.user_id = auth.uid()
        ) AS user_has_liked
    FROM automations a
    LEFT JOIN automation_executions ae ON a.id = ae.automation_id
    WHERE a.id = p_automation_id
    GROUP BY a.id, a.likes_count, a.downloads_count;
END;
$$ LANGUAGE plpgsql;
```

### 6. Engagement Tracking Functions
```sql
-- Track automation downloads
CREATE OR REPLACE FUNCTION track_automation_download(p_automation_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE automations 
    SET downloads_count = downloads_count + 1
    WHERE id = p_automation_id;
END;
$$ LANGUAGE plpgsql;

-- Track automation views
CREATE OR REPLACE FUNCTION track_automation_view(p_automation_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE automations 
    SET views_count = views_count + 1
    WHERE id = p_automation_id;
END;
$$ LANGUAGE plpgsql;
```

## Deployment Steps

1. **Backup your production database** before running migrations

2. **Run migrations in order** through Supabase SQL Editor:
   - Navigate to SQL Editor in your Supabase dashboard
   - Run each migration file in the order listed above
   - Check for any errors after each migration

3. **Verify migrations** by running test queries:
   ```sql
   -- Test user stats function
   SELECT * FROM get_user_automation_stats('your-user-id'::UUID);
   
   -- Test trending function
   SELECT * FROM get_trending_automations(10, '7 days');
   
   -- Test engagement function
   SELECT * FROM get_automation_engagement('automation-id'::UUID);
   ```

4. **Update environment variables** if needed:
   - Ensure SUPABASE_URL and SUPABASE_ANON_KEY are correct in production

5. **Deploy application** using EAS Update:
   ```bash
   eas update --branch preview
   ```

## Rollback Plan

If issues occur, you can rollback by:

1. Dropping the new functions:
   ```sql
   DROP FUNCTION IF EXISTS get_user_automation_stats(UUID);
   DROP FUNCTION IF EXISTS get_trending_automations(INT, TEXT);
   DROP FUNCTION IF EXISTS get_automation_engagement(UUID);
   DROP FUNCTION IF EXISTS track_automation_download(UUID);
   DROP FUNCTION IF EXISTS track_automation_view(UUID);
   ```

2. The app has fallback logic to handle missing functions gracefully

## Monitoring

After deployment, monitor:
- Application logs for any database errors
- Supabase logs for failed function calls
- User reports of loading issues

The application includes fallback mechanisms that will:
- Use default values when functions are missing
- Fall back to direct table queries when RPC calls fail
- Show appropriate error messages to users