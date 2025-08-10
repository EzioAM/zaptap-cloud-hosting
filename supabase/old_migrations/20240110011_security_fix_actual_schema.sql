-- Comprehensive Security Fix Migration (Based on Actual Schema)
-- This migration addresses all security issues with the actual database schema

-- Drop existing problematic views to recreate them
DROP VIEW IF EXISTS public.change_history_view CASCADE;
DROP VIEW IF EXISTS public.change_history_with_details CASCADE;
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;
DROP VIEW IF EXISTS public.user_automation_stats CASCADE;

-- 1. FIX: Recreate change_history_view based on actual table structure
-- The change_history table tracks feature changes, not database changes
CREATE OR REPLACE VIEW public.change_history_view AS
SELECT 
    ch.id,
    ch.user_id,
    ch.feature,
    ch.description,
    ch.status,
    ch.reverted_at,
    ch.reverted_by,
    ch.created_at,
    ch.updated_at,
    u.email as user_email,
    u.name as user_name
FROM 
    public.change_history ch
    LEFT JOIN public.users u ON ch.user_id = u.id
WHERE ch.user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'developer')
);

-- Grant appropriate permissions
GRANT SELECT ON public.change_history_view TO authenticated;

-- 2. FIX: Create change_history_with_details view
CREATE OR REPLACE VIEW public.change_history_with_details AS
SELECT 
    ch.id,
    ch.user_id,
    ch.feature,
    ch.description,
    ch.status,
    ch.reverted_at,
    ch.reverted_by,
    ch.created_at,
    ch.updated_at,
    u.email as user_email,
    u.name as user_name,
    ru.email as reverted_by_email,
    ru.name as reverted_by_name
FROM 
    public.change_history ch
    LEFT JOIN public.users u ON ch.user_id = u.id
    LEFT JOIN public.users ru ON ch.reverted_by = ru.id
WHERE ch.user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'developer')
);

GRANT SELECT ON public.change_history_with_details TO authenticated;

-- 3. FIX: Create user_roles_summary view
CREATE OR REPLACE VIEW public.user_roles_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    COUNT(DISTINCT a.id) as automation_count,
    COUNT(DISTINCT CASE WHEN a.is_public THEN a.id END) as public_automation_count
FROM 
    public.users u
    LEFT JOIN public.automations a ON u.id = a.created_by
WHERE u.id = auth.uid() -- Only show current user's data
GROUP BY u.id, u.email, u.name, u.role, u.created_at;

GRANT SELECT ON public.user_roles_summary TO authenticated;

-- 4. FIX: Enable RLS on change_history table if it exists and doesn't have RLS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'change_history'
    ) THEN
        ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own change history" ON public.change_history;
        DROP POLICY IF EXISTS "Users can create their own change history" ON public.change_history;
        DROP POLICY IF EXISTS "Admins can view all change history" ON public.change_history;
        
        -- Create policies for change_history
        CREATE POLICY "Users can view their own change history" ON public.change_history
            FOR SELECT USING (user_id = auth.uid());
            
        CREATE POLICY "Users can create their own change history" ON public.change_history
            FOR INSERT WITH CHECK (user_id = auth.uid());
            
        CREATE POLICY "Admins can view all change history" ON public.change_history
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.users 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'developer')
                )
            );
    END IF;
END $$;

-- 5. FIX: Enable RLS on tables that are missing it

-- Create user_collections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    automation_ids UUID[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_collections
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own collections" ON public.user_collections;
DROP POLICY IF EXISTS "Users can create their own collections" ON public.user_collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON public.user_collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON public.user_collections;

-- Create RLS policies for user_collections
CREATE POLICY "Users can view their own collections" ON public.user_collections
    FOR SELECT USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create their own collections" ON public.user_collections
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own collections" ON public.user_collections
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own collections" ON public.user_collections
    FOR DELETE USING (user_id = auth.uid());

-- Create automation_reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.automation_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_helpful BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(automation_id, user_id)
);

-- Enable RLS on automation_reviews
ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.automation_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.automation_reviews;

-- Create RLS policies for automation_reviews
CREATE POLICY "Anyone can view reviews" ON public.automation_reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.automation_reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON public.automation_reviews
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews" ON public.automation_reviews
    FOR DELETE USING (user_id = auth.uid());

-- Create feature_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view enabled feature flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins can manage feature flags" ON public.feature_flags;

-- Create RLS policies for feature_flags
CREATE POLICY "Anyone can view enabled feature flags" ON public.feature_flags
    FOR SELECT USING (enabled = true);

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'developer')
        )
    );

-- Enable RLS on automation_executions if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'automation_executions'
    ) THEN
        ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own executions" ON public.automation_executions;
        DROP POLICY IF EXISTS "Users can create their own executions" ON public.automation_executions;
        DROP POLICY IF EXISTS "Users can update their own executions" ON public.automation_executions;
        
        -- Create RLS policies for automation_executions
        CREATE POLICY "Users can view their own executions" ON public.automation_executions
            FOR SELECT USING (user_id = auth.uid());
        
        CREATE POLICY "Users can create their own executions" ON public.automation_executions
            FOR INSERT WITH CHECK (user_id = auth.uid());
        
        CREATE POLICY "Users can update their own executions" ON public.automation_executions
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

-- Enable RLS on step_executions if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'step_executions'
    ) THEN
        ALTER TABLE public.step_executions ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own step executions" ON public.step_executions;
        DROP POLICY IF EXISTS "Users can create step executions for their automations" ON public.step_executions;
        
        -- Create RLS policies for step_executions
        CREATE POLICY "Users can view their own step executions" ON public.step_executions
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.automation_executions ae
                    WHERE ae.id = step_executions.execution_id
                    AND ae.user_id = auth.uid()
                )
            );
        
        CREATE POLICY "Users can create step executions for their automations" ON public.step_executions
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.automation_executions ae
                    WHERE ae.id = step_executions.execution_id
                    AND ae.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- Create shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES auth.users(id),
    share_type VARCHAR(50) CHECK (share_type IN ('public', 'private', 'link')),
    permissions JSONB DEFAULT '{"view": true, "execute": true, "edit": false}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on shares
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view shares they created or received" ON public.shares;
DROP POLICY IF EXISTS "Users can create shares" ON public.shares;
DROP POLICY IF EXISTS "Users can update their own shares" ON public.shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON public.shares;

-- Create RLS policies for shares
CREATE POLICY "Users can view shares they created or received" ON public.shares
    FOR SELECT USING (
        shared_by = auth.uid() OR 
        shared_with = auth.uid() OR
        share_type = 'public'
    );

CREATE POLICY "Users can create shares" ON public.shares
    FOR INSERT WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Users can update their own shares" ON public.shares
    FOR UPDATE USING (shared_by = auth.uid());

CREATE POLICY "Users can delete their own shares" ON public.shares
    FOR DELETE USING (shared_by = auth.uid());

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;

-- Create RLS policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (user_id = auth.uid());

-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on comments if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'comments'
    ) THEN
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
        DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
        DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
        DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
        
        -- Create RLS policies for comments
        CREATE POLICY "Anyone can view comments" ON public.comments
            FOR SELECT USING (true);
        
        CREATE POLICY "Authenticated users can create comments" ON public.comments
            FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
        
        CREATE POLICY "Users can update their own comments" ON public.comments
            FOR UPDATE USING (user_id = auth.uid());
        
        CREATE POLICY "Users can delete their own comments" ON public.comments
            FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- 6. Add indexes for better performance on RLS queries
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON public.user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_reviews_user_id ON public.automation_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_reviews_automation_id ON public.automation_reviews(automation_id);
CREATE INDEX IF NOT EXISTS idx_change_history_user_id ON public.change_history(user_id);

-- Add indexes conditionally for tables that might exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'automation_executions') THEN
        CREATE INDEX IF NOT EXISTS idx_automation_executions_user_id ON public.automation_executions(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shares') THEN
        CREATE INDEX IF NOT EXISTS idx_shares_shared_by ON public.shares(shared_by);
        CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON public.shares(shared_with);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_entity ON public.reviews(entity_type, entity_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
    END IF;
END $$;

-- Add comment explaining the security fixes
COMMENT ON SCHEMA public IS 'Public schema with enhanced security. All tables have RLS enabled and appropriate policies.';