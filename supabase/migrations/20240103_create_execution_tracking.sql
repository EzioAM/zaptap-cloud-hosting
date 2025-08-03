-- Create execution tracking tables
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('running', 'success', 'failed', 'cancelled')) NOT NULL,
  execution_time INTEGER,
  steps_completed INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES automation_executions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')) NOT NULL,
  execution_time INTEGER,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_automation_executions_user_id ON automation_executions(user_id);
CREATE INDEX idx_automation_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX idx_automation_executions_created_at ON automation_executions(created_at DESC);
CREATE INDEX idx_step_executions_execution_id ON step_executions(execution_id);

-- RLS Policies
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_executions ENABLE ROW LEVEL SECURITY;

-- Users can view their own executions
CREATE POLICY "Users can view own executions" ON automation_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own executions" ON automation_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own executions" ON automation_executions
  FOR UPDATE USING (auth.uid() = user_id);

-- Step executions inherit permissions from parent execution
CREATE POLICY "Users can view step executions" ON step_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM automation_executions ae
      WHERE ae.id = step_executions.execution_id
      AND ae.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create step executions" ON step_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM automation_executions ae
      WHERE ae.id = step_executions.execution_id
      AND ae.user_id = auth.uid()
    )
  );

-- Analytics function
CREATE OR REPLACE FUNCTION get_user_automation_stats(p_user_id UUID DEFAULT auth.uid())
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
    COUNT(ae.id) as total_runs,
    COUNT(ae.id) FILTER (WHERE ae.status = 'success') as successful_runs,
    COUNT(ae.id) FILTER (WHERE ae.status = 'failed') as failed_runs,
    COALESCE(SUM(ae.execution_time), 0) as total_time_saved
  FROM automations a
  LEFT JOIN automation_executions ae ON a.id = ae.automation_id
  WHERE a.user_id = p_user_id;
END;
$$;