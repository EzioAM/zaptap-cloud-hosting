-- Comprehensive Security Fix Migration
-- This migration addresses all security issues found by Supabase linter

-- 1. FIX: Exposed auth.users via change_history_view
DROP VIEW IF EXISTS public.change_history_view CASCADE;

-- Recreate the view using public.users instead of auth.users
CREATE OR REPLACE VIEW public.change_history_view
WITH (security_invoker = on) AS
SELECT 
    ch.id,
    ch.record_id,
    ch.action,
    ch.changed_by AS user_id,
    ch.changed_at,
    ch.old_data,
    ch.new_data,
    u.email AS user_email,
    u.name AS user_name
FROM public.change_history ch
LEFT JOIN public.users u ON ch.changed_by = u.id;

-- 2. FIX: Remove SECURITY DEFINER from change_history_with_details
DROP VIEW IF EXISTS public.change_history_with_details CASCADE;
CREATE OR REPLACE VIEW public.change_history_with_details
WITH (security_invoker = on) AS
SELECT 
    ch.id,
    ch.table_name,
    ch.record_id,
    ch.action,
    ch.changed_by AS user_id,
    ch.changed_at,
    ch.old_data,
    ch.new_data,
    u.email AS changed_by_email,
    u.name AS changed_by_name
FROM public.change_history ch
LEFT JOIN public.users u ON ch.changed_by = u.id;

-- 3. FIX: Remove SECURITY DEFINER from user_roles_summary
DROP VIEW IF EXISTS public.user_roles_summary CASCADE;
CREATE OR REPLACE VIEW public.user_roles_summary
WITH (security_invoker = on) AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.created_at,
    COUNT(DISTINCT a.id) AS automation_count,
    COUNT(DISTINCT CASE WHEN a.is_public THEN a.id END) AS public_automation_count
FROM public.users u
LEFT JOIN public.automations a ON u.id = a.created_by
WHERE u.id = auth.uid()
GROUP BY u.id, u.email, u.name, u.role, u.created_at;

-- Grant permissions
GRANT SELECT ON public.change_history_view TO authenticated;
GRANT SELECT ON public.change_history_with_details TO authenticated;
GRANT SELECT ON public.user_roles_summary TO authenticated;

-- 4. Enable and configure RLS

-- user_collections
ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own collections" ON public.user_collections
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own collections" ON public.user_collections
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own collections" ON public.user_collections
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own collections" ON public.user_collections
    FOR DELETE USING (user_id = auth.uid());

-- automation_reviews
ALTER TABLE public.automation_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON public.automation_reviews
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.automation_reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
CREATE POLICY "Users can update their own reviews" ON public.automation_reviews
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own reviews" ON public.automation_reviews
    FOR DELETE USING (user_id = auth.uid());

-- feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
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

-- automation_executions
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own executions" ON public.automation_executions
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create their own executions" ON public.automation_executions
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own executions" ON public.automation_executions
    FOR UPDATE USING (user_id = auth.uid());

-- step_executions
ALTER TABLE public.step_executions ENABLE ROW LEVEL SECURITY;
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

-- shares
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
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

-- reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON public.reviews
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());
CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own reviews" ON public.reviews
    FOR DELETE USING (user_id = auth.uid());

-- comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view comments on public automations" ON public.comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = comments.automation_id
            AND (a.is_public = true OR a.created_by = auth.uid())
        )
    );
CREATE POLICY "Authenticated users can create comments" ON public.comments
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = comments.automation_id
            AND (a.is_public = true OR a.created_by = auth.uid())
        )
    );
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (user_id = auth.uid());

-- 5. Additional security improvements
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'change_history'
    ) THEN
        ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = 'change_history' 
              AND policyname = 'Admins can view change history'
        ) THEN
            CREATE POLICY "Admins can view change history" ON public.change_history
                FOR SELECT USING (
                    EXISTS (
                        SELECT 1 FROM public.users 
                        WHERE id = auth.uid() 
                        AND role IN ('admin', 'developer')
                    )
                );
        END IF;
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON public.user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_reviews_user_id ON public.automation_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_user_id ON public.automation_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_by ON public.shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON public.shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_automation_id ON public.comments(automation_id);

COMMENT ON SCHEMA public IS 'Public schema with enhanced security. All tables have RLS enabled and appropriate policies.';