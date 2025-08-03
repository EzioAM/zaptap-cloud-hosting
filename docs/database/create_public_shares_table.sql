-- Create public_shares table for storing shared automation links
CREATE TABLE IF NOT EXISTS public_shares (
    id VARCHAR(255) PRIMARY KEY,
    automation_id UUID NOT NULL,
    automation_data JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);

-- Enable Row Level Security
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for public_shares table

-- Allow anyone to read active, non-expired public shares
CREATE POLICY "Public shares are readable by anyone" ON public_shares
    FOR SELECT
    USING (is_active = true AND expires_at > NOW());

-- Allow authenticated users to create shares for their own automations
CREATE POLICY "Users can create public shares" ON public_shares
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own shares (e.g., deactivate them)
CREATE POLICY "Users can update their own shares" ON public_shares
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Allow users to delete their own shares
CREATE POLICY "Users can delete their own shares" ON public_shares
    FOR DELETE
    USING (auth.uid() = created_by);

-- Create sharing_logs table for analytics
CREATE TABLE IF NOT EXISTS sharing_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID NOT NULL,
    method VARCHAR(50) NOT NULL,
    recipients TEXT[],
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shared_by UUID REFERENCES auth.users(id)
);

-- Create index for sharing_logs
CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON sharing_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON sharing_logs(shared_by);

-- Enable RLS for sharing_logs
ALTER TABLE sharing_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own sharing logs
CREATE POLICY "Users can view their own sharing logs" ON sharing_logs
    FOR SELECT
    USING (auth.uid() = shared_by);

-- Allow users to create sharing logs
CREATE POLICY "Users can create sharing logs" ON sharing_logs
    FOR INSERT
    WITH CHECK (auth.uid() = shared_by);

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public_shares TO authenticated;
GRANT INSERT ON public_shares TO authenticated;
GRANT UPDATE ON public_shares TO authenticated;
GRANT DELETE ON public_shares TO authenticated;

GRANT SELECT ON sharing_logs TO authenticated;
GRANT INSERT ON sharing_logs TO authenticated;

-- Grant read access to anonymous users for public shares
GRANT SELECT ON public_shares TO anon;