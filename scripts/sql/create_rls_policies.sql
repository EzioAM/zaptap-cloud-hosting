-- Run this after creating the tables to add RLS policies

-- Enable Row Level Security
ALTER TABLE public.automation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_likes ENABLE ROW LEVEL SECURITY;

-- Version History Policies
CREATE POLICY "Users can view automation versions" ON public.automation_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_versions.automation_id 
      AND (a.is_public = true OR a.created_by = auth.uid())
    )
  );

CREATE POLICY "Automation owners can create versions" ON public.automation_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.created_by = auth.uid()
    )
  );

-- Analytics Policies
CREATE POLICY "Users can view automation analytics" ON public.automation_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_analytics.automation_id 
      AND (a.is_public = true OR a.created_by = auth.uid())
    )
  );

CREATE POLICY "Anyone can record analytics" ON public.automation_analytics
  FOR INSERT WITH CHECK (true);

-- Comments Policies
CREATE POLICY "Users can view comments on public automations" ON public.automation_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_comments.automation_id AND a.is_public = true
    )
  );

CREATE POLICY "Authenticated users can comment on public automations" ON public.automation_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.is_public = true
    )
  );

CREATE POLICY "Users can manage their own comments" ON public.automation_comments
  FOR ALL USING (user_id = auth.uid());

-- Comment Likes Policies
CREATE POLICY "Users can view comment likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can unlike their own likes" ON public.comment_likes
  FOR DELETE USING (user_id = auth.uid());

-- Automation Likes Policies
CREATE POLICY "Users can view automation likes" ON public.automation_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like automations" ON public.automation_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can unlike automations" ON public.automation_likes
  FOR DELETE USING (user_id = auth.uid());