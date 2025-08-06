-- Create push_tokens table for storing device push notification tokens
-- This table supports multi-device notifications per user

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    device_id TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Indexes for performance
    CONSTRAINT unique_device_per_user UNIQUE (device_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON public.push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_id ON public.push_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON public.push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_push_tokens_updated_at ON public.push_tokens(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own push tokens
CREATE POLICY "Users can view own push tokens" ON public.push_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own push tokens
CREATE POLICY "Users can insert own push tokens" ON public.push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own push tokens
CREATE POLICY "Users can update own push tokens" ON public.push_tokens
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own push tokens
CREATE POLICY "Users can delete own push tokens" ON public.push_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all push tokens (for sending notifications)
CREATE POLICY "Service role can manage all push tokens" ON public.push_tokens
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on push_tokens
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON public.push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
    BEFORE UPDATE ON public.push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_push_tokens_updated_at();

-- Function to clean up old push tokens (keep only 5 most recent per user)
CREATE OR REPLACE FUNCTION public.cleanup_old_push_tokens(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    tokens_to_delete INTEGER;
BEGIN
    -- Delete tokens older than the 5 most recent for the user
    WITH ranked_tokens AS (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rank
        FROM public.push_tokens
        WHERE user_id = user_uuid
    )
    DELETE FROM public.push_tokens
    WHERE id IN (
        SELECT id FROM ranked_tokens WHERE rank > 5
    );
    
    GET DIAGNOSTICS tokens_to_delete = ROW_COUNT;
    RETURN tokens_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active push tokens for a user
CREATE OR REPLACE FUNCTION public.get_user_push_tokens(user_uuid UUID)
RETURNS TABLE (
    token TEXT,
    device_id TEXT,
    platform TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT pt.token, pt.device_id, pt.platform, pt.updated_at
    FROM public.push_tokens pt
    WHERE pt.user_id = user_uuid
    ORDER BY pt.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_push_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_push_tokens(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.push_tokens IS 'Stores push notification tokens for user devices';
COMMENT ON COLUMN public.push_tokens.token IS 'Expo push token for the device';
COMMENT ON COLUMN public.push_tokens.device_id IS 'Unique identifier for the device';
COMMENT ON COLUMN public.push_tokens.platform IS 'Platform type: ios, android, or web';
COMMENT ON COLUMN public.push_tokens.user_id IS 'Reference to the user who owns this device';
COMMENT ON FUNCTION public.cleanup_old_push_tokens(UUID) IS 'Removes old push tokens, keeping only 5 most recent per user';
COMMENT ON FUNCTION public.get_user_push_tokens(UUID) IS 'Retrieves all active push tokens for a user';