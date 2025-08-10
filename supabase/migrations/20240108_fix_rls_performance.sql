-- Migration: Fix RLS Performance Issues
-- Date: 2024-01-08
-- Description: Optimize RLS policies by fixing auth function calls and consolidating duplicate policies

-- ============================================
-- PART 1: Fix Auth RLS Initialization Plan
-- Replace auth.<function>() with (select auth.<function>())
-- ============================================

-- Fix users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Allow user insert own profile" ON public.users;
CREATE POLICY "Allow user insert own profile" ON public.users
  FOR INSERT WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Allow user read own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Consolidate users policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view profiles" ON public.users
  FOR SELECT USING (
    id = (select auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'developer'
    )
  );

-- Fix push_tokens table policies  
DROP POLICY IF EXISTS "Users can view own push tokens" ON public.push_tokens;
CREATE POLICY "Users can view own push tokens" ON public.push_tokens
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.push_tokens;
CREATE POLICY "Users can insert own push tokens" ON public.push_tokens
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own push tokens" ON public.push_tokens;
CREATE POLICY "Users can update own push tokens" ON public.push_tokens
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.push_tokens;
CREATE POLICY "Users can delete own push tokens" ON public.push_tokens
  FOR DELETE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Service role can manage all push tokens" ON public.push_tokens;

-- Fix automations table policies
DROP POLICY IF EXISTS "Users can view own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can view their own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can view public automations" ON public.automations;
DROP POLICY IF EXISTS "Anyone can view public automations" ON public.automations;
DROP POLICY IF EXISTS "Allow read access to test automations" ON public.automations;

-- Create consolidated view policy for automations
CREATE POLICY "Users can view automations" ON public.automations
  FOR SELECT USING (
    user_id = (select auth.uid()) OR 
    is_public = true OR
    (metadata->>'test')::boolean = true
  );

-- Fix duplicate insert policies
DROP POLICY IF EXISTS "Users can create automations" ON public.automations;
DROP POLICY IF EXISTS "Users can insert own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can insert their own automations" ON public.automations;

CREATE POLICY "Users can create automations" ON public.automations
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- Fix duplicate update policies
DROP POLICY IF EXISTS "Users can update own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can update their own automations" ON public.automations;
DROP POLICY IF EXISTS "Allow update execution count on test automations" ON public.automations;

CREATE POLICY "Users can update automations" ON public.automations
  FOR UPDATE USING (
    user_id = (select auth.uid()) OR 
    (metadata->>'test')::boolean = true
  );

-- Fix duplicate delete policies
DROP POLICY IF EXISTS "Users can delete own automations" ON public.automations;
DROP POLICY IF EXISTS "Users can delete their own automations" ON public.automations;

CREATE POLICY "Users can delete automations" ON public.automations
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix automation_execution_summary policies
DROP POLICY IF EXISTS "Users can view their own execution summaries" ON public.automation_execution_summary;
CREATE POLICY "Users can view their own execution summaries" ON public.automation_execution_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_execution_summary.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

-- Fix profiles table policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Developers can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles" ON public.profiles
  FOR SELECT USING (
    id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (select auth.uid())
      AND p.role = 'developer'
    )
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = (select auth.uid()));

-- Fix automation_versions policies
DROP POLICY IF EXISTS "Users can view automation versions" ON public.automation_versions;
CREATE POLICY "Users can view automation versions" ON public.automation_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_versions.automation_id 
      AND (automations.user_id = (select auth.uid()) OR automations.is_public = true)
    )
  );

DROP POLICY IF EXISTS "Automation owners can create versions" ON public.automation_versions;
CREATE POLICY "Automation owners can create versions" ON public.automation_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_versions.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

-- Fix automation_analytics policies
DROP POLICY IF EXISTS "Users can view automation analytics" ON public.automation_analytics;
CREATE POLICY "Users can view automation analytics" ON public.automation_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_analytics.automation_id 
      AND (automations.user_id = (select auth.uid()) OR automations.is_public = true)
    )
  );

-- Fix comment_likes policies (consolidate duplicates)
DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Authenticated users can like/unlike comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can view comment likes" ON public.comment_likes;

CREATE POLICY "Users can manage comment likes" ON public.comment_likes
  FOR ALL USING (
    (select auth.uid()) IS NOT NULL OR
    true -- Allow viewing for all
  )
  WITH CHECK (
    user_id = (select auth.uid())
  );

-- Fix automation_likes policies
DROP POLICY IF EXISTS "Authenticated users can like automations" ON public.automation_likes;
CREATE POLICY "Authenticated users can like automations" ON public.automation_likes
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unlike automations" ON public.automation_likes;
CREATE POLICY "Users can unlike automations" ON public.automation_likes
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix developer_access_audit policies
DROP POLICY IF EXISTS "Developers can view audit logs" ON public.developer_access_audit;
CREATE POLICY "Developers can view audit logs" ON public.developer_access_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'developer'
    )
  );

-- Fix change_history policies
DROP POLICY IF EXISTS "Users can view their own change history" ON public.change_history;
DROP POLICY IF EXISTS "Developers can view all change history" ON public.change_history;

CREATE POLICY "Users can view change history" ON public.change_history
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'developer'
    )
  );

DROP POLICY IF EXISTS "Users can insert their own change history" ON public.change_history;
CREATE POLICY "Users can insert their own change history" ON public.change_history
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own change history" ON public.change_history;
CREATE POLICY "Users can update their own change history" ON public.change_history
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Fix code_changes policies
DROP POLICY IF EXISTS "Users can view code changes for their history" ON public.code_changes;
DROP POLICY IF EXISTS "Developers can view all code changes" ON public.code_changes;

CREATE POLICY "Users can view code changes" ON public.code_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.change_history 
      WHERE change_history.id = code_changes.change_history_id 
      AND change_history.user_id = (select auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'developer'
    )
  );

DROP POLICY IF EXISTS "Users can insert code changes for their history" ON public.code_changes;
CREATE POLICY "Users can insert code changes for their history" ON public.code_changes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_history 
      WHERE change_history.id = code_changes.change_history_id 
      AND change_history.user_id = (select auth.uid())
    )
  );

-- Fix user_collections policies
DROP POLICY IF EXISTS "Users can view their own collections" ON public.user_collections;
CREATE POLICY "Users can view their own collections" ON public.user_collections
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own collections" ON public.user_collections;
CREATE POLICY "Users can create their own collections" ON public.user_collections
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own collections" ON public.user_collections;
CREATE POLICY "Users can update their own collections" ON public.user_collections
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own collections" ON public.user_collections;
CREATE POLICY "Users can delete their own collections" ON public.user_collections
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix deployments policies
DROP POLICY IF EXISTS "Users can view own deployments" ON public.deployments;
CREATE POLICY "Users can view own deployments" ON public.deployments
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create deployments" ON public.deployments;
CREATE POLICY "Users can create deployments" ON public.deployments
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own deployments" ON public.deployments;
CREATE POLICY "Users can update own deployments" ON public.deployments
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own deployments" ON public.deployments;
CREATE POLICY "Users can delete own deployments" ON public.deployments
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix public_shares policies
DROP POLICY IF EXISTS "Users can create public shares" ON public.public_shares;
CREATE POLICY "Users can create public shares" ON public.public_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = public_shares.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own shares" ON public.public_shares;
CREATE POLICY "Users can update their own shares" ON public.public_shares
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = public_shares.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own shares" ON public.public_shares;
CREATE POLICY "Users can delete their own shares" ON public.public_shares
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = public_shares.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

-- Fix executions policies (consolidate duplicates)
DROP POLICY IF EXISTS "Users can view own executions" ON public.executions;
DROP POLICY IF EXISTS "Automation owners can view all executions" ON public.executions;

CREATE POLICY "Users can view executions" ON public.executions
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = executions.automation_id 
      AND automations.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create executions" ON public.executions;
DROP POLICY IF EXISTS "Anyone can create executions" ON public.executions;

CREATE POLICY "Users can create executions" ON public.executions
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid()) OR 
    user_id IS NULL -- Allow anonymous executions for public automations
  );

DROP POLICY IF EXISTS "Users can update own executions" ON public.executions;
CREATE POLICY "Users can update own executions" ON public.executions
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Fix sharing_logs policies
DROP POLICY IF EXISTS "Users can view their own sharing logs" ON public.sharing_logs;
CREATE POLICY "Users can view their own sharing logs" ON public.sharing_logs
  FOR SELECT USING (
    sharer_id = (select auth.uid()) OR 
    recipient_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can create sharing logs" ON public.sharing_logs;
CREATE POLICY "Users can create sharing logs" ON public.sharing_logs
  FOR INSERT WITH CHECK (sharer_id = (select auth.uid()));

-- Fix automation_reviews policies
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.automation_reviews;
CREATE POLICY "Authenticated users can create reviews" ON public.automation_reviews
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.automation_reviews;
CREATE POLICY "Users can update their own reviews" ON public.automation_reviews
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.automation_reviews;
CREATE POLICY "Users can delete their own reviews" ON public.automation_reviews
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix feature_flags policies
DROP POLICY IF EXISTS "Only admins can insert feature flags" ON public.feature_flags;
CREATE POLICY "Only admins can insert feature flags" ON public.feature_flags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update feature flags" ON public.feature_flags;
CREATE POLICY "Only admins can update feature flags" ON public.feature_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete feature flags" ON public.feature_flags;
CREATE POLICY "Only admins can delete feature flags" ON public.feature_flags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- Fix automation_executions policies
DROP POLICY IF EXISTS "Users can view their own executions" ON public.automation_executions;
CREATE POLICY "Users can view their own executions" ON public.automation_executions
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own executions" ON public.automation_executions;
CREATE POLICY "Users can create their own executions" ON public.automation_executions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own executions" ON public.automation_executions;
CREATE POLICY "Users can update their own executions" ON public.automation_executions
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Fix automation_comments policies (consolidate duplicates)
DROP POLICY IF EXISTS "Authenticated users can comment on public automations" ON public.automation_comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON public.automation_comments;
DROP POLICY IF EXISTS "Users can view comments on public automations" ON public.automation_comments;

CREATE POLICY "Users can view comments" ON public.automation_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_comments.automation_id 
      AND automations.is_public = true
    ) OR
    user_id = (select auth.uid())
  );

CREATE POLICY "Users can create comments" ON public.automation_comments
  FOR INSERT WITH CHECK (
    (select auth.uid()) IS NOT NULL AND 
    user_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.automations 
      WHERE automations.id = automation_comments.automation_id 
      AND automations.is_public = true
    )
  );

CREATE POLICY "Users can update own comments" ON public.automation_comments
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own comments" ON public.automation_comments
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix audit_logs policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (select auth.uid()) 
      AND profiles.role = 'admin'
    )
  );

-- Fix api_keys policies
DROP POLICY IF EXISTS "Users can view their own API keys" ON public.api_keys;
CREATE POLICY "Users can view their own API keys" ON public.api_keys
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create their own API keys" ON public.api_keys;
CREATE POLICY "Users can create their own API keys" ON public.api_keys
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own API keys" ON public.api_keys;
CREATE POLICY "Users can update their own API keys" ON public.api_keys
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.api_keys;
CREATE POLICY "Users can delete their own API keys" ON public.api_keys
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix step_executions policies
DROP POLICY IF EXISTS "Users can view their own step executions" ON public.step_executions;
CREATE POLICY "Users can view their own step executions" ON public.step_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automation_executions 
      WHERE automation_executions.id = step_executions.execution_id 
      AND automation_executions.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create their own step executions" ON public.step_executions;
CREATE POLICY "Users can create their own step executions" ON public.step_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automation_executions 
      WHERE automation_executions.id = step_executions.execution_id 
      AND automation_executions.user_id = (select auth.uid())
    )
  );

-- Fix shares policies
DROP POLICY IF EXISTS "Authenticated users can create shares" ON public.shares;
CREATE POLICY "Authenticated users can create shares" ON public.shares
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update shares" ON public.shares;
CREATE POLICY "Authenticated users can update shares" ON public.shares
  FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete shares" ON public.shares;
CREATE POLICY "Authenticated users can delete shares" ON public.shares
  FOR DELETE USING ((select auth.uid()) IS NOT NULL);

-- Fix reviews policies
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews
  FOR DELETE USING (user_id = (select auth.uid()));

-- Fix comments policies
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
CREATE POLICY "Authenticated users can create comments" ON public.comments
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL AND user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- PART 2: Add missing SELECT policies for reviews and comments
-- ============================================

-- Add SELECT policy for reviews if it doesn't exist
CREATE POLICY IF NOT EXISTS "Anyone can view reviews" ON public.reviews
  FOR SELECT USING (true);

-- Add SELECT policy for comments if it doesn't exist
CREATE POLICY IF NOT EXISTS "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

-- ============================================
-- PART 3: Create indexes for better performance
-- ============================================

-- Create indexes for foreign key relationships if they don't exist
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_is_public ON public.automations(is_public);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_automation_versions_automation_id ON public.automation_versions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_analytics_automation_id ON public.automation_analytics(automation_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_automation_likes_user_id ON public.automation_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_likes_automation_id ON public.automation_likes(automation_id);
CREATE INDEX IF NOT EXISTS idx_change_history_user_id ON public.change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_code_changes_change_history_id ON public.code_changes(change_history_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON public.user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON public.deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public.public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON public.executions(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_automation_id ON public.executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_sharer_id ON public.sharing_logs(sharer_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_recipient_id ON public.sharing_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_automation_reviews_user_id ON public.automation_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_reviews_automation_id ON public.automation_reviews(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_user_id ON public.automation_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_comments_user_id ON public.automation_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_comments_automation_id ON public.automation_comments(automation_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_execution_id ON public.step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- ============================================
-- Migration complete!
-- ============================================