-- Cleanup functions for managing execution data

-- Function to clean up old execution records
CREATE OR REPLACE FUNCTION cleanup_old_executions(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE (
  deleted_executions BIGINT,
  deleted_step_executions BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_executions BIGINT;
  v_deleted_step_executions BIGINT;
  v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate cutoff date
  v_cutoff_date := CURRENT_TIMESTAMP - INTERVAL '1 day' * p_days_to_keep;
  
  -- Delete old step executions first (due to foreign key)
  WITH deleted_steps AS (
    DELETE FROM step_executions
    WHERE execution_id IN (
      SELECT id FROM automation_executions
      WHERE created_at < v_cutoff_date
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_step_executions FROM deleted_steps;
  
  -- Delete old automation executions
  WITH deleted_executions AS (
    DELETE FROM automation_executions
    WHERE created_at < v_cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_executions FROM deleted_executions;
  
  RETURN QUERY
  SELECT v_deleted_executions, v_deleted_step_executions;
END;
$$;

-- Function to aggregate execution stats into a summary table (for performance)
CREATE TABLE IF NOT EXISTS automation_execution_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  total_execution_time BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(automation_id, date)
);

-- Create index for performance
CREATE INDEX idx_execution_summary_date ON automation_execution_summary(date DESC);
CREATE INDEX idx_execution_summary_automation ON automation_execution_summary(automation_id);

-- Function to update execution summary
CREATE OR REPLACE FUNCTION update_execution_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process completed executions
  IF NEW.status IN ('success', 'failed') AND OLD.status = 'running' THEN
    INSERT INTO automation_execution_summary (
      automation_id,
      user_id,
      date,
      total_executions,
      successful_executions,
      failed_executions,
      total_execution_time
    ) VALUES (
      NEW.automation_id,
      NEW.user_id,
      DATE(NEW.created_at),
      1,
      CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      COALESCE(NEW.execution_time, 0)
    )
    ON CONFLICT (automation_id, date) DO UPDATE SET
      total_executions = automation_execution_summary.total_executions + 1,
      successful_executions = automation_execution_summary.successful_executions + 
        CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
      failed_executions = automation_execution_summary.failed_executions + 
        CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
      total_execution_time = automation_execution_summary.total_execution_time + 
        COALESCE(NEW.execution_time, 0),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic summary updates
CREATE TRIGGER update_execution_summary_trigger
AFTER UPDATE ON automation_executions
FOR EACH ROW
EXECUTE FUNCTION update_execution_summary();

-- Function to get summarized stats (faster than querying raw data)
CREATE OR REPLACE FUNCTION get_user_automation_stats_fast(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  total_automations BIGINT,
  total_runs BIGINT,
  successful_runs BIGINT,
  failed_runs BIGINT,
  total_time_saved BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT a.id) as total_automations,
    COALESCE(SUM(s.total_executions), 0)::BIGINT as total_runs,
    COALESCE(SUM(s.successful_executions), 0)::BIGINT as successful_runs,
    COALESCE(SUM(s.failed_executions), 0)::BIGINT as failed_runs,
    COALESCE(SUM(s.total_execution_time), 0)::BIGINT as total_time_saved
  FROM automations a
  LEFT JOIN automation_execution_summary s ON a.id = s.automation_id
  WHERE a.created_by = p_user_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_old_executions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_automation_stats_fast TO authenticated;

-- Enable RLS on summary table
ALTER TABLE automation_execution_summary ENABLE ROW LEVEL SECURITY;

-- RLS policies for summary table
CREATE POLICY "Users can view their own execution summaries" ON automation_execution_summary
  FOR SELECT USING (auth.uid() = user_id);

-- Schedule cleanup (Note: This would typically be done via a cron job or Supabase Edge Function)
-- Example: Run cleanup weekly to remove executions older than 90 days
-- SELECT cron.schedule('cleanup-old-executions', '0 2 * * 0', 'SELECT cleanup_old_executions(90);');