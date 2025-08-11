-- Zaptap Sharing System Database Fix
-- Run this script in Supabase SQL Editor to fix sharing system issues
-- This will create all missing tables and policies needed for shared automation links

-- Start transaction
BEGIN;

-- Create public_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.public_shares (
  id VARCHAR(255) PRIMARY KEY,
  automation_id UUID NOT NULL,
  automation_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  share_type VARCHAR(50) DEFAULT 'link' CHECK (share_type IN ('link', 'qr', 'nfc', 'emergency')),
  metadata JSONB DEFAULT '{}'
);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'public_shares_automation_id_fkey'
  ) THEN
    ALTER TABLE public.public_shares 
    ADD CONSTRAINT public_shares_automation_id_fkey 
    FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_shares_share_type ON public_shares(share_type);

-- Enable RLS
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public shares are readable by anyone" ON public_shares;
DROP POLICY IF EXISTS "Users can create public shares" ON public_shares;
DROP POLICY IF EXISTS "Users can update their own shares" ON public_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON public_shares;

-- Create RLS Policies
CREATE POLICY "Public shares are readable by anyone" ON public_shares
  FOR SELECT USING (is_active = true AND expires_at > NOW());

CREATE POLICY "Users can create public shares" ON public_shares
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own shares" ON public_shares
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own shares" ON public_shares
  FOR DELETE USING (auth.uid() = created_by);

-- Grant permissions
GRANT SELECT ON public_shares TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public_shares TO authenticated;

-- Create helper function for incrementing access count
CREATE OR REPLACE FUNCTION increment_share_access_count(p_share_id VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE public_shares 
  SET access_count = access_count + 1
  WHERE id = p_share_id AND is_active = true AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION increment_share_access_count TO anon, authenticated;

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

-- Create indexes for sharing_logs
CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON sharing_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON sharing_logs(shared_by);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_at ON sharing_logs(shared_at DESC);

-- Enable RLS for sharing_logs
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for sharing_logs
DROP POLICY IF EXISTS "Users can view their own sharing logs" ON sharing_logs;
DROP POLICY IF EXISTS "Users can create sharing logs" ON sharing_logs;

-- Create RLS policies for sharing_logs
CREATE POLICY "Users can view their own sharing logs" ON sharing_logs
  FOR SELECT USING (auth.uid() = shared_by);

CREATE POLICY "Users can create sharing logs" ON sharing_logs
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

-- Grant permissions for sharing_logs
GRANT SELECT, INSERT ON sharing_logs TO authenticated;

-- Enable realtime subscriptions (if not already enabled)
DO $$
BEGIN
  -- Enable realtime for public_shares
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.public_shares;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table public_shares already in publication';
  END;
  
  -- Enable realtime for sharing_logs
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sharing_logs;
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'Table sharing_logs already in publication';
  END;
END $$;

-- Commit transaction
COMMIT;

-- Verify tables were created successfully
SELECT 
  'public_shares' as table_name, 
  COUNT(*) as row_count,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'public_shares'
  ) as table_exists
FROM public_shares
UNION ALL
SELECT 
  'sharing_logs' as table_name, 
  COUNT(*) as row_count,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'sharing_logs'
  ) as table_exists
FROM sharing_logs;