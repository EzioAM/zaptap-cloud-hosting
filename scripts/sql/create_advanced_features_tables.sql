-- Advanced Features Tables for Zaptap
-- Run this script in Supabase SQL Editor to add version history, analytics, and comments

-- 1. Automation Version History Table
CREATE TABLE IF NOT EXISTS public.automation_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  changes_summary TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Ensure unique version numbers per automation
  UNIQUE(automation_id, version_number)
);

-- 2. Automation Analytics Table
CREATE TABLE IF NOT EXISTS public.automation_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'view', 'execution', 'share', 'download', 'like', 'comment'
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  user_agent TEXT,
  ip_address INET,
  location_data JSONB, -- country, city, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Index for performance
  INDEX idx_analytics_automation_id ON automation_analytics(automation_id),
  INDEX idx_analytics_event_type ON automation_analytics(event_type),
  INDEX idx_analytics_created_at ON automation_analytics(created_at),
  INDEX idx_analytics_user_id ON automation_analytics(user_id)
);

-- 3. Automation Comments Table
CREATE TABLE IF NOT EXISTS public.automation_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES public.automation_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraints
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0),
  
  -- Indexes
  INDEX idx_comments_automation_id ON automation_comments(automation_id),
  INDEX idx_comments_parent_id ON automation_comments(parent_comment_id),
  INDEX idx_comments_user_id ON automation_comments(user_id),
  INDEX idx_comments_created_at ON automation_comments(created_at)
);

-- 4. Comment Likes Table (for tracking who liked what)
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.automation_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate likes
  UNIQUE(comment_id, user_id)
);

-- 5. Automation Likes/Favorites Table
CREATE TABLE IF NOT EXISTS public.automation_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate likes
  UNIQUE(automation_id, user_id)
);

-- 6. Enable Row Level Security
ALTER TABLE public.automation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_likes ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Version History
-- Allow users to read versions of public automations or their own automations
CREATE POLICY "Users can view automation versions" ON public.automation_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_versions.automation_id 
      AND (a.is_public = true OR a.created_by = auth.uid())
    )
  );

-- Allow automation owners to create versions
CREATE POLICY "Automation owners can create versions" ON public.automation_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.created_by = auth.uid()
    )
  );

-- 8. RLS Policies for Analytics
-- Allow reading analytics for public automations or own automations
CREATE POLICY "Users can view automation analytics" ON public.automation_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_analytics.automation_id 
      AND (a.is_public = true OR a.created_by = auth.uid())
    )
  );

-- Allow anyone to insert analytics (for tracking)
CREATE POLICY "Anyone can record analytics" ON public.automation_analytics
  FOR INSERT WITH CHECK (true);

-- 9. RLS Policies for Comments
-- Allow reading comments on public automations
CREATE POLICY "Users can view comments on public automations" ON public.automation_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_comments.automation_id AND a.is_public = true
    )
  );

-- Allow authenticated users to create comments on public automations
CREATE POLICY "Authenticated users can comment on public automations" ON public.automation_comments
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.is_public = true
    )
  );

-- Allow users to update/delete their own comments
CREATE POLICY "Users can manage their own comments" ON public.automation_comments
  FOR ALL USING (user_id = auth.uid());

-- 10. RLS Policies for Comment Likes
CREATE POLICY "Users can view comment likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can unlike their own likes" ON public.comment_likes
  FOR DELETE USING (user_id = auth.uid());

-- 11. RLS Policies for Automation Likes
CREATE POLICY "Users can view automation likes" ON public.automation_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like automations" ON public.automation_likes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can unlike automations" ON public.automation_likes
  FOR DELETE USING (user_id = auth.uid());

-- 12. Functions for automatic version creation
CREATE OR REPLACE FUNCTION create_automation_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if significant fields changed
  IF (OLD.title != NEW.title OR OLD.description != NEW.description OR OLD.steps != NEW.steps) THEN
    INSERT INTO public.automation_versions (
      automation_id,
      version_number,
      title,
      description,
      steps,
      category,
      tags,
      changes_summary,
      created_by
    )
    SELECT 
      NEW.id,
      COALESCE((
        SELECT MAX(version_number) + 1 
        FROM public.automation_versions 
        WHERE automation_id = NEW.id
      ), 1),
      NEW.title,
      NEW.description,
      NEW.steps,
      NEW.category,
      NEW.tags,
      'Automated version save',
      NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Trigger to auto-create versions on automation updates
CREATE TRIGGER automation_version_trigger
  AFTER UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION create_automation_version();

-- 14. Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.automation_comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.automation_comments 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Trigger to maintain likes count
CREATE TRIGGER comment_likes_trigger
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- 16. Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_versions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_likes;

-- 17. Create helpful views for analytics
CREATE OR REPLACE VIEW public.automation_stats_detailed AS
SELECT 
  a.id,
  a.title,
  a.created_by,
  COUNT(DISTINCT av.id) as version_count,
  COUNT(DISTINCT CASE WHEN an.event_type = 'view' THEN an.id END) as view_count,
  COUNT(DISTINCT CASE WHEN an.event_type = 'execution' THEN an.id END) as execution_count,
  COUNT(DISTINCT CASE WHEN an.event_type = 'share' THEN an.id END) as share_count,
  COUNT(DISTINCT CASE WHEN an.event_type = 'download' THEN an.id END) as download_count,
  COUNT(DISTINCT ac.id) as comment_count,
  COUNT(DISTINCT al.id) as like_count,
  MAX(an.created_at) as last_activity_at
FROM public.automations a
LEFT JOIN public.automation_versions av ON av.automation_id = a.id
LEFT JOIN public.automation_analytics an ON an.automation_id = a.id
LEFT JOIN public.automation_comments ac ON ac.automation_id = a.id
LEFT JOIN public.automation_likes al ON al.automation_id = a.id
GROUP BY a.id, a.title, a.created_by;

-- Grant permissions on the view
GRANT SELECT ON public.automation_stats_detailed TO anon, authenticated;

-- 18. Add helpful comments
COMMENT ON TABLE public.automation_versions IS 'Version history for automations with change tracking';
COMMENT ON TABLE public.automation_analytics IS 'Analytics events for automation usage tracking';
COMMENT ON TABLE public.automation_comments IS 'User comments and discussions on automations';
COMMENT ON TABLE public.comment_likes IS 'Like/unlike tracking for comments';
COMMENT ON TABLE public.automation_likes IS 'User favorites/likes for automations';

SELECT 'Advanced features tables created successfully!' as status;