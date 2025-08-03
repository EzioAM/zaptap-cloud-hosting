-- Comprehensive Automation Sharing Database Schema for Zaptap
-- This script ensures all necessary tables, indexes, and RLS policies exist
-- for NFC, QR code, and web sharing functionality

-- ============================================
-- 1. AUTOMATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    triggers JSONB NOT NULL DEFAULT '[]',
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    execution_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    access_type VARCHAR(20) DEFAULT 'private' CHECK (access_type IN ('private', 'public', 'password', 'link_only')),
    password_hash TEXT,
    share_settings JSONB DEFAULT '{"allow_sharing": true, "allow_forking": true}'
);

-- Create indexes for automations
CREATE INDEX IF NOT EXISTS idx_automations_created_by ON automations(created_by);
CREATE INDEX IF NOT EXISTS idx_automations_is_public ON automations(is_public);
CREATE INDEX IF NOT EXISTS idx_automations_category ON automations(category);
CREATE INDEX IF NOT EXISTS idx_automations_created_at ON automations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automations_tags ON automations USING GIN(tags);

-- Enable RLS for automations
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automations
CREATE POLICY "Users can view their own automations" ON automations
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can view public automations" ON automations
    FOR SELECT USING (is_public = true OR access_type IN ('public', 'link_only'));

CREATE POLICY "Users can insert own automations" ON automations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own automations" ON automations
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own automations" ON automations
    FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- 2. DEPLOYMENTS TABLE (for NFC/QR associations)
-- ============================================
CREATE TABLE IF NOT EXISTS public.deployments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
    deployment_type VARCHAR(50) NOT NULL CHECK (deployment_type IN ('nfc', 'qr', 'link', 'widget')),
    deployment_data JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for deployments
CREATE INDEX IF NOT EXISTS idx_deployments_automation_id ON deployments(automation_id);
CREATE INDEX IF NOT EXISTS idx_deployments_created_by ON deployments(created_by);
CREATE INDEX IF NOT EXISTS idx_deployments_type ON deployments(deployment_type);

-- Enable RLS for deployments
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deployments
CREATE POLICY "Users can view own deployments" ON deployments
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create deployments" ON deployments
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own deployments" ON deployments
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own deployments" ON deployments
    FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- 3. PUBLIC_SHARES TABLE (already exists, but ensuring schema)
-- ============================================
CREATE TABLE IF NOT EXISTS public.public_shares (
    id VARCHAR(255) PRIMARY KEY,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    automation_data JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    share_type VARCHAR(50) DEFAULT 'link' CHECK (share_type IN ('link', 'qr', 'nfc', 'emergency')),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for public_shares
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_shares_share_type ON public_shares(share_type);

-- Enable RLS for public_shares
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_shares (updated)
DROP POLICY IF EXISTS "Public shares are readable by anyone" ON public_shares;
CREATE POLICY "Public shares are readable by anyone" ON public_shares
    FOR SELECT
    USING (is_active = true AND expires_at > NOW());

DROP POLICY IF EXISTS "Users can create public shares" ON public_shares;
CREATE POLICY "Users can create public shares" ON public_shares
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update their own shares" ON public_shares;
CREATE POLICY "Users can update their own shares" ON public_shares
    FOR UPDATE
    USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete their own shares" ON public_shares;
CREATE POLICY "Users can delete their own shares" ON public_shares
    FOR DELETE
    USING (auth.uid() = created_by);

-- ============================================
-- 4. EXECUTIONS TABLE (for tracking automation runs)
-- ============================================
CREATE TABLE IF NOT EXISTS public.executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES auth.users(id),
    deployment_id UUID REFERENCES deployments(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    steps_completed INTEGER DEFAULT 0,
    total_steps INTEGER,
    error_message TEXT,
    execution_data JSONB DEFAULT '{}',
    source VARCHAR(50) CHECK (source IN ('app', 'nfc', 'qr', 'web', 'api', 'schedule'))
);

-- Create indexes for executions
CREATE INDEX IF NOT EXISTS idx_executions_automation_id ON executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_by ON executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_executions_deployment_id ON executions(deployment_id);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);

-- Enable RLS for executions
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for executions
CREATE POLICY "Users can view own executions" ON executions
    FOR SELECT USING (auth.uid() = executed_by);

CREATE POLICY "Automation owners can view all executions" ON executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM automations 
            WHERE automations.id = executions.automation_id 
            AND automations.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create executions" ON executions
    FOR INSERT WITH CHECK (auth.uid() = executed_by OR executed_by IS NULL);

CREATE POLICY "Users can update own executions" ON executions
    FOR UPDATE USING (auth.uid() = executed_by);

-- ============================================
-- 5. SHARING_LOGS TABLE (already exists, ensuring schema)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sharing_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL CHECK (method IN ('link', 'qr', 'nfc', 'email', 'sms', 'social')),
    recipients TEXT[],
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shared_by UUID REFERENCES auth.users(id),
    share_data JSONB DEFAULT '{}'
);

-- Create indexes for sharing_logs
CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON sharing_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON sharing_logs(shared_by);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_at ON sharing_logs(shared_at DESC);

-- Enable RLS for sharing_logs
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sharing_logs
DROP POLICY IF EXISTS "Users can view their own sharing logs" ON sharing_logs;
CREATE POLICY "Users can view their own sharing logs" ON sharing_logs
    FOR SELECT USING (auth.uid() = shared_by);

DROP POLICY IF EXISTS "Users can create sharing logs" ON sharing_logs;
CREATE POLICY "Users can create sharing logs" ON sharing_logs
    FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- ============================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to increment automation execution count
CREATE OR REPLACE FUNCTION increment_automation_execution_count(p_automation_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE automations 
    SET execution_count = execution_count + 1,
        updated_at = NOW()
    WHERE id = p_automation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment public share access count
CREATE OR REPLACE FUNCTION increment_share_access_count(p_share_id VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE public_shares 
    SET access_count = access_count + 1
    WHERE id = p_share_id AND is_active = true AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get automation for sharing (handles permissions)
CREATE OR REPLACE FUNCTION get_shareable_automation(p_automation_id UUID)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    steps JSONB,
    category VARCHAR,
    tags TEXT[],
    created_by UUID,
    is_public BOOLEAN,
    access_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.description,
        a.steps,
        a.category,
        a.tags,
        a.created_by,
        a.is_public,
        a.access_type
    FROM automations a
    WHERE a.id = p_automation_id
    AND (
        a.is_public = true 
        OR a.access_type IN ('public', 'link_only')
        OR a.created_by = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON automations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE ON executions TO authenticated;
GRANT SELECT, INSERT ON sharing_logs TO authenticated;

-- Grant select permissions to anonymous users for public content
GRANT SELECT ON automations TO anon;
GRANT SELECT ON public_shares TO anon;
GRANT SELECT ON executions TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION increment_automation_execution_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_share_access_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_shareable_automation TO authenticated, anon;

-- ============================================
-- 8. ENABLE REALTIME
-- ============================================
-- Note: ALTER PUBLICATION doesn't support IF NOT EXISTS
-- These commands will fail if tables are already in the publication, which is fine
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.automations;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.executions;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deployments;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.public_shares;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication
END $$;

-- ============================================
-- 9. CLEAN UP AND MAINTENANCE
-- ============================================

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
    UPDATE public_shares 
    SET is_active = false
    WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-shares', '0 0 * * *', 'SELECT cleanup_expired_shares();');

COMMENT ON TABLE automations IS 'Stores user-created automations with steps and configuration';
COMMENT ON TABLE deployments IS 'Tracks NFC, QR, and other deployment methods for automations';
COMMENT ON TABLE public_shares IS 'Temporary shareable links for automations';
COMMENT ON TABLE executions IS 'Logs of automation executions with results';
COMMENT ON TABLE sharing_logs IS 'Analytics for tracking how automations are shared';