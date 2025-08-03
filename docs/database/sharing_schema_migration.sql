-- ============================================
-- ZAPTAP SHARING SYSTEM MIGRATION SCRIPT
-- ============================================
-- This script migrates existing databases to support the full sharing system
-- It safely adds missing columns and updates table structures
-- Safe to run multiple times - all operations are idempotent

-- Start transaction for safety
BEGIN;

-- ============================================
-- 1. DISPLAY CURRENT TABLE STRUCTURE (for debugging)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 Checking current database structure...';
    RAISE NOTICE '';
END $$;

-- Show current automations table columns
DO $$
DECLARE
    col_record RECORD;
    col_list TEXT := '';
BEGIN
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'automations'
        ORDER BY ordinal_position
    LOOP
        col_list := col_list || '  - ' || col_record.column_name || ' (' || col_record.data_type || ')' || E'\n';
    END LOOP;
    
    IF col_list != '' THEN
        RAISE NOTICE 'Current automations table columns:';
        RAISE NOTICE '%', col_list;
    END IF;
END $$;

-- ============================================
-- 2. ADD MISSING COLUMNS TO AUTOMATIONS TABLE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🔧 Adding missing columns to automations table...';
END $$;

-- Add access_type column if missing
ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS access_type VARCHAR(20) DEFAULT 'private';

-- Add check constraint for access_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'automations_access_type_check'
    ) THEN
        ALTER TABLE public.automations 
        ADD CONSTRAINT automations_access_type_check 
        CHECK (access_type IN ('private', 'public', 'password', 'link_only'));
    END IF;
END $$;

-- Add other potentially missing columns
ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{"allow_sharing": true, "allow_forking": true}';

ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS execution_count INTEGER DEFAULT 0;

ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;

ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- ============================================
-- 3. CREATE/UPDATE OTHER TABLES
-- ============================================

-- Create deployments table if it doesn't exist
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

-- Create public_shares table if it doesn't exist
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

-- Add missing columns to public_shares if table already exists
ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS share_type VARCHAR(50) DEFAULT 'link';

-- Add check constraint for share_type if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'public_shares_share_type_check'
    ) THEN
        ALTER TABLE public.public_shares 
        ADD CONSTRAINT public_shares_share_type_check 
        CHECK (share_type IN ('link', 'qr', 'nfc', 'emergency'));
    END IF;
END $$;

-- Add other potentially missing columns to public_shares
ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS automation_data JSONB;

ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;

ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE public.public_shares 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create executions table if it doesn't exist
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

-- Create sharing_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sharing_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL CHECK (method IN ('link', 'qr', 'nfc', 'email', 'sms', 'social')),
    recipients TEXT[],
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shared_by UUID REFERENCES auth.users(id),
    share_data JSONB DEFAULT '{}'
);

-- ============================================
-- 4. CREATE INDEXES (IF NOT EXISTS)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '📇 Creating indexes...';
END $$;

-- Automations indexes
CREATE INDEX IF NOT EXISTS idx_automations_created_by ON automations(created_by);
CREATE INDEX IF NOT EXISTS idx_automations_is_public ON automations(is_public);
CREATE INDEX IF NOT EXISTS idx_automations_category ON automations(category);
CREATE INDEX IF NOT EXISTS idx_automations_created_at ON automations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automations_tags ON automations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_automations_access_type ON automations(access_type);

-- Deployments indexes
CREATE INDEX IF NOT EXISTS idx_deployments_automation_id ON deployments(automation_id);
CREATE INDEX IF NOT EXISTS idx_deployments_created_by ON deployments(created_by);
CREATE INDEX IF NOT EXISTS idx_deployments_type ON deployments(deployment_type);

-- Public shares indexes
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_shares_share_type ON public_shares(share_type);

-- Executions indexes
CREATE INDEX IF NOT EXISTS idx_executions_automation_id ON executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_by ON executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_executions_deployment_id ON executions(deployment_id);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);

-- Sharing logs indexes
CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON sharing_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON sharing_logs(shared_by);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_at ON sharing_logs(shared_at DESC);

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🔒 Enabling Row Level Security...';
END $$;

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. CREATE RLS POLICIES (SAFE VERSION)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '📜 Creating RLS policies...';
END $$;

-- Drop all existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own automations" ON automations;
DROP POLICY IF EXISTS "Users can view public automations" ON automations;
DROP POLICY IF EXISTS "Users can insert own automations" ON automations;
DROP POLICY IF EXISTS "Users can update own automations" ON automations;
DROP POLICY IF EXISTS "Users can delete own automations" ON automations;

-- Create automations policies
CREATE POLICY "Users can view their own automations" ON automations
    FOR SELECT USING (auth.uid() = created_by);

-- This policy now safely references access_type column
CREATE POLICY "Users can view public automations" ON automations
    FOR SELECT USING (
        is_public = true 
        OR (
            EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'automations' 
                AND column_name = 'access_type'
            ) 
            AND access_type IN ('public', 'link_only')
        )
    );

CREATE POLICY "Users can insert own automations" ON automations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own automations" ON automations
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own automations" ON automations
    FOR DELETE USING (auth.uid() = created_by);

-- Deployments policies
DROP POLICY IF EXISTS "Users can view own deployments" ON deployments;
DROP POLICY IF EXISTS "Users can create deployments" ON deployments;
DROP POLICY IF EXISTS "Users can update own deployments" ON deployments;
DROP POLICY IF EXISTS "Users can delete own deployments" ON deployments;

CREATE POLICY "Users can view own deployments" ON deployments
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create deployments" ON deployments
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own deployments" ON deployments
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own deployments" ON deployments
    FOR DELETE USING (auth.uid() = created_by);

-- Public shares policies
DROP POLICY IF EXISTS "Public shares are readable by anyone" ON public_shares;
DROP POLICY IF EXISTS "Users can create public shares" ON public_shares;
DROP POLICY IF EXISTS "Users can update their own shares" ON public_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON public_shares;

CREATE POLICY "Public shares are readable by anyone" ON public_shares
    FOR SELECT USING (is_active = true AND expires_at > NOW());

CREATE POLICY "Users can create public shares" ON public_shares
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own shares" ON public_shares
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own shares" ON public_shares
    FOR DELETE USING (auth.uid() = created_by);

-- Executions policies
DROP POLICY IF EXISTS "Users can view own executions" ON executions;
DROP POLICY IF EXISTS "Automation owners can view all executions" ON executions;
DROP POLICY IF EXISTS "Users can create executions" ON executions;
DROP POLICY IF EXISTS "Users can update own executions" ON executions;

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

-- Sharing logs policies
DROP POLICY IF EXISTS "Users can view their own sharing logs" ON sharing_logs;
DROP POLICY IF EXISTS "Users can create sharing logs" ON sharing_logs;

CREATE POLICY "Users can view their own sharing logs" ON sharing_logs
    FOR SELECT USING (auth.uid() = shared_by);

CREATE POLICY "Users can create sharing logs" ON sharing_logs
    FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- ============================================
-- 7. CREATE FUNCTIONS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🔧 Creating helper functions...';
END $$;

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

-- Function to get shareable automation
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

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION cleanup_expired_shares()
RETURNS void AS $$
BEGIN
    UPDATE public_shares 
    SET is_active = false
    WHERE expires_at < NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '🔑 Granting permissions...';
END $$;

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
GRANT EXECUTE ON FUNCTION cleanup_expired_shares TO authenticated, anon;

-- ============================================
-- 9. ENABLE REALTIME (SAFE VERSION)
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '📡 Enabling realtime subscriptions...';
    
    -- Enable realtime for automations
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.automations;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '  - Table automations already in publication';
    END;
    
    -- Enable realtime for executions
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.executions;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '  - Table executions already in publication';
    END;
    
    -- Enable realtime for deployments
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.deployments;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '  - Table deployments already in publication';
    END;
    
    -- Enable realtime for public_shares
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.public_shares;
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '  - Table public_shares already in publication';
    END;
END $$;

-- ============================================
-- 10. VERIFY MIGRATION SUCCESS
-- ============================================
DO $$
DECLARE
    missing_cols TEXT := '';
    col_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Verifying migration...';
    
    -- Check for required columns in automations table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'automations' AND column_name = 'access_type'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        missing_cols := missing_cols || 'access_type, ';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'automations' AND column_name = 'share_settings'
    ) INTO col_exists;
    
    IF NOT col_exists THEN
        missing_cols := missing_cols || 'share_settings, ';
    END IF;
    
    IF missing_cols = '' THEN
        RAISE NOTICE '✅ All required columns are present!';
    ELSE
        RAISE WARNING '❌ Missing columns: %', rtrim(missing_cols, ', ');
    END IF;
END $$;

-- ============================================
-- COMMIT TRANSACTION
-- ============================================
COMMIT;

-- ============================================
-- FINAL SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Migration completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run npm run setup:sharing to verify';
    RAISE NOTICE '  2. Test sharing features in your app';
    RAISE NOTICE '  3. Check that NFC/QR sharing works correctly';
    RAISE NOTICE '';
END $$;