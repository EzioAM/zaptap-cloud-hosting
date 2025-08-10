-- Analytics aggregation functions for automation statistics

-- Get automation performance metrics
CREATE OR REPLACE FUNCTION get_automation_performance(p_automation_id UUID)
RETURNS TABLE (
  automation_id UUID,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  average_execution_time NUMERIC,
  success_rate NUMERIC,
  last_execution TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_automation_id as automation_id,
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_executions,
    ROUND(AVG(execution_time)::NUMERIC, 2) as average_execution_time,
    ROUND((COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100), 2) as success_rate,
    MAX(created_at) as last_execution
  FROM automation_executions
  WHERE automation_id = p_automation_id
  GROUP BY automation_id;
END;
$$;

-- Get daily execution statistics for a user
CREATE OR REPLACE FUNCTION get_daily_execution_stats(
  p_user_id UUID DEFAULT auth.uid(),
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  execution_date DATE,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  unique_automations BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(created_at) as execution_date,
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_executions,
    COUNT(DISTINCT automation_id)::BIGINT as unique_automations
  FROM automation_executions
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY DATE(created_at)
  ORDER BY execution_date DESC;
END;
$$;

-- Get most popular automations by execution count
CREATE OR REPLACE FUNCTION get_popular_automations(
  p_limit INTEGER DEFAULT 10,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  automation_id UUID,
  automation_title TEXT,
  execution_count BIGINT,
  success_rate NUMERIC,
  average_execution_time NUMERIC,
  last_run TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as automation_id,
    a.title as automation_title,
    COUNT(ae.id)::BIGINT as execution_count,
    ROUND((COUNT(ae.id) FILTER (WHERE ae.status = 'success')::NUMERIC / NULLIF(COUNT(ae.id)::NUMERIC, 0) * 100), 2) as success_rate,
    ROUND(AVG(ae.execution_time)::NUMERIC, 2) as average_execution_time,
    MAX(ae.created_at) as last_run
  FROM automations a
  LEFT JOIN automation_executions ae ON a.id = ae.automation_id
  WHERE (p_user_id IS NULL OR a.created_by = p_user_id)
  GROUP BY a.id, a.title
  HAVING COUNT(ae.id) > 0
  ORDER BY execution_count DESC
  LIMIT p_limit;
END;
$$;

-- Get step execution statistics
CREATE OR REPLACE FUNCTION get_step_execution_stats(p_automation_id UUID)
RETURNS TABLE (
  step_type TEXT,
  step_index INTEGER,
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  average_execution_time NUMERIC,
  common_errors TEXT[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    se.step_type,
    se.step_index,
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE se.status = 'success')::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE se.status = 'failed')::BIGINT as failed_executions,
    ROUND(AVG(se.execution_time)::NUMERIC, 2) as average_execution_time,
    ARRAY_AGG(DISTINCT se.error_message) FILTER (WHERE se.error_message IS NOT NULL) as common_errors
  FROM step_executions se
  JOIN automation_executions ae ON se.execution_id = ae.id
  WHERE ae.automation_id = p_automation_id
  GROUP BY se.step_type, se.step_index
  ORDER BY se.step_index;
END;
$$;

-- Get automation usage trends
CREATE OR REPLACE FUNCTION get_automation_trends(
  p_user_id UUID DEFAULT auth.uid(),
  p_period TEXT DEFAULT 'week' -- 'day', 'week', 'month'
)
RETURNS TABLE (
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  total_executions BIGINT,
  unique_automations BIGINT,
  total_time_saved BIGINT,
  success_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interval INTERVAL;
BEGIN
  -- Determine interval based on period
  CASE p_period
    WHEN 'day' THEN v_interval := INTERVAL '1 day';
    WHEN 'week' THEN v_interval := INTERVAL '1 week';
    WHEN 'month' THEN v_interval := INTERVAL '1 month';
    ELSE v_interval := INTERVAL '1 week';
  END CASE;

  RETURN QUERY
  WITH date_series AS (
    SELECT 
      generate_series(
        date_trunc(p_period, CURRENT_DATE - INTERVAL '6 months'),
        date_trunc(p_period, CURRENT_DATE),
        v_interval
      ) AS period_start
  )
  SELECT 
    ds.period_start,
    ds.period_start + v_interval as period_end,
    COUNT(ae.id)::BIGINT as total_executions,
    COUNT(DISTINCT ae.automation_id)::BIGINT as unique_automations,
    COALESCE(SUM(ae.execution_time), 0)::BIGINT as total_time_saved,
    ROUND((COUNT(ae.id) FILTER (WHERE ae.status = 'success')::NUMERIC / NULLIF(COUNT(ae.id)::NUMERIC, 0) * 100), 2) as success_rate
  FROM date_series ds
  LEFT JOIN automation_executions ae ON 
    ae.created_at >= ds.period_start 
    AND ae.created_at < ds.period_start + v_interval
    AND ae.user_id = p_user_id
  GROUP BY ds.period_start
  ORDER BY ds.period_start DESC
  LIMIT 12; -- Show last 12 periods
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_automation_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_execution_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_automations TO authenticated;
GRANT EXECUTE ON FUNCTION get_step_execution_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_automation_trends TO authenticated;