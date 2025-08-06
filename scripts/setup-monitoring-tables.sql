-- Monitoring Tables Setup Script
-- This script creates the required database tables for the monitoring services
-- Run this script in your Supabase SQL editor to enable monitoring features

-- Performance Metrics Table
-- Stores performance measurements from the app
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('app_launch', 'screen_render', 'api_call', 'memory_usage', 'battery', 'network', 'custom')),
    name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('ms', 'mb', 'percent', 'count', 'bytes', 'fps')),
    context JSONB DEFAULT '{}',
    tags JSONB DEFAULT '{}',
    
    -- Indexing for common queries
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics (type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics (name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_timestamp ON performance_metrics (type, timestamp DESC);

-- Error Reports Table  
-- Stores crash reports and error information
CREATE TABLE IF NOT EXISTS error_reports (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Error details
    error_name TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_type TEXT NOT NULL CHECK (error_type IN ('javascript', 'native', 'unhandled_rejection', 'network', 'custom')),
    error_fatal BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Context information
    context JSONB DEFAULT '{}',
    breadcrumbs JSONB DEFAULT '[]',
    user_actions JSONB DEFAULT '[]',
    performance_metrics JSONB DEFAULT '{}',
    
    -- Classification
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    fingerprint TEXT NOT NULL, -- For deduplication
    tags JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for error reports
CREATE INDEX IF NOT EXISTS idx_error_reports_timestamp ON error_reports (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON error_reports (severity);
CREATE INDEX IF NOT EXISTS idx_error_reports_error_type ON error_reports (error_type);
CREATE INDEX IF NOT EXISTS idx_error_reports_fingerprint ON error_reports (fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_reports_fatal ON error_reports (error_fatal);
CREATE INDEX IF NOT EXISTS idx_error_reports_severity_timestamp ON error_reports (severity, timestamp DESC);

-- Row Level Security (RLS) Policies
-- These tables should be accessible by the application for writing
-- and by developers/admins for reading
-- 
-- IMPORTANT: Anonymous insert access is required because:
-- 1. Performance monitoring starts during app initialization before authentication
-- 2. Crash reports need to be captured even when users are not authenticated
-- 3. The monitoring services run in the background regardless of auth state

-- Enable RLS on both tables
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

-- Policy for performance metrics
-- Allow anonymous users to insert metrics (monitoring happens before auth)
CREATE POLICY "Allow anonymous insert performance metrics" ON performance_metrics
    FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to insert their own metrics
CREATE POLICY "Allow authenticated users to insert performance metrics" ON performance_metrics
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to read all metrics
CREATE POLICY "Allow authenticated users to read performance metrics" ON performance_metrics
    FOR SELECT TO authenticated USING (true);

-- Policy for error reports  
-- Allow anonymous users to insert error reports (crashes can happen before auth)
CREATE POLICY "Allow anonymous insert error reports" ON error_reports
    FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to insert their own error reports
CREATE POLICY "Allow authenticated users to insert error reports" ON error_reports
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to read all error reports (for debugging)
CREATE POLICY "Allow authenticated users to read error reports" ON error_reports
    FOR SELECT TO authenticated USING (true);

-- Service role policies (for server-side operations)
-- These allow the service role to perform all operations
CREATE POLICY "Allow service role full access to performance metrics" ON performance_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to error reports" ON error_reports
    FOR ALL USING (auth.role() = 'service_role');

-- Optional: Create views for common queries

-- Performance summary view
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    type,
    name,
    COUNT(*) as sample_count,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as p50_value,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY value) as p90_value,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99_value,
    unit,
    DATE_TRUNC('day', timestamp) as date
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY type, name, unit, DATE_TRUNC('day', timestamp)
ORDER BY date DESC, type, name;

-- Error summary view
CREATE OR REPLACE VIEW error_summary AS
SELECT 
    error_name,
    error_type,
    severity,
    COUNT(*) as occurrence_count,
    MAX(timestamp) as last_occurrence,
    MIN(timestamp) as first_occurrence,
    COUNT(DISTINCT fingerprint) as unique_errors,
    SUM(CASE WHEN error_fatal THEN 1 ELSE 0 END) as fatal_count,
    DATE_TRUNC('day', timestamp) as date
FROM error_reports
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY error_name, error_type, severity, DATE_TRUNC('day', timestamp)
ORDER BY date DESC, occurrence_count DESC;

-- Grant access to views
GRANT SELECT ON performance_summary TO authenticated, service_role;
GRANT SELECT ON error_summary TO authenticated, service_role;

-- Comments for documentation
COMMENT ON TABLE performance_metrics IS 'Stores application performance metrics and measurements';
COMMENT ON TABLE error_reports IS 'Stores application error reports and crash information';
COMMENT ON VIEW performance_summary IS 'Aggregated performance metrics by day';
COMMENT ON VIEW error_summary IS 'Aggregated error reports by day';

-- Verification queries to test table creation
-- Run these to verify the tables were created correctly

-- Check if tables exist
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('performance_metrics', 'error_reports');

-- Test insert into performance_metrics (should work)
-- INSERT INTO performance_metrics (id, type, name, value, unit) 
-- VALUES ('test-metric-1', 'custom', 'test_metric', 100, 'ms');

-- Test insert into error_reports (should work)  
-- INSERT INTO error_reports (id, error_name, error_message, error_type, severity, fingerprint)
-- VALUES ('test-error-1', 'TestError', 'Test error message', 'custom', 'low', 'test-fingerprint');

-- Clean up test data
-- DELETE FROM performance_metrics WHERE id = 'test-metric-1';
-- DELETE FROM error_reports WHERE id = 'test-error-1';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Monitoring tables setup complete! Tables created: performance_metrics, error_reports';
    RAISE NOTICE 'Views created: performance_summary, error_summary';
    RAISE NOTICE 'RLS policies configured for secure access';
END
$$;