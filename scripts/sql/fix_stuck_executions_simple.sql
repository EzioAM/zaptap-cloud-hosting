-- Simple fix for stuck executions
-- Run each command separately in Supabase SQL Editor

-- 1. First, let's see the stuck executions
SELECT id, status, created_at 
FROM automation_executions 
WHERE status = 'running' 
  AND execution_time IS NULL 
  AND user_id = auth.uid()
ORDER BY created_at;

-- 2. Update them to failed status (run this after checking above)
UPDATE automation_executions 
SET status = 'failed',
    execution_time = 30000,
    completed_at = NOW(),
    error_message = 'Timeout - RLS policy issue'
WHERE status = 'running' 
  AND execution_time IS NULL
  AND user_id = auth.uid();

-- 3. Verify the update worked
SELECT 
  status, 
  COUNT(*) as count 
FROM automation_executions 
WHERE user_id = auth.uid() 
  AND created_at >= CURRENT_DATE
GROUP BY status;